import { expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReloadNotice } from './ReloadNotice'

it('asks to reload when a newer version took over the database', async () => {
  const onReload = vi.fn()
  render(<ReloadNotice reason="version-change" onReload={onReload} />)
  expect(screen.getByRole('alert')).toHaveTextContent('새 버전이 준비됐어요')
  await userEvent.click(screen.getByRole('button', { name: '다시 불러오기' }))
  expect(onReload).toHaveBeenCalledTimes(1)
})

it('asks to close other windows when the upgrade is blocked', () => {
  render(<ReloadNotice reason="blocked" onReload={() => {}} />)
  expect(screen.getByRole('alert')).toHaveTextContent('다른 창이나 탭에 열려 있는 이 앱을 닫아 주세요')
})
