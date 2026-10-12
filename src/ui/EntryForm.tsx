import { useId, useState, type FormEvent } from 'react'
import { isLargeJump, JUMP_WARN_KG, MEMO_MAX, parseWeight } from '../lib/validate'
import { previousEntry } from '../stats/stats'
import type { Entry, ISODate } from '../types'
import { fmtDate, fmtKg } from './format'

type Props = {
  entries: Entry[]
  today: ISODate
  initialDate?: ISODate
  lockDate?: boolean
  onSave: (date: ISODate, weightKg: number, memo: string) => Promise<void>
}

export function EntryForm({ entries, today, initialDate = today, lockDate, onSave }: Props) {
  // 선택한 날짜에 기록이 있을 때만 값을 채운다. 다른 날짜의 값을 채우면 그날 기록된 것처럼 보인다.
  const defaultsFor = (d: ISODate) => {
    const own = entries.find((x) => x.date === d)
    return { weight: own ? own.weightKg.toFixed(1) : '', memo: own?.memo ?? '' }
  }

  const weightId = useId()
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
    setStatus(undefined)
    if (date > today) {
      setError('미래 날짜에는 기록할 수 없습니다.')
      return
    }
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    setError(undefined)
    try {
      await onSave(date, parsed.value, memo)
    } catch {
      setError('저장하지 못했습니다. 다시 시도해 주세요.')
      return
    }
    setStatus('저장했습니다.')
  }

  return (
    // noValidate: 브라우저 기본 검증(max 날짜 등) 대신 아래 오류 문구로 안내한다.
    <form className="card entry-form" noValidate onSubmit={submit}>
      <div className="entry-head">
        <strong className="entry-date">{fmtDate(date)}</strong>
        {!lockDate && (
          <label className="date-pick">
            <span className="sr-only">날짜</span>
            <input type="date" value={date} max={today} onChange={(ev) => ev.target.value && changeDate(ev.target.value)} />
          </label>
        )}
      </div>
      <div className="weight-field">
        <label htmlFor={weightId}>
          체중<span className="sr-only">(kg)</span>
        </label>
        <div className="weight-box">
          <input
            id={weightId}
            inputMode="decimal"
            autoComplete="off"
            value={weight}
            onChange={(ev) => {
              setWeight(ev.target.value)
              setStatus(undefined)
            }}
          />
          <span className="unit" aria-hidden="true">
            kg
          </span>
        </div>
      </div>
      <label>
        메모
        <input
          value={memo}
          maxLength={MEMO_MAX}
          placeholder="컨디션, 식단 등 (선택)"
          onChange={(ev) => setMemo(ev.target.value)}
        />
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
