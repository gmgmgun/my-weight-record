import { changeVsDaysAgo, weekComparison } from '../stats/stats'
import type { Entry } from '../types'
import { fmtDelta, fmtKg, trendArrow } from './format'

export function ComparisonPanel({ entries }: { entries: Entry[] }) {
  const week = changeVsDaysAgo(entries, 7)
  const month = changeVsDaysAgo(entries, 30)
  const { thisWeek, lastWeek } = weekComparison(entries)
  const delta = (v?: number) => `${fmtDelta(v)} ${trendArrow(v)}`.trim()

  return (
    <section className="card" aria-label="비교">
      <dl className="rows">
        <div>
          <dt>지난주 대비</dt>
          <dd>{delta(week)}</dd>
        </div>
        <div>
          <dt>지난달 대비</dt>
          <dd>{delta(month)}</dd>
        </div>
        <div>
          <dt>이번 주 평균</dt>
          <dd>
            {fmtKg(thisWeek)} <small>(지난주 {fmtKg(lastWeek)})</small>
          </dd>
        </div>
      </dl>
    </section>
  )
}
