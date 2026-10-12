import { describe, expect, it, vi } from 'vitest'
import { requestPersistence } from './persist'

describe('requestPersistence', () => {
  it('returns true when already persisted without asking again', async () => {
    const persist = vi.fn()
    expect(await requestPersistence({ persisted: async () => true, persist })).toBe(true)
    expect(persist).not.toHaveBeenCalled()
  })

  it('asks for persistence when not yet granted', async () => {
    expect(await requestPersistence({ persisted: async () => false, persist: async () => true })).toBe(true)
    expect(await requestPersistence({ persisted: async () => false, persist: async () => false })).toBe(false)
  })

  it('never throws', async () => {
    const failing = { persisted: async () => Promise.reject(new Error('x')), persist: async () => true }
    expect(await requestPersistence(failing)).toBe(false)
    expect(await requestPersistence(undefined)).toBe(false)
  })
})
