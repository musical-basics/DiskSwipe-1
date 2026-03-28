import { app, shell } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

export interface ScannedFile {
  name: string
  path: string
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
    const parsed = JSON.parse(sData)
    snoozeMap = new Map(Object.entries(parsed))
  } catch {
    snoozeMap = new Map()
  }
}

async function saveWhitelist() {
  await fs.writeFile(WHITELIST_PATH, JSON.stringify(Array.from(whitelist)))
}

async function saveSnooze() {
  const obj = Object.fromEntries(snoozeMap)
  await fs.writeFile(SNOOZE_PATH, JSON.stringify(obj))
}

export async function checkPermissions(): Promise<boolean> {
  try {
    const desktop = path.join(os.homedir(), 'Desktop')
    const downloads = path.join(os.homedir(), 'Downloads')
    
    // Attempting to opendir on macOS acts as a strict permission check.
    const dirDesktop = await fs.opendir(desktop)
    await dirDesktop.close()
    
    const dirDownloads = await fs.opendir(downloads)
    await dirDownloads.close()
    
    return true
  } catch (err) {
    return false
  }
}

export async function whitelistFile(filePath: string) {
  await ensureFiles()
  whitelist.add(filePath)
  await saveWhitelist()
}

export async function snoozeFile(filePath: string) {
  await ensureFiles()
  snoozeMap.set(filePath, Date.now())
  await saveSnooze()
}

export async function moveToTrash(filePath: string) {
  await shell.trashItem(filePath)
}

export async function moveToTemp(filePath: string) {
  const tempDir = path.join(os.homedir(), 'Documents', 'temp')
  await fs.mkdir(tempDir, { recursive: true }).catch(() => {})
  const dest = path.join(tempDir, path.basename(filePath))
  await fs.rename(filePath, dest).catch(async () => {
    await fs.copyFile(filePath, dest)
    await fs.unlink(filePath)
  })
}

function isSnoozed(filePath: string): boolean {
  if (!snoozeMap.has(filePath)) return false
  const time = snoozeMap.get(filePath)!
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
  return (Date.now() - time) < THIRTY_DAYS
}

async function scanDirectory(dir: string, files: ScannedFile[]) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      // Filter out extremely deep nested folders or bundles
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
        } catch (err) {
          // ignore inaccessible
        }
      }
    }
  } catch (err) {
    // ignore inaccessible 
  }
}

export async function startScan(): Promise<ScannedFile[]> {
  await ensureFiles()
  const files: ScannedFile[] = []
  const homedir = os.homedir()
  const targets = [
    path.join(homedir, 'Desktop'),
    path.join(homedir, 'Downloads')
  ]

  for (const target of targets) {
    await scanDirectory(target, files)
  }

  return files.sort((a, b) => b.size - a.size)
}

import { exec } from 'child_process'

export function emptyTrash(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (process.platform === 'darwin') {
      exec(`osascript -e 'tell application "Finder" to empty trash'`, (error) => {
        if (error) {
          console.error(error)
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

