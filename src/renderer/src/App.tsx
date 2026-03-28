import { useState, useEffect, useRef } from 'react'
import { Search, Trash2, ShieldAlert, Sparkles, RefreshCw, Archive } from 'lucide-react'
import { SwipeCard, SwipeCardRef } from './components/SwipeCard'

// Define the core file interface mapped from preload
interface ScannedFile {
  name: string
  path: string
  size: number
  type: string
  modifyTime: number
}

type AppState = 'PERMISSIONS' | 'SCANNING' | 'CAROUSEL' | 'PROCESSING' | 'COMPLETE'

type ActionType = 'trash' | 'temp' | 'snooze' | 'keep'

export default function App() {
  const [appState, setAppState] = useState<AppState>('PERMISSIONS')
  const [files, setFiles] = useState<ScannedFile[]>([])
  const [history, setHistory] = useState<{file: ScannedFile, action: ActionType}[]>([])
  const [selectedDirs, setSelectedDirs] = useState({
    Downloads: true,
    Desktop: true,
    Documents: false,
    Pictures: false,
    Movies: false
  })
  const swipeCardRef = useRef<SwipeCardRef>(null)

  useEffect(() => {
    checkInitialPermissions()
  }, [])

  const checkInitialPermissions = async () => {
    const hasPerms = await window.api.checkPermissions()
    if (hasPerms) {
      // Don't auto-start scan, let them pick folders
    }
  }

  const startScan = async () => {
    setAppState('SCANNING')
    const dirsToScan = Object.entries(selectedDirs).filter(([_, a]) => a).map(([d]) => d)
    if (dirsToScan.length === 0) dirsToScan.push('Downloads')
    const scannedFiles = await window.api.startScan(dirsToScan)
    setFiles(scannedFiles)
    if (scannedFiles.length > 0) {
      setAppState('CAROUSEL')
    } else {
      setAppState('COMPLETE')
    }
  }

  const handleNext = () => {
    setFiles((prev) => {
      const nextArr = prev.slice(1)
      if (nextArr.length === 0) {
        // We aren't fully complete until we commit, so show complete screen manually
        setAppState('COMPLETE')
      }
      return nextArr
    })
  }

  const trackSwipe = (file: ScannedFile, action: ActionType) => {
    setHistory(prev => [...prev, { file, action }])
    handleNext()
  }

  const handleSwipeLeft = (file: ScannedFile) => trackSwipe(file, 'trash')
  const handleSwipeRight = (file: ScannedFile) => trackSwipe(file, 'snooze')
  const handleKeep = (file: ScannedFile) => trackSwipe(file, 'keep')
  const handleSwipeDown = (file: ScannedFile) => trackSwipe(file, 'temp')

  const handleUndo = () => {
    if (history.length === 0) return
    const lastAction = history[history.length - 1]
    setHistory(history.slice(0, -1))
    setFiles([lastAction.file, ...files])
  }

  useEffect(() => {
    if (appState !== 'CAROUSEL') return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'z' && (e.metaKey || e.ctrlKey)) {
        handleUndo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [appState, history, files])

  const commitActions = async () => {
    setAppState('PROCESSING')
    const acts = history.map(h => ({ path: h.file.path, action: h.action }))
    await window.api.executeActions(acts)
    setAppState('COMPLETE')
    // Reset history so it doesn't double-commit
    setHistory([])
  }

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center p-6 space-y-6">
      {appState === 'PERMISSIONS' && (
        <div className="text-center max-w-sm space-y-4">
          <ShieldAlert className="w-16 h-16 mx-auto text-yellow-500" />
          <h1 className="text-3xl font-bold mb-4 tracking-tight">Disk Access Required</h1>
          <p className="text-gray-400 mb-8 leading-relaxed">
            SwipeSweep needs permission to safely analyze your home folders for massive files. No actions are executed until you finish.
          </p>
          
          <div className="w-full bg-gray-800/50 p-6 rounded-2xl mb-8 border border-gray-700/50 flex flex-col gap-4 text-left shadow-lg">
            <h3 className="font-bold text-sm tracking-widest uppercase text-gray-400 mb-2">Target Folders</h3>
            {Object.entries(selectedDirs).map(([dir, active]) => (
              <label key={dir} className="flex items-center space-x-4 cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors">
                <input 
                  type="checkbox" 
                  checked={active}
                  onChange={() => setSelectedDirs(prev => ({ ...prev, [dir]: !active }))}
                  className="w-5 h-5 accent-blue-500 cursor-pointer" 
                />
                <span className="font-medium text-lg">{dir}</span>
              </label>
            ))}
          </div>

          <button 
            onClick={startScan}
            className="w-full py-4 bg-white text-black rounded-lg font-bold text-lg hover:scale-105 transition-transform cursor-pointer shadow-blue-500/20 shadow-2xl"
          >
            Authenticate & Scan
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
          <p className="text-gray-500 text-sm animate-pulse">Scanning selected folders</p>
        </div>
      )}

      {appState === 'CAROUSEL' && (
        <div className="flex flex-col items-center w-full max-w-md h-full justify-center">
          <h2 className="text-sm font-medium text-gray-400 mb-8 uppercase tracking-widest">
            {files.length} Files Remaining
          </h2>
          
          <div className="w-full aspect-[3/4] relative perspective-1000">
            {history.length > 0 && (
              <button 
                onClick={handleUndo} 
                className="absolute -top-12 left-0 flex items-center bg-gray-800/80 border border-gray-700/50 hover:bg-gray-700 px-4 py-2 rounded-full cursor-pointer transition-colors shadow-lg z-20 text-blue-400 font-bold tracking-widest text-xs uppercase"
              >
                Undo (⌘Z)
              </button>
            )}

            {files[0] && (
              <SwipeCard 
                ref={swipeCardRef}
                key={files[0].path}
                file={files[0]}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
                onKeep={handleKeep}
                onSwipeDown={handleSwipeDown}
              />
            )}
          </div>
          
          <div className="flex w-full mt-10 space-x-2">
            <button 
              onClick={() => swipeCardRef.current?.swipeLeft()}
              className="flex-1 flex flex-col items-center justify-start text-red-500 hover:scale-110 hover:-translate-y-1 transition-all cursor-pointer bg-transparent border-none appearance-none"
            >
              <Trash2 className="w-7 h-7 mb-2" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-center leading-tight">Delete</span>
            </button>
            <button 
              onClick={() => swipeCardRef.current?.swipeDown()}
              className="flex-1 flex flex-col items-center justify-start text-blue-400 hover:scale-110 hover:-translate-y-1 transition-all cursor-pointer bg-transparent border-none appearance-none"
            >
              <Archive className="w-7 h-7 mb-2" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-center leading-tight">Temp Folder</span>
            </button>
            <button 
              onClick={() => swipeCardRef.current?.swipeUp()}
              className="flex-1 flex flex-col items-center justify-start text-yellow-500 hover:scale-110 hover:-translate-y-1 transition-all cursor-pointer bg-transparent border-none appearance-none"
            >
              <Sparkles className="w-7 h-7 mb-2" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-center leading-tight">Keep Forever</span>
            </button>
            <button 
              onClick={() => swipeCardRef.current?.swipeRight()}
              className="flex-1 flex flex-col items-center justify-start text-green-500 hover:scale-110 hover:-translate-y-1 transition-all cursor-pointer bg-transparent border-none appearance-none"
            >
              <RefreshCw className="w-7 h-7 mb-2" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-center leading-tight">Think About It</span>
            </button>
          </div>
        </div>
      )}

      {appState === 'PROCESSING' && (
        <div className="flex flex-col items-center animate-pulse">
          <Search className="w-16 h-16 text-blue-500 mb-6 animate-spin" />
          <h2 className="text-2xl font-bold">Executing Moves...</h2>
          <p className="text-gray-400 mt-2">Updating Trash & Archive</p>
        </div>
      )}

      {appState === 'COMPLETE' && (
        <div className="flex flex-col items-center max-w-sm text-center">
          <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mb-8 border border-green-500/30">
            <Trash2 className="w-12 h-12 text-green-400" />
          </div>
          <h1 className="text-5xl font-black mb-6 tracking-tight">Boom.</h1>
          
          <div className="w-full bg-gray-800/50 p-6 rounded-2xl mb-8 border border-gray-700/50">
            <p className="text-gray-400 mb-2 font-medium tracking-widest uppercase text-xs">Total Trashed</p>
            <p className="text-4xl font-bold text-red-400">
              {(history.filter(h => h.action === 'trash').reduce((acc, h) => acc + h.file.size, 0) / 1024 / 1024 / 1024).toFixed(2)} GB
            </p>
          </div>

          <div className="flex justify-between w-full space-x-2">
            <button 
              onClick={history.length > 0 ? commitActions : window.api.emptyTrash}
              className="flex-1 py-4 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white rounded-lg font-bold text-sm tracking-widest uppercase transition-colors"
            >
              {history.length > 0 ? "Commit All Moves" : "Empty Mac Trash Now"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
