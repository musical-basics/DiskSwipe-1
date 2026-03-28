import { useState, useEffect } from 'react'
import { Search, Trash2, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react'
import { SwipeCard } from './components/SwipeCard'

// Define the core file interface mapped from preload
interface ScannedFile {
  name: string
  path: string
  size: number
  type: string
  modifyTime: number
}

type AppState = 'PERMISSIONS' | 'SCANNING' | 'CAROUSEL' | 'COMPLETE'

export default function App() {
  const [appState, setAppState] = useState<AppState>('PERMISSIONS')
  const [files, setFiles] = useState<ScannedFile[]>([])
  const [trashedSize, setTrashedSize] = useState(0)

  useEffect(() => {
    checkInitialPermissions()
  }, [])

  const checkInitialPermissions = async () => {
    if (!window.api) {
      alert("You are viewing the React dev server in a browser!\nSwipeSweep requires Electron Native APIs.\n\nPlease look for the Electron app window in your dock or run 'pnpm dev' again.")
      return
    }

    const hasPermission = await window.api.checkPermissions()
    if (hasPermission) {
      startScanningProcess()
    } else {
      setAppState('PERMISSIONS')
    }
  }

  const startScanningProcess = async () => {
    setAppState('SCANNING')
    // A small buffer so the user actually sees the satisfying animation before it resolves
    setTimeout(async () => {
      const scanned = await window.api.startScan()
      if (scanned.length > 0) {
        setFiles(scanned)
        setAppState('CAROUSEL')
      } else {
        setAppState('COMPLETE')
      }
    }, 1200)
  }

  const handleGrantPermission = async () => {
    checkInitialPermissions()
  }

  const handleNext = () => {
    if (files.length <= 1) {
      setAppState('COMPLETE')
    } else {
      setFiles(files.slice(1))
    }
  }

  const handleSwipeLeft = async (file: ScannedFile) => {
    await window.api.moveToTrash(file.path)
    setTrashedSize(prev => prev + (file.size / 1024 / 1024 / 1024))
    handleNext()
  }

  const handleSwipeRight = async (file: ScannedFile) => {
    await window.api.snoozeFile(file.path)
    handleNext()
  }

  const handleKeep = async (file: ScannedFile) => {
    await window.api.whitelistFile(file.path)
    handleNext()
  }

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center p-6 space-y-6">
      {appState === 'PERMISSIONS' && (
        <div className="text-center max-w-sm space-y-4">
          <ShieldAlert className="w-16 h-16 mx-auto text-yellow-500" />
          <h1 className="text-2xl font-bold">Access Required</h1>
          <p className="text-gray-400">
            SwipeSweep needs permission to read your Desktop and Downloads folders to find heavy files.
            Please grant "Files and Folders" or "Full Disk Access" in macOS System Settings.
          </p>
          <button 
            onClick={handleGrantPermission}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            I've Granted Access
          </button>
        </div>
      )}

      {appState === 'SCANNING' && (
        <div className="text-center space-y-4">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20"></div>
            <Search className="w-12 h-12 absolute inset-0 m-auto text-blue-400 animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold">Hunting down heavy files...</h2>
          <p className="text-gray-500 text-sm animate-pulse">Scanning ~/Desktop and ~/Downloads</p>
        </div>
      )}

      {appState === 'CAROUSEL' && (
        <div className="flex flex-col items-center w-full max-w-md h-full justify-center">
          <h2 className="text-sm font-medium text-gray-400 mb-8 uppercase tracking-widest">
            {files.length} Files Remaining
          </h2>
          
          <div className="w-full aspect-[3/4] relative perspective-1000">
            {files[0] && (
              <SwipeCard 
                key={files[0].path}
                file={files[0]}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
                onKeep={handleKeep}
              />
            )}
          </div>
          
          <div className="flex justify-between w-full mt-10 px-4">
            <div className="flex flex-col items-center text-red-400">
              <Trash2 className="w-8 h-8 mb-2" />
              <span className="text-xs font-bold uppercase tracking-widest">Delete</span>
            </div>
            <div className="flex flex-col items-center text-yellow-500">
              <Sparkles className="w-8 h-8 mb-2" />
              <span className="text-xs font-bold uppercase tracking-widest">Keep Forever</span>
            </div>
            <div className="flex flex-col items-center text-green-400">
              <RefreshCw className="w-8 h-8 mb-2" />
              <span className="text-xs font-bold uppercase tracking-widest">Think About It</span>
            </div>
          </div>
        </div>
      )}

      {appState === 'COMPLETE' && (
        <div className="text-center max-w-sm space-y-6">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trash2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-4xl font-black tracking-tight">Boom.</h1>
          <p className="text-xl text-gray-300">
            You just staged <span className="text-green-400 font-bold">{trashedSize.toFixed(2)} GB</span> for deletion.
          </p>
          
          <div className="pt-8 space-y-3">
            <button 
              onClick={async () => {
                await window.api.emptyTrash()
                alert('macOS Trash successfully emptied!')
              }}
              className="w-full py-4 bg-red-600 hover:bg-red-700 rounded-xl font-bold transition-colors shadow-lg"
            >
              Empty Trash Now
            </button>
            <button 
              onClick={checkInitialPermissions}
              className="w-full py-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-semibold transition-colors"
            >
              Scan Again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
