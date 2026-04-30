import { ipcMain } from 'electron'
import { addProfileItem, getProfileConfig } from '../config'
import { mainWindow } from '..'

const TICK_INTERVAL_MS = 60_000
const START_DELAY_MS = 10_000

const inFlight = new Set<string>()
let started = false

function canAutoUpdate(item: ProfileItem): boolean {
  if (item.type !== 'remote') return false
  if (item.autoUpdate === false) return false
  return true
}

function isDue(item: ProfileItem): boolean {
  if (!canAutoUpdate(item)) return false
  if (!item.interval) return false
  const timeSince = Date.now() - (item.updated || 0)
  return timeSince >= item.interval * 60 * 1000
}

async function updateItem(item: ProfileItem): Promise<boolean> {
  if (inFlight.has(item.id)) return false
  inFlight.add(item.id)
  try {
    await addProfileItem(item)
    return true
  } catch {
    return false
  } finally {
    inFlight.delete(item.id)
  }
}

function notifyProfileConfigUpdated(): void {
  mainWindow?.webContents.send('profileConfigUpdated')
  ipcMain.emit('updateTrayMenu')
}

async function runUpdatePass(force: boolean): Promise<void> {
  let updated = false
  try {
    const { items = [] } = await getProfileConfig()
    for (const item of items) {
      if (force ? !canAutoUpdate(item) : !isDue(item)) continue
      updated = (await updateItem(item)) || updated
    }
  } catch {
    // ignore - background updates must not block app startup
  }

  if (updated) {
    notifyProfileConfigUpdated()
  }
}

async function runTick(): Promise<void> {
  try {
    await runUpdatePass(false)
  } finally {
    setTimeout(runTick, TICK_INTERVAL_MS)
  }
}

export async function initProfileUpdater(): Promise<void> {
  if (started) return
  started = true
  setTimeout(async () => {
    await runUpdatePass(true)
    await runTick()
  }, START_DELAY_MS)
}
