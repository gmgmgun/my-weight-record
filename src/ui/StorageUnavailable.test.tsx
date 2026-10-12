import { expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StorageUnavailable } from './StorageUnavailable'

it('explains that records cannot be saved', () => {
  render(<StorageUnavailable />)
  expect(screen.getByRole('alert')).toHaveTextContent('이 브라우저 모드에서는 기록을 저장할 수 없습니다')
})
