import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  inRange,
  movingAverage7,
  rangeStart,
  recentPeriods,
  summarize,
  type PeriodUnit,
  type RangeKey,
} from '../stats/stats'
import type { Entry, ISODate, Settings } from '../types'
import { fmtDelta, fmtKg, fmtPeriod } from './format'

const RANGES: { id: RangeKey; label: string }[] = [
  { id: '1m', label: '1개월' },
  { id: '3m', label: '3개월' },
  { id: '6m', label: '6개월' },
  { id: '1y', label: '1년' },
  { id: 'all', label: '전체' },
]

type Props = { entries: Entry[]; settings: Settings; today: ISODate }

export function ChartScreen({ entries, settings, today }: Props) {
  const [range, setRange] = useState<RangeKey>('3m')
  const [unit, setUnit] = useState<PeriodUnit>('week')

  if (entries.length === 0) {
    return (
      <section className="card">
        <p className="hint">기록이 쌓이면 그래프가 표시됩니다.</p>
      </section>
    )
  }

  // 이동평균은 전체 기록으로 계산해야 기간 시작 부분도 직전 7일을 반영한다.
  const ma = new Map(movingAverage7(entries).map((p) => [p.date, p.avg]))
  const visible = inRange(entries, rangeStart(today, range))
  const data = visible.map((e) => ({ date: e.date, weight: e.weightKg, ma7: ma.get(e.date) }))
  const summary = summarize(visible)
  const goal = settings.goalKg
  const values = [...visible.map((e) => e.weightKg), ...(goal === undefined ? [] : [goal])]
  const domain = [Math.floor(Math.min(...values) - 1), Math.ceil(Math.max(...values) + 1)]
  const rows = recentPeriods(entries, unit, unit === 'week' ? 8 : 6)

  return (
    <>
      <section className="card" aria-label="그래프">
        <div className="segmented" role="group" aria-label="기간">
          {RANGES.map((r) => (
            <button key={r.id} type="button" aria-pressed={range === r.id} onClick={() => setRange(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
        {visible.length === 0 ? (
          <p className="hint">이 기간에는 기록이 없습니다.</p>
        ) : (
          <div className="chart">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5).replace('-', '/')} minTickGap={24} />
                <YAxis domain={domain} allowDecimals={false} />
                <Tooltip formatter={(v) => `${fmtKg(Number(v))}kg`} />
                {goal !== undefined && (
                  <ReferenceLine
                    y={goal}
                    stroke="var(--goal)"
                    strokeDasharray="6 4"
                    label={{ value: `목표 ${fmtKg(goal)}`, position: 'insideTopRight', fill: 'var(--goal)' }}
                  />
                )}
                <Line
                  dataKey="weight"
                  name="체중"
                  stroke="none"
                  dot={{ r: 3, fill: 'var(--muted)', stroke: 'none', fillOpacity: 0.7 }}
                  activeDot={{ r: 5, fill: 'var(--muted)', stroke: 'var(--card)' }}
                  legendType="circle"
                  isAnimationActive={false}
                />
                <Line
                  dataKey="ma7"
                  name="7일 평균"
                  type="monotone"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {summary && (
        <section className="card" aria-label="기간 요약">
          <dl className="stats">
            <div>
              <dt>변화</dt>
              <dd>{fmtDelta(summary.change)}</dd>
            </div>
            <div>
              <dt>최저</dt>
              <dd>{fmtKg(summary.min)}</dd>
            </div>
            <div>
              <dt>최고</dt>
              <dd>{fmtKg(summary.max)}</dd>
            </div>
            <div>
              <dt>평균</dt>
              <dd>{fmtKg(summary.avg)}</dd>
            </div>
          </dl>
        </section>
      )}

      <section className="card" aria-label="평균 비교">
        <div className="segmented" role="group" aria-label="단위">
          <button type="button" aria-pressed={unit === 'week'} onClick={() => setUnit('week')}>
            주간
          </button>
          <button type="button" aria-pressed={unit === 'month'} onClick={() => setUnit('month')}>
            월간
          </button>
        </div>
        <table className="periods">
          <thead>
            <tr>
              <th>{unit === 'week' ? '주' : '월'}</th>
              <th>평균</th>
              <th>직전 대비</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td>{fmtPeriod(r.key, unit)}</td>
                <td>{fmtKg(r.avg)}</td>
                <td>{fmtDelta(r.delta)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )
}
