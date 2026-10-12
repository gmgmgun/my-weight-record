# 몸무게 기록 PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 스마트폰에서 매일 체중·메모를 기록하고 목표 진행률·기간 비교·7일 이동평균을 보여 주는 오프라인 PWA를 만든다.

**Architecture:** Vite + React + TypeScript 단일 페이지 앱. 계산(`stats`)·백업(`backup`)·검증(`lib`)은 DOM/IndexedDB에 의존하지 않는 순수 함수로, IndexedDB 접근은 `db/storage.ts` 한 곳으로 모은다. UI는 `useAppData` 훅이 저장소를 감싸고 세 개의 탭 화면(홈/그래프/기록·설정)이 그 상태를 읽는다.

**Tech Stack:** Vite 8, React 19, TypeScript 6, idb 8, Recharts 3, vite-plugin-pwa 2, Vitest 5 + jsdom + Testing Library + fake-indexeddb, GitHub Pages(Actions).

**Spec:** `docs/superpowers/specs/2026-10-12-weight-record-design.md`

## Global Constraints

- UI 문구는 한국어.
- 체중 범위 20.0~300.0kg, 소수점 한 자리. 쉼표 입력은 점으로 변환.
- 하루 1개 기록(`date`가 키, 같은 날 저장 시 덮어쓰기). 날짜는 기기 로컬 기준 `YYYY-MM-DD` 문자열.
- 메모 최대 200자.
- 직전 기록 대비 3kg 초과 차이 → 경고만, 저장은 허용.
- 미래 날짜 기록 불가.
- 주는 월요일 시작~일요일, 월은 달력 월.
- 지난주/지난달 비교는 7일/30일 전 ±3일 이내 가장 가까운 기록(동률이면 더 이른 날짜).
- 진행률 = (시작 − 현재)/(시작 − 목표)×100, 0~100 제한, 시작=목표이면 100.
- 표시 값만 소수점 한 자리 반올림, 계산 중간에는 반올림하지 않음.
- 백업 파일 `weight-backup-YYYY-MM-DD.json`, 형식 `{ version: 1, exportedAt, entries, settings }`.
- 백업 경고: `lastBackupAt`(없으면 `firstUseAt`) 후 30일 경과 + 기록 1개 이상.
- 서버 없음, 로그인 없음. 데이터는 IndexedDB에만 저장.
- `tsconfig`의 `erasableSyntaxOnly`, `verbatimModuleSyntax` 유지: `enum` 금지, 타입은 `import type`.
- 테스트 함수는 전역이 아니라 `vitest`에서 import 한다.

## Review Focus

1. 자정을 넘겨 백그라운드에 있던 앱을 다시 열면 → 입력 날짜가 새 "오늘"로 바뀐다. (Task 6 Step 1 `refreshes today when the app becomes visible again`)
2. 날짜 입력에 미래 날짜를 직접 넣고 저장하면 → 저장되지 않고 오류가 보인다. (Task 6 Step 1 `rejects a future date`)
3. 메모에 공백만 입력하면 → 메모 없는 기록으로 저장된다. (Task 6 Step 1 `stores whitespace-only memo as no memo`)
4. 설정에서 목표 칸을 비우고 저장하면 → 목표가 해제되고 홈에 "목표를 설정해 보세요"가 다시 보인다. (Task 7 Step 1 `clears the goal when the field is emptied`)
5. 백업을 가져와 설정이 바뀌면 → 설정 폼이 새 목표 값을 보여 준다. (Task 7 Step 1 `settings form shows imported goal`)

---

## File Structure

```
index.html                         lang=ko, 제목, PWA 메타 (Task 1, Task 9)
vite.config.ts                     React + Vitest 설정, PWA 플러그인 (Task 1, Task 9)
public/icon.svg                    앱 아이콘 원본 → 생성 PNG들 (Task 9)
.github/workflows/deploy.yml       테스트 → 빌드 → GitHub Pages 배포 (Task 9)
src/
  types.ts                         Entry, Settings, ISODate 타입 (Task 2)
  main.tsx                         저장소 열기 → App 렌더 / 실패 시 안내 (Task 6, Task 9)
  App.tsx                          탭 셸, 오늘 날짜 관리, 백업 내보내기 연결 (Task 6~8)
  index.css                        전역 스타일, 다크 모드 (Task 6)
  lib/date.ts                      날짜 문자열 연산 (Task 2)
  lib/validate.ts                  체중 파싱·검증, 큰 변화 판정 (Task 2)
  lib/persist.ts                   navigator.storage.persist 요청 (Task 9)
  stats/stats.ts                   추세·비교 계산 순수 함수 (Task 3)
  backup/backup.ts                 백업 생성·검증·병합, 경고 판정 (Task 4)
  db/storage.ts                    IndexedDB 래퍼 (Task 5)
  ui/format.ts                     표시 형식 (Task 6)
  ui/useAppData.ts                 저장소 ↔ React 상태 (Task 6)
  ui/EntryForm.tsx                 체중 입력 폼 (Task 6)
  ui/GoalProgress.tsx              목표 진행 카드 (Task 6)
  ui/ComparisonPanel.tsx           기간 비교 카드 (Task 6)
  ui/HomeScreen.tsx                홈 탭 (Task 6, Task 7)
  ui/BackupBanner.tsx              백업 경고 배너 (Task 7)
  ui/download.ts                   JSON 파일 다운로드 (Task 7)
  ui/HistoryScreen.tsx             기록 목록·수정·삭제 (Task 7)
  ui/SettingsPanel.tsx             목표·시작점·백업 (Task 7)
  ui/ChartScreen.tsx               그래프·기간 요약·평균표 (Task 8)
  ui/StorageUnavailable.tsx        저장 불가 안내 (Task 9)
  test/setup.ts                    jest-dom, fake-indexeddb, cleanup (Task 1)
  test/renderApp.tsx               App 렌더 테스트 헬퍼 (Task 6)
```

테스트 파일은 대상 파일 옆에 `*.test.ts(x)`로 둔다.

---

### Task 1: 프로젝트 스캐폴드와 테스트 환경

**Files:**
- Create: Vite react-ts 템플릿 전체(루트), `src/test/setup.ts`, `src/smoke.test.tsx`
- Modify: `vite.config.ts`, `package.json`, `index.html`, `src/App.tsx`, `src/main.tsx`, `src/index.css`
- Delete: `src/App.css`, `src/assets/`, `public/icons.svg`

**Interfaces:**
- Consumes: 없음
- Produces: `npm test`(= `vitest run`), `npm run build`, `src/test/setup.ts`(모든 테스트에 jest-dom 매처, 전역 `indexedDB`(fake), 자동 cleanup 제공)

- [ ] **Step 1: 템플릿을 임시 폴더에 생성하고 루트로 옮긴다**

저장소 루트에 이미 `docs/`와 `.git`이 있으므로 하위 폴더에 만든 뒤 옮긴다.

```bash
npm create vite@9.2.1 _scaffold -- --template react-ts --no-interactive
cp -r _scaffold/. .
rm -rf _scaffold src/App.css src/assets public/icons.svg
npm install
npm install idb recharts react-is
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event fake-indexeddb
```

- [ ] **Step 2: `package.json` scripts에 테스트 명령을 추가한다**

`"scripts"`를 다음으로 바꾼다(`name`은 `"my-weight-record"`로).

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "oxlint",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 3: Vitest 설정과 setup 파일**

`vite.config.ts`:

```ts
/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

`src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => cleanup())
```

- [ ] **Step 4: 템플릿 데모 코드를 최소 형태로 바꾼다**

`src/App.tsx`:

```tsx
export default function App() {
  return <h1>몸무게 기록</h1>
}
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`src/index.css`: 내용을 비운다(Task 6에서 채움).

`index.html`: `<html lang="en">` → `<html lang="ko">`, `<title>`을 `몸무게 기록`으로. `<link rel="icon" ...>` 줄은 `/favicon.svg`를 가리키는 템플릿 그대로 둔다.

- [ ] **Step 5: 스모크 테스트 작성**

`src/smoke.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('smoke', () => {
  it('renders the app title', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: '몸무게 기록' })).toBeInTheDocument()
  })

  it('provides a fake indexedDB', () => {
    expect(globalThis.indexedDB).toBeDefined()
  })
})
```

- [ ] **Step 6: 테스트와 빌드 실행**

Run: `npm test`
Expected: `Tests  2 passed (2)`

Run: `npm run build`
Expected: `✓ built in` 출력, 타입 오류 없음.

- [ ] **Step 7: 커밋**

`.gitignore`가 템플릿에서 복사되었는지 확인한다(`node_modules`, `dist` 포함).

```bash
git add -A
git commit -m "chore: Vite React TS 스캐폴드와 Vitest 환경 구성"
```

---

### Task 2: 타입, 날짜 연산, 입력 검증

**Files:**
- Create: `src/types.ts`, `src/lib/date.ts`, `src/lib/validate.ts`
- Test: `src/lib/date.test.ts`, `src/lib/validate.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `types.ts`: `type ISODate = string`, `type Entry = { date: ISODate; weightKg: number; memo?: string; updatedAt: number }`, `type Settings = { goalKg?: number; startDate?: ISODate; startKg?: number; lastBackupAt?: number; firstUseAt?: number }`
  - `date.ts`: `DAY_MS`, `todayLocal(now?: Date): ISODate`, `isValidISODate(s: unknown): s is ISODate`, `addDays(d: ISODate, n: number): ISODate`, `diffDays(a: ISODate, b: ISODate): number`(a−b 일수), `startOfWeek(d: ISODate): ISODate`(월요일), `monthOf(d: ISODate): string`(`YYYY-MM`), `addMonths(month: string, n: number): string`
  - `validate.ts`: `MIN_KG=20`, `MAX_KG=300`, `MEMO_MAX=200`, `JUMP_WARN_KG=3`, `type WeightParse = { ok: true; value: number } | { ok: false; error: string }`, `parseWeight(input: string): WeightParse`, `isValidWeight(v: unknown): v is number`, `isLargeJump(prevKg: number | undefined, nextKg: number): boolean`

- [ ] **Step 1: 날짜 테스트 작성**

참고: 2026-10-12는 월요일이다.

`src/lib/date.test.ts`:

```ts
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
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/date.test.ts`
Expected: FAIL — `Failed to resolve import "./date"`

- [ ] **Step 3: 타입과 날짜 구현**

`src/types.ts`:

```ts
export type ISODate = string

export type Entry = {
  date: ISODate
  weightKg: number
  memo?: string
  updatedAt: number
}

export type Settings = {
  goalKg?: number
  startDate?: ISODate
  startKg?: number
  lastBackupAt?: number
  firstUseAt?: number
}
```

`src/lib/date.ts`:

```ts
import type { ISODate } from '../types'

export const DAY_MS = 86_400_000

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function toUTC(d: ISODate): number {
  const [y, m, day] = d.split('-').map(Number)
  return Date.UTC(y, m - 1, day)
}

function fromUTC(ms: number): ISODate {
  return new Date(ms).toISOString().slice(0, 10)
}

export function todayLocal(now: Date = new Date()): ISODate {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function isValidISODate(s: unknown): s is ISODate {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  return fromUTC(toUTC(s)) === s
}

export function addDays(d: ISODate, n: number): ISODate {
  return fromUTC(toUTC(d) + n * DAY_MS)
}

export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(a) - toUTC(b)) / DAY_MS)
}

export function startOfWeek(d: ISODate): ISODate {
  const dow = new Date(toUTC(d)).getUTCDay()
  return addDays(d, -((dow + 6) % 7))
}

export function monthOf(d: ISODate): string {
  return d.slice(0, 7)
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number)
  const idx = y * 12 + (m - 1) + n
  return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/date.test.ts`
Expected: PASS

- [ ] **Step 5: 검증 테스트 작성**

`src/lib/validate.test.ts`:

```ts
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
```

- [ ] **Step 6: 실패 확인**

Run: `npx vitest run src/lib/validate.test.ts`
Expected: FAIL — `Failed to resolve import "./validate"`

- [ ] **Step 7: 검증 구현**

`src/lib/validate.ts`:

```ts
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
```

- [ ] **Step 8: 통과 확인**

Run: `npm test`
Expected: 모든 테스트 PASS

- [ ] **Step 9: 커밋**

```bash
git add src/types.ts src/lib
git commit -m "feat: 데이터 타입, 날짜 연산, 체중 입력 검증 추가"
```

---

### Task 3: 추세·비교 계산 (`stats.ts`)

**Files:**
- Create: `src/stats/stats.ts`
- Test: `src/stats/stats.test.ts`

**Interfaces:**
- Consumes: `Entry`, `Settings`, `ISODate`(types), `addDays`, `addMonths`, `diffDays`, `monthOf`, `startOfWeek`(date)
- Produces:
  - `sortByDate(entries: Entry[]): Entry[]` (오름차순 복사본)
  - `latestEntry(entries: Entry[]): Entry | undefined`
  - `previousEntry(entries: Entry[], date: ISODate): Entry | undefined` (date보다 이른 것 중 가장 늦은 기록)
  - `findNear(entries: Entry[], target: ISODate, tolerance?: number): Entry | undefined`
  - `changeVsDaysAgo(entries: Entry[], days: number): number | undefined`
  - `type AvgPoint = { date: ISODate; avg: number }`, `movingAverage7(entries: Entry[]): AvgPoint[]`
  - `type PeriodUnit = 'week' | 'month'`, `periodAverages(entries: Entry[], unit: PeriodUnit): Map<string, number>`
  - `weekComparison(entries: Entry[]): { thisWeek?: number; lastWeek?: number }`
  - `type PeriodRow = { key: string; avg?: number; delta?: number }`, `recentPeriods(entries: Entry[], unit: PeriodUnit, count: number): PeriodRow[]` (최신 구간부터)
  - `effectiveStart(entries: Entry[], settings: Settings): { date: ISODate; kg: number } | undefined`
  - `progressPercent(startKg: number, currentKg: number, goalKg: number): number`
  - `type RangeKey = '1m' | '3m' | '6m' | '1y' | 'all'`, `rangeStart(today: ISODate, range: RangeKey): ISODate | undefined`, `inRange(entries: Entry[], from: ISODate | undefined): Entry[]`
  - `type RangeSummary = { change?: number; min: number; max: number; avg: number }`, `summarize(entries: Entry[]): RangeSummary | undefined`

- [ ] **Step 1: 테스트 작성**

`src/stats/stats.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { Entry } from '../types'
import {
  changeVsDaysAgo,
  effectiveStart,
  findNear,
  inRange,
  latestEntry,
  movingAverage7,
  previousEntry,
  progressPercent,
  rangeStart,
  recentPeriods,
  sortByDate,
  summarize,
  weekComparison,
} from './stats'

const e = (date: string, weightKg: number): Entry => ({ date, weightKg, updatedAt: 0 })

describe('ordering helpers', () => {
  const list = [e('2026-10-03', 72), e('2026-10-01', 70), e('2026-10-02', 71)]

  it('sorts ascending without mutating', () => {
    expect(sortByDate(list).map((x) => x.date)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03'])
    expect(list[0].date).toBe('2026-10-03')
  })

  it('finds latest and previous entries', () => {
    expect(latestEntry(list)?.date).toBe('2026-10-03')
    expect(latestEntry([])).toBeUndefined()
    expect(previousEntry(list, '2026-10-03')?.date).toBe('2026-10-02')
    expect(previousEntry(list, '2026-10-01')).toBeUndefined()
  })
})

describe('findNear', () => {
  it('picks the closest entry within tolerance, earlier on ties', () => {
    const list = [e('2026-10-02', 70), e('2026-10-08', 71)]
    expect(findNear(list, '2026-10-05')?.date).toBe('2026-10-02')
    expect(findNear(list, '2026-10-07')?.date).toBe('2026-10-08')
    expect(findNear(list, '2026-09-20')).toBeUndefined()
  })
})

describe('changeVsDaysAgo', () => {
  it('compares latest with the entry near N days before', () => {
    const list = [e('2026-09-10', 74.2), e('2026-10-05', 73.0), e('2026-10-12', 72.4)]
    expect(changeVsDaysAgo(list, 7)).toBeCloseTo(-0.6)
    expect(changeVsDaysAgo(list, 30)).toBeCloseTo(-1.8)
  })

  it('returns undefined when nothing is within ±3 days', () => {
    expect(changeVsDaysAgo([e('2026-10-01', 73), e('2026-10-12', 72)], 7)).toBeUndefined()
    expect(changeVsDaysAgo([e('2026-10-12', 72)], 7)).toBeUndefined()
    expect(changeVsDaysAgo([], 7)).toBeUndefined()
  })
})

describe('movingAverage7', () => {
  it('averages entries in [D-6, D], skipping missing days', () => {
    const list = [e('2026-10-08', 74), e('2026-10-01', 70), e('2026-10-03', 72)]
    expect(movingAverage7(list)).toEqual([
      { date: '2026-10-01', avg: 70 },
      { date: '2026-10-03', avg: 71 },
      { date: '2026-10-08', avg: 73 },
    ])
  })
})

describe('weekComparison', () => {
  it('compares the calendar week of the latest entry with the previous week', () => {
    const list = [e('2026-10-05', 73), e('2026-10-11', 72), e('2026-10-12', 71), e('2026-10-14', 70)]
    expect(weekComparison(list)).toEqual({ thisWeek: 70.5, lastWeek: 72.5 })
  })

  it('leaves missing weeks undefined', () => {
    expect(weekComparison([e('2026-10-12', 71)])).toEqual({ thisWeek: 71, lastWeek: undefined })
    expect(weekComparison([])).toEqual({})
  })
})

describe('recentPeriods', () => {
  it('lists weeks newest first with delta vs previous week', () => {
    const list = [e('2026-10-05', 73), e('2026-10-12', 72)]
    expect(recentPeriods(list, 'week', 2)).toEqual([
      { key: '2026-10-12', avg: 72, delta: -1 },
      { key: '2026-10-05', avg: 73, delta: undefined },
    ])
  })

  it('includes empty months as gaps', () => {
    const list = [e('2026-08-15', 75), e('2026-10-01', 73), e('2026-10-20', 71)]
    expect(recentPeriods(list, 'month', 3)).toEqual([
      { key: '2026-10', avg: 72, delta: undefined },
      { key: '2026-09', avg: undefined, delta: undefined },
      { key: '2026-08', avg: 75, delta: undefined },
    ])
  })

  it('crosses year boundaries', () => {
    const list = [e('2026-12-20', 74), e('2027-01-05', 73)]
    expect(recentPeriods(list, 'month', 1)).toEqual([{ key: '2027-01', avg: 73, delta: -1 }])
  })

  it('returns nothing without entries', () => {
    expect(recentPeriods([], 'week', 8)).toEqual([])
  })
})

describe('effectiveStart', () => {
  const list = [e('2026-10-12', 72), e('2026-09-01', 76)]

  it('defaults to the first entry', () => {
    expect(effectiveStart(list, {})).toEqual({ date: '2026-09-01', kg: 76 })
  })

  it('lets settings override each field', () => {
    expect(effectiveStart(list, { startKg: 80 })).toEqual({ date: '2026-09-01', kg: 80 })
    expect(effectiveStart(list, { startDate: '2026-08-01', startKg: 81 })).toEqual({ date: '2026-08-01', kg: 81 })
  })

  it('is undefined with no data', () => {
    expect(effectiveStart([], {})).toBeUndefined()
  })
})

describe('progressPercent', () => {
  it('works for loss and gain goals and clamps to 0..100', () => {
    expect(progressPercent(80, 75, 70)).toBe(50)
    expect(progressPercent(50, 55, 60)).toBe(50)
    expect(progressPercent(80, 68, 70)).toBe(100)
    expect(progressPercent(80, 82, 70)).toBe(0)
    expect(progressPercent(70, 72, 70)).toBe(100)
  })
})

describe('ranges and summary', () => {
  it('computes range start dates', () => {
    expect(rangeStart('2026-10-12', '1m')).toBe('2026-09-12')
    expect(rangeStart('2026-10-12', 'all')).toBeUndefined()
  })

  it('filters by start date', () => {
    const list = [e('2026-10-12', 72), e('2026-09-01', 76)]
    expect(inRange(list, '2026-10-01').map((x) => x.date)).toEqual(['2026-10-12'])
    expect(inRange(list, undefined).map((x) => x.date)).toEqual(['2026-09-01', '2026-10-12'])
  })

  it('summarizes change, min, max, avg', () => {
    expect(summarize([])).toBeUndefined()
    expect(summarize([e('2026-10-01', 72)])).toEqual({ change: undefined, min: 72, max: 72, avg: 72 })
    expect(summarize([e('2026-10-03', 70), e('2026-10-01', 74), e('2026-10-02', 75)])).toEqual({
      change: -4,
      min: 70,
      max: 75,
      avg: 73,
    })
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/stats/stats.test.ts`
Expected: FAIL — `Failed to resolve import "./stats"`

- [ ] **Step 3: 구현**

`src/stats/stats.ts`:

```ts
import { addDays, addMonths, diffDays, monthOf, startOfWeek } from '../lib/date'
import type { Entry, ISODate, Settings } from '../types'

export function sortByDate(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date))
}

export function latestEntry(entries: Entry[]): Entry | undefined {
  let best: Entry | undefined
  for (const e of entries) if (!best || e.date > best.date) best = e
  return best
}

export function previousEntry(entries: Entry[], date: ISODate): Entry | undefined {
  return latestEntry(entries.filter((e) => e.date < date))
}

export function findNear(entries: Entry[], target: ISODate, tolerance = 3): Entry | undefined {
  let best: Entry | undefined
  let bestDist = Infinity
  for (const e of entries) {
    const dist = Math.abs(diffDays(e.date, target))
    if (dist > tolerance) continue
    if (dist < bestDist || (dist === bestDist && best !== undefined && e.date < best.date)) {
      best = e
      bestDist = dist
    }
  }
  return best
}

export function changeVsDaysAgo(entries: Entry[], days: number): number | undefined {
  const latest = latestEntry(entries)
  if (!latest) return undefined
  const ref = findNear(entries, addDays(latest.date, -days))
  return ref ? latest.weightKg - ref.weightKg : undefined
}

export type AvgPoint = { date: ISODate; avg: number }

export function movingAverage7(entries: Entry[]): AvgPoint[] {
  const sorted = sortByDate(entries)
  return sorted.map((e, i) => {
    let sum = 0
    let count = 0
    for (let j = i; j >= 0 && diffDays(e.date, sorted[j].date) <= 6; j--) {
      sum += sorted[j].weightKg
      count++
    }
    return { date: e.date, avg: sum / count }
  })
}

export type PeriodUnit = 'week' | 'month'

function periodKey(date: ISODate, unit: PeriodUnit): string {
  return unit === 'week' ? startOfWeek(date) : monthOf(date)
}

function shiftPeriod(key: string, unit: PeriodUnit, n: number): string {
  return unit === 'week' ? addDays(key, 7 * n) : addMonths(key, n)
}

export function periodAverages(entries: Entry[], unit: PeriodUnit): Map<string, number> {
  const acc = new Map<string, { sum: number; count: number }>()
  for (const e of entries) {
    const key = periodKey(e.date, unit)
    const cur = acc.get(key) ?? { sum: 0, count: 0 }
    acc.set(key, { sum: cur.sum + e.weightKg, count: cur.count + 1 })
  }
  return new Map([...acc].map(([k, v]) => [k, v.sum / v.count]))
}

export function weekComparison(entries: Entry[]): { thisWeek?: number; lastWeek?: number } {
  const latest = latestEntry(entries)
  if (!latest) return {}
  const avgs = periodAverages(entries, 'week')
  const week = startOfWeek(latest.date)
  return { thisWeek: avgs.get(week), lastWeek: avgs.get(addDays(week, -7)) }
}

export type PeriodRow = { key: string; avg?: number; delta?: number }

export function recentPeriods(entries: Entry[], unit: PeriodUnit, count: number): PeriodRow[] {
  const latest = latestEntry(entries)
  if (!latest) return []
  const avgs = periodAverages(entries, unit)
  const newest = periodKey(latest.date, unit)
  return Array.from({ length: count }, (_, i) => {
    const key = shiftPeriod(newest, unit, -i)
    const avg = avgs.get(key)
    const prev = avgs.get(shiftPeriod(key, unit, -1))
    return { key, avg, delta: avg !== undefined && prev !== undefined ? avg - prev : undefined }
  })
}

export function effectiveStart(entries: Entry[], settings: Settings): { date: ISODate; kg: number } | undefined {
  const first = sortByDate(entries)[0]
  const date = settings.startDate ?? first?.date
  const kg = settings.startKg ?? first?.weightKg
  return date !== undefined && kg !== undefined ? { date, kg } : undefined
}

export function progressPercent(startKg: number, currentKg: number, goalKg: number): number {
  if (startKg === goalKg) return 100
  const p = ((startKg - currentKg) / (startKg - goalKg)) * 100
  return Math.min(100, Math.max(0, p))
}

export type RangeKey = '1m' | '3m' | '6m' | '1y' | 'all'

const RANGE_DAYS: Record<Exclude<RangeKey, 'all'>, number> = { '1m': 30, '3m': 91, '6m': 182, '1y': 365 }

export function rangeStart(today: ISODate, range: RangeKey): ISODate | undefined {
  return range === 'all' ? undefined : addDays(today, -RANGE_DAYS[range])
}

export function inRange(entries: Entry[], from: ISODate | undefined): Entry[] {
  return sortByDate(entries).filter((e) => from === undefined || e.date >= from)
}

export type RangeSummary = { change?: number; min: number; max: number; avg: number }

export function summarize(entries: Entry[]): RangeSummary | undefined {
  const sorted = sortByDate(entries)
  if (sorted.length === 0) return undefined
  const ws = sorted.map((e) => e.weightKg)
  return {
    change: ws.length >= 2 ? ws[ws.length - 1] - ws[0] : undefined,
    min: Math.min(...ws),
    max: Math.max(...ws),
    avg: ws.reduce((a, b) => a + b, 0) / ws.length,
  }
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/stats/stats.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/stats
git commit -m "feat: 이동평균, 기간 비교, 진행률 계산 함수 추가"
```

---

### Task 4: 백업 생성·검증·병합 (`backup.ts`)

**Files:**
- Create: `src/backup/backup.ts`
- Test: `src/backup/backup.test.ts`

**Interfaces:**
- Consumes: `Entry`, `Settings`, `ISODate`, `isValidISODate`, `DAY_MS`(date), `isValidWeight`, `MEMO_MAX`(validate), `sortByDate`(stats)
- Produces:
  - `BACKUP_VERSION = 1`, `BACKUP_REMINDER_DAYS = 30`
  - `type AppSnapshot = { entries: Entry[]; settings: Settings }`
  - `type BackupFile = { version: 1; exportedAt: string; entries: Entry[]; settings: Settings }`
  - `type ParseBackupResult = { ok: true; data: BackupFile } | { ok: false; error: string }`
  - `buildBackup(snapshot: AppSnapshot, now?: Date): BackupFile`
  - `backupFileName(today: ISODate): string`
  - `parseBackup(text: string): ParseBackupResult`
  - `mergeBackup(current: AppSnapshot, incoming: BackupFile): AppSnapshot`
  - `replaceWithBackup(incoming: BackupFile): AppSnapshot`
  - `shouldShowBackupReminder(entryCount: number, settings: Settings, now: number): boolean`

- [ ] **Step 1: 테스트 작성**

`src/backup/backup.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { DAY_MS } from '../lib/date'
import type { Entry } from '../types'
import {
  backupFileName,
  buildBackup,
  mergeBackup,
  parseBackup,
  replaceWithBackup,
  shouldShowBackupReminder,
} from './backup'

const e = (date: string, weightKg: number, memo?: string): Entry =>
  memo === undefined ? { date, weightKg, updatedAt: 1 } : { date, weightKg, memo, updatedAt: 1 }

const fileWith = (overrides: Record<string, unknown>) =>
  JSON.stringify({ version: 1, exportedAt: '2026-10-12T00:00:00.000Z', entries: [], settings: {}, ...overrides })

describe('buildBackup / parseBackup', () => {
  it('round-trips a snapshot', () => {
    const snapshot = { entries: [e('2026-10-02', 71, '야식'), e('2026-10-01', 70)], settings: { goalKg: 68 } }
    const file = buildBackup(snapshot, new Date('2026-10-12T09:00:00Z'))
    expect(file.exportedAt).toBe('2026-10-12T09:00:00.000Z')
    expect(file.entries.map((x) => x.date)).toEqual(['2026-10-01', '2026-10-02'])
    expect(parseBackup(JSON.stringify(file))).toEqual({ ok: true, data: file })
  })

  it('names the file by date', () => {
    expect(backupFileName('2026-10-12')).toBe('weight-backup-2026-10-12.json')
  })

  it('rejects broken JSON', () => {
    expect(parseBackup('{oops')).toEqual({ ok: false, error: '백업 파일을 읽을 수 없습니다. JSON 형식이 아닙니다.' })
  })

  it('rejects unknown versions and shapes', () => {
    expect(parseBackup(fileWith({ version: 2 }))).toEqual({ ok: false, error: '지원하지 않는 백업 버전입니다: 2' })
    expect(parseBackup('[]')).toEqual({ ok: false, error: '백업 파일 형식이 올바르지 않습니다.' })
    expect(parseBackup(fileWith({ entries: 'x' }))).toEqual({ ok: false, error: '백업 파일 형식이 올바르지 않습니다.' })
  })

  it('rejects invalid entries with their position', () => {
    const bad = [e('2026-10-01', 70), { date: '2026-10-02', weightKg: 500, updatedAt: 1 }]
    expect(parseBackup(fileWith({ entries: bad }))).toEqual({ ok: false, error: '2번째 기록이 올바르지 않습니다.' })
    const longMemo = [e('2026-10-01', 70, 'a'.repeat(201))]
    expect(parseBackup(fileWith({ entries: longMemo }))).toEqual({ ok: false, error: '1번째 기록이 올바르지 않습니다.' })
  })

  it('rejects duplicate dates', () => {
    const dup = [e('2026-10-01', 70), e('2026-10-01', 71)]
    expect(parseBackup(fileWith({ entries: dup }))).toEqual({
      ok: false,
      error: '같은 날짜의 기록이 두 번 있습니다: 2026-10-01',
    })
  })

  it('rejects invalid settings', () => {
    expect(parseBackup(fileWith({ settings: { goalKg: '68' } }))).toEqual({
      ok: false,
      error: '설정 값이 올바르지 않습니다.',
    })
  })

  it('strips unknown fields', () => {
    const r = parseBackup(
      fileWith({ entries: [{ ...e('2026-10-01', 70), extra: 1 }], settings: { goalKg: 68, theme: 'x' } }),
    )
    expect(r).toEqual({
      ok: true,
      data: {
        version: 1,
        exportedAt: '2026-10-12T00:00:00.000Z',
        entries: [e('2026-10-01', 70)],
        settings: { goalKg: 68 },
      },
    })
  })
})

describe('merge / replace', () => {
  const current = {
    entries: [e('2026-10-01', 70), e('2026-10-02', 71)],
    settings: { goalKg: 65, firstUseAt: 100 },
  }
  const incoming = {
    version: 1 as const,
    exportedAt: '',
    entries: [e('2026-10-03', 73), e('2026-10-02', 72)],
    settings: { goalKg: 68 },
  }

  it('merges with file values winning on conflicts', () => {
    expect(mergeBackup(current, incoming)).toEqual({
      entries: [e('2026-10-01', 70), e('2026-10-02', 72), e('2026-10-03', 73)],
      settings: { goalKg: 68, firstUseAt: 100 },
    })
  })

  it('replaces everything', () => {
    expect(replaceWithBackup(incoming)).toEqual({
      entries: [e('2026-10-02', 72), e('2026-10-03', 73)],
      settings: { goalKg: 68 },
    })
  })
})

describe('shouldShowBackupReminder', () => {
  const now = 1_000 * DAY_MS

  it('shows after 30 days since last backup or first use', () => {
    expect(shouldShowBackupReminder(1, { firstUseAt: now - 31 * DAY_MS }, now)).toBe(true)
    expect(shouldShowBackupReminder(1, { firstUseAt: now - 29 * DAY_MS }, now)).toBe(false)
    expect(
      shouldShowBackupReminder(1, { firstUseAt: now - 90 * DAY_MS, lastBackupAt: now - 2 * DAY_MS }, now),
    ).toBe(false)
  })

  it('stays hidden without entries or timestamps', () => {
    expect(shouldShowBackupReminder(0, { firstUseAt: now - 90 * DAY_MS }, now)).toBe(false)
    expect(shouldShowBackupReminder(3, {}, now)).toBe(false)
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/backup/backup.test.ts`
Expected: FAIL — `Failed to resolve import "./backup"`

- [ ] **Step 3: 구현**

`src/backup/backup.ts`:

```ts
import { DAY_MS, isValidISODate } from '../lib/date'
import { isValidWeight, MEMO_MAX } from '../lib/validate'
import { sortByDate } from '../stats/stats'
import type { Entry, ISODate, Settings } from '../types'

export const BACKUP_VERSION = 1
export const BACKUP_REMINDER_DAYS = 30

export type AppSnapshot = { entries: Entry[]; settings: Settings }
export type BackupFile = { version: 1; exportedAt: string; entries: Entry[]; settings: Settings }
export type ParseBackupResult = { ok: true; data: BackupFile } | { ok: false; error: string }

const INVALID_SHAPE = '백업 파일 형식이 올바르지 않습니다.'

export function buildBackup(snapshot: AppSnapshot, now: Date = new Date()): BackupFile {
  return {
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    entries: sortByDate(snapshot.entries),
    settings: snapshot.settings,
  }
}

export function backupFileName(today: ISODate): string {
  return `weight-backup-${today}.json`
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function parseEntry(v: unknown): Entry | undefined {
  if (!isObject(v)) return undefined
  const { date, weightKg, memo, updatedAt } = v
  if (!isValidISODate(date) || !isValidWeight(weightKg) || !isFiniteNumber(updatedAt)) return undefined
  if (memo === undefined) return { date, weightKg, updatedAt }
  if (typeof memo !== 'string' || memo.length > MEMO_MAX) return undefined
  return { date, weightKg, memo, updatedAt }
}

function parseSettings(v: unknown): Settings | undefined {
  if (!isObject(v)) return undefined
  const s: Settings = {}
  if (v.goalKg !== undefined) {
    if (!isValidWeight(v.goalKg)) return undefined
    s.goalKg = v.goalKg
  }
  if (v.startKg !== undefined) {
    if (!isValidWeight(v.startKg)) return undefined
    s.startKg = v.startKg
  }
  if (v.startDate !== undefined) {
    if (!isValidISODate(v.startDate)) return undefined
    s.startDate = v.startDate
  }
  if (v.lastBackupAt !== undefined) {
    if (!isFiniteNumber(v.lastBackupAt)) return undefined
    s.lastBackupAt = v.lastBackupAt
  }
  if (v.firstUseAt !== undefined) {
    if (!isFiniteNumber(v.firstUseAt)) return undefined
    s.firstUseAt = v.firstUseAt
  }
  return s
}

export function parseBackup(text: string): ParseBackupResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: '백업 파일을 읽을 수 없습니다. JSON 형식이 아닙니다.' }
  }
  if (!isObject(raw)) return { ok: false, error: INVALID_SHAPE }
  if (raw.version !== BACKUP_VERSION) {
    return { ok: false, error: `지원하지 않는 백업 버전입니다: ${String(raw.version)}` }
  }
  if (!Array.isArray(raw.entries)) return { ok: false, error: INVALID_SHAPE }

  const entries: Entry[] = []
  const seen = new Set<string>()
  for (const [i, item] of raw.entries.entries()) {
    const entry = parseEntry(item)
    if (!entry) return { ok: false, error: `${i + 1}번째 기록이 올바르지 않습니다.` }
    if (seen.has(entry.date)) return { ok: false, error: `같은 날짜의 기록이 두 번 있습니다: ${entry.date}` }
    seen.add(entry.date)
    entries.push(entry)
  }

  const settings = parseSettings(raw.settings)
  if (!settings) return { ok: false, error: '설정 값이 올바르지 않습니다.' }

  const exportedAt = typeof raw.exportedAt === 'string' ? raw.exportedAt : ''
  return { ok: true, data: { version: BACKUP_VERSION, exportedAt, entries, settings } }
}

export function mergeBackup(current: AppSnapshot, incoming: BackupFile): AppSnapshot {
  const byDate = new Map(current.entries.map((e) => [e.date, e]))
  for (const e of incoming.entries) byDate.set(e.date, e)
  return {
    entries: sortByDate([...byDate.values()]),
    settings: { ...current.settings, ...incoming.settings },
  }
}

export function replaceWithBackup(incoming: BackupFile): AppSnapshot {
  return { entries: sortByDate(incoming.entries), settings: incoming.settings }
}

export function shouldShowBackupReminder(entryCount: number, settings: Settings, now: number): boolean {
  const since = settings.lastBackupAt ?? settings.firstUseAt
  return entryCount > 0 && since !== undefined && now - since > BACKUP_REMINDER_DAYS * DAY_MS
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/backup/backup.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/backup
git commit -m "feat: 백업 파일 생성·검증·병합과 백업 경고 판정 추가"
```

---

### Task 5: IndexedDB 저장소 (`storage.ts`)

**Files:**
- Create: `src/db/storage.ts`
- Test: `src/db/storage.test.ts`

**Interfaces:**
- Consumes: `Entry`, `Settings`, `ISODate`, `AppSnapshot`(backup), `sortByDate`(stats)
- Produces:
  - `DEFAULT_DB_NAME = 'weight-record'`
  - `type WeightStore = { getEntries(): Promise<Entry[]>; putEntry(entry: Entry): Promise<void>; deleteEntry(date: ISODate): Promise<void>; getSettings(): Promise<Settings>; saveSettings(settings: Settings): Promise<void>; replaceAll(snapshot: AppSnapshot): Promise<void> }`
  - `openWeightStore(name?: string): Promise<WeightStore>` (IndexedDB 사용 불가 시 reject)

- [ ] **Step 1: 테스트 작성**

`src/db/storage.test.ts`:

```ts
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
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/db/storage.test.ts`
Expected: FAIL — `Failed to resolve import "./storage"`

- [ ] **Step 3: 구현**

`src/db/storage.ts`:

```ts
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
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/db/storage.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/db
git commit -m "feat: IndexedDB 저장소 래퍼 추가"
```

---

### Task 6: 앱 셸과 홈 화면(기록 입력·목표 진행·비교)

**Files:**
- Create: `src/ui/format.ts`, `src/ui/useAppData.ts`, `src/ui/EntryForm.tsx`, `src/ui/GoalProgress.tsx`, `src/ui/ComparisonPanel.tsx`, `src/ui/HomeScreen.tsx`, `src/test/renderApp.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`, `src/index.css`
- Delete: `src/smoke.test.tsx` (App 시그니처가 바뀜. 대체 테스트가 `src/App.test.tsx`)
- Test: `src/ui/format.test.ts`, `src/App.test.tsx`

**Interfaces:**
- Consumes: Task 2~5의 모든 export
- Produces:
  - `format.ts`: `fmtKg(v?: number): string`, `fmtDelta(v?: number): string`, `trendArrow(v?: number): string`, `fmtDate(d: ISODate): string`, `fmtPercent(v: number): string`, `fmtPeriod(key: string, unit: PeriodUnit): string`
  - `useAppData.ts`: `type AppState = AppSnapshot & { saveEntry(date: ISODate, weightKg: number, memo: string): Promise<void>; deleteEntry(date: ISODate): Promise<void>; updateSettings(patch: Partial<Settings>): Promise<void>; applySnapshot(snapshot: AppSnapshot): Promise<void> }`, `useAppData(store: WeightStore): AppState | null`
  - `EntryForm` props: `{ entries: Entry[]; today: ISODate; initialDate?: ISODate; onSave: (date: ISODate, weightKg: number, memo: string) => Promise<void> }`
  - `App` props: `{ store: WeightStore; clock?: () => number }` — 내부 `type Tab = 'home' | 'chart' | 'history'`
  - `HomeScreen` props: `{ app: AppState; today: ISODate; onGoSettings: () => void }`
  - `renderApp(options?: { seed?: (store: WeightStore) => Promise<void>; now?: number }): Promise<{ store: WeightStore; user: UserEvent; setNow: (t: number) => void }>`, `NOW`(2026-10-12 09:00 로컬 ms)

- [ ] **Step 1: 표시 형식 테스트 작성**

`src/ui/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { fmtDate, fmtDelta, fmtKg, fmtPercent, fmtPeriod, trendArrow } from './format'

describe('format', () => {
  it('formats kilograms', () => {
    expect(fmtKg(72.4)).toBe('72.4')
    expect(fmtKg(72)).toBe('72.0')
    expect(fmtKg(undefined)).toBe('–')
  })

  it('formats signed deltas without negative zero', () => {
    expect(fmtDelta(73.0 - 72.4)).toBe('+0.6')
    expect(fmtDelta(72.4 - 73.0)).toBe('-0.6')
    expect(fmtDelta(-0.04)).toBe('0.0')
    expect(fmtDelta(undefined)).toBe('–')
  })

  it('shows trend arrows', () => {
    expect(trendArrow(-0.6)).toBe('▼')
    expect(trendArrow(0.6)).toBe('▲')
    expect(trendArrow(0.01)).toBe('')
    expect(trendArrow(undefined)).toBe('')
  })

  it('formats dates, percents and periods', () => {
    expect(fmtDate('2026-10-12')).toBe('10월 12일 (월)')
    expect(fmtPercent(49.6)).toBe('50%')
    expect(fmtPeriod('2026-10-12', 'week')).toBe('10/12 주')
    expect(fmtPeriod('2026-10', 'month')).toBe('2026년 10월')
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/ui/format.test.ts`
Expected: FAIL — `Failed to resolve import "./format"`

- [ ] **Step 3: 표시 형식 구현**

`src/ui/format.ts`:

```ts
import type { PeriodUnit } from '../stats/stats'
import type { ISODate } from '../types'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function round1(v: number): number {
  const r = Math.round(v * 10) / 10
  return r === 0 ? 0 : r
}

export function fmtKg(v?: number): string {
  return v === undefined ? '–' : round1(v).toFixed(1)
}

export function fmtDelta(v?: number): string {
  if (v === undefined) return '–'
  const r = round1(v)
  return r > 0 ? `+${r.toFixed(1)}` : r.toFixed(1)
}

export function trendArrow(v?: number): string {
  if (v === undefined) return ''
  const r = round1(v)
  return r < 0 ? '▼' : r > 0 ? '▲' : ''
}

export function fmtDate(d: ISODate): string {
  const [y, m, day] = d.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, day)).getUTCDay()
  return `${m}월 ${day}일 (${WEEKDAYS[dow]})`
}

export function fmtPercent(v: number): string {
  return `${Math.round(v)}%`
}

export function fmtPeriod(key: string, unit: PeriodUnit): string {
  const [y, m, d] = key.split('-').map(Number)
  return unit === 'week' ? `${m}/${d} 주` : `${y}년 ${m}월`
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/ui/format.test.ts`
Expected: PASS

- [ ] **Step 5: 홈 화면 테스트 헬퍼와 테스트 작성**

`src/test/renderApp.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { openWeightStore, type WeightStore } from '../db/storage'

// 2026-10-12(월) 09:00 로컬 시각
export const NOW = new Date(2026, 9, 12, 9, 0).getTime()

export async function renderApp(options: { seed?: (store: WeightStore) => Promise<void>; now?: number } = {}) {
  const store = await openWeightStore(`test-${crypto.randomUUID()}`)
  if (options.seed) await options.seed(store)
  let now = options.now ?? NOW
  const user = userEvent.setup()
  render(<App store={store} clock={() => now} />)
  await screen.findByRole('navigation')
  const setNow = (t: number) => {
    now = t
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
  }
  return { store, user, setNow }
}
```

`src/App.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { NOW, renderApp } from './test/renderApp'
import type { Entry } from './types'

const e = (date: string, weightKg: number, memo?: string): Entry =>
  memo === undefined ? { date, weightKg, updatedAt: 1 } : { date, weightKg, memo, updatedAt: 1 }

describe('home screen', () => {
  it('shows a hint when empty and saves the first entry', async () => {
    const { store, user } = await renderApp()
    expect(screen.getByText(/첫 체중을 기록해 보세요/)).toBeInTheDocument()

    await user.type(screen.getByLabelText('체중(kg)'), '72.4')
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(await screen.findByRole('status')).toHaveTextContent('저장했습니다.')
    expect(await store.getEntries()).toEqual([
      { date: '2026-10-12', weightKg: 72.4, updatedAt: expect.any(Number) },
    ])
    expect(within(screen.getByRole('region', { name: '목표 진행' })).getByText('72.4')).toBeInTheDocument()
  })

  it('shows a validation error and does not save', async () => {
    const { store, user } = await renderApp()
    await user.type(screen.getByLabelText('체중(kg)'), 'abc')
    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(screen.getByRole('alert')).toHaveTextContent('체중은 숫자로, 소수점 한 자리까지 입력해 주세요.')
    expect(await store.getEntries()).toEqual([])
  })

  it('rejects a future date', async () => {
    const { store, user } = await renderApp()
    fireEvent.change(screen.getByLabelText('날짜'), { target: { value: '2026-10-13' } })
    await user.type(screen.getByLabelText('체중(kg)'), '72.4')
    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(screen.getByRole('alert')).toHaveTextContent('미래 날짜에는 기록할 수 없습니다.')
    expect(await store.getEntries()).toEqual([])
  })

  it('stores whitespace-only memo as no memo', async () => {
    const { store, user } = await renderApp()
    await user.type(screen.getByLabelText('체중(kg)'), '72.4')
    await user.type(screen.getByLabelText('메모'), '   ')
    await user.click(screen.getByRole('button', { name: '저장' }))
    await screen.findByRole('status')
    expect((await store.getEntries())[0]).not.toHaveProperty('memo')
  })

  it('prefills with the latest weight and warns on large jumps without blocking', async () => {
    const { store, user } = await renderApp({ seed: (s) => s.putEntry(e('2026-10-11', 72.0)) })
    const input = screen.getByLabelText('체중(kg)')
    expect(input).toHaveValue('72.0')

    await user.clear(input)
    await user.type(input, '76.0')
    expect(screen.getByText(/3kg 넘게 차이 나요/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '저장' }))
    await screen.findByRole('status')
    expect((await store.getEntries()).map((x) => x.weightKg)).toEqual([72, 76])
  })

  it('loads the existing memo when a past date is selected', async () => {
    await renderApp({ seed: (s) => s.putEntry(e('2026-10-10', 73.1, '회식')) })
    fireEvent.change(screen.getByLabelText('날짜'), { target: { value: '2026-10-10' } })
    expect(screen.getByLabelText('체중(kg)')).toHaveValue('73.1')
    expect(screen.getByLabelText('메모')).toHaveValue('회식')
    expect(screen.getByText('10월 10일 (토)')).toBeInTheDocument()
  })

  it('shows week, month and weekly-average comparisons', async () => {
    await renderApp({
      seed: async (s) => {
        await s.putEntry(e('2026-09-12', 74.2))
        await s.putEntry(e('2026-10-05', 73.0))
        await s.putEntry(e('2026-10-12', 72.4))
      },
    })
    const panel = within(screen.getByRole('region', { name: '비교' }))
    expect(panel.getByText(/지난주 대비/).nextElementSibling).toHaveTextContent('-0.6 ▼')
    expect(panel.getByText(/지난달 대비/).nextElementSibling).toHaveTextContent('-1.8 ▼')
    expect(panel.getByText(/이번 주 평균/).nextElementSibling).toHaveTextContent('72.4 (지난주 73.0)')
  })

  it('shows goal progress or a link to set one', async () => {
    await renderApp({
      seed: async (s) => {
        await s.putEntry(e('2026-10-01', 76.8))
        await s.putEntry(e('2026-10-12', 72.4))
      },
    })
    expect(screen.getByRole('button', { name: '목표를 설정해 보세요' })).toBeInTheDocument()
  })

  it('computes progress toward the goal', async () => {
    await renderApp({
      seed: async (s) => {
        await s.putEntry(e('2026-10-01', 76.8))
        await s.putEntry(e('2026-10-12', 72.4))
        await s.saveSettings({ goalKg: 68 })
      },
    })
    const goal = within(screen.getByRole('region', { name: '목표 진행' }))
    expect(goal.getByText('50%')).toBeInTheDocument()
    expect(goal.getByText('목표까지 4.4kg')).toBeInTheDocument()
    expect(goal.getByText(/시작 대비/).nextElementSibling).toHaveTextContent('-4.4')
  })

  it('refreshes today when the app becomes visible again', async () => {
    const { setNow } = await renderApp()
    expect(screen.getByText('10월 12일 (월)')).toBeInTheDocument()
    setNow(NOW + 24 * 60 * 60 * 1000)
    expect(await screen.findByText('10월 13일 (화)')).toBeInTheDocument()
    expect(screen.getByLabelText('날짜')).toHaveValue('2026-10-13')
  })
})
```

- [ ] **Step 6: 실패 확인**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — `App`이 `store`를 받지 않아 `navigation`을 찾지 못하거나 모듈 해석 실패.

- [ ] **Step 7: 상태 훅 구현**

`src/ui/useAppData.ts`:

```ts
import { useCallback, useEffect, useState } from 'react'
import type { AppSnapshot } from '../backup/backup'
import type { WeightStore } from '../db/storage'
import type { ISODate, Settings } from '../types'

export type AppState = AppSnapshot & {
  saveEntry(date: ISODate, weightKg: number, memo: string): Promise<void>
  deleteEntry(date: ISODate): Promise<void>
  updateSettings(patch: Partial<Settings>): Promise<void>
  applySnapshot(snapshot: AppSnapshot): Promise<void>
}

export function useAppData(store: WeightStore): AppState | null {
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null)

  const reload = useCallback(async () => {
    setSnapshot({ entries: await store.getEntries(), settings: await store.getSettings() })
  }, [store])

  useEffect(() => {
    void (async () => {
      const settings = await store.getSettings()
      if (settings.firstUseAt === undefined) await store.saveSettings({ ...settings, firstUseAt: Date.now() })
      await reload()
    })()
  }, [store, reload])

  if (!snapshot) return null

  return {
    ...snapshot,
    async saveEntry(date, weightKg, memo) {
      const trimmed = memo.trim()
      const updatedAt = Date.now()
      await store.putEntry(trimmed ? { date, weightKg, memo: trimmed, updatedAt } : { date, weightKg, updatedAt })
      await reload()
    },
    async deleteEntry(date) {
      await store.deleteEntry(date)
      await reload()
    },
    async updateSettings(patch) {
      await store.saveSettings({ ...(await store.getSettings()), ...patch })
      await reload()
    },
    async applySnapshot(next) {
      await store.replaceAll(next)
      await reload()
    },
  }
}
```

- [ ] **Step 8: 입력 폼 구현**

`src/ui/EntryForm.tsx`:

```tsx
import { useState, type FormEvent } from 'react'
import { isLargeJump, JUMP_WARN_KG, MEMO_MAX, parseWeight } from '../lib/validate'
import { latestEntry, previousEntry } from '../stats/stats'
import type { Entry, ISODate } from '../types'
import { fmtDate, fmtKg } from './format'

type Props = {
  entries: Entry[]
  today: ISODate
  initialDate?: ISODate
  onSave: (date: ISODate, weightKg: number, memo: string) => Promise<void>
}

export function EntryForm({ entries, today, initialDate = today, onSave }: Props) {
  const defaultsFor = (d: ISODate) => {
    const own = entries.find((x) => x.date === d)
    const base = own ?? latestEntry(entries)
    return { weight: base ? base.weightKg.toFixed(1) : '', memo: own?.memo ?? '' }
  }

  const [date, setDate] = useState(initialDate)
  const [weight, setWeight] = useState(() => defaultsFor(initialDate).weight)
  const [memo, setMemo] = useState(() => defaultsFor(initialDate).memo)
  const [error, setError] = useState<string>()
  const [status, setStatus] = useState<string>()

  const parsed = parseWeight(weight)
  const prev = previousEntry(entries, date)
  const warn = parsed.ok && isLargeJump(prev?.weightKg, parsed.value)

  function changeDate(d: ISODate) {
    const defaults = defaultsFor(d)
    setDate(d)
    setWeight(defaults.weight)
    setMemo(defaults.memo)
    setError(undefined)
    setStatus(undefined)
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    if (date > today) {
      setError('미래 날짜에는 기록할 수 없습니다.')
      return
    }
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    setError(undefined)
    await onSave(date, parsed.value, memo)
    setStatus('저장했습니다.')
  }

  return (
    // noValidate: 브라우저 기본 검증(max 날짜 등) 대신 아래 오류 문구로 안내한다.
    <form className="card entry-form" noValidate onSubmit={submit}>
      <div className="date-row">
        <strong>{fmtDate(date)}</strong>
        <label>
          날짜
          <input type="date" value={date} max={today} onChange={(ev) => ev.target.value && changeDate(ev.target.value)} />
        </label>
      </div>
      <label className="weight-field">
        체중(kg)
        <input
          inputMode="decimal"
          autoComplete="off"
          value={weight}
          onChange={(ev) => {
            setWeight(ev.target.value)
            setStatus(undefined)
          }}
        />
      </label>
      <label>
        메모
        <input value={memo} maxLength={MEMO_MAX} onChange={(ev) => setMemo(ev.target.value)} />
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!error && warn && (
        <p className="warning">
          직전 기록({fmtKg(prev?.weightKg)}kg)과 {JUMP_WARN_KG}kg 넘게 차이 나요. 입력값을 확인해 주세요.
        </p>
      )}
      {status && <p role="status">{status}</p>}
      <button type="submit" className="primary">
        저장
      </button>
    </form>
  )
}
```

- [ ] **Step 9: 목표 진행·비교 카드 구현**

`src/ui/GoalProgress.tsx`:

```tsx
import { effectiveStart, latestEntry, progressPercent } from '../stats/stats'
import type { Entry, Settings } from '../types'
import { fmtDelta, fmtKg, fmtPercent } from './format'

type Props = { entries: Entry[]; settings: Settings; onGoSettings: () => void }

export function GoalProgress({ entries, settings, onGoSettings }: Props) {
  const latest = latestEntry(entries)
  const start = effectiveStart(entries, settings)
  if (!latest || !start) return null
  const goal = settings.goalKg
  const pct = goal === undefined ? undefined : progressPercent(start.kg, latest.weightKg, goal)

  return (
    <section className="card" aria-label="목표 진행">
      <dl className="stats">
        <div>
          <dt>현재</dt>
          <dd>{fmtKg(latest.weightKg)}</dd>
        </div>
        <div>
          <dt>시작 대비</dt>
          <dd>{fmtDelta(latest.weightKg - start.kg)}</dd>
        </div>
        {goal !== undefined && (
          <div>
            <dt>목표</dt>
            <dd>{fmtKg(goal)}</dd>
          </div>
        )}
      </dl>
      {goal === undefined || pct === undefined ? (
        <button type="button" className="link" onClick={onGoSettings}>
          목표를 설정해 보세요
        </button>
      ) : (
        <div className="progress">
          <progress value={pct} max={100} aria-label="목표 진행률" />
          <div className="progress-text">
            <span>{fmtPercent(pct)}</span>
            <span>{pct >= 100 ? '목표 달성!' : `목표까지 ${fmtKg(Math.abs(latest.weightKg - goal))}kg`}</span>
          </div>
        </div>
      )}
    </section>
  )
}
```

`src/ui/ComparisonPanel.tsx`:

```tsx
import { changeVsDaysAgo, weekComparison } from '../stats/stats'
import type { Entry } from '../types'
import { fmtDelta, fmtKg, trendArrow } from './format'

export function ComparisonPanel({ entries }: { entries: Entry[] }) {
  const week = changeVsDaysAgo(entries, 7)
  const month = changeVsDaysAgo(entries, 30)
  const { thisWeek, lastWeek } = weekComparison(entries)
  const delta = (v?: number) => `${fmtDelta(v)} ${trendArrow(v)}`.trim()

  return (
    <section className="card" aria-label="비교">
      <dl className="rows">
        <div>
          <dt>지난주 대비</dt>
          <dd>{delta(week)}</dd>
        </div>
        <div>
          <dt>지난달 대비</dt>
          <dd>{delta(month)}</dd>
        </div>
        <div>
          <dt>이번 주 평균</dt>
          <dd>
            {fmtKg(thisWeek)} <small>(지난주 {fmtKg(lastWeek)})</small>
          </dd>
        </div>
      </dl>
    </section>
  )
}
```

- [ ] **Step 10: 홈 화면과 App 셸 구현**

`src/ui/HomeScreen.tsx`:

```tsx
import type { ISODate } from '../types'
import { ComparisonPanel } from './ComparisonPanel'
import { EntryForm } from './EntryForm'
import { GoalProgress } from './GoalProgress'
import type { AppState } from './useAppData'

type Props = { app: AppState; today: ISODate; onGoSettings: () => void }

export function HomeScreen({ app, today, onGoSettings }: Props) {
  return (
    <>
      <EntryForm key={today} entries={app.entries} today={today} onSave={app.saveEntry} />
      {app.entries.length === 0 ? (
        <p className="hint">첫 체중을 기록해 보세요. 기록이 쌓이면 추세와 비교가 여기에 표시됩니다.</p>
      ) : (
        <>
          <GoalProgress entries={app.entries} settings={app.settings} onGoSettings={onGoSettings} />
          <ComparisonPanel entries={app.entries} />
        </>
      )}
    </>
  )
}
```

`src/App.tsx`:

```tsx
import { useEffect, useState } from 'react'
import type { WeightStore } from './db/storage'
import { todayLocal } from './lib/date'
import { HomeScreen } from './ui/HomeScreen'
import { useAppData } from './ui/useAppData'

type Tab = 'home' | 'chart' | 'history'

const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: '홈' },
  { id: 'chart', label: '그래프' },
  { id: 'history', label: '기록·설정' },
]

type Props = { store: WeightStore; clock?: () => number }

export default function App({ store, clock = Date.now }: Props) {
  const app = useAppData(store)
  const [tab, setTab] = useState<Tab>('home')
  const [now, setNow] = useState(clock)

  // 자정을 넘겨 백그라운드에 있던 앱을 다시 열면 "오늘"을 갱신한다.
  useEffect(() => {
    const refresh = () => setNow(clock())
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [clock])

  if (!app) return <p className="hint">불러오는 중…</p>
  const today = todayLocal(new Date(now))

  return (
    <div className="app">
      <main>
        {tab === 'home' && <HomeScreen app={app} today={today} onGoSettings={() => setTab('history')} />}
        {tab === 'chart' && <p className="hint">그래프 화면</p>}
        {tab === 'history' && <p className="hint">기록·설정 화면</p>}
      </main>
      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
```

(`chart`/`history` 탭의 임시 문구는 Task 7, 8에서 실제 화면으로 교체한다.)

`src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { openWeightStore } from './db/storage'
import './index.css'

const root = createRoot(document.getElementById('root')!)

void openWeightStore().then((store) =>
  root.render(
    <StrictMode>
      <App store={store} />
    </StrictMode>,
  ),
)
```

삭제: `git rm src/smoke.test.tsx`

- [ ] **Step 11: 전역 스타일**

`src/index.css`:

```css
:root {
  --bg: #f4f6f5;
  --card: #ffffff;
  --text: #1c2421;
  --muted: #5f6b66;
  --accent: #2f6f5e;
  --goal: #c0662b;
  --danger: #b3261e;
  --warn-bg: #fff4e0;
  --border: #dde3e0;
  color-scheme: light dark;
  font-family: system-ui, -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
  color: var(--text);
  background: var(--bg);
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #121615;
    --card: #1c2220;
    --text: #e6ebe9;
    --muted: #9aa6a1;
    --accent: #6cc3a8;
    --goal: #f0a46b;
    --danger: #f2b8b5;
    --warn-bg: #3a2e1a;
    --border: #2e3633;
  }
}

* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); }
.app { max-width: 480px; margin: 0 auto; min-height: 100dvh; padding-bottom: 72px; }
main { padding: 16px; display: grid; gap: 12px; }
.card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 16px; }
.hint { color: var(--muted); text-align: center; margin: 16px 0; }
label { display: grid; gap: 4px; font-size: 0.85rem; color: var(--muted); }
input { font: inherit; color: var(--text); background: transparent; border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; }
button { font: inherit; border-radius: 10px; border: 1px solid var(--border); background: var(--card); color: var(--text); padding: 10px 14px; }
button.primary { background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600; }
button.link { border: none; background: none; color: var(--accent); padding: 0; text-decoration: underline; }
button.danger { color: var(--danger); }
.entry-form { display: grid; gap: 12px; }
.date-row { display: flex; justify-content: space-between; align-items: end; gap: 12px; }
.date-row strong { font-size: 1.1rem; }
.weight-field input { font-size: 2rem; font-weight: 700; text-align: center; }
.error { color: var(--danger); margin: 0; }
.warning { background: var(--warn-bg); border-radius: 8px; padding: 8px 10px; margin: 0; }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 8px; margin: 0; }
.stats dt { color: var(--muted); font-size: 0.8rem; }
.stats dd { margin: 0; font-size: 1.3rem; font-weight: 700; }
.rows { margin: 0; display: grid; gap: 8px; }
.rows > div { display: flex; justify-content: space-between; }
.rows dd { margin: 0; font-weight: 600; }
.progress { margin-top: 12px; }
.progress progress { width: 100%; height: 12px; accent-color: var(--accent); }
.progress-text { display: flex; justify-content: space-between; font-size: 0.9rem; }
.tabs { position: fixed; bottom: 0; left: 0; right: 0; display: flex; justify-content: center; background: var(--card); border-top: 1px solid var(--border); padding-bottom: env(safe-area-inset-bottom); }
.tabs button { flex: 1; max-width: 160px; border: none; border-radius: 0; background: none; padding: 14px 0; color: var(--muted); }
.tabs button[aria-current='page'] { color: var(--accent); font-weight: 700; }
```

- [ ] **Step 12: 통과 확인**

Run: `npm test`
Expected: 모든 테스트 PASS

Run: `npm run build`
Expected: 타입 오류 없이 빌드 성공

- [ ] **Step 13: 커밋**

```bash
git add -A
git commit -m "feat: 앱 셸과 홈 화면(기록 입력, 목표 진행, 기간 비교) 추가"
```

---

### Task 7: 기록 목록·설정·백업

**Files:**
- Create: `src/ui/download.ts`, `src/ui/BackupBanner.tsx`, `src/ui/HistoryScreen.tsx`, `src/ui/SettingsPanel.tsx`
- Modify: `src/App.tsx`, `src/ui/HomeScreen.tsx`, `src/index.css`
- Test: `src/ui/HistoryScreen.test.tsx`

**Interfaces:**
- Consumes: `AppState`, `useAppData`(Task 6), `EntryForm`, `format.ts`, `buildBackup`, `backupFileName`, `parseBackup`, `mergeBackup`, `replaceWithBackup`, `shouldShowBackupReminder`, `BackupFile`(Task 4), `parseWeight`(Task 2), `sortByDate`(Task 3), `renderApp`, `NOW`(Task 6)
- Produces:
  - `downloadBackup(backup: BackupFile, fileName: string): void`
  - `BackupBanner` props `{ entryCount: number; settings: Settings; now: number; onExport: () => void }`
  - `HistoryScreen` props `{ app: AppState; today: ISODate; onExport: () => void }`
  - `SettingsPanel` props `{ app: AppState; onExport: () => void }`
  - `HomeScreen` props에 `now: number; onExport: () => void` 추가

- [ ] **Step 1: 테스트 작성**

`src/ui/HistoryScreen.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { DAY_MS } from '../lib/date'
import { NOW, renderApp } from '../test/renderApp'
import type { Entry } from '../types'
import { downloadBackup } from './download'

vi.mock('./download', () => ({ downloadBackup: vi.fn() }))

const e = (date: string, weightKg: number, memo?: string): Entry =>
  memo === undefined ? { date, weightKg, updatedAt: 1 } : { date, weightKg, memo, updatedAt: 1 }

const backupJson = (entries: Entry[], settings: object = {}) =>
  new File([JSON.stringify({ version: 1, exportedAt: '2026-10-01T00:00:00.000Z', entries, settings })], 'b.json', {
    type: 'application/json',
  })

beforeEach(() => {
  vi.mocked(downloadBackup).mockClear()
  vi.restoreAllMocks()
})

async function openHistory(seed?: Parameters<typeof renderApp>[0]) {
  const ctx = await renderApp(seed)
  await ctx.user.click(screen.getByRole('button', { name: '기록·설정' }))
  return ctx
}

describe('history list', () => {
  it('lists entries newest first with deltas and memos', async () => {
    await openHistory({
      seed: async (s) => {
        await s.putEntry(e('2026-10-10', 73.0))
        await s.putEntry(e('2026-10-12', 72.4, '운동함'))
      },
    })
    const rows = within(screen.getByRole('region', { name: '기록 목록' })).getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('10월 12일 (월)')
    expect(rows[0]).toHaveTextContent('72.4')
    expect(rows[0]).toHaveTextContent('-0.6')
    expect(rows[0]).toHaveTextContent('운동함')
    expect(rows[1]).toHaveTextContent('10월 10일 (토)')
  })

  it('edits an entry', async () => {
    const { store, user } = await openHistory({ seed: (s) => s.putEntry(e('2026-10-10', 73.0)) })
    await user.click(screen.getByRole('button', { name: /10월 10일/ }))
    const input = screen.getByLabelText('체중(kg)')
    expect(input).toHaveValue('73.0')
    await user.clear(input)
    await user.type(input, '72.8')
    await user.click(screen.getByRole('button', { name: '저장' }))
    await screen.findByRole('status')
    expect((await store.getEntries())[0].weightKg).toBe(72.8)
  })

  it('deletes only after confirmation', async () => {
    const { store, user } = await openHistory({ seed: (s) => s.putEntry(e('2026-10-10', 73.0)) })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    await user.click(screen.getByRole('button', { name: /10월 10일/ }))

    await user.click(screen.getByRole('button', { name: '삭제' }))
    expect(await store.getEntries()).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: '삭제' }))
    expect(confirm).toHaveBeenCalledTimes(2)
    expect(await screen.findByText('아직 기록이 없습니다.')).toBeInTheDocument()
    expect(await store.getEntries()).toEqual([])
  })
})

describe('settings', () => {
  it('saves a goal that shows on the home screen', async () => {
    const { store, user } = await openHistory({ seed: (s) => s.putEntry(e('2026-10-12', 72.4)) })
    await user.type(screen.getByLabelText('목표 체중(kg)'), '68')
    await user.click(screen.getByRole('button', { name: '설정 저장' }))
    expect(await screen.findByText('설정을 저장했습니다.')).toBeInTheDocument()
    expect((await store.getSettings()).goalKg).toBe(68)

    await user.click(screen.getByRole('button', { name: '홈' }))
    expect(within(screen.getByRole('region', { name: '목표 진행' })).getByText('68.0')).toBeInTheDocument()
  })

  it('rejects an invalid goal', async () => {
    const { store, user } = await openHistory()
    await user.type(screen.getByLabelText('목표 체중(kg)'), '10')
    await user.click(screen.getByRole('button', { name: '설정 저장' }))
    expect(screen.getByRole('alert')).toHaveTextContent('체중은 20~300kg 사이로 입력해 주세요.')
    expect((await store.getSettings()).goalKg).toBeUndefined()
  })

  it('clears the goal when the field is emptied', async () => {
    const { store, user } = await openHistory({
      seed: async (s) => {
        await s.putEntry(e('2026-10-12', 72.4))
        await s.saveSettings({ goalKg: 68 })
      },
    })
    const goal = screen.getByLabelText('목표 체중(kg)')
    expect(goal).toHaveValue('68.0')
    await user.clear(goal)
    await user.click(screen.getByRole('button', { name: '설정 저장' }))
    await screen.findByText('설정을 저장했습니다.')
    expect((await store.getSettings()).goalKg).toBeUndefined()

    await user.click(screen.getByRole('button', { name: '홈' }))
    expect(screen.getByRole('button', { name: '목표를 설정해 보세요' })).toBeInTheDocument()
  })

  it('opens settings from the home goal link', async () => {
    const { user } = await renderApp({ seed: (s) => s.putEntry(e('2026-10-12', 72.4)) })
    await user.click(screen.getByRole('button', { name: '목표를 설정해 보세요' }))
    expect(screen.getByLabelText('목표 체중(kg)')).toBeInTheDocument()
  })
})

describe('backup', () => {
  it('exports and records the backup time', async () => {
    const { store, user } = await openHistory({ seed: (s) => s.putEntry(e('2026-10-12', 72.4)) })
    await user.click(screen.getByRole('button', { name: '백업 내보내기' }))
    expect(downloadBackup).toHaveBeenCalledWith(
      expect.objectContaining({ version: 1, entries: [e('2026-10-12', 72.4)] }),
      'weight-backup-2026-10-12.json',
    )
    await vi.waitFor(async () => expect((await store.getSettings()).lastBackupAt).toEqual(expect.any(Number)))
  })

  it('merges an imported file', async () => {
    const { store, user } = await openHistory({ seed: (s) => s.putEntry(e('2026-10-01', 70)) })
    await user.upload(screen.getByLabelText('백업 가져오기'), backupJson([e('2026-10-01', 71), e('2026-10-02', 72)]))
    expect(await screen.findByText('가져올 기록 2개')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '가져오기 실행' }))
    expect(await screen.findByText('기록 2개를 가져왔습니다.')).toBeInTheDocument()
    expect(await store.getEntries()).toEqual([e('2026-10-01', 71), e('2026-10-02', 72)])
  })

  it('replaces after confirmation', async () => {
    const { store, user } = await openHistory({ seed: (s) => s.putEntry(e('2026-09-01', 75)) })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await user.upload(screen.getByLabelText('백업 가져오기'), backupJson([e('2026-10-02', 72)]))
    await user.click(await screen.findByLabelText('전체 교체'))
    await user.click(screen.getByRole('button', { name: '가져오기 실행' }))
    await screen.findByText('기록 1개를 가져왔습니다.')
    expect(await store.getEntries()).toEqual([e('2026-10-02', 72)])
  })

  it('shows an error for a broken file and changes nothing', async () => {
    const { store, user } = await openHistory({ seed: (s) => s.putEntry(e('2026-10-01', 70)) })
    await user.upload(screen.getByLabelText('백업 가져오기'), new File(['{oops'], 'b.json', { type: 'application/json' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('JSON 형식이 아닙니다')
    expect(screen.queryByRole('button', { name: '가져오기 실행' })).not.toBeInTheDocument()
    expect(await store.getEntries()).toEqual([e('2026-10-01', 70)])
  })

  it('settings form shows imported goal', async () => {
    const { user } = await openHistory({ seed: (s) => s.saveSettings({ goalKg: 65 }) })
    await user.upload(screen.getByLabelText('백업 가져오기'), backupJson([e('2026-10-02', 72)], { goalKg: 68 }))
    await user.click(await screen.findByRole('button', { name: '가져오기 실행' }))
    await screen.findByText('기록 1개를 가져왔습니다.')
    expect(screen.getByLabelText('목표 체중(kg)')).toHaveValue('68.0')
  })

  it('shows the 30-day backup banner on home and exports from it', async () => {
    const { user } = await renderApp({
      seed: async (s) => {
        await s.putEntry(e('2026-10-12', 72.4))
        await s.saveSettings({ firstUseAt: NOW - 31 * DAY_MS })
      },
    })
    const banner = screen.getByRole('note')
    expect(banner).toHaveTextContent('백업한 지 30일이 지났어요.')
    await user.click(within(banner).getByRole('button', { name: '지금 백업' }))
    expect(downloadBackup).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => expect(screen.queryByRole('note')).not.toBeInTheDocument())
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/ui/HistoryScreen.test.tsx`
Expected: FAIL — `Failed to resolve import "./download"`

- [ ] **Step 3: 다운로드와 배너 구현**

`src/ui/download.ts`:

```ts
import type { BackupFile } from '../backup/backup'

export function downloadBackup(backup: BackupFile, fileName: string): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.append(a)
  a.click()
  a.remove()
  // 일부 브라우저는 click 직후 해제하면 다운로드가 취소된다.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
```

`src/ui/BackupBanner.tsx`:

```tsx
import { shouldShowBackupReminder } from '../backup/backup'
import type { Settings } from '../types'

type Props = { entryCount: number; settings: Settings; now: number; onExport: () => void }

export function BackupBanner({ entryCount, settings, now, onExport }: Props) {
  if (!shouldShowBackupReminder(entryCount, settings, now)) return null
  return (
    <aside className="banner" role="note">
      <span>백업한 지 30일이 지났어요.</span>
      <button type="button" onClick={onExport}>
        지금 백업
      </button>
    </aside>
  )
}
```

- [ ] **Step 4: 설정 패널 구현**

`src/ui/SettingsPanel.tsx`:

```tsx
import { useState, type ChangeEvent, type FormEvent } from 'react'
import { mergeBackup, parseBackup, replaceWithBackup, type BackupFile } from '../backup/backup'
import { parseWeight } from '../lib/validate'
import type { Settings } from '../types'
import type { AppState } from './useAppData'

type GoalFormProps = { settings: Settings; onSave: (patch: Partial<Settings>) => Promise<void> }

function GoalForm({ settings, onSave }: GoalFormProps) {
  const [goal, setGoal] = useState(settings.goalKg?.toFixed(1) ?? '')
  const [startDate, setStartDate] = useState(settings.startDate ?? '')
  const [startKg, setStartKg] = useState(settings.startKg?.toFixed(1) ?? '')
  const [error, setError] = useState<string>()

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    const g = goal.trim() ? parseWeight(goal) : undefined
    const k = startKg.trim() ? parseWeight(startKg) : undefined
    for (const r of [g, k]) {
      if (r && !r.ok) {
        setError(r.error)
        return
      }
    }
    setError(undefined)
    await onSave({
      goalKg: g?.ok ? g.value : undefined,
      startKg: k?.ok ? k.value : undefined,
      startDate: startDate || undefined,
    })
  }

  return (
    <form className="settings-form" onSubmit={submit}>
      <label>
        목표 체중(kg)
        <input inputMode="decimal" value={goal} onChange={(ev) => setGoal(ev.target.value)} />
      </label>
      <label>
        시작일 (비우면 첫 기록)
        <input type="date" value={startDate} onChange={(ev) => setStartDate(ev.target.value)} />
      </label>
      <label>
        시작 체중(kg) (비우면 첫 기록)
        <input inputMode="decimal" value={startKg} onChange={(ev) => setStartKg(ev.target.value)} />
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button type="submit" className="primary">
        설정 저장
      </button>
    </form>
  )
}

type Props = { app: AppState; onExport: () => void }

export function SettingsPanel({ app, onExport }: Props) {
  const s = app.settings
  const [message, setMessage] = useState<string>()
  const [importError, setImportError] = useState<string>()
  const [pending, setPending] = useState<BackupFile>()
  const [mode, setMode] = useState<'merge' | 'replace'>('merge')

  async function pickFile(ev: ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0]
    ev.target.value = ''
    if (!file) return
    const result = parseBackup(await file.text())
    setMessage(undefined)
    if (!result.ok) {
      setPending(undefined)
      setImportError(result.error)
      return
    }
    setImportError(undefined)
    setMode('merge')
    setPending(result.data)
  }

  async function applyImport() {
    if (!pending) return
    if (mode === 'replace' && !window.confirm('현재 기록을 모두 지우고 백업 파일 내용으로 바꿀까요?')) return
    await app.applySnapshot(mode === 'merge' ? mergeBackup(app, pending) : replaceWithBackup(pending))
    setPending(undefined)
    setMessage(`기록 ${pending.entries.length}개를 가져왔습니다.`)
  }

  // 가져오기 등으로 설정이 바뀌면 폼을 새 값으로 다시 만든다.
  const goalFormKey = `${s.goalKg}|${s.startDate}|${s.startKg}`

  return (
    <section className="card settings" aria-label="설정">
      <h2>목표</h2>
      <GoalForm
        key={goalFormKey}
        settings={s}
        onSave={async (patch) => {
          await app.updateSettings(patch)
          setMessage('설정을 저장했습니다.')
        }}
      />

      <h2>백업</h2>
      <p className="muted">
        마지막 백업: {s.lastBackupAt ? new Date(s.lastBackupAt).toLocaleDateString('ko-KR') : '없음'}
      </p>
      <button type="button" onClick={onExport}>
        백업 내보내기
      </button>
      <label>
        백업 가져오기
        <input type="file" accept="application/json,.json" onChange={pickFile} />
      </label>
      {importError && (
        <p role="alert" className="error">
          {importError}
        </p>
      )}
      {pending && (
        <div className="import-confirm">
          <p>가져올 기록 {pending.entries.length}개</p>
          <label className="radio">
            <input type="radio" name="import-mode" checked={mode === 'merge'} onChange={() => setMode('merge')} />
            병합 (같은 날짜는 파일 값 우선)
          </label>
          <label className="radio">
            <input type="radio" name="import-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} />
            전체 교체
          </label>
          <div className="actions">
            <button type="button" className="primary" onClick={applyImport}>
              가져오기 실행
            </button>
            <button type="button" onClick={() => setPending(undefined)}>
              취소
            </button>
          </div>
        </div>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  )
}
```

주의: 테스트의 `getByLabelText('전체 교체')`가 라디오를 찾도록 라벨 텍스트는 정확히 `전체 교체`로 둔다.

- [ ] **Step 5: 기록 목록 화면 구현**

`src/ui/HistoryScreen.tsx`:

```tsx
import { useState } from 'react'
import { sortByDate } from '../stats/stats'
import type { ISODate } from '../types'
import { EntryForm } from './EntryForm'
import { fmtDate, fmtDelta, fmtKg } from './format'
import { SettingsPanel } from './SettingsPanel'
import type { AppState } from './useAppData'

type Props = { app: AppState; today: ISODate; onExport: () => void }

export function HistoryScreen({ app, today, onExport }: Props) {
  const [editing, setEditing] = useState<ISODate>()
  const rows = sortByDate(app.entries).reverse()

  async function remove(date: ISODate) {
    if (!window.confirm(`${fmtDate(date)} 기록을 삭제할까요?`)) return
    await app.deleteEntry(date)
    setEditing(undefined)
  }

  return (
    <>
      <section className="card" aria-label="기록 목록">
        <h2>기록</h2>
        {rows.length === 0 && <p className="hint">아직 기록이 없습니다.</p>}
        <ul className="history">
          {rows.map((entry, i) => {
            const prev = rows[i + 1]
            return (
              <li key={entry.date}>
                <button
                  type="button"
                  className="history-row"
                  aria-expanded={editing === entry.date}
                  onClick={() => setEditing(editing === entry.date ? undefined : entry.date)}
                >
                  <span>{fmtDate(entry.date)}</span>
                  <strong>{fmtKg(entry.weightKg)}</strong>
                  <span className="delta">{prev ? fmtDelta(entry.weightKg - prev.weightKg) : '–'}</span>
                  {entry.memo && <span className="memo">{entry.memo}</span>}
                </button>
                {editing === entry.date && (
                  <div className="edit">
                    <EntryForm
                      key={entry.date}
                      entries={app.entries}
                      today={today}
                      initialDate={entry.date}
                      onSave={app.saveEntry}
                    />
                    <button type="button" className="danger" onClick={() => void remove(entry.date)}>
                      삭제
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>
      <SettingsPanel app={app} onExport={onExport} />
    </>
  )
}
```

- [ ] **Step 6: 홈에 배너 연결, App에 내보내기·기록 탭 연결**

`src/ui/HomeScreen.tsx` 전체를 다음으로 바꾼다:

```tsx
import type { ISODate } from '../types'
import { BackupBanner } from './BackupBanner'
import { ComparisonPanel } from './ComparisonPanel'
import { EntryForm } from './EntryForm'
import { GoalProgress } from './GoalProgress'
import type { AppState } from './useAppData'

type Props = { app: AppState; today: ISODate; now: number; onGoSettings: () => void; onExport: () => void }

export function HomeScreen({ app, today, now, onGoSettings, onExport }: Props) {
  return (
    <>
      <BackupBanner entryCount={app.entries.length} settings={app.settings} now={now} onExport={onExport} />
      <EntryForm key={today} entries={app.entries} today={today} onSave={app.saveEntry} />
      {app.entries.length === 0 ? (
        <p className="hint">첫 체중을 기록해 보세요. 기록이 쌓이면 추세와 비교가 여기에 표시됩니다.</p>
      ) : (
        <>
          <GoalProgress entries={app.entries} settings={app.settings} onGoSettings={onGoSettings} />
          <ComparisonPanel entries={app.entries} />
        </>
      )}
    </>
  )
}
```

`src/App.tsx`에서:

import 추가:

```tsx
import { backupFileName, buildBackup } from './backup/backup'
import { downloadBackup } from './ui/download'
import { HistoryScreen } from './ui/HistoryScreen'
```

`const today = ...` 다음 줄에 추가:

```tsx
  const exportBackup = () => {
    downloadBackup(buildBackup(app), backupFileName(today))
    void app.updateSettings({ lastBackupAt: clock() })
  }
```

`<main>` 안을 다음으로 바꾼다(`chart` 줄은 Task 8에서 교체):

```tsx
        {tab === 'home' && (
          <HomeScreen
            app={app}
            today={today}
            now={now}
            onGoSettings={() => setTab('history')}
            onExport={exportBackup}
          />
        )}
        {tab === 'chart' && <p className="hint">그래프 화면</p>}
        {tab === 'history' && <HistoryScreen app={app} today={today} onExport={exportBackup} />}
```

- [ ] **Step 7: 스타일 추가**

`src/index.css` 끝에 추가:

```css
h2 { font-size: 1rem; margin: 0 0 8px; }
.muted { color: var(--muted); margin: 0; font-size: 0.85rem; }
.banner { display: flex; justify-content: space-between; align-items: center; gap: 8px; background: var(--warn-bg); border-radius: 12px; padding: 10px 12px; }
.history { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.history-row { width: 100%; display: grid; grid-template-columns: 1fr auto 56px; gap: 4px 12px; text-align: left; border: none; border-bottom: 1px solid var(--border); border-radius: 0; background: none; padding: 10px 2px; }
.history-row .delta { color: var(--muted); text-align: right; }
.history-row .memo { grid-column: 1 / -1; color: var(--muted); font-size: 0.85rem; }
.edit { display: grid; gap: 8px; padding: 8px 0; }
.settings { display: grid; gap: 10px; }
.settings-form { display: grid; gap: 10px; }
.import-confirm { display: grid; gap: 8px; border: 1px dashed var(--border); border-radius: 10px; padding: 10px; }
.import-confirm p { margin: 0; }
.radio { display: flex; align-items: center; gap: 8px; color: var(--text); }
.actions { display: flex; gap: 8px; }
```

- [ ] **Step 8: 통과 확인**

Run: `npm test`
Expected: 모든 테스트 PASS

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 9: 커밋**

```bash
git add -A
git commit -m "feat: 기록 목록 수정·삭제, 목표 설정, 백업 내보내기·가져오기 추가"
```

---

### Task 8: 그래프 화면

**Files:**
- Create: `src/ui/ChartScreen.tsx`
- Modify: `src/App.tsx`, `src/index.css`
- Test: `src/ui/ChartScreen.test.tsx`

**Interfaces:**
- Consumes: `movingAverage7`, `inRange`, `rangeStart`, `summarize`, `recentPeriods`, `RangeKey`, `PeriodUnit`(Task 3), `fmtKg`, `fmtDelta`, `fmtPeriod`(Task 6), `renderApp`(Task 6)
- Produces: `ChartScreen` props `{ entries: Entry[]; settings: Settings; today: ISODate }`

- [ ] **Step 1: 테스트 작성**

`src/ui/ChartScreen.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderApp } from '../test/renderApp'
import type { Entry } from '../types'

const e = (date: string, weightKg: number): Entry => ({ date, weightKg, updatedAt: 1 })

async function openChart(entries: Entry[]) {
  const ctx = await renderApp({
    seed: async (s) => {
      for (const entry of entries) await s.putEntry(entry)
    },
  })
  await ctx.user.click(screen.getByRole('button', { name: '그래프' }))
  return ctx
}

const valueOf = (region: HTMLElement, label: string) => within(region).getByText(label).nextElementSibling

describe('chart screen', () => {
  it('shows a hint without entries', async () => {
    await openChart([])
    expect(screen.getByText('기록이 쌓이면 그래프가 표시됩니다.')).toBeInTheDocument()
  })

  it('summarizes the default 3-month range and switches to all', async () => {
    const { user } = await openChart([e('2026-06-01', 80), e('2026-08-01', 78), e('2026-10-12', 76)])
    expect(screen.getByRole('button', { name: '3개월' })).toHaveAttribute('aria-pressed', 'true')

    const summary = screen.getByRole('region', { name: '기간 요약' })
    expect(valueOf(summary, '변화')).toHaveTextContent('-2.0')
    expect(valueOf(summary, '최저')).toHaveTextContent('76.0')
    expect(valueOf(summary, '최고')).toHaveTextContent('78.0')
    expect(valueOf(summary, '평균')).toHaveTextContent('77.0')

    await user.click(screen.getByRole('button', { name: '전체' }))
    expect(valueOf(screen.getByRole('region', { name: '기간 요약' }), '변화')).toHaveTextContent('-4.0')
  })

  it('shows an empty-range hint', async () => {
    const { user } = await openChart([e('2026-06-01', 80)])
    await user.click(screen.getByRole('button', { name: '1개월' }))
    expect(screen.getByText('이 기간에는 기록이 없습니다.')).toBeInTheDocument()
  })

  it('shows weekly and monthly average tables', async () => {
    const { user } = await openChart([e('2026-09-20', 77), e('2026-10-05', 73), e('2026-10-12', 72)])
    const table = () => within(screen.getByRole('region', { name: '평균 비교' }))

    const weekRows = table().getAllByRole('row')
    expect(weekRows).toHaveLength(1 + 8)
    expect(weekRows[1]).toHaveTextContent('10/12 주72.0-1.0')
    expect(weekRows[2]).toHaveTextContent('10/5 주73.0–')

    await user.click(screen.getByRole('button', { name: '월간' }))
    const monthRows = table().getAllByRole('row')
    expect(monthRows).toHaveLength(1 + 6)
    expect(monthRows[1]).toHaveTextContent('2026년 10월72.5-4.5')
    expect(monthRows[2]).toHaveTextContent('2026년 9월77.0–')
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/ui/ChartScreen.test.tsx`
Expected: FAIL — `그래프` 탭이 임시 문구만 보여 `기록이 쌓이면 그래프가 표시됩니다.`를 찾지 못함.

- [ ] **Step 3: 구현**

`src/ui/ChartScreen.tsx`:

```tsx
import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  inRange,
  movingAverage7,
  rangeStart,
  recentPeriods,
  summarize,
  type PeriodUnit,
  type RangeKey,
} from '../stats/stats'
import type { Entry, ISODate, Settings } from '../types'
import { fmtDelta, fmtKg, fmtPeriod } from './format'

const RANGES: { id: RangeKey; label: string }[] = [
  { id: '1m', label: '1개월' },
  { id: '3m', label: '3개월' },
  { id: '6m', label: '6개월' },
  { id: '1y', label: '1년' },
  { id: 'all', label: '전체' },
]

type Props = { entries: Entry[]; settings: Settings; today: ISODate }

export function ChartScreen({ entries, settings, today }: Props) {
  const [range, setRange] = useState<RangeKey>('3m')
  const [unit, setUnit] = useState<PeriodUnit>('week')

  if (entries.length === 0) {
    return (
      <section className="card">
        <p className="hint">기록이 쌓이면 그래프가 표시됩니다.</p>
      </section>
    )
  }

  // 이동평균은 전체 기록으로 계산해야 기간 시작 부분도 직전 7일을 반영한다.
  const ma = new Map(movingAverage7(entries).map((p) => [p.date, p.avg]))
  const visible = inRange(entries, rangeStart(today, range))
  const data = visible.map((e) => ({ date: e.date, weight: e.weightKg, ma7: ma.get(e.date) }))
  const summary = summarize(visible)
  const goal = settings.goalKg
  const values = [...visible.map((e) => e.weightKg), ...(goal === undefined ? [] : [goal])]
  const domain = [Math.floor(Math.min(...values) - 1), Math.ceil(Math.max(...values) + 1)]
  const rows = recentPeriods(entries, unit, unit === 'week' ? 8 : 6)

  return (
    <>
      <section className="card" aria-label="그래프">
        <div className="segmented" role="group" aria-label="기간">
          {RANGES.map((r) => (
            <button key={r.id} type="button" aria-pressed={range === r.id} onClick={() => setRange(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
        {visible.length === 0 ? (
          <p className="hint">이 기간에는 기록이 없습니다.</p>
        ) : (
          <div className="chart">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5).replace('-', '/')} minTickGap={24} />
                <YAxis domain={domain} allowDecimals={false} />
                <Tooltip formatter={(v) => `${fmtKg(Number(v))}kg`} />
                {goal !== undefined && (
                  <ReferenceLine
                    y={goal}
                    stroke="var(--goal)"
                    strokeDasharray="6 4"
                    label={{ value: `목표 ${fmtKg(goal)}`, position: 'insideTopRight', fill: 'var(--goal)' }}
                  />
                )}
                <Line dataKey="weight" name="체중" stroke="none" dot={{ r: 3 }} isAnimationActive={false} />
                <Line
                  dataKey="ma7"
                  name="7일 평균"
                  type="monotone"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {summary && (
        <section className="card" aria-label="기간 요약">
          <dl className="stats">
            <div>
              <dt>변화</dt>
              <dd>{fmtDelta(summary.change)}</dd>
            </div>
            <div>
              <dt>최저</dt>
              <dd>{fmtKg(summary.min)}</dd>
            </div>
            <div>
              <dt>최고</dt>
              <dd>{fmtKg(summary.max)}</dd>
            </div>
            <div>
              <dt>평균</dt>
              <dd>{fmtKg(summary.avg)}</dd>
            </div>
          </dl>
        </section>
      )}

      <section className="card" aria-label="평균 비교">
        <div className="segmented" role="group" aria-label="단위">
          <button type="button" aria-pressed={unit === 'week'} onClick={() => setUnit('week')}>
            주간
          </button>
          <button type="button" aria-pressed={unit === 'month'} onClick={() => setUnit('month')}>
            월간
          </button>
        </div>
        <table className="periods">
          <thead>
            <tr>
              <th>{unit === 'week' ? '주' : '월'}</th>
              <th>평균</th>
              <th>직전 대비</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td>{fmtPeriod(r.key, unit)}</td>
                <td>{fmtKg(r.avg)}</td>
                <td>{fmtDelta(r.delta)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )
}
```

- [ ] **Step 4: App에 연결**

`src/App.tsx`에 import 추가:

```tsx
import { ChartScreen } from './ui/ChartScreen'
```

`{tab === 'chart' && <p className="hint">그래프 화면</p>}` 줄을 다음으로 바꾼다:

```tsx
        {tab === 'chart' && <ChartScreen entries={app.entries} settings={app.settings} today={today} />}
```

- [ ] **Step 5: 스타일 추가**

`src/index.css` 끝에 추가:

```css
.segmented { display: flex; gap: 4px; margin-bottom: 12px; }
.segmented button { flex: 1; padding: 6px 0; font-size: 0.85rem; }
.segmented button[aria-pressed='true'] { background: var(--accent); border-color: var(--accent); color: #fff; }
.chart { width: 100%; height: 260px; font-size: 0.75rem; }
.periods { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.periods th { color: var(--muted); font-weight: 500; text-align: right; padding: 6px 4px; }
.periods td { text-align: right; padding: 6px 4px; border-top: 1px solid var(--border); }
.periods th:first-child, .periods td:first-child { text-align: left; }
```

- [ ] **Step 6: 통과 확인**

Run: `npm test`
Expected: 모든 테스트 PASS

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "feat: 그래프 화면(7일 이동평균, 목표선, 기간 요약, 주간·월간 평균표) 추가"
```

---

### Task 9: PWA, 저장 보호, 배포

**Files:**
- Create: `src/lib/persist.ts`, `src/ui/StorageUnavailable.tsx`, `public/icon.svg`, `.github/workflows/deploy.yml`, (생성물) `public/pwa-64x64.png`, `public/pwa-192x192.png`, `public/pwa-512x512.png`, `public/maskable-icon-512x512.png`, `public/apple-touch-icon-180x180.png`, `public/favicon.ico`
- Modify: `vite.config.ts`, `index.html`, `src/main.tsx`
- Delete: `public/favicon.svg`
- Test: `src/lib/persist.test.ts`, `src/ui/StorageUnavailable.test.tsx`

**Interfaces:**
- Consumes: `openWeightStore`(Task 5), `App`(Task 6~8)
- Produces: `requestPersistence(storage?: Pick<StorageManager, 'persist' | 'persisted'>): Promise<boolean>`, `StorageUnavailable` 컴포넌트

- [ ] **Step 1: 테스트 작성**

`src/lib/persist.test.ts`:

```ts
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
```

`src/ui/StorageUnavailable.test.tsx`:

```tsx
import { expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StorageUnavailable } from './StorageUnavailable'

it('explains that records cannot be saved', () => {
  render(<StorageUnavailable />)
  expect(screen.getByRole('alert')).toHaveTextContent('이 브라우저 모드에서는 기록을 저장할 수 없습니다')
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/persist.test.ts src/ui/StorageUnavailable.test.tsx`
Expected: FAIL — 모듈 해석 실패

- [ ] **Step 3: 구현**

`src/lib/persist.ts`:

```ts
type PersistApi = Pick<StorageManager, 'persist' | 'persisted'>

// 저장 공간이 부족할 때 브라우저가 IndexedDB를 지우지 않도록 영구 저장을 요청한다.
export async function requestPersistence(
  storage: PersistApi | undefined = typeof navigator === 'undefined' ? undefined : navigator.storage,
): Promise<boolean> {
  try {
    if (!storage?.persist || !storage.persisted) return false
    if (await storage.persisted()) return true
    return await storage.persist()
  } catch {
    return false
  }
}
```

`src/ui/StorageUnavailable.tsx`:

```tsx
export function StorageUnavailable() {
  return (
    <main className="unavailable">
      <div role="alert" className="card">
        <h1>몸무게 기록</h1>
        <p>이 브라우저 모드에서는 기록을 저장할 수 없습니다.</p>
        <p className="muted">사생활 보호(시크릿) 모드를 끄거나 다른 브라우저에서 열어 주세요.</p>
      </div>
    </main>
  )
}
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { openWeightStore } from './db/storage'
import { requestPersistence } from './lib/persist'
import { StorageUnavailable } from './ui/StorageUnavailable'
import './index.css'

const root = createRoot(document.getElementById('root')!)

openWeightStore().then(
  (store) => {
    void requestPersistence()
    root.render(
      <StrictMode>
        <App store={store} />
      </StrictMode>,
    )
  },
  () => root.render(<StorageUnavailable />),
)
```

`src/index.css` 끝에 추가:

```css
.unavailable { padding: 32px 16px; max-width: 480px; margin: 0 auto; }
```

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: 모든 테스트 PASS

- [ ] **Step 5: PWA 플러그인과 아이콘**

```bash
npm install -D vite-plugin-pwa @vite-pwa/assets-generator
git rm public/favicon.svg
```

`public/icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#2f6f5e"/>
  <text x="256" y="330" font-size="220" font-weight="700" text-anchor="middle" fill="#ffffff" font-family="sans-serif">kg</text>
</svg>
```

```bash
npx pwa-assets-generator --preset minimal-2023 public/icon.svg
```

Expected: `PWA assets generated`, `public/`에 `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`, `favicon.ico` 생성.

`vite.config.ts`:

```ts
/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // GitHub Pages는 /<저장소 이름>/ 아래에서 서비스되므로 배포 시 BASE_PATH로 지정한다.
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: '몸무게 기록',
        short_name: '몸무게',
        description: '매일 체중을 기록하고 추세를 확인합니다.',
        lang: 'ko',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        background_color: '#f4f6f5',
        theme_color: '#2f6f5e',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

`index.html`의 `<head>`를 다음으로 바꾼다(`<body>`는 템플릿 그대로):

```html
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#2f6f5e" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="몸무게" />
    <link rel="icon" href="favicon.ico" sizes="48x48" />
    <link rel="apple-touch-icon" href="apple-touch-icon-180x180.png" />
    <title>몸무게 기록</title>
  </head>
```

- [ ] **Step 6: 빌드와 PWA 산출물 확인**

Run: `npm run build`
Expected: 출력 끝에 `PWA v2.0.0`, `mode generateSW`, `dist/sw.js` 생성.

Run: `ls dist`
Expected: `index.html`, `manifest.webmanifest`, `sw.js`, `pwa-192x192.png` 등이 있다.

- [ ] **Step 7: GitHub Pages 배포 워크플로**

`.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
        env:
          BASE_PATH: /${{ github.event.repository.name }}/
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 8: 로컬 미리보기로 PWA 동작 확인**

Run: `npm run build && npx vite preview --host`
확인(브라우저 개발자 도구 → Application):
- Manifest에 이름 `몸무게 기록`, 아이콘 4개 표시
- Service Worker가 `activated`
- 체중 저장 → 새로고침 후 유지
- 개발자 도구 Network를 Offline으로 바꾸고 새로고침 → 앱이 그대로 뜨고 기록 가능

- [ ] **Step 9: 전체 테스트와 커밋**

Run: `npm test`
Expected: 모든 테스트 PASS

```bash
git add -A
git commit -m "feat: PWA 설정, 영구 저장 요청, 저장 불가 안내, GitHub Pages 배포 워크플로 추가"
```

- [ ] **Step 10: 배포와 실제 폰 확인 (사용자와 함께)**

원격 저장소가 아직 없다. 사용자에게 GitHub 저장소 생성과 push 여부를 확인한 뒤 진행한다(외부 공개 행위).
1. GitHub에 저장소를 만들고 `git remote add origin <url>` → `git push -u origin master`
2. 저장소 Settings → Pages → Source를 **GitHub Actions**로 설정
3. Actions의 Deploy가 성공하면 `https://<user>.github.io/<repo>/` 접속
4. 폰에서 확인: 홈 화면에 추가 → 아이콘으로 실행 → 기록 → 비행기 모드에서 다시 실행 → 백업 내보내기 → 다른 브라우저에서 가져오기
