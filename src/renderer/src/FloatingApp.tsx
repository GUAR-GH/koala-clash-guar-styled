import { useEffect, useMemo, useState } from 'react'
import { calcTraffic } from './utils/calc'
import { showContextMenu, triggerMainWindow } from './utils/ipc'
import { useAppConfig } from './hooks/use-app-config'
import { useControledMihomoConfig } from './hooks/use-controled-mihomo-config'
import guarLogo from '@renderer/assets/guar-logo.png'

const FloatingApp: React.FC = () => {
  const { appConfig } = useAppConfig()
  const { controledMihomoConfig } = useControledMihomoConfig()
  const { proxyMode = false, spinFloatingIcon = true } = appConfig || {}
  const { tun } = controledMihomoConfig || {}
  const proxyModeEnabled = proxyMode
  const tunEnabled = tun?.enable

  const [upload, setUpload] = useState(0)
  const [download, setDownload] = useState(0)

  // Calculate rotation speed based on total throughput.
  const spinSpeed = useMemo(() => {
    const total = upload + download
    if (total === 0) return 0
    if (total < 1024) return 2
    if (total < 1024 * 1024) return 3
    if (total < 1024 * 1024 * 1024) return 4
    return 5
  }, [upload, download])

  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    if (!spinFloatingIcon) return

    let animationFrameId: number
    const animate = (): void => {
      setRotation((prev) => {
        if (prev === 360) {
          return 0
        }
        return prev + spinSpeed
      })
      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)
    return (): void => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [spinSpeed, spinFloatingIcon])

  useEffect(() => {
    window.electron.ipcRenderer.on('mihomoTraffic', async (_e, info: ControllerTraffic) => {
      setUpload(info.up)
      setDownload(info.down)
    })
    return (): void => {
      window.electron.ipcRenderer.removeAllListeners('mihomoTraffic')
    }
  }, [])

  return (
    <div className="app-drag h-screen w-screen overflow-hidden">
      <div className="floating-bg border border-stroke flex rounded-full bg-background/75 backdrop-blur-2xl shadow-[0_12px_32px_rgba(217,70,239,0.24)] h-full w-full">
        <div className="flex justify-center items-center h-full aspect-square">
          <div
            onContextMenu={(e) => {
              e.preventDefault()
              showContextMenu()
            }}
            onClick={() => {
              triggerMainWindow()
            }}
            style={
              spinFloatingIcon
                ? {
                    transform: `rotate(${rotation}deg)`,
                    transition: 'transform 0.1s linear'
                  }
                : {}
            }
            className={`app-nodrag cursor-pointer floating-thumb flex items-center justify-center ${tunEnabled ? 'bg-gradient-end-power-on' : proxyModeEnabled ? 'bg-primary' : 'bg-muted'} hover:opacity-80 rounded-full h-[calc(100%-4px)] aspect-square`}
          >
            <img src={guarLogo} alt="GUAR" className="floating-icon aspect-square size-[72%] rounded-full object-contain" />
          </div>
        </div>
        <div className="w-full overflow-hidden">
          <div className="flex flex-col justify-center h-full w-full">
            <h2 className="text-end floating-text whitespace-nowrap text-[12px] mr-2 font-bold">
              {calcTraffic(upload)}/s
            </h2>
            <h2 className="text-end floating-text whitespace-nowrap text-[12px] mr-2 font-bold">
              {calcTraffic(download)}/s
            </h2>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FloatingApp
