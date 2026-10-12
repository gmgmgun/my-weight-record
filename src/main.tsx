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
