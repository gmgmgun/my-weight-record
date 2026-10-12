import { useEffect, useState } from 'react'
import type { WeightStore } from './db/storage'
import { todayLocal } from './lib/date'
import { HomeScreen } from './ui/HomeScreen'
import { useAppData } from './ui/useAppData'

type Tab = 'home' | 'chart' | 'history'

const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: '홈' },
  { id: 'chart', label: '그래프' },
  { id: 'history', label: '기록·설정' },
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

  return (
    <div className="app">
      <main>
        {tab === 'home' && <HomeScreen app={app} today={today} onGoSettings={() => setTab('history')} />}
        {tab === 'chart' && <p className="hint">그래프 화면</p>}
        {tab === 'history' && <p className="hint">기록·설정 화면</p>}
      </main>
      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
