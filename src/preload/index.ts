import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  checkPermissions: () => ipcRenderer.invoke('check-permissions'),
  startScan: () => ipcRenderer.invoke('start-scan'),
  whitelistFile: (path: string) => ipcRenderer.invoke('whitelist-file', path),
  snoozeFile: (path: string) => ipcRenderer.invoke('snooze-file', path),
  moveToTrash: (path: string) => ipcRenderer.invoke('move-to-trash', path),
  moveToTemp: (path: string) => ipcRenderer.invoke('move-to-temp', path),
  emptyTrash: () => ipcRenderer.invoke('empty-trash'),
  getFileThumbnail: (path: string) => ipcRenderer.invoke('get-file-thumbnail', path),
  openFile: (path: string) => ipcRenderer.invoke('open-file', path),
  revealInFinder: (path: string) => ipcRenderer.invoke('reveal-in-finder', path)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
