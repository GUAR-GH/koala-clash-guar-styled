import { toast } from 'sonner'
import { useTheme } from 'next-themes'
import React, { useEffect, useState } from 'react'
import { useRoutes } from 'react-router-dom'
import './i18n'
import { useTranslation } from 'react-i18next'
import routes from '@renderer/routes'
import { useAppConfig } from '@renderer/hooks/use-app-config'
import {
  applyTheme,
  needsFirstRunAdmin,
  restartAsAdmin,
  setNativeTheme
} from '@renderer/utils/ipc'
import { platform } from '@renderer/utils/init'
import ConfirmModal from '@renderer/components/base/base-confirm'
import { SidebarProvider } from '@renderer/components/ui/sidebar'
import AppSidebar from '@renderer/components/app-sidebar'
import HwidLimitAlert from '@renderer/components/profiles/hwid-limit-alert'
import WindowControls from '@renderer/components/window-controls'
import { attachConnectionsStore } from '@renderer/store/connections-store'
import { attachTrafficStore } from '@renderer/store/traffic-store'
import { attachLogsStore } from '@renderer/store/logs-store'
import { attachCoreLifecycleStore } from '@renderer/store/core-lifecycle-store'

const App: React.FC = () => {
  const { t } = useTranslation()
  const { appConfig } = useAppConfig()
  const {
    appTheme = 'system',
    customTheme
  } = appConfig || {}
  const { setTheme, systemTheme } = useTheme()
  const page = useRoutes(routes)

  useEffect(() => {
    const detachConnections = attachConnectionsStore()
    const detachTraffic = attachTrafficStore()
    const detachLogs = attachLogsStore()
    const detachCoreLifecycle = attachCoreLifecycleStore()
    return (): void => {
      detachConnections()
      detachTraffic()
      detachLogs()
      detachCoreLifecycle()
    }
  }, [])

  useEffect(() => {
    setNativeTheme(appTheme)
    setTheme(appTheme)
  }, [appTheme, systemTheme])

  useEffect(() => {
    applyTheme(customTheme || 'default.css')
  }, [customTheme])

  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const [showAdminRequired, setShowAdminRequired] = useState(false)

  useEffect(() => {
    const handleShowQuitConfirm = (): void => {
      setShowQuitConfirm(true)
    }

    window.electron.ipcRenderer.on('show-quit-confirm', handleShowQuitConfirm)

    const handleShowError = (_event: unknown, title: string, message: string): void => {
      toast.error(title, { description: message })
    }
    window.electron.ipcRenderer.on('showError', handleShowError)

    const handleNeedsAdminSetup = (): void => {
      setShowAdminRequired(true)
    }
    window.electron.ipcRenderer.on('needs-admin-setup', handleNeedsAdminSetup)

    if (platform === 'win32') {
      needsFirstRunAdmin().then((needs) => {
        if (needs) setShowAdminRequired(true)
      })
    }

    return (): void => {
      window.electron.ipcRenderer.removeAllListeners('show-quit-confirm')
      window.electron.ipcRenderer.removeAllListeners('needs-admin-setup')
      window.electron.ipcRenderer.removeAllListeners('showError')
    }
  }, [])

  const handleQuitConfirm = (confirmed: boolean): void => {
    setShowQuitConfirm(false)
    window.electron.ipcRenderer.send('quit-confirm-result', confirmed)
  }

  return (
    <SidebarProvider
      defaultOpen={false}
      className="guar-app-shell relative w-full h-screen overflow-hidden"
    >
      {showQuitConfirm && (
        <ConfirmModal
          title={t('modal.confirmQuit')}
          description={
            <div>
              <p></p>
              <p className="text-sm text-gray-500 mt-2">{t('modal.quitWarning')}</p>
              <p className="text-sm text-gray-400 mt-1">
                {t('modal.quickQuitHint')} {platform === 'darwin' ? '⌘Q' : 'Ctrl+Q'}{' '}
                {t('modal.canQuitDirectly')}
              </p>
            </div>
          }
          confirmText={t('common.quit')}
          cancelText={t('common.cancel')}
          onChange={(open) => {
            if (!open) {
              handleQuitConfirm(false)
            }
          }}
          onConfirm={() => handleQuitConfirm(true)}
        />
      )}
      {showAdminRequired && (
        <ConfirmModal
          title={t('modal.adminRequired')}
          description={
            <div>
              <p className="text-sm">{t('modal.adminRequiredDesc')}</p>
            </div>
          }
          confirmText={t('modal.restartAsAdmin')}
          onChange={(open) => {
            if (!open) {
              setShowAdminRequired(false)
            }
          }}
          onConfirm={async () => {
            await restartAsAdmin()
          }}
          className="guide-admin-required-modal"
        />
      )}
      <HwidLimitAlert />
      {platform === 'darwin' && (
        <div className="fixed top-0.5 -left-1 h-10 flex items-center pl-3 z-100 app-drag">
          <WindowControls />
        </div>
      )}
      <AppSidebar />
      <div className="relative z-10 main grow h-full overflow-y-auto">{page}</div>
    </SidebarProvider>
  )
}

export default App
