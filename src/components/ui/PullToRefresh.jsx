import React, { useState, useRef, useEffect } from 'react'
import { RotateCcw } from 'lucide-react'

export default function PullToRefresh({ onRefresh, children }) {
  const [pulling, setPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startYRef = useRef(0)
  const containerRef = useRef(null)

  const handleTouchStart = (e) => {
    if (containerRef.current?.scrollTop === 0) {
      startYRef.current = e.touches[0].clientY
    }
  }

  const handleTouchMove = (e) => {
    if (containerRef.current?.scrollTop !== 0 || isRefreshing) return

    const currentY = e.touches[0].clientY
    const distance = Math.max(0, currentY - startYRef.current)

    setPullDistance(distance)
    setPulling(distance > 80)
  }

  const handleTouchEnd = async () => {
    if (pulling && !isRefreshing) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }
    setPullDistance(0)
    setPulling(false)
  }

  const handleScroll = () => {
    if (containerRef.current?.scrollTop !== 0) {
      setPullDistance(0)
      setPulling(false)
    }
  }

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onScroll={handleScroll}
      className="relative w-full h-full overflow-auto"
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-300"
        style={{
          height: `${Math.min(pullDistance, 80)}px`,
        }}
      >
        <div className="flex flex-col items-center gap-2">
          <RotateCcw
            className={`w-5 h-5 text-indigo-600 transition-transform duration-300 ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            style={{
              transform: `rotate(${Math.min(pullDistance, 80) * 2.25}deg)`,
              opacity: Math.min(pullDistance / 80, 1),
            }}
          />
          {!isRefreshing && pullDistance > 0 && (
            <span className="text-xs text-slate-500">
              {pulling ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          )}
        </div>
      </div>

      {children}
    </div>
  )
}