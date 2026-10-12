import { openDB, type DBSchema } from 'idb'
import type { AppSnapshot } from '../backup/backup'
import { sortByDate } from '../stats/stats'
import type { Entry, ISODate, Settings } from '../types'

interface WeightDB extends DBSchema {
  entries: { key: string; value: Entry }
  settings: { key: string; value: Settings }
}

export const DEFAULT_DB_NAME = 'weight-record'
const SETTINGS_KEY = 'app'

export type WeightStore = {
  getEntries(): Promise<Entry[]>
  putEntry(entry: Entry): Promise<void>
  deleteEntry(date: ISODate): Promise<void>
  getSettings(): Promise<Settings>
  saveSettings(settings: Settings): Promise<void>
  replaceAll(snapshot: AppSnapshot): Promise<void>
}

export async function openWeightStore(name: string = DEFAULT_DB_NAME): Promise<WeightStore> {
  const db = await openDB<WeightDB>(name, 1, {
    upgrade(database) {
      database.createObjectStore('entries', { keyPath: 'date' })
      database.createObjectStore('settings')
    },
  })

  return {
    async getEntries() {
      return sortByDate(await db.getAll('entries'))
    },
    async putEntry(entry) {
      await db.put('entries', entry)
    },
    async deleteEntry(date) {
      await db.delete('entries', date)
    },
    async getSettings() {
      return (await db.get('settings', SETTINGS_KEY)) ?? {}
    },
    async saveSettings(settings) {
      await db.put('settings', settings, SETTINGS_KEY)
    },
    async replaceAll({ entries, settings }) {
      const tx = db.transaction(['entries', 'settings'], 'readwrite')
      const store = tx.objectStore('entries')
      await store.clear()
      for (const entry of entries) await store.put(entry)
      await tx.objectStore('settings').put(settings, SETTINGS_KEY)
      await tx.done
    },
  }
}
