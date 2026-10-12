import { effectiveStart, latestEntry, progressPercent } from '../stats/stats'
import type { Entry, Settings } from '../types'
import { fmtDelta, fmtKg, fmtPercent } from './format'

type Props = { entries: Entry[]; settings: Settings; onGoSettings: () => void }

export function GoalProgress({ entries, settings, onGoSettings }: Props) {
  const latest = latestEntry(entries)
  const start = effectiveStart(entries, settings)
  if (!latest || !start) return null
  const goal = settings.goalKg
  const pct = goal === undefined ? undefined : progressPercent(start.kg, latest.weightKg, goal)

  return (
    <section className="card" aria-label="목표 진행">
      <dl className="stats">
        <div>
          <dt>현재</dt>
          <dd>{fmtKg(latest.weightKg)}</dd>
        </div>
        <div>
          <dt>시작 대비</dt>
          <dd>{fmtDelta(latest.weightKg - start.kg)}</dd>
        </div>
        {goal !== undefined && (
          <div>
            <dt>목표</dt>
            <dd>{fmtKg(goal)}</dd>
          </div>
        )}
      </dl>
      {goal === undefined || pct === undefined ? (
        <button type="button" className="link" onClick={onGoSettings}>
          목표를 설정해 보세요
        </button>
      ) : (
        <div className="progress">
          <progress value={pct} max={100} aria-label="목표 진행률" />
          <div className="progress-text">
            <span>{fmtPercent(pct)}</span>
            <span>{pct >= 100 ? '목표 달성!' : `목표까지 ${fmtKg(Math.abs(latest.weightKg - goal))}kg`}</span>
          </div>
        </div>
      )}
    </section>
  )
}
