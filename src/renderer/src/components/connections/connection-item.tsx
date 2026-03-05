import { Avatar, AvatarImage } from '@renderer/components/ui/avatar'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Card, CardFooter, CardHeader } from '@renderer/components/ui/card'
import { calcTraffic } from '@renderer/utils/calc'
import dayjs from 'dayjs'
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Trash2, X } from 'lucide-react'

interface Props {
  index: number
  info: ControllerConnectionDetail
  displayIcon?: boolean
  iconUrl: string
  displayName?: string
  selected: ControllerConnectionDetail | undefined
  setSelected: React.Dispatch<React.SetStateAction<ControllerConnectionDetail | undefined>>
  setIsDetailModalOpen: React.Dispatch<React.SetStateAction<boolean>>
  close: (id: string) => void
}

const ConnectionItemComponent: React.FC<Props> = ({
  info,
  displayIcon,
  iconUrl,
  displayName,
  close,
  setSelected,
  setIsDetailModalOpen
}) => {
  const fallbackProcessName = useMemo(
    () => info.metadata.process || info.metadata.sourceIP,
    [info.metadata.process, info.metadata.sourceIP]
  )
  const processName = displayName || fallbackProcessName

  const destination = useMemo(
    () =>
      info.metadata.host ||
      info.metadata.sniffHost ||
      info.metadata.destinationIP ||
      info.metadata.remoteDestination,
    [
      info.metadata.host,
      info.metadata.sniffHost,
      info.metadata.destinationIP,
      info.metadata.remoteDestination
    ]
  )

  const [timeAgo, setTimeAgo] = useState(() => dayjs(info.start).fromNow())

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeAgo(dayjs(info.start).fromNow())
    }, 60000)

    return () => clearInterval(timer)
  }, [info.start])

  const uploadTraffic = useMemo(() => calcTraffic(info.upload), [info.upload])

  const downloadTraffic = useMemo(() => calcTraffic(info.download), [info.download])

  const uploadSpeed = useMemo(
    () => (info.uploadSpeed ? calcTraffic(info.uploadSpeed) : null),
    [info.uploadSpeed]
  )

  const downloadSpeed = useMemo(
    () => (info.downloadSpeed ? calcTraffic(info.downloadSpeed) : null),
    [info.downloadSpeed]
  )

  const hasSpeed = useMemo(
    () => Boolean(info.uploadSpeed || info.downloadSpeed),
    [info.uploadSpeed, info.downloadSpeed]
  )

  const handleCardPress = useCallback(() => {
    setSelected(info)
    setIsDetailModalOpen(true)
  }, [info, setSelected, setIsDetailModalOpen])

  const handleClose = useCallback(() => {
    close(info.id)
  }, [close, info.id])

  return (
    <div className="px-2 pb-2" style={{ minHeight: 80 }}>
      <Card
        className="w-full cursor-pointer py-0 gap-0 hover:bg-accent/50 transition-colors"
        onClick={handleCardPress}
      >
        <div className="w-full flex justify-between items-center">
          {displayIcon && (
            <div>
              <Avatar className="bg-transparent ml-2 w-14 h-14 rounded-sm">
                <AvatarImage src={iconUrl} />
              </Avatar>
            </div>
          )}
          <div
            className={`w-full flex flex-col justify-start truncate relative ${displayIcon ? '-ml-2' : ''}`}
          >
            <CardHeader className="pb-0 gap-1 flex items-center pl-4 pr-1 pt-2">
              <div className="flex-1 text-ellipsis whitespace-nowrap overflow-hidden text-left">
                <span style={{ textAlign: 'left' }}>
                  {processName} → {destination}
                </span>
              </div>
              <small className="ml-2 whitespace-nowrap text-muted-foreground">{timeAgo}</small>
              <Button
                variant="ghost"
                size="icon-sm"
                className={`shrink-0 ml-1 ${info.isActive ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-500/10' : 'text-destructive hover:text-destructive hover:bg-destructive/10'}`}
                onClick={(e) => {
                  e.stopPropagation()
                  handleClose()
                }}
              >
                {info.isActive ? <X className="text-lg" /> : <Trash2 className="text-lg" />}
              </Button>
            </CardHeader>
            <CardFooter className="pt-0.5 px-4 pb-2">
              <div className="flex gap-1 overflow-x-auto no-scrollbar">
                <Badge variant="outline" className="rounded-sm gap-1.5">
                  <span
                    className={`size-1.5 rounded-full ${info.isActive ? 'bg-primary' : 'bg-destructive'}`}
                  />
                  {info.metadata.type}({info.metadata.network.toUpperCase()})
                </Badge>
                <Badge variant="outline" className="flag-emoji whitespace-nowrap overflow-hidden rounded-sm">
                  {info.chains[0]}
                </Badge>
                <Badge variant="outline" className="rounded-sm">
                  ↑ {uploadTraffic} ↓ {downloadTraffic}
                </Badge>
                {hasSpeed && (
                  <Badge variant="outline" className="rounded-sm border-primary/50 text-primary">
                    ↑ {uploadSpeed || '0 B'}/s ↓ {downloadSpeed || '0 B'}/s
                  </Badge>
                )}
              </div>
            </CardFooter>
          </div>
        </div>
      </Card>
    </div>
  )
}

const ConnectionItem = memo(ConnectionItemComponent, (prevProps, nextProps) => {
  return (
    prevProps.info.id === nextProps.info.id &&
    prevProps.info.upload === nextProps.info.upload &&
    prevProps.info.download === nextProps.info.download &&
    prevProps.info.uploadSpeed === nextProps.info.uploadSpeed &&
    prevProps.info.downloadSpeed === nextProps.info.downloadSpeed &&
    prevProps.info.isActive === nextProps.info.isActive &&
    prevProps.iconUrl === nextProps.iconUrl &&
    prevProps.displayIcon === nextProps.displayIcon &&
    prevProps.displayName === nextProps.displayName &&
    prevProps.selected?.id === nextProps.selected?.id
  )
})

export default ConnectionItem
