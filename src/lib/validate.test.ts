import { describe, expect, it } from 'vitest'
import { isLargeJump, isValidWeight, parseWeight } from './validate'

describe('parseWeight', () => {
  it('accepts one decimal place and comma separators', () => {
    expect(parseWeight('72.4')).toEqual({ ok: true, value: 72.4 })
    expect(parseWeight(' 72,4 ')).toEqual({ ok: true, value: 72.4 })
    expect(parseWeight('72')).toEqual({ ok: true, value: 72 })
    expect(parseWeight('300.0')).toEqual({ ok: true, value: 300 })
  })

  it('rejects non-numbers and extra precision', () => {
    for (const bad of ['', 'abc', '72.45', '-70', '7 2']) {
      const r = parseWeight(bad)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toBe('체중은 숫자로, 소수점 한 자리까지 입력해 주세요.')
    }
  })

  it('rejects out-of-range values', () => {
    for (const bad of ['19.9', '300.1']) {
      const r = parseWeight(bad)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toBe('체중은 20~300kg 사이로 입력해 주세요.')
    }
  })
})

describe('isValidWeight', () => {
  it('checks type, range and precision', () => {
    expect(isValidWeight(72.4)).toBe(true)
    expect(isValidWeight(72.45)).toBe(false)
    expect(isValidWeight('72.4')).toBe(false)
    expect(isValidWeight(Number.NaN)).toBe(false)
    expect(isValidWeight(10)).toBe(false)
  })
})

describe('isLargeJump', () => {
  it('warns only above 3kg difference', () => {
    expect(isLargeJump(72.4, 75.4)).toBe(false)
    expect(isLargeJump(72.4, 75.5)).toBe(true)
    expect(isLargeJump(75.5, 72.4)).toBe(true)
    expect(isLargeJump(undefined, 90)).toBe(false)
  })
})
