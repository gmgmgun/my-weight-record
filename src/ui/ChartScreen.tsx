import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  inRange,
  movingAverage7,
  rangeStart,
  recentPeriods,
  recentWeekdays,
  summarize,
  type PeriodUnit,
  type RangeKey,
} from '../stats/stats'
import type { Entry, ISODate, Settings } from '../types'
import { fmtDelta, fmtKg, fmtPeriod, fmtShortDate } from './format'

const RANGES: { id: RangeKey; label: string }[] = [
  { id: '1m', label: '1개월' },
  { id: '3m', label: '3개월' },
  { id: '6m', label: '6개월' },
  { id: '1y', label: '1년' },
  { id: 'all', label: '전체' },
]

const SUNDAY = 0

// 평균표 카드에서 고르는 보기: 주간·월간 평균, 또는 일요일마다 잰 체중
type TableView = PeriodUnit | 'sunday'

const TABLE_VIEWS: { id: TableView; label: string }[] = [
  { id: 'week', label: '주간' },
  { id: 'month', label: '월간' },
  { id: 'sunday', label: '일요일' },
]

type Props = { entries: Entry[]; settings: Settings; today: ISODate }

export function ChartScreen({ entries, settings, today }: Props) {
  const [range, setRange] = useState<RangeKey>('3m')
  const [view, setView] = useState<TableView>('week')

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
  // 일요일 보기는 하루 값이라 최저·최고 열이 없다
  const showRange = view !== 'sunday'
  const rows =
    view === 'sunday'
      ? recentWeekdays(entries, today, SUNDAY, 8).map((r) => ({
          key: r.date,
          label: fmtShortDate(r.date),
          value: r.weightKg,
          min: undefined,
          max: undefined,
          delta: r.delta,
        }))
      : recentPeriods(entries, view, view === 'week' ? 8 : 6).map((r) => ({
          key: r.key,
          label: fmtPeriod(r.key, view),
          value: r.avg,
          min: r.min,
          max: r.max,
          delta: r.delta,
        }))

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
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => d.slice(5).replace('-', '/')}
                  minTickGap={24}
                  tick={{ fill: 'var(--muted)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis domain={domain} allowDecimals={false} tick={{ fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v) => `${fmtKg(Number(v))}kg`}
                  contentStyle={{
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: 12,
                    color: 'var(--ink)',
                  }}
                  labelStyle={{ color: 'var(--muted)' }}
                  cursor={{ stroke: 'var(--line)' }}
                />
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
                  dot={{ r: 3, fill: 'var(--dot)', stroke: 'none' }}
                  activeDot={{ r: 5, fill: 'var(--dot)', stroke: 'var(--surface)' }}
                  legendType="circle"
                  isAnimationActive={false}
                />
                <Line
                  dataKey="ma7"
                  name="7일 평균"
                  type="monotone"
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <div className="split">
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
            {TABLE_VIEWS.map((v) => (
              <button key={v.id} type="button" aria-pressed={view === v.id} onClick={() => setView(v.id)}>
                {v.label}
              </button>
            ))}
          </div>
          <table className={showRange ? 'periods with-range' : 'periods'}>
            <thead>
              <tr>
                <th>{view === 'week' ? '주' : view === 'month' ? '월' : '일요일'}</th>
                <th>{view === 'sunday' ? '체중' : '평균'}</th>
                {showRange && <th>최저</th>}
                {showRange && <th>최고</th>}
                <th>직전 대비</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td>{r.label}</td>
                  <td>{fmtKg(r.value)}</td>
                  {showRange && <td>{fmtKg(r.min)}</td>}
                  {showRange && <td>{fmtKg(r.max)}</td>}
                  <td>{fmtDelta(r.delta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  )
}
