export const MIN_KG = 20
// 몸무게는 늘 두 자리라는 전제로 입력받으므로(아래 formatWeightDigits) 99.9kg까지다.
export const MAX_KG = 99.9
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
    return { ok: false, error: '체중을 숫자로 입력해 주세요. 예: 933 → 93.3kg' }
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

// 소수점 없이 숫자만 받는다. 앞의 두 자리는 kg, 세 번째 자리는 소수점 아래(93 → 93, 933 → 93.3).
// 이미 표시된 값('93.3')이나 마지막 자리를 지운 값('93.')을 다시 받아도 같은 규칙으로 정리된다.
export function formatWeightDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 3)
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}.${digits[2]}`
}
