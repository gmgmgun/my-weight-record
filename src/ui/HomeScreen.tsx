import type { ISODate } from '../types'
import { BackupBanner } from './BackupBanner'
import { ComparisonPanel } from './ComparisonPanel'
import { EntryForm } from './EntryForm'
import { GoalProgress } from './GoalProgress'
import type { AppState } from './useAppData'

type Props = { app: AppState; today: ISODate; now: number; onGoSettings: () => void; onExport: () => void }

export function HomeScreen({ app, today, now, onGoSettings, onExport }: Props) {
  return (
    <>
      <BackupBanner entryCount={app.entries.length} settings={app.settings} now={now} onExport={onExport} />
      <EntryForm key={today} entries={app.entries} today={today} onSave={app.saveEntry} />
      {app.entries.length === 0 ? (
        <p className="hint">첫 체중을 기록해 보세요. 기록이 쌓이면 추세와 비교가 여기에 표시됩니다.</p>
      ) : (
        <>
          <GoalProgress entries={app.entries} settings={app.settings} onGoSettings={onGoSettings} />
          <ComparisonPanel entries={app.entries} />
        </>
      )}
    </>
  )
}
