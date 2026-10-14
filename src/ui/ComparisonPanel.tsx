import { sameDayComparison } from '../stats/stats'
import type { Entry } from '../types'
import { fmtDelta, fmtShortDate, trendArrow } from './format'

export function ComparisonPanel({ entries }: { entries: Entry[] }) {
  const day = sameDayComparison(entries, 'day')
  const week = sameDayComparison(entries, 'week')
  const month = sameDayComparison(entries, 'month')
  const delta = (v?: number) => {
    const arrow = trendArrow(v)
    return (
      <>
        {fmtDelta(v)}
        {arrow && <span className="arrow"> {arrow}</span>}
      </>
    )
  }

  return (
    <section aria-label="비교">
      <dl className="tiles">
        <div className="tile">
          <dt>어제 대비</dt>
          <dd>{delta(day?.delta)}</dd>
          {day && <dd className="ref">{fmtShortDate(day.refDate)}</dd>}
        </div>
        <div className="tile">
          <dt>지난주 대비</dt>
          <dd>{delta(week?.delta)}</dd>
          {week && <dd className="ref">{fmtShortDate(week.refDate)}</dd>}
        </div>
        <div className="tile">
          <dt>지난달 대비</dt>
          <dd>{delta(month?.delta)}</dd>
          {month && <dd className="ref">{fmtShortDate(month.refDate)}</dd>}
        </div>
      </dl>
    </section>
  )
}
