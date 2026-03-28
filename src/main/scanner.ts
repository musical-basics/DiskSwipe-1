import { app, shell } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { exec } from 'child_process'

export interface ScannedItem {
  id: string
  isBundle: boolean
  name: string
  paths: string[]
  size: number
  type: string
  modifyTime: number
}

const THRESHOLD = 100 * 1024 * 1024 // 100MB
const USER_DATA_PATH = app.getPath('userData')
const WHITELIST_PATH = path.join(USER_DATA_PATH, 'whitelist.json')
const SNOOZE_PATH = path.join(USER_DATA_PATH, 'snooze.json')

let whitelist: Set<string> = new Set()
let snoozeMap: Map<string, number> = new Map()

async function ensureFiles() {
  try {
    const wData = await fs.readFile(WHITELIST_PATH, 'utf-8')
    whitelist = new Set(JSON.parse(wData))
  } catch {
    whitelist = new Set()
  }

  try {
    const sData = await fs.readFile(SNOOZE_PATH, 'utf-8')
    snoozeMap = new Map(Object.entries(JSON.parse(sData)))
  } catch {
    snoozeMap = new Map()
  }
}

export async function checkPermissions(): Promise<boolean> {
  try {
    const desktop = path.join(os.homedir(), 'Desktop')
    const downloads = path.join(os.homedir(), 'Downloads')
    const dirDesktop = await fs.opendir(desktop)
    await dirDesktop.close()
    const dirDownloads = await fs.opendir(downloads)
    await dirDownloads.close()
    return true
  } catch (err) {
    return false
  }
}

async function moveToTemp(filePath: string) {
  const tempDir = path.join(os.homedir(), 'Documents', 'temp')
  await fs.mkdir(tempDir, { recursive: true }).catch(() => {})
  const dest = path.join(tempDir, path.basename(filePath))
  await fs.rename(filePath, dest).catch(async () => {
    await fs.copyFile(filePath, dest)
    await fs.unlink(filePath)
  })
}

export async function executeActions(actions: {paths: string[], action: 'trash' | 'temp' | 'snooze' | 'keep'}[]) {
  await ensureFiles()
  for (const act of actions) {
    if (act.action === 'trash') {
      for (const p of act.paths) {
        try { await shell.trashItem(p) } catch {}
      }
    } else if (act.action === 'temp') {
      if (act.paths.length === 1) {
        try { await moveToTemp(act.paths[0]) } catch {}
      } else {
        const timestamp = Date.now()
        const destRoot = path.join(os.homedir(), 'Desktop', `Organized_Bundle_${timestamp}`)
        
        for (const p of act.paths) {
          try {
            const stat = await fs.stat(p)
            const mtime = new Date(stat.mtimeMs)
            const yearStr = mtime.getFullYear().toString()
            const monthStr = mtime.toLocaleString('default', { month: 'short' })
            
            const specificDestFolder = path.join(destRoot, yearStr, monthStr)
            await fs.mkdir(specificDestFolder, { recursive: true }).catch(() => {})
            
            const destPath = path.join(specificDestFolder, path.basename(p))
            await fs.rename(p, destPath)
          } catch {
            // ignore 
          }
        }
      }
    } else if (act.action === 'keep') {
      for (const p of act.paths) whitelist.add(p)
    } else if (act.action === 'snooze') {
      const future = Date.now() + 7 * 24 * 60 * 60 * 1000
      for (const p of act.paths) snoozeMap.set(p, future)
    }
  }
  await fs.writeFile(WHITELIST_PATH, JSON.stringify(Array.from(whitelist), null, 2))
  const obj = Object.fromEntries(snoozeMap)
  await fs.writeFile(SNOOZE_PATH, JSON.stringify(obj, null, 2))
}

function isSnoozed(filePath: string): boolean {
  if (!snoozeMap.has(filePath)) return false
  const time = snoozeMap.get(filePath)!
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
  return (Date.now() - time) < THIRTY_DAYS
}

interface RawFile {
  name: string
  path: string
  size: number
  type: string
  modifyTime: number
}

async function scanDirectory(dir: string, files: RawFile[]) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.name.startsWith('.') || entry.name.endsWith('.app')) continue
      if (whitelist.has(fullPath) || isSnoozed(fullPath)) continue

      if (entry.isDirectory()) {
        await scanDirectory(fullPath, files)
      } else if (entry.isFile()) {
        try {
          const stats = await fs.stat(fullPath)
          if (stats.size > THRESHOLD) {
            files.push({
              name: entry.name,
              path: fullPath,
              size: stats.size,
              type: path.extname(fullPath).slice(1) || 'file',
              modifyTime: stats.mtimeMs
            })
          }
        } catch {}
      }
    }
  } catch {}
}

export async function startScan(directories: string[], mode: 'heavy' | 'clutter'): Promise<ScannedItem[]> {
  await ensureFiles()
  const items: ScannedItem[] = []
  const targets = directories.map(dir => path.join(os.homedir(), dir))

  if (mode === 'heavy') {
    const files: RawFile[] = []
    for (const target of targets) {
      await scanDirectory(target, files)
    }
    const sorted = files.sort((a, b) => b.size - a.size)
    for (const f of sorted) {
      items.push({
        id: Buffer.from(f.path).toString('base64'),
        isBundle: false,
        name: f.name,
        paths: [f.path],
        size: f.size,
        type: f.type,
        modifyTime: f.modifyTime
      })
    }
  } else {
    for (const target of targets) {
      try {
        const dirents = await fs.readdir(target, { withFileTypes: true })
        const grouped: Record<string, { paths: string[], size: number }> = {}
        for (const dirent of dirents) {
          if (dirent.isDirectory()) continue
          const fullPath = path.join(target, dirent.name)
          if (dirent.name.startsWith('.') || dirent.name.endsWith('.app')) continue
          if (whitelist.has(fullPath) || isSnoozed(fullPath)) continue
          
          try {
            const stat = await fs.stat(fullPath)
            if (stat.size < 10 * 1024 * 1024) {  // < 10MB
              const ext = path.extname(fullPath).toLowerCase().replace('.', '') || 'unknown'
              if (!grouped[ext]) grouped[ext] = { paths: [], size: 0 }
              grouped[ext].paths.push(fullPath)
              grouped[ext].size += stat.size
            }
          } catch {}
        }
        for (const [ext, data] of Object.entries(grouped)) {
          if (data.paths.length > 5) {
            items.push({
              id: `bundle-${Buffer.from(target).toString('base64')}-${ext}`,
              isBundle: true,
              name: `${data.paths.length} Loose ${ext.toUpperCase() || 'Files'}`,
              paths: data.paths,
              size: data.size,
              type: `bundle-${ext}`,
              modifyTime: Date.now()
            })
          }
        }
      } catch {}
    }
    items.sort((a, b) => b.size - a.size)
  }

  return items
}

export function emptyTrash(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (process.platform === 'darwin') {
      exec(`osascript -e 'tell application "Finder" to empty trash'`, (error) => {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
    } else {
      resolve()
    }
  })
}
