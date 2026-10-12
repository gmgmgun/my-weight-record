import { shouldShowBackupReminder } from '../backup/backup'
import type { Settings } from '../types'

type Props = { entryCount: number; settings: Settings; now: number; onExport: () => void }

export function BackupBanner({ entryCount, settings, now, onExport }: Props) {
  if (!shouldShowBackupReminder(entryCount, settings, now)) return null
  return (
    <aside className="banner" role="note">
      <span>백업한 지 30일이 지났어요.</span>
      <button type="button" onClick={onExport}>
        지금 백업
      </button>
    </aside>
  )
}
