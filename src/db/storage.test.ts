import { describe, expect, it, vi } from 'vitest'
import type { Entry } from '../types'
import { openWeightStore } from './storage'

const e = (date: string, weightKg: number): Entry => ({ date, weightKg, updatedAt: 1 })
const freshStore = () => openWeightStore(`test-${crypto.randomUUID()}`)

describe('WeightStore', () => {
  it('starts empty', async () => {
    const store = await freshStore()
    expect(await store.getEntries()).toEqual([])
    expect(await store.getSettings()).toEqual({})
  })

  it('stores entries sorted and overwrites the same date', async () => {
    const store = await freshStore()
    await store.putEntry(e('2026-10-02', 71))
    await store.putEntry(e('2026-10-01', 70))
    await store.putEntry(e('2026-10-02', 72))
    expect(await store.getEntries()).toEqual([e('2026-10-01', 70), e('2026-10-02', 72)])
  })

  it('deletes entries', async () => {
    const store = await freshStore()
    await store.putEntry(e('2026-10-01', 70))
    await store.deleteEntry('2026-10-01')
    expect(await store.getEntries()).toEqual([])
  })

  it('saves settings', async () => {
    const store = await freshStore()
    await store.saveSettings({ goalKg: 68 })
    expect(await store.getSettings()).toEqual({ goalKg: 68 })
  })

  it('replaces all data at once', async () => {
    const store = await freshStore()
    await store.putEntry(e('2026-09-01', 75))
    await store.saveSettings({ goalKg: 60 })
    await store.replaceAll({ entries: [e('2026-10-01', 70)], settings: { goalKg: 68 } })
    expect(await store.getEntries()).toEqual([e('2026-10-01', 70)])
    expect(await store.getSettings()).toEqual({ goalKg: 68 })
  })

  it('persists across reopen', async () => {
    const name = `test-${crypto.randomUUID()}`
    await (await openWeightStore(name)).putEntry(e('2026-10-01', 70))
    expect(await (await openWeightStore(name)).getEntries()).toEqual([e('2026-10-01', 70)])
  })

  it('closes itself and notifies when a newer version upgrades the database', async () => {
    const name = `test-${crypto.randomUUID()}`
    const onVersionChange = vi.fn()
    const store = await openWeightStore(name, { onVersionChange })
    await store.putEntry(e('2026-10-01', 70))

    // 새 버전(다른 탭)이 저장 구조를 v2로 올리려 한다. 이 연결이 닫히지 않으면 업그레이드가 막힌다.
    const upgraded = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(name, 2)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
      req.onblocked = () => reject(new Error('upgrade blocked'))
    })
    expect(upgraded.version).toBe(2)
    expect(onVersionChange).toHaveBeenCalledTimes(1)
    upgraded.close()
  })
})
