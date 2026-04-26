import { Button } from '@renderer/components/ui/button'
import { platform } from '@renderer/utils/init'
import WindowControls from '@renderer/components/window-controls'
import React, { forwardRef, useImperativeHandle, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { exportLogsToDesktop } from '@renderer/utils/ipc'
import { useLogsStore } from '@renderer/store/logs-store'

const sidebarPaths = new Set(['/home', '/profiles', '/proxies', '/connections', '/rules', '/logs', '/settings'])
const isMac = platform === 'darwin'

interface Props {
  title?: React.ReactNode
  header?: React.ReactNode
  children?: React.ReactNode
  contentClassName?: string
  showBackButton?: boolean
}

const BasePage = forwardRef<HTMLDivElement, Props>((props, ref) => {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const isSubPage = !sidebarPaths.has(location.pathname)

  const contentRef = useRef<HTMLDivElement>(null)
  useImperativeHandle(ref, () => {
    return contentRef.current as HTMLDivElement
  })

  const handleExportLogs = async (): Promise<void> => {
    try {
      const target = await exportLogsToDesktop(useLogsStore.getState().logs)
      const fileName = target.split(/[\\/]/).pop() ?? 'guarclash-logs.txt'
      toast.success(t('pages.logs.exportSuccess', { fileName }))
    } catch (e) {
      toast.error(`${e}`)
    }
  }

  return (
    <div ref={contentRef} className="w-full h-full">
      <div className="sticky top-0 z-40 h-10 w-full border-b border-stroke/55 bg-background/20 backdrop-blur-2xl">
        <div className="app-drag flex h-10 items-stretch justify-between pl-2.5">
          <div className="title h-full text-[14px] leading-7 flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              title={t('pages.logs.exportToDesktop')}
              className="app-nodrag"
              onClick={handleExportLogs}
            >
              <FileText className="size-4" />
            </Button>
            {(isSubPage || props.showBackButton) && (
              <Button
                size="icon-sm"
                variant="ghost"
                className="app-nodrag"
                onClick={() => navigate(-1)}
              >
                <ChevronLeft className="size-5" />
              </Button>
            )}
            {props.title}
          </div>
          <div className="header flex h-full items-stretch">
            {props.header && <div className="flex items-center gap-1 pr-1.5">{props.header}</div>}
            {!isMac && <WindowControls />}
          </div>
        </div>
      </div>
      <div className="content h-[calc(100vh-40px)] overflow-y-auto custom-scrollbar">
        {props.children}
      </div>
    </div>
  )
})

BasePage.displayName = 'BasePage'
export default BasePage
