import { describe, expect, it } from 'vitest'
import { NOTICE_MESSAGES, selectNotice } from './selectNotice'

describe('selectNotice', () => {
  it('returns nothing when persistence is healthy', () => {
    expect(selectNotice({ persistenceBlocked: null, saveError: null, restoreFailed: false })).toBeNull()
  })

  it('prefers a blocked persistence over a full storage over a failed restore', () => {
    expect(selectNotice({ persistenceBlocked: 'newer-version', saveError: 'quota', restoreFailed: true })).toBe(
      'newer-version',
    )
    expect(selectNotice({ persistenceBlocked: null, saveError: 'quota', restoreFailed: true })).toBe('quota')
    expect(selectNotice({ persistenceBlocked: null, saveError: null, restoreFailed: true })).toBe('restore-failed')
  })

  it('uses the exact copy from the spec', () => {
    expect(NOTICE_MESSAGES).toEqual({
      'newer-version':
        "This workspace was saved by a newer version of ArchitectMind. Reload to update — changes in this window won't be saved.",
      'backup-failed':
        "Your saved workspace couldn't be restored or backed up. To protect it, changes in this window won't be saved.",
      unavailable: "This browser is blocking local storage — changes won't be kept after you close the app.",
      quota: "Storage is full — recent changes couldn't be saved.",
      'restore-failed': "Your saved workspace couldn't be restored. A backup was kept in this browser.",
    })
  })
})
