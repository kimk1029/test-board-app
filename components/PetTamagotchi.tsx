'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Droplet, Utensils, Gamepad2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

// 폰트 로드 (Next.js의 경우 layout.tsx에서 로드하거나 아래처럼 스타일로 주입 가능)
const pixelFontUrl = "https://fonts.googleapis.com/css2?family=VT323&display=swap";

interface Pet {
  id: number
  name: string
  level: number
  exp: number
  hunger: number
  happiness: number
  health: number
  poop: number
  lastFedAt: string | null
  lastPlayedAt: string | null
  lastCleanedAt: string | null
}

export default function PetTamagotchi() {
  const [pet, setPet] = useState<Pet | null>(null)
  // 테스트를 위해 초기 로딩을 false로, 임시 펫 데이터를 넣어둘 수도 있습니다.
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [petMood, setPetMood] = useState<'happy' | 'sad' | 'hungry' | 'sick' | 'normal'>('normal')
  const [showMessage, setShowMessage] = useState(false)
  const [message, setMessage] = useState('')
  const [isEating, setIsEating] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  // 폰트 스타일 주입
  useEffect(() => {
    const link = document.createElement('link');
    link.href = pixelFontUrl;
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    // 임시 데이터 (API가 없을 때 테스트용, 실제 연동 시 제거하거나 fetchPet 로직 사용)
    setTimeout(() => {
      setPet({
        id: 1, name: '다마고치', level: 1, exp: 20, hunger: 50, happiness: 60, health: 80, poop: 1,
        lastFedAt: null, lastPlayedAt: null, lastCleanedAt: null
      })
      setLoading(false)
    }, 1000)
  }, []);

  useEffect(() => {
    // fetchPet() // 실제 API 연동 시 주석 해제
    // const interval = setInterval(fetchPet, 30000)
    // return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (pet) {
      if (pet.health < 30) setPetMood('sick')
      else if (pet.hunger < 30) setPetMood('hungry')
      else if (pet.happiness < 30) setPetMood('sad')
      else if (pet.happiness > 70 && pet.hunger > 70) setPetMood('happy')
      else setPetMood('normal')
    }
  }, [pet])

  // 실제 API 호출 함수 (생략되지 않음, 기존 로직 유지)
  const fetchPet = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) { setLoading(false); return }
      const res = await fetch('/api/pet', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const data = await res.json(); setPet(data) }
    } catch (error) { console.error(error) } finally { setLoading(false) }
  }

  const handleAction = async (action: 'feed' | 'play' | 'clean') => {
    if (!pet || actionLoading) return

    // 즉각적인 UI 피드백
    if (action === 'feed') {
      setIsEating(true)
      setTimeout(() => setIsEating(false), 2500) // 먹는 시간 2.5초
    } else if (action === 'play') {
      setIsPlaying(true)
      setTimeout(() => setIsPlaying(false), 2000)
    }

    // API 호출 시뮬레이션 (실제 사용시 아래 주석 해제 및 위 로직과 통합)
    /* setActionLoading(action)
    try {
        // ... API fetch logic ...
    } finally { setActionLoading(null) }
    */

    // UI 테스트를 위한 가짜 업데이트
    setMessage(action === 'feed' ? "맛있어! 냠냠!" : action === 'play' ? "신난다!" : "깨끗해졌어!");
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 3000);
  }

  // 펫 이미지 결정 (픽셀 아트 URL)
  // 실제로는 기분별로 다른 이미지 URL을 리턴하도록 설정하면 더 좋습니다.
  const getPetImage = () => {
    // 예시: PokeAPI의 픽셀 스프라이트 사용 (안정적임)
    // 기분에 따라 다른 포켓몬이나 표정을 쓸 수 있습니다.
    if (petMood === 'sick') return "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/132.png" // 메타몽(녹아내림)
    if (petMood === 'happy') return "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/133.png" // 이브이
    return "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/133.png" // 기본 이브이
  }

  const getNextLevelExp = () => pet ? pet.level * 100 : 100
  const getExpProgress = () => {
    if (!pet) return 0
    return ((pet.exp - (pet.level - 1) * 100) / 100) * 100 // 단순화
  }

  if (loading) return <div className="p-8 text-center text-pixel-gray">Loading...</div>
  if (!pet) return <div className="p-8 text-center text-pixel-gray">No Pet Found</div>

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4 font-['VT323']">

      {/* 게임기 본체 */}
      <div className="relative bg-[#f0f0f0] p-6 rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.2),inset_0_-10px_20px_rgba(0,0,0,0.1)] border-4 border-[#d4d4d4] w-full max-w-md">

        {/* 화면 베젤 */}
        <div className="bg-[#5c5c5c] p-4 rounded-3xl shadow-inner mb-6 relative">
          <div className="absolute top-2 right-4 text-xs text-white/50 tracking-widest">TAMAGOTCHI</div>

          {/* 실제 LCD 화면 영역 */}
          <div className="relative w-full aspect-square bg-[#8bac0f] overflow-hidden rounded-xl border-4 border-[#4d5c14] shadow-[inset_0_0_20px_rgba(0,0,0,0.3)]">

            {/* 배경 이미지 (픽셀 룸) */}
            <div
              className="absolute inset-0 opacity-80 mix-blend-multiply"
              style={{
                backgroundImage: 'url(https://i.pinimg.com/originals/f3/78/f6/f378f6356df16a7590d96d747a163152.gif)', // 픽셀 아트 배경 GIF 예시 (또는 정적 이미지)
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                imageRendering: 'pixelated'
              }}
            />

            {/* 스캔라인 효과 (옛날 TV 느낌) */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] z-20 pointer-events-none background-size-[100%_2px,3px_100%]" />

            {/* 펫 & 인터랙션 영역 */}
            <div className="absolute inset-0 flex items-center justify-center z-10">

              {/* 펫 컨테이너 */}
              <motion.div
                // Idle 애니메이션: 둥둥 떠다니기 (숨쉬기)
                animate={
                  isEating ? {
                    y: [0, -20, 0], // 점프
                    scale: [1, 1.1, 0.9, 1], // 씹는 듯한 스케일 변화
                  } : isPlaying ? {
                    x: [-10, 10, -10, 10, 0], // 좌우로 신나게 흔들기
                    rotate: [0, -5, 5, -5, 0]
                  } : {
                    y: [0, -6, 0], // 기본: 천천히 위아래로 움직임
                  }
                }
                transition={
                  isEating ? { duration: 0.5, repeat: 5 }
                    : isPlaying ? { duration: 0.5 }
                      : { duration: 2, repeat: Infinity, ease: "easeInOut" }
                }
                className="relative"
              >
                {/* 밥 먹을 때 나타나는 음식 아이콘 */}
                <AnimatePresence>
                  {isEating && (
                    <motion.div
                      initial={{ opacity: 0, x: -30, y: -20 }}
                      animate={{ opacity: 1, x: 0, y: 0 }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{ duration: 0.5 }}
                      className="absolute -left-8 top-1/2 -translate-y-1/2 text-4xl"
                    >
                      🍗
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 펫 이미지 (pixelated 클래스로 픽셀 깨짐 방지) */}
                <img
                  src={getPetImage()}
                  alt="Pet"
                  className="w-32 h-32 object-contain drop-shadow-md"
                  style={{ imageRendering: 'pixelated' }}
                />

                {/* 그림자 (바닥에 고정) */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-20 h-3 bg-black/20 rounded-[100%] blur-[2px]" />
              </motion.div>
            </div>

            {/* 상태 오버레이 (간단한 정보) */}
            <div className="absolute top-2 left-2 z-30 flex gap-2">
              <div className="bg-[#4d5c14]/90 text-[#9bbc0f] px-2 py-0.5 rounded text-sm border border-[#9bbc0f]">
                Lv.{pet.level}
              </div>
            </div>

            {/* 메시지 알림 */}
            <AnimatePresence>
              {showMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-4 left-0 right-0 text-center z-30"
                >
                  <span className="bg-[#0f380f] text-[#9bbc0f] px-3 py-1 rounded-full text-lg border-2 border-[#9bbc0f]">
                    {message}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

        {/* 하단 컨트롤 패널 */}
        <div className="space-y-6">

          {/* 상태 바 (픽셀 스타일) */}
          <div className="grid grid-cols-2 gap-4 bg-white/50 p-4 rounded-xl border-2 border-gray-200">
            <div className="space-y-1">
              <div className="flex justify-between text-xl text-gray-600">
                <span>HUNGRY</span>
                <span>{Math.round(pet.hunger)}%</span>
              </div>
              <Progress value={pet.hunger} className="h-4 bg-gray-300 rounded-none" indicatorClassName="bg-[#8bac0f]" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xl text-gray-600">
                <span>HAPPY</span>
                <span>{Math.round(pet.happiness)}%</span>
              </div>
              <Progress value={pet.happiness} className="h-4 bg-gray-300 rounded-none" indicatorClassName="bg-[#8bac0f]" />
            </div>
          </div>

          {/* 버튼 그룹 (게임기 버튼 느낌) */}
          <div className="grid grid-cols-3 gap-4">
            <Button
              onClick={() => handleAction('feed')}
              disabled={isEating}
              className="h-16 rounded-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 border-b-4 border-yellow-600 active:border-b-0 active:translate-y-1 transition-all flex flex-col gap-1"
            >
              <Utensils className="w-6 h-6" />
              <span className="text-sm">밥주기</span>
            </Button>

            <Button
              onClick={() => handleAction('play')}
              disabled={isPlaying}
              className="h-16 rounded-full bg-blue-400 hover:bg-blue-500 text-blue-900 border-b-4 border-blue-600 active:border-b-0 active:translate-y-1 transition-all flex flex-col gap-1"
            >
              <Gamepad2 className="w-6 h-6" />
              <span className="text-sm">놀기</span>
            </Button>

            <Button
              onClick={() => handleAction('clean')}
              disabled={pet.poop === 0}
              className="h-16 rounded-full bg-emerald-400 hover:bg-emerald-500 text-emerald-900 border-b-4 border-emerald-600 active:border-b-0 active:translate-y-1 transition-all flex flex-col gap-1"
            >
              <Droplet className="w-6 h-6" />
              <span className="text-sm">청소</span>
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}