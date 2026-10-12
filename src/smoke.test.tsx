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
