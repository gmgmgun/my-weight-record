import { useState, type ChangeEvent, type FormEvent } from 'react'
import { mergeBackup, parseBackup, replaceWithBackup, type BackupFile } from '../backup/backup'
import { parseWeight } from '../lib/validate'
import type { Settings } from '../types'
import type { AppState } from './useAppData'

type GoalFormProps = { settings: Settings; onSave: (patch: Partial<Settings>) => Promise<void> }

function GoalForm({ settings, onSave }: GoalFormProps) {
  const [goal, setGoal] = useState(settings.goalKg?.toFixed(1) ?? '')
  const [startDate, setStartDate] = useState(settings.startDate ?? '')
  const [startKg, setStartKg] = useState(settings.startKg?.toFixed(1) ?? '')
  const [error, setError] = useState<string>()

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    const g = goal.trim() ? parseWeight(goal) : undefined
    const k = startKg.trim() ? parseWeight(startKg) : undefined
    for (const r of [g, k]) {
      if (r && !r.ok) {
        setError(r.error)
        return
      }
    }
    setError(undefined)
    try {
      await onSave({
        goalKg: g?.ok ? g.value : undefined,
        startKg: k?.ok ? k.value : undefined,
        startDate: startDate || undefined,
      })
    } catch {
      setError('설정을 저장하지 못했습니다. 다시 시도해 주세요.')
    }
  }

  return (
    <form className="settings-form" onSubmit={submit}>
      <label>
        목표 체중(kg)
        <input inputMode="decimal" value={goal} onChange={(ev) => setGoal(ev.target.value)} />
      </label>
      <label>
        시작일 (비우면 첫 기록)
        <input type="date" value={startDate} onChange={(ev) => setStartDate(ev.target.value)} />
      </label>
      <label>
        시작 체중(kg) (비우면 첫 기록)
        <input inputMode="decimal" value={startKg} onChange={(ev) => setStartKg(ev.target.value)} />
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button type="submit" className="primary">
        설정 저장
      </button>
    </form>
  )
}

type Props = { app: AppState; onExport: () => void }

export function SettingsPanel({ app, onExport }: Props) {
  const s = app.settings
  const [message, setMessage] = useState<string>()
  const [importError, setImportError] = useState<string>()
  const [pending, setPending] = useState<BackupFile>()
  const [mode, setMode] = useState<'merge' | 'replace'>('merge')

  async function pickFile(ev: ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0]
    ev.target.value = ''
    if (!file) return
    const result = parseBackup(await file.text())
    setMessage(undefined)
    if (!result.ok) {
      setPending(undefined)
      setImportError(result.error)
      return
    }
    setImportError(undefined)
    setMode('merge')
    setPending(result.data)
  }

  async function applyImport() {
    if (!pending) return
    if (mode === 'replace' && !window.confirm('현재 기록을 모두 지우고 백업 파일 내용으로 바꿀까요?')) return
    try {
      await app.applySnapshot(mode === 'merge' ? mergeBackup(app, pending) : replaceWithBackup(pending))
    } catch {
      setImportError('가져오지 못했습니다. 다시 시도해 주세요.')
      return
    }
    setImportError(undefined)
    setPending(undefined)
    setMessage(`기록 ${pending.entries.length}개를 가져왔습니다.`)
  }

  // 가져오기 등으로 설정이 바뀌면 폼을 새 값으로 다시 만든다.
  const goalFormKey = `${s.goalKg}|${s.startDate}|${s.startKg}`

  return (
    <section className="card settings" aria-label="설정">
      <h2>목표</h2>
      <GoalForm
        key={goalFormKey}
        settings={s}
        onSave={async (patch) => {
          await app.updateSettings(patch)
          setMessage('설정을 저장했습니다.')
        }}
      />

      <h2>백업</h2>
      <p className="muted">
        마지막 백업: {s.lastBackupAt ? new Date(s.lastBackupAt).toLocaleDateString('ko-KR') : '없음'}
      </p>
      <button type="button" onClick={onExport}>
        백업 내보내기
      </button>
      <label>
        백업 가져오기
        <input type="file" accept="application/json,.json" onChange={pickFile} />
      </label>
      {importError && (
        <p role="alert" className="error">
          {importError}
        </p>
      )}
      {pending && (
        <div className="import-confirm">
          <p>가져올 기록 {pending.entries.length}개</p>
          <label className="radio">
            <input type="radio" name="import-mode" checked={mode === 'merge'} onChange={() => setMode('merge')} />
            병합 (같은 날짜는 파일 값 우선)
          </label>
          <label className="radio">
            <input type="radio" name="import-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} />
            전체 교체
          </label>
          <div className="actions">
            <button type="button" className="primary" onClick={applyImport}>
              가져오기 실행
            </button>
            <button type="button" onClick={() => setPending(undefined)}>
              취소
            </button>
          </div>
        </div>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  )
}
