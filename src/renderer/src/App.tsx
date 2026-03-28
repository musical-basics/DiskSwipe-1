import { useState, useEffect } from 'react'
import { HardDrive, Search, Trash2, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react'

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
    // Check again assuming user has navigated macOS settings
    checkInitialPermissions()
  }

  // Temporary stub until Phase 4 (Framer Motion SwipeCard)
  const handleNext = () => {
    if (files.length <= 1) {
      setAppState('COMPLETE')
    } else {
      // Log interaction roughly
      const trashed = files[0].size
      setTrashedSize(prev => prev + (trashed / 1024 / 1024 / 1024))
      setFiles(files.slice(1))
    }
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
          
          <div className="bg-gray-800 border border-gray-700 w-full aspect-[3/4] rounded-2xl flex flex-col items-center justify-center p-8 shadow-2xl relative">
            <HardDrive className="w-20 h-20 text-gray-500 mb-6" />
            <h3 className="text-xl font-bold text-center break-all line-clamp-2">
              {files[0]?.name}
            </h3>
            <p className="text-blue-400 font-mono mt-4 text-2xl">
              {(files[0]?.size / 1024 / 1024).toFixed(1)} MB
            </p>
            <p className="text-gray-500 mt-2 text-sm uppercase">{files[0]?.type}</p>
            
            <button 
              onClick={handleNext} 
              className="absolute bottom-6 px-6 py-2 bg-gray-700 rounded-full text-sm font-medium hover:bg-gray-600 transition-colors"
            >
              Simulate Swipe (Dev)
            </button>
          </div>
          
          <div className="flex justify-between w-full mt-10 px-4">
            <div className="flex flex-col items-center text-red-400">
              <Trash2 className="w-8 h-8 mb-2" />
              <span className="text-xs font-bold uppercase">Swipe Left</span>
            </div>
            <div className="flex flex-col items-center text-yellow-500">
              <Sparkles className="w-8 h-8 mb-2" />
              <span className="text-xs font-bold uppercase">Click Star</span>
            </div>
            <div className="flex flex-col items-center text-green-400">
              <RefreshCw className="w-8 h-8 mb-2" />
              <span className="text-xs font-bold uppercase">Swipe Right</span>
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
               onClick={() => alert('Will trigger OS trash clear in v2')}
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
