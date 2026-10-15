import { beforeAll, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { renderApp } from '../test/renderApp'
import type { Entry, Settings } from '../types'

const e = (date: string, weightKg: number): Entry => ({ date, weightKg, updatedAt: 1 })

async function openChart(entries: Entry[], settings?: Settings) {
  const ctx = await renderApp({
    seed: async (s) => {
      for (const entry of entries) await s.putEntry(entry)
      if (settings) await s.saveSettings(settings)
    },
  })
  await ctx.user.click(screen.getByRole('button', { name: '그래프' }))
  // 그래프 화면은 처음 열 때 불러온다
  await waitFor(() => expect(screen.queryByText('그래프를 불러오는 중…')).not.toBeInTheDocument())
  return ctx
}

const valueOf = (region: HTMLElement, label: string) => within(region).getByText(label).nextElementSibling

// 그래프 화면은 지연 로딩된다. 처음 불러올 때 그래프 라이브러리 변환이 오래 걸려
// 첫 테스트가 시간 초과되지 않도록 미리 불러 둔다.
beforeAll(async () => {
  await import('./ChartScreen')
}, 30_000)

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

    // 열: 구간 | 평균 | 최저 | 최고 | 직전 대비 | 누적(시작 체중 대비, 여기서는 첫 기록 77.0)
    expect(headers()).toEqual(['주', '평균', '최저', '최고', '직전 대비', '누적'])
    expect(table().getByText('누적: 시작 체중 77.0kg 대비')).toBeInTheDocument()
    const weekRows = table().getAllByRole('row')
    expect(weekRows).toHaveLength(1 + 8)
    // 주는 일요일 시작: 10/12·10/13은 10/11 주, 10/5는 10/4 주
    expect(weekRows[1]).toHaveTextContent('10/11 주73.071.574.50.0-4.0')
    expect(weekRows[2]).toHaveTextContent('10/4 주73.073.073.0–-4.0')
    expect(weekRows[3]).toHaveTextContent('9/27 주–––––')

    await user.click(screen.getByRole('button', { name: '월간' }))
    expect(headers()).toEqual(['월', '평균', '최저', '최고', '직전 대비', '누적'])
    const monthRows = table().getAllByRole('row')
    expect(monthRows).toHaveLength(1 + 6)
    expect(monthRows[1]).toHaveTextContent('2026년 10월73.071.574.5-4.0-4.0')
    expect(monthRows[2]).toHaveTextContent('2026년 9월77.077.077.0–0.0')
  })

  it('shows the weight recorded on each recent Sunday', async () => {
    const { user } = await openChart([e('2026-09-27', 74.0), e('2026-10-04', 73.0), e('2026-10-07', 70), e('2026-10-11', 72.4)])
    expect(screen.queryByRole('button', { name: '월요일' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '일요일' }))
    const region = within(screen.getByRole('region', { name: '평균 비교' }))
    expect(region.getByRole('columnheader', { name: '체중' })).toBeInTheDocument()
    // 하루 값이라 최저·최고 열은 없다
    expect(region.queryByRole('columnheader', { name: '최저' })).not.toBeInTheDocument()

    const rows = region.getAllByRole('row')
    expect(rows).toHaveLength(1 + 8)
    expect(rows[1]).toHaveTextContent('10/11 (일)72.4-0.6-1.6')
    expect(rows[2]).toHaveTextContent('10/4 (일)73.0-1.0-1.0')
    expect(rows[3]).toHaveTextContent('9/27 (일)74.0–0.0')
    expect(rows[4]).toHaveTextContent('9/20 (일)–––')
  })

  it('measures the running total from the start weight set in settings', async () => {
    await openChart([e('2026-10-05', 73), e('2026-10-12', 72.4)], { startKg: 78.3 })
    const region = within(screen.getByRole('region', { name: '평균 비교' }))
    expect(region.getByText('누적: 시작 체중 78.3kg 대비')).toBeInTheDocument()
    expect(region.getAllByRole('row')[1]).toHaveTextContent('10/11 주72.472.472.4-0.6-5.9')
  })
})
