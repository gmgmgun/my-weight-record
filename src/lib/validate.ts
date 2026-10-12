export const MIN_KG = 20
export const MAX_KG = 300
export const MEMO_MAX = 200
export const JUMP_WARN_KG = 3

export type WeightParse = { ok: true; value: number } | { ok: false; error: string }

export function isValidWeight(v: unknown): v is number {
  return (
    typeof v === 'number' &&
    Number.isFinite(v) &&
    v >= MIN_KG &&
    v <= MAX_KG &&
    Math.abs(Math.round(v * 10) - v * 10) < 1e-6
  )
}

export function parseWeight(input: string): WeightParse {
  const s = input.trim().replace(',', '.')
  if (!/^\d+(\.\d)?$/.test(s)) {
    return { ok: false, error: '체중은 숫자로, 소수점 한 자리까지 입력해 주세요.' }
  }
  const value = Number(s)
  if (!isValidWeight(value)) {
    return { ok: false, error: `체중은 ${MIN_KG}~${MAX_KG}kg 사이로 입력해 주세요.` }
  }
  return { ok: true, value }
}

// 0.1kg 단위로 비교해 부동소수 오차(75.4 - 72.4 = 3.0000000000000x)를 피한다.
export function isLargeJump(prevKg: number | undefined, nextKg: number): boolean {
  return prevKg !== undefined && Math.abs(Math.round((nextKg - prevKg) * 10)) > JUMP_WARN_KG * 10
}
