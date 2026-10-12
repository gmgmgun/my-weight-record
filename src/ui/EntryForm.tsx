import { useState, type FormEvent } from 'react'
import { isLargeJump, JUMP_WARN_KG, MEMO_MAX, parseWeight } from '../lib/validate'
import { latestEntry, previousEntry } from '../stats/stats'
import type { Entry, ISODate } from '../types'
import { fmtDate, fmtKg } from './format'

type Props = {
  entries: Entry[]
  today: ISODate
  initialDate?: ISODate
  onSave: (date: ISODate, weightKg: number, memo: string) => Promise<void>
}

export function EntryForm({ entries, today, initialDate = today, onSave }: Props) {
  const defaultsFor = (d: ISODate) => {
    const own = entries.find((x) => x.date === d)
    const base = own ?? latestEntry(entries)
    return { weight: base ? base.weightKg.toFixed(1) : '', memo: own?.memo ?? '' }
  }

  const [date, setDate] = useState(initialDate)
  const [weight, setWeight] = useState(() => defaultsFor(initialDate).weight)
  const [memo, setMemo] = useState(() => defaultsFor(initialDate).memo)
  const [error, setError] = useState<string>()
  const [status, setStatus] = useState<string>()

  const parsed = parseWeight(weight)
  const prev = previousEntry(entries, date)
  const warn = parsed.ok && isLargeJump(prev?.weightKg, parsed.value)

  function changeDate(d: ISODate) {
    const defaults = defaultsFor(d)
    setDate(d)
    setWeight(defaults.weight)
    setMemo(defaults.memo)
    setError(undefined)
    setStatus(undefined)
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    if (date > today) {
      setError('미래 날짜에는 기록할 수 없습니다.')
      return
    }
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    setError(undefined)
    await onSave(date, parsed.value, memo)
    setStatus('저장했습니다.')
  }

  return (
    // noValidate: 브라우저 기본 검증(max 날짜 등) 대신 아래 오류 문구로 안내한다.
    <form className="card entry-form" noValidate onSubmit={submit}>
      <div className="date-row">
        <strong>{fmtDate(date)}</strong>
        <label>
          날짜
          <input type="date" value={date} max={today} onChange={(ev) => ev.target.value && changeDate(ev.target.value)} />
        </label>
      </div>
      <label className="weight-field">
        체중(kg)
        <input
          inputMode="decimal"
          autoComplete="off"
          value={weight}
          onChange={(ev) => {
            setWeight(ev.target.value)
            setStatus(undefined)
          }}
        />
      </label>
      <label>
        메모
        <input value={memo} maxLength={MEMO_MAX} onChange={(ev) => setMemo(ev.target.value)} />
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!error && warn && (
        <p className="warning">
          직전 기록({fmtKg(prev?.weightKg)}kg)과 {JUMP_WARN_KG}kg 넘게 차이 나요. 입력값을 확인해 주세요.
        </p>
      )}
      {status && <p role="status">{status}</p>}
      <button type="submit" className="primary">
        저장
      </button>
    </form>
  )
}
