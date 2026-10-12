import { describe, expect, it } from 'vitest'
import { addDays, addMonths, diffDays, isValidISODate, monthOf, startOfWeek, todayLocal } from './date'

describe('todayLocal', () => {
  it('uses the local calendar date', () => {
    expect(todayLocal(new Date(2026, 9, 12, 23, 59))).toBe('2026-10-12')
    expect(todayLocal(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05')
  })
})

describe('isValidISODate', () => {
  it('accepts real dates only', () => {
    expect(isValidISODate('2026-10-12')).toBe(true)
    expect(isValidISODate('2028-02-29')).toBe(true)
    expect(isValidISODate('2026-02-29')).toBe(false)
    expect(isValidISODate('2026-1-1')).toBe(false)
    expect(isValidISODate(20261012)).toBe(false)
  })
})

describe('addDays / diffDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(diffDays('2026-10-12', '2026-10-05')).toBe(7)
    expect(diffDays('2026-10-05', '2026-10-12')).toBe(-7)
  })
})

describe('startOfWeek', () => {
  it('returns the Monday of the week', () => {
    expect(startOfWeek('2026-10-12')).toBe('2026-10-12')
    expect(startOfWeek('2026-10-18')).toBe('2026-10-12')
    expect(startOfWeek('2026-10-11')).toBe('2026-10-05')
  })
})

describe('months', () => {
  it('extracts and shifts months', () => {
    expect(monthOf('2026-10-12')).toBe('2026-10')
    expect(addMonths('2026-11', 2)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
  })
})
