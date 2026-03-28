import { ElectronAPI } from '@electron-toolkit/preload'

export interface ScannedFile {
  name: string
  path: string
  size: number
  type: string
  modifyTime: number
}

export interface ScannedItem {
  id: string
  isBundle: boolean
  name: string
  paths: string[]
  size: number
  type: string
  modifyTime: number
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      checkPermissions: () => Promise<boolean>
      startScan: (directories: string[], mode: string) => Promise<ScannedItem[]>
      executeActions: (actions: {paths: string[], action: string}[]) => Promise<void>
      emptyTrash: () => Promise<void>
      getFileThumbnail: (path: string) => Promise<string | null>
      openFile: (path: string) => Promise<void>
      revealInFinder: (path: string) => Promise<void>
    }
  }
}
