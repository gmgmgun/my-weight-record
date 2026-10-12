import { describe, expect, it } from 'vitest'
import { DAY_MS } from '../lib/date'
import type { Entry } from '../types'
import {
  backupFileName,
  buildBackup,
  mergeBackup,
  parseBackup,
  replaceWithBackup,
  shouldShowBackupReminder,
} from './backup'

const e = (date: string, weightKg: number, memo?: string): Entry =>
  memo === undefined ? { date, weightKg, updatedAt: 1 } : { date, weightKg, memo, updatedAt: 1 }

const fileWith = (overrides: Record<string, unknown>) =>
  JSON.stringify({ version: 1, exportedAt: '2026-10-12T00:00:00.000Z', entries: [], settings: {}, ...overrides })

describe('buildBackup / parseBackup', () => {
  it('round-trips a snapshot', () => {
    const snapshot = { entries: [e('2026-10-02', 71, '야식'), e('2026-10-01', 70)], settings: { goalKg: 68 } }
    const file = buildBackup(snapshot, new Date('2026-10-12T09:00:00Z'))
    expect(file.exportedAt).toBe('2026-10-12T09:00:00.000Z')
    expect(file.settings).toEqual({ goalKg: 68, lastBackupAt: new Date('2026-10-12T09:00:00Z').getTime() })
    expect(file.entries.map((x) => x.date)).toEqual(['2026-10-01', '2026-10-02'])
    expect(parseBackup(JSON.stringify(file))).toEqual({ ok: true, data: file })
  })

  it('names the file by date', () => {
    expect(backupFileName('2026-10-12')).toBe('weight-backup-2026-10-12.json')
  })

  it('rejects broken JSON', () => {
    expect(parseBackup('{oops')).toEqual({ ok: false, error: '백업 파일을 읽을 수 없습니다. JSON 형식이 아닙니다.' })
  })

  it('rejects unknown versions and shapes', () => {
    expect(parseBackup(fileWith({ version: 2 }))).toEqual({ ok: false, error: '지원하지 않는 백업 버전입니다: 2' })
    expect(parseBackup('[]')).toEqual({ ok: false, error: '백업 파일 형식이 올바르지 않습니다.' })
    expect(parseBackup(fileWith({ entries: 'x' }))).toEqual({ ok: false, error: '백업 파일 형식이 올바르지 않습니다.' })
  })

  it('rejects invalid entries with their position', () => {
    const bad = [e('2026-10-01', 70), { date: '2026-10-02', weightKg: 500, updatedAt: 1 }]
    expect(parseBackup(fileWith({ entries: bad }))).toEqual({ ok: false, error: '2번째 기록이 올바르지 않습니다.' })
    const longMemo = [e('2026-10-01', 70, 'a'.repeat(201))]
    expect(parseBackup(fileWith({ entries: longMemo }))).toEqual({ ok: false, error: '1번째 기록이 올바르지 않습니다.' })
  })

  it('rejects duplicate dates', () => {
    const dup = [e('2026-10-01', 70), e('2026-10-01', 71)]
    expect(parseBackup(fileWith({ entries: dup }))).toEqual({
      ok: false,
      error: '같은 날짜의 기록이 두 번 있습니다: 2026-10-01',
    })
  })

  it('rejects invalid settings', () => {
    expect(parseBackup(fileWith({ settings: { goalKg: '68' } }))).toEqual({
      ok: false,
      error: '설정 값이 올바르지 않습니다.',
    })
  })

  it('strips unknown fields', () => {
    const r = parseBackup(
      fileWith({ entries: [{ ...e('2026-10-01', 70), extra: 1 }], settings: { goalKg: 68, theme: 'x' } }),
    )
    expect(r).toEqual({
      ok: true,
      data: {
        version: 1,
        exportedAt: '2026-10-12T00:00:00.000Z',
        entries: [e('2026-10-01', 70)],
        settings: { goalKg: 68 },
      },
    })
  })
})

describe('merge / replace', () => {
  const current = {
    entries: [e('2026-10-01', 70), e('2026-10-02', 71)],
    settings: { goalKg: 65, firstUseAt: 100 },
  }
  const incoming = {
    version: 1 as const,
    exportedAt: '',
    entries: [e('2026-10-03', 73), e('2026-10-02', 72)],
    settings: { goalKg: 68 },
  }

  it('merges with file values winning on conflicts', () => {
    expect(mergeBackup(current, incoming)).toEqual({
      entries: [e('2026-10-01', 70), e('2026-10-02', 72), e('2026-10-03', 73)],
      settings: { goalKg: 68, firstUseAt: 100 },
    })
  })

  it('keeps the latest backup time and earliest first use', () => {
    const cur = { entries: [], settings: { goalKg: 65, firstUseAt: 100, lastBackupAt: 500 } }
    const inc = { ...incoming, entries: [], settings: { goalKg: 68, firstUseAt: 50, lastBackupAt: 300 } }
    expect(mergeBackup(cur, inc).settings).toEqual({ goalKg: 68, firstUseAt: 50, lastBackupAt: 500 })
  })

  it('replaces everything', () => {
    expect(replaceWithBackup(incoming)).toEqual({
      entries: [e('2026-10-02', 72), e('2026-10-03', 73)],
      settings: { goalKg: 68 },
    })
  })
})

describe('shouldShowBackupReminder', () => {
  const now = 1_000 * DAY_MS

  it('shows after 30 days since last backup or first use', () => {
    expect(shouldShowBackupReminder(1, { firstUseAt: now - 31 * DAY_MS }, now)).toBe(true)
    expect(shouldShowBackupReminder(1, { firstUseAt: now - 29 * DAY_MS }, now)).toBe(false)
    expect(
      shouldShowBackupReminder(1, { firstUseAt: now - 90 * DAY_MS, lastBackupAt: now - 2 * DAY_MS }, now),
    ).toBe(false)
  })

  it('stays hidden without entries or timestamps', () => {
    expect(shouldShowBackupReminder(0, { firstUseAt: now - 90 * DAY_MS }, now)).toBe(false)
    expect(shouldShowBackupReminder(3, {}, now)).toBe(false)
  })
})
