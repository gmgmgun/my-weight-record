import { useEffect, useState } from 'react'
import { backupFileName, buildBackup } from './backup/backup'
import type { WeightStore } from './db/storage'
import { todayLocal } from './lib/date'
import { ChartScreen } from './ui/ChartScreen'
import { downloadBackup } from './ui/download'
import { HistoryScreen } from './ui/HistoryScreen'
import { HomeScreen } from './ui/HomeScreen'
import { useAppData } from './ui/useAppData'

type Tab = 'home' | 'chart' | 'history'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: '홈', icon: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
  { id: 'chart', label: '그래프', icon: 'M3 17l5-5 4 3 8-8M3 21h18' },
  { id: 'history', label: '기록·설정', icon: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01' },
]

type Props = { store: WeightStore; clock?: () => number }

export default function App({ store, clock = Date.now }: Props) {
  const app = useAppData(store)
  const [tab, setTab] = useState<Tab>('home')
  const [now, setNow] = useState(clock)

  // 자정을 넘겨 백그라운드에 있던 앱을 다시 열면 "오늘"을 갱신한다.
  useEffect(() => {
    const refresh = () => setNow(clock())
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [clock])

  if (!app) return <p className="hint">불러오는 중…</p>
  const today = todayLocal(new Date(now))
  const exportBackup = () => {
    downloadBackup(buildBackup(app), backupFileName(today))
    void app.updateSettings({ lastBackupAt: clock() })
  }

  return (
    <div className="app">
      <main>
        {tab === 'home' && (
          <HomeScreen
            app={app}
            today={today}
            now={now}
            onGoSettings={() => setTab('history')}
            onExport={exportBackup}
          />
        )}
        {tab === 'chart' && <ChartScreen entries={app.entries} settings={app.settings} today={today} />}
        {tab === 'history' && <HistoryScreen app={app} today={today} onExport={exportBackup} />}
      </main>
      <nav className="tabs" aria-label="화면 전환">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={t.icon} />
            </svg>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
