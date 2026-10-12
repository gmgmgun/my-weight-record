import { DAY_MS, isValidISODate } from '../lib/date'
import { isValidWeight, MEMO_MAX } from '../lib/validate'
import { sortByDate } from '../stats/stats'
import type { Entry, ISODate, Settings } from '../types'

export const BACKUP_VERSION = 1
export const BACKUP_REMINDER_DAYS = 30

export type AppSnapshot = { entries: Entry[]; settings: Settings }
export type BackupFile = { version: 1; exportedAt: string; entries: Entry[]; settings: Settings }
export type ParseBackupResult = { ok: true; data: BackupFile } | { ok: false; error: string }

const INVALID_SHAPE = '백업 파일 형식이 올바르지 않습니다.'

export function buildBackup(snapshot: AppSnapshot, now: Date = new Date()): BackupFile {
  return {
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    entries: sortByDate(snapshot.entries),
    settings: snapshot.settings,
  }
}

export function backupFileName(today: ISODate): string {
  return `weight-backup-${today}.json`
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function parseEntry(v: unknown): Entry | undefined {
  if (!isObject(v)) return undefined
  const { date, weightKg, memo, updatedAt } = v
  if (!isValidISODate(date) || !isValidWeight(weightKg) || !isFiniteNumber(updatedAt)) return undefined
  if (memo === undefined) return { date, weightKg, updatedAt }
  if (typeof memo !== 'string' || memo.length > MEMO_MAX) return undefined
  return { date, weightKg, memo, updatedAt }
}

function parseSettings(v: unknown): Settings | undefined {
  if (!isObject(v)) return undefined
  const s: Settings = {}
  if (v.goalKg !== undefined) {
    if (!isValidWeight(v.goalKg)) return undefined
    s.goalKg = v.goalKg
  }
  if (v.startKg !== undefined) {
    if (!isValidWeight(v.startKg)) return undefined
    s.startKg = v.startKg
  }
  if (v.startDate !== undefined) {
    if (!isValidISODate(v.startDate)) return undefined
    s.startDate = v.startDate
  }
  if (v.lastBackupAt !== undefined) {
    if (!isFiniteNumber(v.lastBackupAt)) return undefined
    s.lastBackupAt = v.lastBackupAt
  }
  if (v.firstUseAt !== undefined) {
    if (!isFiniteNumber(v.firstUseAt)) return undefined
    s.firstUseAt = v.firstUseAt
  }
  return s
}

export function parseBackup(text: string): ParseBackupResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: '백업 파일을 읽을 수 없습니다. JSON 형식이 아닙니다.' }
  }
  if (!isObject(raw)) return { ok: false, error: INVALID_SHAPE }
  if (raw.version !== BACKUP_VERSION) {
    return { ok: false, error: `지원하지 않는 백업 버전입니다: ${String(raw.version)}` }
  }
  if (!Array.isArray(raw.entries)) return { ok: false, error: INVALID_SHAPE }

  const entries: Entry[] = []
  const seen = new Set<string>()
  for (const [i, item] of raw.entries.entries()) {
    const entry = parseEntry(item)
    if (!entry) return { ok: false, error: `${i + 1}번째 기록이 올바르지 않습니다.` }
    if (seen.has(entry.date)) return { ok: false, error: `같은 날짜의 기록이 두 번 있습니다: ${entry.date}` }
    seen.add(entry.date)
    entries.push(entry)
  }

  const settings = parseSettings(raw.settings)
  if (!settings) return { ok: false, error: '설정 값이 올바르지 않습니다.' }

  const exportedAt = typeof raw.exportedAt === 'string' ? raw.exportedAt : ''
  return { ok: true, data: { version: BACKUP_VERSION, exportedAt, entries, settings } }
}

export function mergeBackup(current: AppSnapshot, incoming: BackupFile): AppSnapshot {
  const byDate = new Map(current.entries.map((e) => [e.date, e]))
  for (const e of incoming.entries) byDate.set(e.date, e)
  return {
    entries: sortByDate([...byDate.values()]),
    settings: { ...current.settings, ...incoming.settings },
  }
}

export function replaceWithBackup(incoming: BackupFile): AppSnapshot {
  return { entries: sortByDate(incoming.entries), settings: incoming.settings }
}

export function shouldShowBackupReminder(entryCount: number, settings: Settings, now: number): boolean {
  const since = settings.lastBackupAt ?? settings.firstUseAt
  return entryCount > 0 && since !== undefined && now - since > BACKUP_REMINDER_DAYS * DAY_MS
}
