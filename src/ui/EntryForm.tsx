import { useId, useRef, useState, type FormEvent } from 'react'
import { addDays } from '../lib/date'
import { isLargeJump, JUMP_WARN_KG, MEMO_MAX, parseWeight } from '../lib/validate'
import { previousEntry } from '../stats/stats'
import type { Entry, ISODate } from '../types'
import { fmtDate, fmtKg } from './format'

const SWIPE_MIN_PX = 50

// 하루씩 넘길 때 내용이 들어오는 방향을 보여 준다(전날은 왼쪽에서, 다음날은 오른쪽에서).
// 입력칸을 다시 만들지 않도록 CSS 키 리마운트 대신 Web Animations API를 쓴다.
function slideIn(el: HTMLElement | null, direction: -1 | 1) {
  if (!el || typeof el.animate !== 'function') return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  el.animate(
    [
      { transform: `translateX(${direction * 28}px)`, opacity: 0 },
      { transform: 'none', opacity: 1 },
    ],
    { duration: 220, easing: 'ease-out' },
  )
}

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

  // 하루 1기록: 그날 기록이 있으면 같은 날짜 키로 덮어쓰므로 '수정'이다.
  const recorded = entries.some((x) => x.date === date)
  const action = recorded ? '수정' : '저장'
  const parsed = parseWeight(weight)
  const prev = previousEntry(entries, date)
  const warn = parsed.ok && isLargeJump(prev?.weightKg, parsed.value)

  const bodyRef = useRef<HTMLDivElement>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  function shiftDay(days: number) {
    const next = addDays(date, days)
    if (next > today) return
    changeDate(next)
    slideIn(bodyRef.current, days < 0 ? -1 : 1)
  }

  // 세로 스크롤과 구분하려고, 가로로 충분히 길고 세로보다 확실히 크게 움직였을 때만 넘긴다.
  function endSwipe(x: number, y: number) {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return
    const dx = x - start.x
    const dy = y - start.y
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return
    shiftDay(dx > 0 ? -1 : 1)
  }

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
    const done = action
    try {
      await onSave(date, parsed.value, memo)
    } catch {
      setError(`${done}하지 못했습니다. 다시 시도해 주세요.`)
      return
    }
    setStatus(`${done}했습니다.`)
  }

  return (
    // noValidate: 브라우저 기본 검증(max 날짜 등) 대신 아래 오류 문구로 안내한다.
    <form
      className="card entry-form"
      noValidate
      onSubmit={submit}
      onTouchStart={
        lockDate ? undefined : (ev) => (touchStart.current = { x: ev.touches[0].clientX, y: ev.touches[0].clientY })
      }
      onTouchEnd={
        lockDate ? undefined : (ev) => endSwipe(ev.changedTouches[0].clientX, ev.changedTouches[0].clientY)
      }
    >
      <div className="entry-head">
        <div className="day-nav">
          {!lockDate && (
            <button type="button" className="day-step" aria-label="이전 날" onClick={() => shiftDay(-1)}>
              ‹
            </button>
          )}
          <strong className="entry-date">{fmtDate(date)}</strong>
          {!lockDate && (
            <button
              type="button"
              className="day-step"
              aria-label="다음 날"
              disabled={date >= today}
              onClick={() => shiftDay(1)}
            >
              ›
            </button>
          )}
        </div>
        {!lockDate && (
          <label className="date-pick">
            <span className="sr-only">날짜</span>
            <input
              type="date"
              value={date}
              max={today}
              onChange={(ev) => ev.target.value && changeDate(ev.target.value)}
            />
          </label>
        )}
      </div>
      <div ref={bodyRef} className="entry-body">
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
      </div>
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
        {action}
      </button>
    </form>
  )
}
