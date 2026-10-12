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
