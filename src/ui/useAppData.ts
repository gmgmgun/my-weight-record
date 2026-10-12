import { useCallback, useEffect, useState } from 'react'
import type { AppSnapshot } from '../backup/backup'
import type { WeightStore } from '../db/storage'
import type { ISODate, Settings } from '../types'

export type AppState = AppSnapshot & {
  saveEntry(date: ISODate, weightKg: number, memo: string): Promise<void>
  deleteEntry(date: ISODate): Promise<void>
  updateSettings(patch: Partial<Settings>): Promise<void>
  applySnapshot(snapshot: AppSnapshot): Promise<void>
}

export function useAppData(store: WeightStore): AppState | null {
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null)

  const reload = useCallback(async () => {
    setSnapshot({ entries: await store.getEntries(), settings: await store.getSettings() })
  }, [store])

  useEffect(() => {
    void (async () => {
      const settings = await store.getSettings()
      if (settings.firstUseAt === undefined) await store.saveSettings({ ...settings, firstUseAt: Date.now() })
      await reload()
    })()
  }, [store, reload])

  if (!snapshot) return null

  return {
    ...snapshot,
    async saveEntry(date, weightKg, memo) {
      const trimmed = memo.trim()
      const updatedAt = Date.now()
      await store.putEntry(trimmed ? { date, weightKg, memo: trimmed, updatedAt } : { date, weightKg, updatedAt })
      await reload()
    },
    async deleteEntry(date) {
      await store.deleteEntry(date)
      await reload()
    },
    async updateSettings(patch) {
      await store.saveSettings({ ...(await store.getSettings()), ...patch })
      await reload()
    },
    async applySnapshot(next) {
      await store.replaceAll(next)
      await reload()
    },
  }
}
