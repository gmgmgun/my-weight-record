import { describe, expect, it } from 'vitest'
import { formatWeightDigits, isLargeJump, isValidWeight, parseWeight } from './validate'

describe('parseWeight', () => {
  it('accepts one decimal place and comma separators', () => {
    expect(parseWeight('72.4')).toEqual({ ok: true, value: 72.4 })
    expect(parseWeight(' 72,4 ')).toEqual({ ok: true, value: 72.4 })
    expect(parseWeight('72')).toEqual({ ok: true, value: 72 })
    expect(parseWeight('99.9')).toEqual({ ok: true, value: 99.9 })
  })

  it('rejects non-numbers and extra precision', () => {
    for (const bad of ['', 'abc', '72.45', '-70', '7 2']) {
      const r = parseWeight(bad)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toBe('체중을 숫자로 입력해 주세요. 예: 933 → 93.3kg')
    }
  })

  it('rejects out-of-range values', () => {
    for (const bad of ['19.9', '100.0']) {
      const r = parseWeight(bad)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toBe('체중은 20~99.9kg 사이로 입력해 주세요.')
    }
  })
})

describe('formatWeightDigits', () => {
  it('reads the first two digits as kg and the third as one decimal place', () => {
    expect(formatWeightDigits('9')).toBe('9')
    expect(formatWeightDigits('93')).toBe('93')
    expect(formatWeightDigits('933')).toBe('93.3')
    expect(formatWeightDigits('750')).toBe('75.0')
  })

  it('ignores anything that is not a digit and stops at three digits', () => {
    expect(formatWeightDigits('93.3')).toBe('93.3') // 이미 표시된 값을 다시 넣어도 그대로
    expect(formatWeightDigits('93.')).toBe('93') // 93.3에서 마지막 자리를 지운 경우
    expect(formatWeightDigits('9334')).toBe('93.3')
    expect(formatWeightDigits('a9b3')).toBe('93')
    expect(formatWeightDigits('')).toBe('')
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
