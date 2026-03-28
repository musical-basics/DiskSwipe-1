import { ElectronAPI } from '@electron-toolkit/preload'

export interface ScannedFile {
  name: string
  path: string
  size: number
  type: string
  modifyTime: number
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      checkPermissions: () => Promise<boolean>
      startScan: () => Promise<ScannedFile[]>
      whitelistFile: (path: string) => Promise<void>
      snoozeFile: (path: string) => Promise<void>
      moveToTrash: (path: string) => Promise<void>
      emptyTrash: () => Promise<void>
    }
  }
}
