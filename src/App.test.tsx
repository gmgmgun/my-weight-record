import { describe, expect, it } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { NOW, renderApp } from './test/renderApp'
import type { Entry } from './types'

const e = (date: string, weightKg: number, memo?: string): Entry =>
  memo === undefined ? { date, weightKg, updatedAt: 1 } : { date, weightKg, memo, updatedAt: 1 }

describe('home screen', () => {
  it('shows a hint when empty and saves the first entry', async () => {
    const { store, user } = await renderApp()
    expect(screen.getByText(/첫 체중을 기록해 보세요/)).toBeInTheDocument()

    await user.type(screen.getByLabelText('체중(kg)'), '72.4')
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(await screen.findByRole('status')).toHaveTextContent('저장했습니다.')
    expect(await store.getEntries()).toEqual([
      { date: '2026-10-12', weightKg: 72.4, updatedAt: expect.any(Number) },
    ])
    expect(within(screen.getByRole('region', { name: '목표 진행' })).getByText('72.4')).toBeInTheDocument()
  })

  it('shows a validation error and does not save', async () => {
    const { store, user } = await renderApp()
    await user.type(screen.getByLabelText('체중(kg)'), 'abc')
    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(screen.getByRole('alert')).toHaveTextContent('체중은 숫자로, 소수점 한 자리까지 입력해 주세요.')
    expect(await store.getEntries()).toEqual([])
  })

  it('rejects a future date', async () => {
    const { store, user } = await renderApp()
    fireEvent.change(screen.getByLabelText('날짜'), { target: { value: '2026-10-13' } })
    await user.type(screen.getByLabelText('체중(kg)'), '72.4')
    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(screen.getByRole('alert')).toHaveTextContent('미래 날짜에는 기록할 수 없습니다.')
    expect(await store.getEntries()).toEqual([])
  })

  it('stores whitespace-only memo as no memo', async () => {
    const { store, user } = await renderApp()
    await user.type(screen.getByLabelText('체중(kg)'), '72.4')
    await user.type(screen.getByLabelText('메모'), '   ')
    await user.click(screen.getByRole('button', { name: '저장' }))
    await screen.findByRole('status')
    expect((await store.getEntries())[0]).not.toHaveProperty('memo')
  })

  it('prefills with the latest weight and warns on large jumps without blocking', async () => {
    const { store, user } = await renderApp({ seed: (s) => s.putEntry(e('2026-10-11', 72.0)) })
    const input = screen.getByLabelText('체중(kg)')
    expect(input).toHaveValue('72.0')

    await user.clear(input)
    await user.type(input, '76.0')
    expect(screen.getByText(/3kg 넘게 차이 나요/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '저장' }))
    await screen.findByRole('status')
    expect((await store.getEntries()).map((x) => x.weightKg)).toEqual([72, 76])
  })

  it('loads the existing memo when a past date is selected', async () => {
    await renderApp({ seed: (s) => s.putEntry(e('2026-10-10', 73.1, '회식')) })
    fireEvent.change(screen.getByLabelText('날짜'), { target: { value: '2026-10-10' } })
    expect(screen.getByLabelText('체중(kg)')).toHaveValue('73.1')
    expect(screen.getByLabelText('메모')).toHaveValue('회식')
    expect(screen.getByText('10월 10일 (토)')).toBeInTheDocument()
  })

  it('shows week, month and weekly-average comparisons', async () => {
    await renderApp({
      seed: async (s) => {
        await s.putEntry(e('2026-09-12', 74.2))
        await s.putEntry(e('2026-10-05', 73.0))
        await s.putEntry(e('2026-10-12', 72.4))
      },
    })
    const panel = within(screen.getByRole('region', { name: '비교' }))
    expect(panel.getByText(/지난주 대비/).nextElementSibling).toHaveTextContent('-0.6 ▼')
    expect(panel.getByText(/지난달 대비/).nextElementSibling).toHaveTextContent('-1.8 ▼')
    expect(panel.getByText(/이번 주 평균/).nextElementSibling).toHaveTextContent('72.4 (지난주 73.0)')
  })

  it('shows goal progress or a link to set one', async () => {
    await renderApp({
      seed: async (s) => {
        await s.putEntry(e('2026-10-01', 76.8))
        await s.putEntry(e('2026-10-12', 72.4))
      },
    })
    expect(screen.getByRole('button', { name: '목표를 설정해 보세요' })).toBeInTheDocument()
  })

  it('computes progress toward the goal', async () => {
    await renderApp({
      seed: async (s) => {
        await s.putEntry(e('2026-10-01', 76.8))
        await s.putEntry(e('2026-10-12', 72.4))
        await s.saveSettings({ goalKg: 68 })
      },
    })
    const goal = within(screen.getByRole('region', { name: '목표 진행' }))
    expect(goal.getByText('50%')).toBeInTheDocument()
    expect(goal.getByText('목표까지 4.4kg')).toBeInTheDocument()
    expect(goal.getByText(/시작 대비/).nextElementSibling).toHaveTextContent('-4.4')
  })

  it('refreshes today when the app becomes visible again', async () => {
    const { setNow } = await renderApp()
    expect(screen.getByText('10월 12일 (월)')).toBeInTheDocument()
    setNow(NOW + 24 * 60 * 60 * 1000)
    expect(await screen.findByText('10월 13일 (화)')).toBeInTheDocument()
    expect(screen.getByLabelText('날짜')).toHaveValue('2026-10-13')
  })
})
