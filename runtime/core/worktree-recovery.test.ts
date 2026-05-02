import { describe, expect, it, vi } from 'vitest';
import type { AppRuntimeWorktreeCreateResult } from '@sero-ai/common';
import type { KanbanRuntimeHost } from '../types';
import { createWorktreeWithRecovery, isStaleWorktreeRegistrationError } from './worktree-recovery';

const WORKTREE_RESULT: AppRuntimeWorktreeCreateResult = {
  worktreePath: '/tmp/workspace/.sero/worktrees/card-4',
  branchName: 'chore/example-4',
  greenfield: false,
};

const STALE_ERROR = new Error(
  "Command failed: git worktree add /tmp/workspace/.sero/worktrees/card-4 chore/example-4\n"
    + "fatal: '/tmp/workspace/.sero/worktrees/card-4' is a missing but already registered worktree;\n"
    + "use 'add -f' to override, or 'prune' or 'remove' to clear",
);

function createHost(createWorktree: KanbanRuntimeHost['git']['createWorktree']) {
  const removeWorktree = vi.fn(async () => {});
  const host = {
    git: {
      createWorktree,
      removeWorktree,
      syncWorktreeWithDefaultBranch: async () => ({ success: true, updated: false, resolvedConflicts: false }),
      syncWorkspaceRootToDefaultBranch: async () => ({ synced: true }),
      createCheckpoint: async () => 'checkpoint-1',
      getDiffSummary: async () => '',
      getDiff: async () => '',
      pushBranch: async () => true,
      ensureRemoteDefaultBranch: async () => 'main',
      createPr: async () => ({ success: true as const, url: 'https://example.test/pr/1', number: 1 }),
      mergePr: async () => ({ success: true as const, state: 'merged' as const }),
      getPrMergeState: async () => 'unknown' as const,
      getPrMergeError: async () => null,
    },
  } satisfies Pick<KanbanRuntimeHost, 'git'>;
  return { host, removeWorktree };
}

describe('worktree recovery', () => {
  it('detects stale git worktree registration errors', () => {
    expect(isStaleWorktreeRegistrationError(STALE_ERROR)).toBe(true);
    expect(isStaleWorktreeRegistrationError(new Error('permission denied'))).toBe(false);
  });

  it('clears a stale registration and retries creation once', async () => {
    const createWorktree = vi.fn()
      .mockRejectedValueOnce(STALE_ERROR)
      .mockResolvedValueOnce(WORKTREE_RESULT);
    const { host, removeWorktree } = createHost(createWorktree);

    await expect(createWorktreeWithRecovery(host, '/tmp/workspace', {
      id: '4',
      title: 'Example',
    })).resolves.toEqual(WORKTREE_RESULT);

    expect(removeWorktree).toHaveBeenCalledWith('/tmp/workspace', '4', { force: true });
    expect(createWorktree).toHaveBeenCalledTimes(2);
  });

  it('does not remove worktrees for unrelated create failures', async () => {
    const createWorktree = vi.fn().mockRejectedValue(new Error('permission denied'));
    const { host, removeWorktree } = createHost(createWorktree);

    await expect(createWorktreeWithRecovery(host, '/tmp/workspace', {
      id: '4',
      title: 'Example',
    })).rejects.toThrow('permission denied');

    expect(removeWorktree).not.toHaveBeenCalled();
  });
});
