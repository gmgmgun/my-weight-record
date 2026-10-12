import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { DAY_MS } from '../lib/date'
import { NOW, renderApp } from '../test/renderApp'
import type { Entry } from '../types'
import { downloadBackup } from './download'

vi.mock('./download', () => ({ downloadBackup: vi.fn() }))

const e = (date: string, weightKg: number, memo?: string): Entry =>
  memo === undefined ? { date, weightKg, updatedAt: 1 } : { date, weightKg, memo, updatedAt: 1 }

const backupJson = (entries: Entry[], settings: object = {}) =>
  new File([JSON.stringify({ version: 1, exportedAt: '2026-10-01T00:00:00.000Z', entries, settings })], 'b.json', {
    type: 'application/json',
  })

beforeEach(() => {
  vi.mocked(downloadBackup).mockClear()
  vi.restoreAllMocks()
})

async function openHistory(seed?: Parameters<typeof renderApp>[0]) {
  const ctx = await renderApp(seed)
  await ctx.user.click(screen.getByRole('button', { name: '기록·설정' }))
  return ctx
}

describe('history list', () => {
  it('lists entries newest first with deltas and memos', async () => {
    await openHistory({
      seed: async (s) => {
        await s.putEntry(e('2026-10-10', 73.0))
        await s.putEntry(e('2026-10-12', 72.4, '운동함'))
      },
    })
    const rows = within(screen.getByRole('region', { name: '기록 목록' })).getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('10월 12일 (월)')
    expect(rows[0]).toHaveTextContent('72.4')
    expect(rows[0]).toHaveTextContent('-0.6')
    expect(rows[0]).toHaveTextContent('운동함')
    expect(rows[1]).toHaveTextContent('10월 10일 (토)')
  })

  it('edits an entry', async () => {
    const { store, user } = await openHistory({ seed: (s) => s.putEntry(e('2026-10-10', 73.0)) })
    await user.click(screen.getByRole('button', { name: /10월 10일/ }))
    const input = screen.getByLabelText('체중(kg)')
    expect(input).toHaveValue('73.0')
    await user.clear(input)
    await user.type(input, '72.8')
    await user.click(screen.getByRole('button', { name: '저장' }))
    await screen.findByRole('status')
    expect((await store.getEntries())[0].weightKg).toBe(72.8)
  })

  it('edit form has no date input', async () => {
    const { user } = await openHistory({ seed: (s) => s.putEntry(e('2026-10-10', 73.0)) })
    await user.click(screen.getByRole('button', { name: /10월 10일/ }))
    expect(screen.queryByLabelText('날짜')).toBeNull()
  })

  it('deletes only after confirmation', async () => {
    const { store, user } = await openHistory({ seed: (s) => s.putEntry(e('2026-10-10', 73.0)) })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    await user.click(screen.getByRole('button', { name: /10월 10일/ }))

    await user.click(screen.getByRole('button', { name: '삭제' }))
    expect(await store.getEntries()).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: '삭제' }))
    expect(confirm).toHaveBeenCalledTimes(2)
    expect(await screen.findByText('아직 기록이 없습니다.')).toBeInTheDocument()
    expect(await store.getEntries()).toEqual([])
  })
})

describe('settings', () => {
  it('saves a goal that shows on the home screen', async () => {
    const { store, user } = await openHistory({ seed: (s) => s.putEntry(e('2026-10-12', 72.4)) })
    await user.type(screen.getByLabelText('목표 체중(kg)'), '68')
    await user.click(screen.getByRole('button', { name: '설정 저장' }))
    expect(await screen.findByText('설정을 저장했습니다.')).toBeInTheDocument()
    expect((await store.getSettings()).goalKg).toBe(68)

    await user.click(screen.getByRole('button', { name: '홈' }))
    expect(within(screen.getByRole('region', { name: '목표 진행' })).getByText('68.0')).toBeInTheDocument()
  })

  it('rejects an invalid goal', async () => {
    const { store, user } = await openHistory()
    await user.type(screen.getByLabelText('목표 체중(kg)'), '10')
    await user.click(screen.getByRole('button', { name: '설정 저장' }))
    expect(screen.getByRole('alert')).toHaveTextContent('체중은 20~300kg 사이로 입력해 주세요.')
    expect((await store.getSettings()).goalKg).toBeUndefined()
  })

  it('clears the goal when the field is emptied', async () => {
    const { store, user } = await openHistory({
      seed: async (s) => {
        await s.putEntry(e('2026-10-12', 72.4))
        await s.saveSettings({ goalKg: 68 })
      },
    })
    const goal = screen.getByLabelText('목표 체중(kg)')
    expect(goal).toHaveValue('68.0')
    await user.clear(goal)
    await user.click(screen.getByRole('button', { name: '설정 저장' }))
    await screen.findByText('설정을 저장했습니다.')
    expect((await store.getSettings()).goalKg).toBeUndefined()

    await user.click(screen.getByRole('button', { name: '홈' }))
    expect(screen.getByRole('button', { name: '목표를 설정해 보세요' })).toBeInTheDocument()
  })

  it('opens settings from the home goal link', async () => {
    const { user } = await renderApp({ seed: (s) => s.putEntry(e('2026-10-12', 72.4)) })
    await user.click(screen.getByRole('button', { name: '목표를 설정해 보세요' }))
    expect(screen.getByLabelText('목표 체중(kg)')).toBeInTheDocument()
  })
})

describe('backup', () => {
  it('exports and records the backup time', async () => {
    const { store, user } = await openHistory({ seed: (s) => s.putEntry(e('2026-10-12', 72.4)) })
    await user.click(screen.getByRole('button', { name: '백업 내보내기' }))
    expect(downloadBackup).toHaveBeenCalledWith(
      expect.objectContaining({ version: 1, entries: [e('2026-10-12', 72.4)] }),
      'weight-backup-2026-10-12.json',
    )
    await vi.waitFor(async () => expect((await store.getSettings()).lastBackupAt).toEqual(expect.any(Number)))
  })

  it('merges an imported file', async () => {
    const { store, user } = await openHistory({ seed: (s) => s.putEntry(e('2026-10-01', 70)) })
    await user.upload(screen.getByLabelText('백업 가져오기'), backupJson([e('2026-10-01', 71), e('2026-10-02', 72)]))
    expect(await screen.findByText('가져올 기록 2개')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '가져오기 실행' }))
    expect(await screen.findByText('기록 2개를 가져왔습니다.')).toBeInTheDocument()
    expect(await store.getEntries()).toEqual([e('2026-10-01', 71), e('2026-10-02', 72)])
  })

  it('replaces after confirmation', async () => {
    const { store, user } = await openHistory({ seed: (s) => s.putEntry(e('2026-09-01', 75)) })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await user.upload(screen.getByLabelText('백업 가져오기'), backupJson([e('2026-10-02', 72)]))
    await user.click(await screen.findByLabelText('전체 교체'))
    await user.click(screen.getByRole('button', { name: '가져오기 실행' }))
    await screen.findByText('기록 1개를 가져왔습니다.')
    expect(await store.getEntries()).toEqual([e('2026-10-02', 72)])
  })

  it('shows an error for a broken file and changes nothing', async () => {
    const { store, user } = await openHistory({ seed: (s) => s.putEntry(e('2026-10-01', 70)) })
    await user.upload(screen.getByLabelText('백업 가져오기'), new File(['{oops'], 'b.json', { type: 'application/json' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('JSON 형식이 아닙니다')
    expect(screen.queryByRole('button', { name: '가져오기 실행' })).not.toBeInTheDocument()
    expect(await store.getEntries()).toEqual([e('2026-10-01', 70)])
  })

  it('shows an error when importing fails', async () => {
    const { store, user } = await openHistory({ seed: (s) => s.putEntry(e('2026-10-01', 70)) })
    vi.spyOn(store, 'replaceAll').mockRejectedValueOnce(new Error('x'))
    await user.upload(screen.getByLabelText('백업 가져오기'), backupJson([e('2026-10-02', 72)]))
    await user.click(await screen.findByRole('button', { name: '가져오기 실행' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('가져오지 못했습니다')
    expect(screen.getByRole('button', { name: '가져오기 실행' })).toBeInTheDocument()
  })

  it('settings form shows imported goal', async () => {
    const { user } = await openHistory({ seed: (s) => s.saveSettings({ goalKg: 65 }) })
    await user.upload(screen.getByLabelText('백업 가져오기'), backupJson([e('2026-10-02', 72)], { goalKg: 68 }))
    await user.click(await screen.findByRole('button', { name: '가져오기 실행' }))
    await screen.findByText('기록 1개를 가져왔습니다.')
    expect(screen.getByLabelText('목표 체중(kg)')).toHaveValue('68.0')
  })

  it('shows the 30-day backup banner on home and exports from it', async () => {
    const { user } = await renderApp({
      seed: async (s) => {
        await s.putEntry(e('2026-10-12', 72.4))
        await s.saveSettings({ firstUseAt: NOW - 31 * DAY_MS })
      },
    })
    const banner = screen.getByRole('note')
    expect(banner).toHaveTextContent('백업한 지 30일이 지났어요.')
    await user.click(within(banner).getByRole('button', { name: '지금 백업' }))
    expect(downloadBackup).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => expect(screen.queryByRole('note')).not.toBeInTheDocument())
  })
})
