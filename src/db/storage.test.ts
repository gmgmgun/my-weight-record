import { describe, expect, it } from 'vitest'
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
})
