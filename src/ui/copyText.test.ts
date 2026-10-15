import { describe, expect, it } from 'vitest'
import type { Entry } from '../types'
import { copyFrom, recordsText } from './copyText'

const e = (date: string, weightKg: number, memo?: string): Entry =>
  memo === undefined ? { date, weightKg, updatedAt: 1 } : { date, weightKg, memo, updatedAt: 1 }

describe('recordsText', () => {
  const list = [e('2026-10-08', 94.1), e('2026-10-13', 93.6), e('2026-10-15', 93.3, '아침 공복'), e('2026-10-14', 93.8)]

  it('lists records newest first with the change from the record before and memos', () => {
    expect(recordsText(list, '2026-10-13')).toBe(
      [
        '몸무게 기록 (10/13 ~ 10/15)',
        '10/15 (목) 93.3kg  -0.5  아침 공복',
        '10/14 (수) 93.8kg  +0.2',
        // 범위 밖이어도 바로 앞 기록(10/8)과 비교한다
        '10/13 (화) 93.6kg  -0.5',
      ].join('\n'),
    )
  })

  it('copies everything without a start date and shows – for the very first record', () => {
    const text = recordsText(list, undefined)!
    expect(text.split('\n')[0]).toBe('몸무게 기록 (10/8 ~ 10/15)')
    expect(text.split('\n').at(-1)).toBe('10/8 (목) 94.1kg  –')
  })

  it('names a single day once and returns nothing for an empty range', () => {
    expect(recordsText(list, '2026-10-15')!.split('\n')[0]).toBe('몸무게 기록 (10/15)')
    expect(recordsText(list, '2026-10-16')).toBeUndefined()
    expect(recordsText([], undefined)).toBeUndefined()
  })
})

describe('copyFrom', () => {
  it('counts today in the week and month ranges', () => {
    expect(copyFrom('2026-10-15', 'week')).toBe('2026-10-09')
    expect(copyFrom('2026-10-15', 'month')).toBe('2026-09-16')
    expect(copyFrom('2026-10-15', 'all')).toBeUndefined()
  })
})
