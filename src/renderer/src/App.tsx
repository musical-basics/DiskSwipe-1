import { useState, useEffect, useRef } from 'react'
import { Search, Trash2, ShieldAlert, Sparkles, RefreshCw, Archive, Home } from 'lucide-react'
import { SwipeCard, SwipeCardRef } from './components/SwipeCard'

export interface ScannedItem {
  id: string
  isBundle: boolean
  name: string
  paths: string[]
  size: number
  type: string
  modifyTime: number
}

type AppState = 'PERMISSIONS' | 'SCANNING' | 'CAROUSEL' | 'PROCESSING' | 'COMPLETE'
type ActionType = 'trash' | 'temp' | 'snooze' | 'keep'
type ScanMode = 'heavy' | 'clutter'

export default function App() {
  const [appState, setAppState] = useState<AppState>('PERMISSIONS')
  const [scanMode, setScanMode] = useState<ScanMode>('heavy')
  const [files, setFiles] = useState<ScannedItem[]>([])
  const [history, setHistory] = useState<{file: ScannedItem, action: ActionType}[]>([])
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
      // Don't auto-start
    }
  }

  const startScan = async () => {
    setAppState('SCANNING')
    const dirsToScan = Object.entries(selectedDirs).filter(([_, a]) => a).map(([d]) => d)
    if (dirsToScan.length === 0) dirsToScan.push('Downloads')
    
    const scannedItems = await window.api.startScan(dirsToScan, scanMode)
    setFiles(scannedItems)
    
    if (scannedItems.length > 0) {
      setAppState('CAROUSEL')
    } else {
      setAppState('COMPLETE')
    }
  }

  const handleNext = () => {
    setFiles((prev) => {
      const nextArr = prev.slice(1)
      if (nextArr.length === 0) setAppState('COMPLETE')
      return nextArr
    })
  }

  const trackSwipe = (file: ScannedItem, action: ActionType) => {
    setHistory(prev => [...prev, { file, action }])
    handleNext()
  }

  const handleSwipeLeft = (file: ScannedItem) => trackSwipe(file, 'trash')
  const handleSwipeRight = (file: ScannedItem) => trackSwipe(file, 'snooze')
  const handleKeep = (file: ScannedItem) => trackSwipe(file, 'keep')
  const handleSwipeDown = (file: ScannedItem) => trackSwipe(file, 'temp')

  const handleUndo = () => {
    if (history.length === 0) return
    const lastAction = history[history.length - 1]
    setHistory(history.slice(0, -1))
    setFiles([lastAction.file, ...files])
  }

  const handleGoHome = () => {
    if (history.length > 0) {
      if (!window.confirm("You have uncommitted swipes. Are you sure you want to return home? Your staging queue will be lost.")) {
        return
      }
    }
    setHistory([])
    setFiles([])
    setAppState('PERMISSIONS')
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
    // Send the array of paths down
    const acts = history.map(h => ({ paths: h.file.paths, action: h.action }))
    await window.api.executeActions(acts)
    setHistory([])
    
    if (files.length > 0) {
      setAppState('CAROUSEL')
    } else {
      setAppState('COMPLETE')
    }
  }

  const currentFile = files[0]

  return (
    <div className="w-screen h-screen bg-black text-white overflow-hidden flex flex-col font-sans select-none">
      
      {appState === 'PERMISSIONS' && (
        <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-gray-900 to-black">
          <div className="text-center max-w-md w-full">
            <ShieldAlert className="w-16 h-16 mx-auto text-blue-500 mb-6" />
            <h1 className="text-3xl font-bold mb-4 tracking-tight">Disk Access Required</h1>
            <p className="text-gray-400 mb-8 leading-relaxed text-sm">
              SwipeSweep needs permission to safely analyze your home folders. No actions are executed until you finish.
            </p>
            
            <div className="flex w-full space-x-2 mb-6">
              <button 
                onClick={() => setScanMode('heavy')}
                className={`flex-1 py-4 px-2 rounded-xl font-bold text-sm transition-all border border-gray-700/50 ${scanMode === 'heavy' ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'bg-gray-800/50 text-gray-500 hover:bg-gray-800'}`}
              >
                Heavy Hitters<br/><span className="text-xs font-normal opacity-70">&gt; 100 MB</span>
              </button>
              <button 
                onClick={() => setScanMode('clutter')}
                className={`flex-1 py-4 px-2 rounded-xl font-bold text-sm transition-all border border-gray-700/50 ${scanMode === 'clutter' ? 'bg-green-600 text-white shadow-[0_0_20px_rgba(22,163,74,0.3)]' : 'bg-gray-800/50 text-gray-500 hover:bg-gray-800'}`}
              >
                Clutter Sweeper<br/><span className="text-xs font-normal opacity-70">Loose Files &lt; 10 MB</span>
              </button>
            </div>

            <div className="w-full bg-gray-800/50 p-6 rounded-2xl mb-8 border border-gray-700/50 flex flex-col gap-4 text-left shadow-lg">
              <h3 className="font-bold text-sm tracking-widest uppercase text-gray-500 mb-2">Target Folders</h3>
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
              className="w-full py-4 bg-white text-black rounded-lg font-bold text-lg hover:scale-105 transition-transform cursor-pointer shadow-white/20 shadow-2xl"
            >
              Analyze Disk Space
            </button>
          </div>
        </div>
      )}

      {appState === 'SCANNING' && (
        <div className="flex-1 flex flex-col items-center justify-center bg-black">
          <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
            <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full animate-spin border-t-blue-500"></div>
            <Search className="w-12 h-12 absolute inset-0 m-auto text-blue-400 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Hunting down files...</h2>
          <p className="text-gray-500 text-sm mt-2 animate-pulse font-mono tracking-widest uppercase">{scanMode} Mode</p>
        </div>
      )}

      {appState === 'CAROUSEL' && (
        <div className="flex-1 flex flex-col items-center justify-center bg-black relative">
          <div className="absolute inset-x-0 inset-y-0 pointer-events-none bg-gradient-to-b from-blue-900/10 to-black z-0"></div>
          
          <h2 className="absolute top-12 text-sm font-bold tracking-widest text-gray-500 uppercase z-10 font-mono">
            {files.length} {scanMode === 'heavy' ? 'Giants' : 'Bundles'} Remaining
          </h2>
          
          <div className="w-full aspect-[3/4] relative perspective-1000 z-10 max-w-sm mx-auto flex items-center justify-center">
            {history.length > 0 && (
              <button 
                onClick={handleUndo} 
                className="absolute -top-16 left-0 flex items-center bg-gray-800/80 border border-gray-700/50 hover:bg-gray-700 px-4 py-2 rounded-full cursor-pointer transition-colors shadow-lg z-20 text-blue-400 font-bold tracking-widest text-[10px] uppercase"
              >
                Undo (⌘Z)
              </button>
            )}

            {history.length > 0 && (
              <button 
                onClick={commitActions} 
                className="absolute -top-16 left-1/2 -translate-x-1/2 flex items-center bg-red-600/90 border border-red-500 hover:bg-red-500 px-6 py-2 rounded-full cursor-pointer transition-colors shadow-[0_0_15px_rgba(239,68,68,0.5)] z-20 text-white font-black tracking-widest text-[10px] uppercase group scale-105"
              >
                COMMIT ({history.length})
              </button>
            )}

            <button 
              onClick={handleGoHome} 
              className="absolute -top-16 right-0 flex items-center bg-gray-800/80 border border-gray-700/50 hover:bg-gray-700 px-4 py-2 rounded-full cursor-pointer transition-colors shadow-lg z-20 text-gray-400 hover:text-white font-bold tracking-widest text-[10px] uppercase"
            >
              <Home className="w-3 h-3 mr-2" />
              Home
            </button>

            {currentFile && (
              <SwipeCard 
                ref={swipeCardRef}
                file={currentFile} 
                onSwipeLeft={() => handleSwipeLeft(currentFile)}
                onSwipeRight={() => handleSwipeRight(currentFile)}
                onKeep={() => handleKeep(currentFile)}
                onSwipeDown={() => handleSwipeDown(currentFile)}
                key={currentFile.id}
              />
            )}
            {!currentFile && (
              <div className="absolute inset-0 flex flex-col items-center justify-center border-4 border-dashed border-gray-800 rounded-3xl">
                <Sparkles className="w-16 h-16 text-gray-600 mb-4" />
                <p className="text-gray-500 font-bold tracking-widest uppercase">All Clear!</p>
              </div>
            )}
          </div>

          <div className="absolute bottom-12 w-full max-w-md px-6 flex justify-between items-end z-20">
            <button 
              onClick={() => swipeCardRef.current?.swipeLeft()}
              className="flex flex-col items-center text-red-500 hover:scale-110 hover:text-red-400 transition-all cursor-pointer group"
            >
              <Trash2 className="w-8 h-8 mb-2 group-hover:-translate-y-1 transition-transform" />
              <span className="text-[10px] whitespace-pre-wrap font-bold uppercase tracking-widest text-center leading-tight">
                {currentFile?.isBundle ? 'Trash\nAll' : 'Delete'}
              </span>
            </button>
            <button 
              onClick={() => swipeCardRef.current?.swipeDown()}
              className="flex flex-col items-center text-blue-500 hover:scale-110 hover:text-blue-400 transition-all cursor-pointer group translate-y-4"
            >
              <Archive className="w-8 h-8 mb-2 group-hover:translate-y-1 transition-transform" />
              <span className="text-[10px] whitespace-pre-wrap font-bold uppercase tracking-widest text-center leading-tight">
                {currentFile?.isBundle ? 'Box\nIt Up' : 'Temp Folder'}
              </span>
            </button>
            <button 
              onClick={() => swipeCardRef.current?.keep()}
              className="flex flex-col items-center text-yellow-500 hover:scale-110 hover:text-yellow-400 transition-all cursor-pointer group translate-y-4"
            >
              <Sparkles className="w-8 h-8 mb-2 group-hover:-translate-y-1 transition-transform" />
              <span className="text-[10px] whitespace-pre-wrap font-bold uppercase tracking-widest text-center leading-tight">
                {currentFile?.isBundle ? 'Keep\nMess' : 'Keep'}
              </span>
            </button>
            <button 
              onClick={() => swipeCardRef.current?.swipeRight()}
              className="flex flex-col items-center text-green-500 hover:scale-110 hover:text-green-400 transition-all cursor-pointer group"
            >
              <RefreshCw className="w-8 h-8 mb-2 group-hover:translate-y-1 transition-transform" />
              <span className="text-[10px] whitespace-pre-wrap font-bold uppercase tracking-widest text-center leading-tight">
                {currentFile?.isBundle ? 'Snooze\nStack' : 'Snooze'}
              </span>
            </button>
          </div>
        </div>
      )}

      {appState === 'PROCESSING' && (
        <div className="flex-1 flex flex-col items-center justify-center bg-black animate-pulse">
          <Search className="w-16 h-16 text-blue-500 mb-6 animate-spin" />
          <h2 className="text-2xl font-bold">Executing Moves...</h2>
          <p className="text-gray-400 mt-2 font-mono uppercase tracking-widest">Updating Filesystem</p>
        </div>
      )}

      {appState === 'COMPLETE' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-t from-green-900/20 to-black">
          <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mb-8 border border-green-500/30">
            <Trash2 className="w-12 h-12 text-green-400" />
          </div>
          <h1 className="text-5xl font-black mb-6 tracking-tight">Boom.</h1>
          
          <div className="w-full max-w-sm bg-gray-800/50 p-6 rounded-2xl mb-8 border border-gray-700/50 text-center shadow-lg">
            <p className="text-gray-400 mb-2 font-medium tracking-widest uppercase text-xs">Total Impact</p>
            <p className="text-4xl font-bold text-red-400">
              {(history.filter(h => h.action === 'trash').reduce((acc, h) => acc + h.file.size, 0) / 1024 / 1024 / 1024).toFixed(2)} GB
            </p>
            <p className="text-xs text-gray-500 mt-2 uppercase tracking-widest">Marked for Deletion</p>
          </div>

          <div className="flex flex-col max-w-sm w-full space-y-4">
            <button 
              onClick={history.length > 0 ? commitActions : window.api.emptyTrash}
              className="w-full py-4 bg-red-600/20 text-red-400 border border-red-500/50 hover:bg-red-600 hover:text-white rounded-xl font-bold tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)]"
            >
              {history.length > 0 ? "Commit All Moves" : "Empty Mac Trash Now"}
            </button>
            <button 
              onClick={handleGoHome}
              className="w-full py-4 bg-gray-800/50 text-gray-300 hover:bg-gray-700 rounded-xl font-bold tracking-widest uppercase transition-all"
            >
              Start New Scan
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
