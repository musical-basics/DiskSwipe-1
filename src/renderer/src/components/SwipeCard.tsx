import { motion, useAnimation, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { HardDrive } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ScannedFile {
  name: string
  path: string
  size: number
  type: string
  modifyTime: number
}

interface SwipeCardProps {
  file: ScannedFile
  onSwipeLeft: (file: ScannedFile) => void
  onSwipeRight: (file: ScannedFile) => void
  onKeep: (file: ScannedFile) => void
}

export function SwipeCard({ file, onSwipeLeft, onSwipeRight, onKeep }: SwipeCardProps) {
  const x = useMotionValue(0)
  const controls = useAnimation()
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)

  const rotate = useTransform(x, [-200, 200], [-10, 10])
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0])
  const background = useTransform(
    x,
    [-200, 0, 200],
    ['rgba(239,68,68,0.2)', 'rgba(31,41,55,1)', 'rgba(34,197,94,0.2)']
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnimatingOut) return
      if (e.key === 'ArrowLeft') handleSwipe('left')
      if (e.key === 'ArrowRight') handleSwipe('right')
      if (e.key === 'ArrowUp') handleSwipe('up')
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [file, isAnimatingOut])

  // Automatically start animations on load
  useEffect(() => {
    controls.start({ scale: 1, opacity: 1, transition: { type: 'spring', damping: 15 } })
  }, [file])

  const handleSwipe = async (dir: 'left' | 'right' | 'up') => {
    setIsAnimatingOut(true)
    if (dir === 'left') {
      await controls.start({ x: -500, opacity: 0, transition: { duration: 0.2 } })
      onSwipeLeft(file)
    } else if (dir === 'right') {
      await controls.start({ x: 500, opacity: 0, transition: { duration: 0.2 } })
      onSwipeRight(file)
    } else if (dir === 'up') {
      await controls.start({ scale: 0, opacity: 0, transition: { duration: 0.2 } })
      onKeep(file)
    }
  }

  const handleDragEnd = async (_e: any, info: PanInfo) => {
    const threshold = 100
    if (info.offset.x < -threshold) {
      await handleSwipe('left')
    } else if (info.offset.x > threshold) {
      await handleSwipe('right')
    } else {
      controls.start({ x: 0, y: 0 })
    }
  }

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      style={{ x, rotate, backgroundColor: background }}
      animate={controls}
      initial={{ scale: 0.95, opacity: 0, x: 0, y: 0 }}
      className="border border-gray-700 w-full h-full rounded-2xl flex flex-col items-center justify-center p-8 shadow-2xl absolute inset-0 cursor-grab active:cursor-grabbing hover:shadow-blue-500/10 origin-bottom"
    >
      <HardDrive className="w-20 h-20 text-gray-500 mb-6 pointer-events-none" />
      <h3 className="text-xl font-bold text-center break-all line-clamp-3 px-4 pointer-events-none">
        {file.name}
      </h3>
      <p className="text-blue-400 font-mono mt-4 text-2xl pointer-events-none">
        {(file.size / 1024 / 1024).toFixed(1)} MB
      </p>
      <p className="text-gray-500 mt-2 text-sm uppercase pointer-events-none">{file.type}</p>
    </motion.div>
  )
}
