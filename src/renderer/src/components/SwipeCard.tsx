import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { motion, useMotionValue, useTransform, useAnimation, PanInfo } from 'framer-motion'
import { Copy, Archive, Layers, Folder } from 'lucide-react'
import type { ScannedItem } from '../App'

interface SwipeCardProps {
  file: ScannedItem
  onSwipeLeft: () => void
  onSwipeRight: () => void
  onKeep: () => void
  onSwipeDown: () => void
}

export interface SwipeCardRef {
  swipeLeft: () => void
  swipeRight: () => void
  keep: () => void
  swipeDown: () => void
}

export const SwipeCard = forwardRef<SwipeCardRef, SwipeCardProps>(({ file, onSwipeLeft, onSwipeRight, onKeep, onSwipeDown }, ref) => {
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const controls = useAnimation()
  
  const rotate = useTransform(x, [-200, 200], [-10, 10])
  const opacity = useTransform(y, [-200, 0, 200], [0.5, 1, 0.5])
  
  const SWIPE_THRESHOLD = 100

  useImperativeHandle(ref, () => ({
    swipeLeft: async () => {
      await controls.start({ x: -400, opacity: 0, transition: { duration: 0.3 } })
      onSwipeLeft()
    },
    swipeRight: async () => {
      await controls.start({ x: 400, opacity: 0, transition: { duration: 0.3 } })
      onSwipeRight()
    },
    keep: async () => {
      await controls.start({ y: -400, opacity: 0, transition: { duration: 0.3 } })
      onKeep()
    },
    swipeDown: async () => {
      await controls.start({ y: 400, opacity: 0, transition: { duration: 0.3 } })
      onSwipeDown()
    }
  }))

  useEffect(() => {
    async function loadThumbnail() {
      if (file.isBundle || !file.paths || !file.paths[0]) return
      try {
        const path = file.paths[0]
        const dataUrl = await window.api.getFileThumbnail(path)
        if (dataUrl) setThumbnail(dataUrl)
      } catch (err) {
        // empty
      }
    }
    loadThumbnail()
  }, [file])

  const handleDragEnd = async (_: any, info: PanInfo) => {
    const absX = Math.abs(info.offset.x)
    const absY = Math.abs(info.offset.y)

    if (absX > absY) {
      if (info.offset.x > SWIPE_THRESHOLD) {
        await controls.start({ x: 400, opacity: 0, transition: { duration: 0.3 } })
        onSwipeRight()
      } else if (info.offset.x < -SWIPE_THRESHOLD) {
        await controls.start({ x: -400, opacity: 0, transition: { duration: 0.3 } })
        onSwipeLeft()
      } else {
        controls.start({ x: 0, y: 0, opacity: 1 })
      }
    } else {
      if (info.offset.y > SWIPE_THRESHOLD) {
        await controls.start({ y: 400, opacity: 0, transition: { duration: 0.3 } })
        onSwipeDown()
      } else if (info.offset.y < -SWIPE_THRESHOLD) {
        await controls.start({ y: -400, opacity: 0, transition: { duration: 0.3 } })
        onKeep()
      } else {
        controls.start({ x: 0, y: 0, opacity: 1 })
      }
    }
  }

  const isVideo = !file.isBundle && file.paths[0]?.toLowerCase().match(/\.(mp4|mov|mkv|avi)$/)

  return (
    <motion.div
      className="absolute w-full h-[110%] bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl shadow-2xl flex flex-col items-center justify-center p-6 border border-gray-700/50 cursor-grab active:cursor-grabbing hover:shadow-blue-500/20 transition-shadow"
      style={{ x, y, rotate, opacity }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={handleDragEnd}
      animate={controls}
      whileTap={{ scale: 0.98 }}
    >
      <div 
        onClick={(e) => {
          e.stopPropagation()
          if (!file.isBundle) {
            window.api.revealInFinder(file.paths[0])
          }
        }}
        className={`absolute top-4 right-4 bg-black/40 p-3 rounded-full hover:bg-blue-600 transition-colors cursor-pointer z-50 group border border-gray-700 ${file.isBundle ? 'hidden' : ''}`}
        title="Reveal in Finder"
      >
        <Folder className="w-4 h-4 text-gray-300 group-hover:text-white" />
      </div>

      {file.isBundle ? (
        <div className="relative w-full max-w-[240px] aspect-square mb-8 rounded-2xl shrink-0 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex items-center justify-center pointer-events-none bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border border-blue-500/20">
          <Layers className="w-24 h-24 text-blue-400 opacity-30 absolute -rotate-12 transform -translate-x-4 translate-y-4 shadow-lg drop-shadow-lg" />
          <Archive className="w-24 h-24 text-indigo-400 opacity-60 absolute rotate-6 transform translate-x-4 -translate-y-2 drop-shadow-lg" />
          <Copy className="w-28 h-28 text-blue-300 z-10 drop-shadow-2xl" />
        </div>
      ) : thumbnail ? (
        <div className="relative w-full max-w-[240px] aspect-square mb-8 rounded-2xl overflow-hidden shrink-0 shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-black pointer-events-none border border-gray-700/50">
          <img 
            src={thumbnail} 
            alt={file.name}
            className="w-full h-full object-cover"
            draggable="false"
          />
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-auto">
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  window.api.openFile(file.paths[0])
                }}
                className="w-16 h-16 bg-white/20 backdrop-blur hover:bg-white/40 border-2 border-white/50 rounded-full flex items-center justify-center transition-all cursor-pointer group shadow-2xl"
              >
                <div className="ml-1 border-y-[12px] border-y-transparent border-l-[20px] border-l-white group-hover:scale-110 transition-transform"></div>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full max-w-[240px] aspect-square mb-8 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-800 shrink-0 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex items-center justify-center text-4xl font-black text-gray-600 uppercase tracking-widest pointer-events-none border border-gray-600/50">
          {file.type ? `.${file.type}` : 'FILE'}
        </div>
      )}

      <h3 className="text-xl font-bold text-center break-words line-clamp-3 px-2 pointer-events-none leading-tight font-sans tracking-tight">
        {file.name}
      </h3>
      
      <p className="text-blue-400 font-mono mt-4 text-3xl font-light pointer-events-none flex items-baseline">
        {(file.size / 1024 / 1024).toFixed(1)} <span className="text-sm ml-1 text-blue-500/50 font-bold uppercase tracking-widest">MB</span>
      </p>
      
      {!file.isBundle && (
        <div className="mt-6 flex flex-col items-center gap-1 pointer-events-none">
          <p className="text-gray-500 font-bold tracking-widest text-[9px] uppercase border border-gray-700/50 rounded-full px-3 py-1 bg-gray-900/50 text-center">
            LAST MODIFIED • {file.modifyTime ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(file.modifyTime)) : 'UNKNOWN'}
          </p>
        </div>
      )}
    </motion.div>
  )
})

SwipeCard.displayName = 'SwipeCard'
