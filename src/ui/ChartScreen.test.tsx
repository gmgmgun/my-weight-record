import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { renderApp } from '../test/renderApp'
import type { Entry } from '../types'

const e = (date: string, weightKg: number): Entry => ({ date, weightKg, updatedAt: 1 })

async function openChart(entries: Entry[]) {
  const ctx = await renderApp({
    seed: async (s) => {
      for (const entry of entries) await s.putEntry(entry)
    },
  })
  await ctx.user.click(screen.getByRole('button', { name: '그래프' }))
  // 그래프 화면은 처음 열 때 불러온다
  await waitFor(() => expect(screen.queryByText('그래프를 불러오는 중…')).not.toBeInTheDocument())
  return ctx
}

const valueOf = (region: HTMLElement, label: string) => within(region).getByText(label).nextElementSibling

describe('chart screen', () => {
  it('shows a hint without entries', async () => {
    await openChart([])
    expect(screen.getByText('기록이 쌓이면 그래프가 표시됩니다.')).toBeInTheDocument()
  })

  it('summarizes the default 3-month range and switches to all', async () => {
    const { user } = await openChart([e('2026-06-01', 80), e('2026-08-01', 78), e('2026-10-12', 76)])
    expect(screen.getByRole('button', { name: '3개월' })).toHaveAttribute('aria-pressed', 'true')

    const summary = screen.getByRole('region', { name: '기간 요약' })
    expect(valueOf(summary, '변화')).toHaveTextContent('-2.0')
    expect(valueOf(summary, '최저')).toHaveTextContent('76.0')
    expect(valueOf(summary, '최고')).toHaveTextContent('78.0')
    expect(valueOf(summary, '평균')).toHaveTextContent('77.0')

    await user.click(screen.getByRole('button', { name: '전체' }))
    expect(valueOf(screen.getByRole('region', { name: '기간 요약' }), '변화')).toHaveTextContent('-4.0')
  })

  it('shows an empty-range hint', async () => {
    const { user } = await openChart([e('2026-06-01', 80)])
    await user.click(screen.getByRole('button', { name: '1개월' }))
    expect(screen.getByText('이 기간에는 기록이 없습니다.')).toBeInTheDocument()
  })

  it('shows weekly and monthly average tables', async () => {
    const { user } = await openChart([
      e('2026-09-20', 77),
      e('2026-10-05', 73),
      e('2026-10-12', 71.5),
      e('2026-10-13', 74.5),
    ])
    const table = () => within(screen.getByRole('region', { name: '평균 비교' }))
    const headers = () => table().getAllByRole('columnheader').map((h) => h.textContent)

    // 열: 구간 | 평균 | 최저 | 최고 | 직전 대비
    expect(headers()).toEqual(['주', '평균', '최저', '최고', '직전 대비'])
    const weekRows = table().getAllByRole('row')
    expect(weekRows).toHaveLength(1 + 8)
    expect(weekRows[1]).toHaveTextContent('10/12 주73.071.574.50.0')
    expect(weekRows[2]).toHaveTextContent('10/5 주73.073.073.0–')
    expect(weekRows[3]).toHaveTextContent('9/28 주––––')

    await user.click(screen.getByRole('button', { name: '월간' }))
    expect(headers()).toEqual(['월', '평균', '최저', '최고', '직전 대비'])
    const monthRows = table().getAllByRole('row')
    expect(monthRows).toHaveLength(1 + 6)
    expect(monthRows[1]).toHaveTextContent('2026년 10월73.071.574.5-4.0')
    expect(monthRows[2]).toHaveTextContent('2026년 9월77.077.077.0–')
  })

  it('shows the weight recorded on each recent Monday', async () => {
    const { user } = await openChart([e('2026-09-28', 74.0), e('2026-10-05', 73.0), e('2026-10-07', 70), e('2026-10-12', 72.4)])
    await user.click(screen.getByRole('button', { name: '월요일' }))
    const region = within(screen.getByRole('region', { name: '평균 비교' }))
    expect(region.getByRole('columnheader', { name: '체중' })).toBeInTheDocument()
    // 하루 값이라 최저·최고 열은 없다
    expect(region.queryByRole('columnheader', { name: '최저' })).not.toBeInTheDocument()

    const rows = region.getAllByRole('row')
    expect(rows).toHaveLength(1 + 8)
    expect(rows[1]).toHaveTextContent('10/12 (월)72.4-0.6')
    expect(rows[2]).toHaveTextContent('10/5 (월)73.0-1.0')
    expect(rows[3]).toHaveTextContent('9/28 (월)74.0–')
    expect(rows[4]).toHaveTextContent('9/21 (월)––')
  })
})
