import { describe, expect, it, vi } from 'vitest'
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

  it('offers 수정 for a day that already has a record and updates it in place', async () => {
    const { store, user } = await renderApp({ seed: (s) => s.putEntry(e('2026-10-12', 72.0, '아침')) })
    expect(screen.queryByRole('button', { name: '저장' })).not.toBeInTheDocument()

    const input = screen.getByLabelText('체중(kg)')
    await user.clear(input)
    await user.type(input, '71.5')
    await user.click(screen.getByRole('button', { name: '수정' }))

    expect(await screen.findByRole('status')).toHaveTextContent('수정했습니다.')
    // 하루 1기록: 같은 날 기록이 하나뿐이고 값만 바뀐다
    expect(await store.getEntries()).toEqual([
      { date: '2026-10-12', weightKg: 71.5, memo: '아침', updatedAt: expect.any(Number) },
    ])
  })

  it('switches the button from 저장 to 수정 once the day is recorded', async () => {
    const { user } = await renderApp({ seed: (s) => s.putEntry(e('2026-10-11', 73.5)) })
    await user.type(screen.getByLabelText('체중(kg)'), '72.4')
    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(await screen.findByRole('status')).toHaveTextContent('저장했습니다.')
    expect(await screen.findByRole('button', { name: '수정' })).toBeInTheDocument()

    // 기록 없는 날로 넘기면 다시 저장
    await user.click(screen.getByRole('button', { name: '이전 날' }))
    expect(screen.getByRole('button', { name: '수정' })).toBeInTheDocument() // 10/11은 기록 있음
    await user.click(screen.getByRole('button', { name: '이전 날' }))
    expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument() // 10/10은 기록 없음
  })

  it('reads digits as kg with the third digit after the decimal point', async () => {
    const { store, user } = await renderApp()
    const input = screen.getByLabelText('체중(kg)')
    expect(input).toHaveAttribute('inputmode', 'numeric')

    await user.type(input, '933')
    expect(input).toHaveValue('93.3')
    await user.click(screen.getByRole('button', { name: '저장' }))
    await screen.findByRole('status')
    expect((await store.getEntries())[0].weightKg).toBe(93.3)

    await user.clear(input)
    await user.type(input, '92')
    expect(input).toHaveValue('92')
    await user.click(screen.getByRole('button', { name: '수정' }))
    await screen.findByText('수정했습니다.')
    expect((await store.getEntries())[0].weightKg).toBe(92)
  })

  it('shows a validation error and does not save', async () => {
    const { store, user } = await renderApp()
    await user.type(screen.getByLabelText('체중(kg)'), 'abc')
    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(screen.getByRole('alert')).toHaveTextContent('체중을 숫자로 입력해 주세요. 예: 933 → 93.3kg')
    expect(await store.getEntries()).toEqual([])
  })

  it('shows an error when saving fails', async () => {
    const { store, user } = await renderApp()
    vi.spyOn(store, 'putEntry').mockRejectedValueOnce(new Error('quota'))
    await user.type(screen.getByLabelText('체중(kg)'), '72.4')
    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('저장하지 못했습니다. 다시 시도해 주세요.')
    expect(screen.queryByRole('status')).toBeNull()
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

  it('leaves a day without a record empty and warns on large jumps', async () => {
    const { store, user } = await renderApp({ seed: (s) => s.putEntry(e('2026-10-11', 72.0)) })
    const input = screen.getByLabelText('체중(kg)')
    expect(input).toHaveValue('')
    expect(input).not.toHaveAttribute('placeholder')

    await user.type(input, '76.0')
    expect(screen.getByText(/3kg 넘게 차이 나요/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '저장' }))
    await screen.findByRole('status')
    expect((await store.getEntries()).map((x) => x.weightKg)).toEqual([72, 76])
  })

  it('shows the weight recorded on the selected date', async () => {
    await renderApp({
      seed: async (s) => {
        await s.putEntry(e('2026-10-08', 75.0))
        await s.putEntry(e('2026-10-11', 73.5))
      },
    })
    const date = screen.getByLabelText('날짜')
    const input = screen.getByLabelText('체중(kg)')

    fireEvent.change(date, { target: { value: '2026-10-08' } })
    expect(input).toHaveValue('75.0')

    // 기록이 없는 날: 숫자를 전혀 보여 주지 않는다
    fireEvent.change(date, { target: { value: '2026-10-09' } })
    expect(input).toHaveValue('')
    expect(input).not.toHaveAttribute('placeholder')

    // 첫 기록보다 이전 날도 마찬가지
    fireEvent.change(date, { target: { value: '2026-10-05' } })
    expect(input).toHaveValue('')
    expect(input).not.toHaveAttribute('placeholder')

    fireEvent.change(date, { target: { value: '2026-10-11' } })
    expect(input).toHaveValue('73.5')
  })

  it('moves to the previous and next day with the arrow buttons', async () => {
    const { user } = await renderApp({ seed: (s) => s.putEntry(e('2026-10-11', 73.5)) })
    const next = screen.getByRole('button', { name: '다음 날' })
    expect(next).toBeDisabled()

    await user.click(screen.getByRole('button', { name: '이전 날' }))
    expect(screen.getByText('10월 11일 (일)')).toBeInTheDocument()
    expect(screen.getByLabelText('체중(kg)')).toHaveValue('73.5')
    expect(next).toBeEnabled()

    await user.click(next)
    expect(screen.getByText('10월 12일 (월)')).toBeInTheDocument()
    expect(screen.getByLabelText('체중(kg)')).toHaveValue('')
    expect(next).toBeDisabled()
  })

  it('swipes horizontally to change the day, ignoring vertical drags and the future', async () => {
    await renderApp({ seed: (s) => s.putEntry(e('2026-10-11', 73.5)) })
    const form = screen.getByLabelText('체중(kg)').closest('form')!
    const swipe = (dx: number, dy: number) => {
      fireEvent.touchStart(form, { touches: [{ clientX: 200, clientY: 300 }] })
      fireEvent.touchEnd(form, { changedTouches: [{ clientX: 200 + dx, clientY: 300 + dy }] })
    }

    swipe(-120, 5) // 왼쪽으로 밀기 = 다음날, 오늘이라 그대로
    expect(screen.getByText('10월 12일 (월)')).toBeInTheDocument()

    swipe(120, 5) // 오른쪽으로 밀기 = 전날
    expect(screen.getByText('10월 11일 (일)')).toBeInTheDocument()
    expect(screen.getByLabelText('체중(kg)')).toHaveValue('73.5')

    swipe(70, 120) // 세로 움직임이 더 크면 스크롤로 본다
    expect(screen.getByText('10월 11일 (일)')).toBeInTheDocument()

    swipe(30, 0) // 너무 짧으면 무시
    expect(screen.getByText('10월 11일 (일)')).toBeInTheDocument()

    swipe(-120, -5)
    expect(screen.getByText('10월 12일 (월)')).toBeInTheDocument()
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
    // 무엇과 비교했는지 날짜를 함께 보여 준다
    expect(panel.getByText('10/5 (월)')).toBeInTheDocument()
    expect(panel.getByText('9/12 (토)')).toBeInTheDocument()
  })

  it('shows – when the exact comparison day has no record', async () => {
    await renderApp({
      seed: async (s) => {
        await s.putEntry(e('2026-10-04', 73.0))
        await s.putEntry(e('2026-10-12', 72.4))
      },
    })
    const panel = within(screen.getByRole('region', { name: '비교' }))
    expect(panel.getByText(/지난주 대비/).nextElementSibling).toHaveTextContent('–')
    expect(panel.getByText('10/5 (월)')).toBeInTheDocument()
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
