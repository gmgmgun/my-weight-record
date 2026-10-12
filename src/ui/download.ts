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
