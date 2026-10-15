import { useEffect, useRef, useState } from 'react'
import { inRange, sortByDate } from '../stats/stats'
import type { ISODate } from '../types'
import { COPY_RANGES, copyFrom, recordsText, type CopyRange } from './copyText'
import { EntryForm } from './EntryForm'
import { fmtDate, fmtDelta, fmtKg } from './format'
import { SettingsPanel } from './SettingsPanel'
import type { AppState } from './useAppData'

const COPIED_MS = 1100

type Props = { app: AppState; today: ISODate; onExport: () => void }

export function HistoryScreen({ app, today, onExport }: Props) {
  const [editing, setEditing] = useState<ISODate>()
  const rows = sortByDate(app.entries).reverse()
  const [copyOpen, setCopyOpen] = useState(false)
  const [copied, setCopied] = useState<string>()
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(copiedTimer.current), [])

  async function copy(range: CopyRange) {
    const from = copyFrom(today, range)
    const text = recordsText(app.entries, from)
    if (!text) return
    setCopyOpen(false)
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      window.alert('복사하지 못했습니다. 다시 시도해 주세요.')
      return
    }
    // 저장과 같이 문구 대신 버튼의 체크 표시로 알리고, 화면 낭독용 문구만 남긴다
    setCopied(`기록 ${inRange(app.entries, from).length}개를 복사했습니다.`)
    clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCopied(undefined), COPIED_MS)
  }

  async function remove(date: ISODate) {
    if (!window.confirm(`${fmtDate(date)} 기록을 삭제할까요?`)) return
    try {
      await app.deleteEntry(date)
    } catch {
      window.alert('삭제하지 못했습니다. 다시 시도해 주세요.')
      return
    }
    setEditing(undefined)
  }

  return (
    <div className="split">
      <section className="card" aria-label="기록 목록">
        <div className="section-head">
          <h2>기록</h2>
          {rows.length > 0 && (
            <button
              type="button"
              className={copied ? 'chip is-saved' : 'chip'}
              aria-label="복사"
              aria-expanded={copyOpen}
              onClick={() => setCopyOpen(!copyOpen)}
            >
              {copied ? '✓ 복사됨' : '복사'}
            </button>
          )}
        </div>
        {copyOpen && (
          <div className="copy-options" role="group" aria-label="복사할 기간">
            {COPY_RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                disabled={!recordsText(app.entries, copyFrom(today, r.id))}
                onClick={() => void copy(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
        {copied && (
          <p role="status" className="sr-only">
            {copied}
          </p>
        )}
        {rows.length === 0 && <p className="hint">아직 기록이 없습니다.</p>}
        <ul className="history">
          {rows.map((entry, i) => {
            const prev = rows[i + 1]
            return (
              <li key={entry.date}>
                <button
                  type="button"
                  className="history-row"
                  aria-expanded={editing === entry.date}
                  onClick={() => setEditing(editing === entry.date ? undefined : entry.date)}
                >
                  <span>{fmtDate(entry.date)}</span>
                  <strong>{fmtKg(entry.weightKg)}</strong>
                  <span className="delta">{prev ? fmtDelta(entry.weightKg - prev.weightKg) : '–'}</span>
                  {entry.memo && <span className="memo">{entry.memo}</span>}
                </button>
                {editing === entry.date && (
                  <div className="edit">
                    <EntryForm
                      key={entry.date}
                      entries={app.entries}
                      today={today}
                      initialDate={entry.date}
                      lockDate
                      onSave={app.saveEntry}
                    />
                    <button type="button" className="danger" onClick={() => void remove(entry.date)}>
                      삭제
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>
      <SettingsPanel app={app} onExport={onExport} />
    </div>
  )
}
