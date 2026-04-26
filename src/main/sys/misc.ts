import { exec, execFile, execFileSync, execSync, spawn } from 'child_process'
import { app, dialog, nativeTheme, shell } from 'electron'
import { readdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { promisify } from 'util'
import {
  dataDir,
  exePath,
  logDir,
  mihomoCorePath,
  profilePath,
  resourcesDir,
  resourcesFilesDir,
  taskDir
} from '../utils/dirs'
import { copyFileSync, existsSync, writeFileSync } from 'fs'
import { t } from '../utils/i18n'

const elevateTaskName = 'guar-clash-run'
const elevateTaskRunner = 'guar-clash-run.exe'
const sourceTaskRunner = 'koala-clash-run.exe'

export function getFilePath(ext: string[]): string[] | undefined {
  return dialog.showOpenDialogSync({
    title: t('dialog.selectSubscriptionFile'),
    filters: [{ name: `${ext} file`, extensions: ext }],
    properties: ['openFile']
  })
}

export async function readTextFile(filePath: string): Promise<string> {
  return await readFile(filePath, 'utf8')
}

function getUniqueDesktopLogPath(): string {
  const desktop = app.getPath('desktop')
  const baseName = 'guarclash-logs'
  const extension = '.txt'
  let index = 0
  let target = path.join(desktop, `${baseName}${extension}`)

  while (existsSync(target)) {
    index += 1
    target = path.join(desktop, `${baseName} (${index})${extension}`)
  }

  return target
}

export async function exportLogsToDesktop(rendererLogs: ControllerLog[] = []): Promise<string> {
  const sections: string[] = [
    `GUAR Clash logs`,
    `Exported: ${new Date().toLocaleString()}`,
    ''
  ]

  try {
    const files = (await readdir(logDir())).filter((file) => file.endsWith('.log')).sort()
    for (const file of files) {
      const content = await readFile(path.join(logDir(), file), 'utf8')
      sections.push(`===== ${file} =====`, content.trimEnd(), '')
    }
  } catch {
    sections.push('===== Core log files =====', 'No saved log files found.', '')
  }

  if (rendererLogs.length > 0) {
    sections.push(
      '===== Live UI logs =====',
      rendererLogs
        .map((log) => `[${log.time ?? ''}] [${log.type ?? ''}] ${log.payload ?? ''}`.trim())
        .join('\n'),
      ''
    )
  }

  const target = getUniqueDesktopLogPath()
  await writeFile(target, sections.join('\n'), 'utf8')
  return target
}

export function openFile(id: string): void {
  shell.openPath(profilePath(id))
}

export async function openUWPTool(): Promise<void> {
  const execFilePromise = promisify(execFile)
  const uwpToolPath = path.join(resourcesDir(), 'files', 'enableLoopback.exe')
  await execFilePromise(uwpToolPath)
}

export async function setupFirewall(): Promise<void> {
  const execPromise = promisify(exec)
  const appName = app.getName()
  const removeCommand = `
  $rules = @("mihomo", "mihomo-alpha", "${appName}", "Sparkle", "Mihomo Party")
  foreach ($rule in $rules) {
    if (Get-NetFirewallRule -DisplayName $rule -ErrorAction SilentlyContinue) {
      Remove-NetFirewallRule -DisplayName $rule -ErrorAction SilentlyContinue
    }
  }
  `
  const createCommand = `
  New-NetFirewallRule -DisplayName "mihomo" -Direction Inbound -Action Allow -Program "${mihomoCorePath('mihomo')}" -Enabled True -Profile Any -ErrorAction SilentlyContinue
  New-NetFirewallRule -DisplayName "mihomo-alpha" -Direction Inbound -Action Allow -Program "${mihomoCorePath('mihomo-alpha')}" -Enabled True -Profile Any -ErrorAction SilentlyContinue
  New-NetFirewallRule -DisplayName "${appName}" -Direction Inbound -Action Allow -Program "${exePath()}" -Enabled True -Profile Any -ErrorAction SilentlyContinue
  `

  if (process.platform === 'win32') {
    await execPromise(removeCommand, { shell: 'powershell' })
    await execPromise(createCommand, { shell: 'powershell' })
  }
}

export function setNativeTheme(theme: 'system' | 'light' | 'dark'): void {
  nativeTheme.themeSource = theme
}

const elevateTaskXml = `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <Triggers />
  <Principals>
    <Principal id="Author">
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>HighestAvailable</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>Parallel</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>false</AllowHardTerminate>
    <StartWhenAvailable>false</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <IdleSettings>
      <StopOnIdleEnd>false</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <Priority>3</Priority>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>"${path.join(taskDir(), elevateTaskRunner)}"</Command>
      <Arguments>"${exePath()}"</Arguments>
    </Exec>
  </Actions>
</Task>
`

export function createElevateTaskSync(): void {
  const taskFilePath = path.join(taskDir(), `${elevateTaskName}.xml`)
  writeFileSync(taskFilePath, Buffer.from(`\ufeff${elevateTaskXml}`, 'utf-16le'))
  copyFileSync(
    path.join(resourcesFilesDir(), sourceTaskRunner),
    path.join(taskDir(), elevateTaskRunner)
  )
  execSync(
    `%SystemRoot%\\System32\\schtasks.exe /create /tn "${elevateTaskName}" /xml "${taskFilePath}" /f`
  )
}

export function runElevateTaskSync(args: string[]): boolean {
  const runnerPath = path.join(taskDir(), elevateTaskRunner)
  if (!existsSync(runnerPath)) return false

  try {
    const taskXmlBuffer = execFileSync('schtasks.exe', ['/query', '/tn', elevateTaskName, '/xml'], {
      stdio: ['ignore', 'pipe', 'ignore']
    })
    const taskXml = (taskXmlBuffer.includes(0)
      ? taskXmlBuffer.toString('utf16le')
      : taskXmlBuffer.toString('utf8')
    )
      .replace(/&quot;/g, '"')
      .toLowerCase()

    if (
      !taskXml.includes(exePath().toLowerCase()) ||
      !taskXml.includes(runnerPath.toLowerCase())
    ) {
      return false
    }

    writeFileSync(path.join(taskDir(), 'param.txt'), args.length > 0 ? args.join(' ') : 'empty')
    execFileSync('schtasks.exe', ['/run', '/tn', elevateTaskName], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

export async function deleteElevateTask(): Promise<void> {
  try {
    execSync(`%SystemRoot%\\System32\\schtasks.exe /delete /tn "${elevateTaskName}" /f`)
  } catch {
    // ignore
  }
}

export async function checkElevateTask(): Promise<boolean> {
  try {
    execSync(`%SystemRoot%\\System32\\schtasks.exe /query /tn "${elevateTaskName}"`, { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

export function resetAppConfig(): void {
  if (process.platform === 'win32') {
    spawn(
      'cmd',
      [
        '/C',
        `"timeout /t 2 /nobreak >nul && rmdir /s /q "${dataDir()}" && start "" "${exePath()}""`
      ],
      {
        shell: true,
        detached: true
      }
    ).unref()
  } else {
    const script = `while kill -0 ${process.pid} 2>/dev/null; do
  sleep 0.1
done
  rm -rf '${dataDir()}'
  ${process.argv.join(' ')} & disown
exit
`
    spawn('sh', ['-c', `"${script}"`], {
      shell: true,
      detached: true,
      stdio: 'ignore'
    })
  }
  app.quit()
}
