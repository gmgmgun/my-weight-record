import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { openWeightStore } from './db/storage'
import { requestPersistence } from './lib/persist'
import { ReloadNotice } from './ui/ReloadNotice'
import { StorageUnavailable } from './ui/StorageUnavailable'
import '@fontsource/outfit/latin-500.css'
import '@fontsource/outfit/latin-700.css'
import './index.css'

const root = createRoot(document.getElementById('root')!)

const reload = () => window.location.reload()

openWeightStore(undefined, {
  // 새 버전이 저장 구조를 올리면 이 화면의 연결은 닫히므로, 기록을 더 쓰지 못하게 안내로 바꾼다.
  onVersionChange: () => root.render(<ReloadNotice reason="version-change" onReload={reload} />),
  // 예전 버전 창이 열려 있어 업그레이드를 기다리는 동안 보여 준다. 끝나면 아래 then에서 앱으로 바뀐다.
  onBlocked: () => root.render(<ReloadNotice reason="blocked" onReload={reload} />),
}).then(
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
