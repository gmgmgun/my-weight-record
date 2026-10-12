import { useState } from 'react'
import { sortByDate } from '../stats/stats'
import type { ISODate } from '../types'
import { EntryForm } from './EntryForm'
import { fmtDate, fmtDelta, fmtKg } from './format'
import { SettingsPanel } from './SettingsPanel'
import type { AppState } from './useAppData'

type Props = { app: AppState; today: ISODate; onExport: () => void }

export function HistoryScreen({ app, today, onExport }: Props) {
  const [editing, setEditing] = useState<ISODate>()
  const rows = sortByDate(app.entries).reverse()

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
    <>
      <section className="card" aria-label="기록 목록">
        <h2>기록</h2>
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
    </>
  )
}
