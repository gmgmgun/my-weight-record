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
