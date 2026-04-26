import { getAppConfig } from '../config'
import { version } from '../../../package.json'

export async function getUserAgent(): Promise<string> {
  const { userAgent } = await getAppConfig()
  if (userAgent) {
    return userAgent
  }

  // Subscription gateways often choose the output format from the client User-Agent.
  return `guar/${version}`
}
