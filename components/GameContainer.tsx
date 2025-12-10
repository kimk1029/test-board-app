import React, { ReactNode } from 'react'

interface GameContainerProps {
  children: ReactNode
  className?: string
  centerContent?: boolean // 내용물 중앙 정렬 여부 (기본값 true)
}

export default function GameContainer({ children, className = '', centerContent = true }: GameContainerProps) {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* 상단 네비게이션 공간 확보 (HeaderNavigator 높이 약 64px) */}
      {/* 여백 요구사항: 상단 네비+30px, 좌우 50px, 하단 30px */}
      <div className="flex-1 flex flex-col pt-[94px] px-[50px] pb-[30px] w-full h-full overflow-hidden">
        <div 
          className={`flex-1 relative w-full h-full border-2 border-white/10 rounded-xl bg-black/20 backdrop-blur-sm overflow-hidden ${centerContent ? 'flex items-center justify-center' : ''} ${className}`}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
