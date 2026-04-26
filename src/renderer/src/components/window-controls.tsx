import React, { useEffect, useState } from 'react'
import { platform } from '@renderer/utils/init'
import { useAppConfig } from '@renderer/hooks/use-app-config'

const WindowControls: React.FC = () => {
  const { appConfig } = useAppConfig()
  const { useWindowFrame = false } = appConfig || {}
  const [isFocused, setIsFocused] = useState(document.hasFocus())
  const isMac = platform === 'darwin'

  useEffect(() => {
    if (useWindowFrame) return

    const onFocus = (): void => setIsFocused(true)
    const onBlur = (): void => setIsFocused(false)
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)

    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur', onBlur)
    }
  }, [useWindowFrame])

  if (useWindowFrame) return null

  const handleMinimize = (): void => {
    window.electron.ipcRenderer.invoke('windowMinimize')
  }
  const handleClose = (): void => {
    window.electron.ipcRenderer.invoke('windowClose')
  }

  const closeBtn = (
    <button key="close" className="wc-btn wc-close" onClick={handleClose}>
      <svg viewBox="0 0 10 10" fill="none">
        <path
          d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    </button>
  )

  const minimizeBtn = (
    <button key="minimize" className="wc-btn wc-minimize" onClick={handleMinimize}>
      <svg viewBox="0 0 10 10" fill="none">
        <path d="M1.5 5H8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    </button>
  )

  const buttons = isMac ? [closeBtn, minimizeBtn] : [minimizeBtn, closeBtn]

  return (
    <div className={`wc-group app-nodrag ${isMac ? `wc-mac${!isFocused ? ' wc-blurred' : ''}` : 'wc-win'}`}>{buttons}</div>
  )
}

export default WindowControls
