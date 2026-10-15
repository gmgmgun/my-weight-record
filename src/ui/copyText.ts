import { addDays } from '../lib/date'
import { sortByDate } from '../stats/stats'
import type { Entry, ISODate } from '../types'
import { fmtDelta, fmtKg, fmtShortDate } from './format'

export type CopyRange = 'week' | 'month' | 'all'

export const COPY_RANGES: { id: CopyRange; label: string }[] = [
  { id: 'week', label: '최근 1주' },
  { id: 'month', label: '최근 1개월' },
  { id: 'all', label: '전체' },
]

// 오늘을 포함해 1주는 7일, 1개월은 30일이다.
export function copyFrom(today: ISODate, range: CopyRange): ISODate | undefined {
  return range === 'week' ? addDays(today, -6) : range === 'month' ? addDays(today, -29) : undefined
}

const monthDay = (d: ISODate) => d.slice(5).split('-').map(Number).join('/')

// 메모장·메신저에 붙여 넣을 글. 최신순이고, 증감은 기록 목록처럼 바로 앞 기록과 비교한다(범위 밖 기록 포함).
export function recordsText(entries: Entry[], from: ISODate | undefined): string | undefined {
  const sorted = sortByDate(entries)
  const lines: string[] = []
  sorted.forEach((entry, i) => {
    if (from !== undefined && entry.date < from) return
    const prev = sorted[i - 1]
    const parts = [`${fmtShortDate(entry.date)} ${fmtKg(entry.weightKg)}kg`, prev ? fmtDelta(entry.weightKg - prev.weightKg) : '–']
    if (entry.memo) parts.push(entry.memo)
    lines.unshift(parts.join('  '))
  })
  if (lines.length === 0) return undefined
  const first = sorted.find((x) => from === undefined || x.date >= from)!.date
  const last = sorted[sorted.length - 1].date
  const span = first === last ? monthDay(first) : `${monthDay(first)} ~ ${monthDay(last)}`
  return [`몸무게 기록 (${span})`, ...lines].join('\n')
}
