import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { addDays } from '../lib/date'
import { formatWeightDigits, isLargeJump, JUMP_WARN_KG, MEMO_MAX, parseWeight } from '../lib/validate'
import { previousEntry } from '../stats/stats'
import type { Entry, ISODate } from '../types'
import { fmtDate, fmtKg } from './format'

const SWIPE_MIN_PX = 50

// 하루씩 넘길 때 내용이 들어오는 방향을 보여 준다(전날은 왼쪽에서, 다음날은 오른쪽에서).
// 입력칸을 다시 만들지 않도록 CSS 키 리마운트 대신 Web Animations API를 쓴다.
function canAnimate(el: HTMLElement | null): el is HTMLElement {
  if (!el || typeof el.animate !== 'function') return false
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function slideIn(el: HTMLElement | null, direction: -1 | 1) {
  if (!canAnimate(el)) return
  el.animate(
    [
      { transform: `translateX(${direction * 28}px)`, opacity: 0 },
      { transform: 'none', opacity: 1 },
    ],
    { duration: 220, easing: 'ease-out' },
  )
}

const SAVED_MS = 1100

// 저장·수정이 끝났음을 문구 대신 보여 준다: 숫자가 톡 튀고, 카드 테두리가 한 번 빛난다.
function celebrate(form: HTMLElement | null, box: HTMLElement | null) {
  if (canAnimate(box)) {
    box.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], {
      duration: 360,
      easing: 'cubic-bezier(.3,1.6,.5,1)',
    })
  }
  if (canAnimate(form)) {
    form.animate(
      [
        { boxShadow: '0 0 0 0 var(--success-glow)' },
        { boxShadow: '0 0 0 8px var(--success-glow)', offset: 0.35 },
        { boxShadow: '0 0 0 14px transparent' },
      ],
      { duration: 700, easing: 'ease-out' },
    )
  }
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
  const [justSaved, setJustSaved] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const weightRef = useRef<HTMLInputElement>(null)
  const savedTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(savedTimer.current), [])

  // 하루 1기록: 그날 기록이 있으면 같은 날짜 키로 덮어쓰므로 '수정'이다.
  const recorded = entries.some((x) => x.date === date)
  const action = recorded ? '수정' : '저장'
  const parsed = parseWeight(weight)
  const prev = previousEntry(entries, date)
  const warn = parsed.ok && isLargeJump(prev?.weightKg, parsed.value)

  const bodyRef = useRef<HTMLDivElement>(null)
  const pickerRef = useRef<HTMLInputElement>(null)
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

  function openCalendar() {
    const picker = pickerRef.current
    if (!picker) return
    // showPicker가 없거나 막힌 브라우저에서는 입력칸을 눌러 여는 방식으로 대신한다.
    try {
      if (typeof picker.showPicker === 'function') return picker.showPicker()
    } catch {
      /* 아래로 넘어간다 */
    }
    picker.click()
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
    setJustSaved(true)
    clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setJustSaved(false), SAVED_MS)
    celebrate(formRef.current, boxRef.current)
  }

  return (
    // noValidate: 브라우저 기본 검증(max 날짜 등) 대신 아래 오류 문구로 안내한다.
    <form
      ref={formRef}
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
          {lockDate ? (
            <strong className="entry-date">{fmtDate(date)}</strong>
          ) : (
            // 날짜 글자를 누르면 폰 기본 달력이 열린다. 입력칸은 달력 위치만 잡고 보이지 않는다.
            <span className="date-pick">
              <button type="button" className="entry-date" onClick={openCalendar}>
                {fmtDate(date)}
                <span className="caret" aria-hidden="true">
                  ▾
                </span>
                <span className="sr-only">, 달력 열기</span>
              </button>
              <input
                ref={pickerRef}
                type="date"
                aria-label="날짜"
                aria-hidden="true"
                tabIndex={-1}
                value={date}
                max={today}
                onChange={(ev) => ev.target.value && changeDate(ev.target.value)}
              />
            </span>
          )}
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
      </div>
      <div ref={bodyRef} className="entry-body">
        <div className="weight-field">
          <label htmlFor={weightId}>
            체중<span className="sr-only">(kg)</span>
          </label>
          {/* 숫자 부분만이 아니라 박스 어디를 눌러도(빈 공간, kg 글자) 입력을 시작한다 */}
          <div ref={boxRef} className="weight-box" onClick={() => weightRef.current?.focus()}>
            <input
              ref={weightRef}
              id={weightId}
              inputMode="numeric"
              autoComplete="off"
              value={weight}
              onChange={(ev) => {
                setWeight(formatWeightDigits(ev.target.value))
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
      {/* 화면 낭독용. 눈으로는 버튼의 체크 표시와 효과로 확인한다. */}
      {status && (
        <p role="status" className="sr-only">
          {status}
        </p>
      )}
      <button type="submit" className={justSaved ? 'primary is-saved' : 'primary'} aria-label={action}>
        {justSaved ? (
          <svg className="save-check" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          action
        )}
      </button>
    </form>
  )
}
