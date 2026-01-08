'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Droplet, Utensils, Gamepad2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

const pixelFontUrl = "https://fonts.googleapis.com/css2?family=VT323&display=swap";

// ✅ 수정됨: 끊기지 않는 100% 안정적인 PokeAPI 이미지 주소로 변경
const PetAssets = {
  // 5세대(블랙/화이트) 움직이는 스프라이트 (제자리에서 콩콩 뛰는 모션이라 걷는 효과에 딱입니다)
  idle: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/133.gif",

  // 걷기: 같은 움직이는 GIF를 쓰되, CSS로 좌우 반전 시키며 움직이면 진짜 걷는 것처럼 보입니다.
  walking: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/133.gif",

  // 먹기: 밥 먹는 전용 GIF가 API에 없으므로, 기본 GIF를 쓰고 애니메이션으로 표현합니다.
  // (입 벌리는 전용 이미지를 원하시면 아래 '직접 다운로드' 방법을 참고하세요)
  eating: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/133.gif",

  // 아픔: 움직임이 없는 정지 이미지 (흑백 처리 예정)
  sick: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/133.png",
};

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
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [petMood, setPetMood] = useState<'happy' | 'sad' | 'hungry' | 'sick' | 'normal'>('normal')
  const [showMessage, setShowMessage] = useState(false)
  const [message, setMessage] = useState('')

  const [isEating, setIsEating] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  // 걷는 방향을 위한 상태 (오른쪽: 1, 왼쪽: -1)
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    const link = document.createElement('link');
    link.href = pixelFontUrl;
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    setTimeout(() => {
      setPet({
        id: 1, name: '이브이', level: 1, exp: 20, hunger: 50, happiness: 60, health: 80, poop: 1,
        lastFedAt: null, lastPlayedAt: null, lastCleanedAt: null
      })
      setLoading(false)
    }, 1000)
  }, []);

  useEffect(() => {
    if (pet) {
      if (pet.health < 30) setPetMood('sick')
      else if (pet.hunger < 30) setPetMood('hungry')
      else if (pet.happiness < 30) setPetMood('sad')
      else if (pet.happiness > 70 && pet.hunger > 70) setPetMood('happy')
      else setPetMood('normal')
    }
  }, [pet])


  const handleAction = async (action: 'feed' | 'play' | 'clean') => {
    if (!pet || actionLoading || isEating || isPlaying) return

    if (action === 'feed') {
      setIsEating(true)
      setMessage("냠냠! 맛있다!");
      setShowMessage(true);
      setTimeout(() => {
        setIsEating(false);
        setShowMessage(false);
        setPet(prev => prev ? { ...prev, hunger: Math.min(100, prev.hunger + 20), poop: prev.poop + (Math.random() > 0.7 ? 1 : 0) } : null)
      }, 3000)

    } else if (action === 'play') {
      setIsPlaying(true)
      setMessage("산책이 즐거워!");
      setShowMessage(true);
      setTimeout(() => {
        setIsPlaying(false);
        setShowMessage(false);
        setPet(prev => prev ? { ...prev, happiness: Math.min(100, prev.happiness + 15), hunger: Math.max(0, prev.hunger - 10) } : null)
      }, 4000)

    } else if (action === 'clean') {
      setMessage("깨끗해졌어!");
      setShowMessage(true);
      setTimeout(() => {
        setShowMessage(false);
        setPet(prev => prev ? { ...prev, poop: 0 } : null)
      }, 2000);
    }
  }

  const getPetImage = () => {
    if (isEating) return PetAssets.eating;
    if (isPlaying) return PetAssets.walking;
    if (petMood === 'sick') return PetAssets.sick;
    return PetAssets.idle;
  }

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-100 font-['VT323'] text-xl text-gray-500">Loading...</div>
  if (!pet) return <div className="flex h-screen items-center justify-center bg-slate-100 font-['VT323'] text-xl text-gray-500">No Pet Found</div>

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4 font-['VT323']">

      <div className="relative bg-[#f0f0f0] p-6 rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.2),inset_0_-10px_20px_rgba(0,0,0,0.1)] border-4 border-[#d4d4d4] w-full max-w-md select-none">

        <div className="bg-[#5c5c5c] p-4 rounded-3xl shadow-inner mb-6 relative">
          <div className="absolute top-2 right-4 text-xs text-white/50 tracking-widest">TAMAGOTCHI</div>

          <div className="relative w-full aspect-square bg-[#8bac0f] overflow-hidden rounded-xl border-4 border-[#4d5c14] shadow-[inset_0_0_20px_rgba(0,0,0,0.3)]">

            {/* 배경 */}
            <div
              className="absolute inset-0 opacity-70 mix-blend-multiply"
              style={{
                backgroundImage: 'url(https://i.pinimg.com/originals/f3/78/f6/f378f6356df16a7590d96d747a163152.gif)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                imageRendering: 'pixelated'
              }}
            />

            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] z-20 pointer-events-none background-size-[100%_2px,3px_100%]" />

            <div className="absolute inset-0 flex items-end justify-center z-10 pb-8">

              {/* 펫 애니메이션 컨테이너 */}
              <motion.div
                animate={
                  isEating ? {
                    y: [0, -10, 0], // 밥 먹을 때: 냠냠거리듯 제자리 점프
                    scaleY: [1, 0.9, 1], // 몸이 눌렸다 펴짐 (씹는 느낌)
                  } : isPlaying ? {
                    x: [-60, 60, -60], // 놀 때: 화면 좌우로 크게 이동
                  } : {
                    y: [0, -4, 0], // 평소: 숨쉬기
                  }
                }
                transition={
                  isEating ? { duration: 0.4, repeat: Infinity }
                    : isPlaying ? {
                      duration: 4,
                      ease: "linear",
                      repeat: Infinity,
                      // x값이 바뀔 때마다 방향 전환을 위한 onUpdate는 framer-motion에서 복잡하므로
                      // 아래 CSS transform으로 처리합니다.
                    }
                      : { duration: 2, repeat: Infinity, ease: "easeInOut" }
                }
                className="relative"
              >
                {/* 밥 아이콘 */}
                <AnimatePresence>
                  {isEating && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1, y: 10 }}
                      exit={{ opacity: 0 }}
                      className="absolute -right-8 bottom-0 text-3xl z-20"
                    >
                      🍖
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 펫 이미지 
                        scaleX(-1): 이미지를 좌우 반전시킵니다.
                        놀고 있을 때(isPlaying) 움직이는 방향에 따라 이미지를 뒤집어주면 더 리얼합니다.
                        여기서는 간단하게 CSS 애니메이션이나 Framer Motion의 style로 처리할 수 있습니다.
                    */}
                <motion.img
                  key={getPetImage()}
                  src={getPetImage()}
                  alt="Pet"
                  // 아플 때는 흑백처리, 평소에는 픽셀 처리
                  className={`w-32 h-32 object-contain drop-shadow-md ${petMood === 'sick' && !isEating && !isPlaying ? 'grayscale opacity-80' : ''}`}
                  style={{
                    imageRendering: 'pixelated',
                  }}
                // 걷는 방향에 따라 이미지 뒤집기 (isPlaying일 때 좌우 왕복에 맞춰 이미지를 반전시키는 것은 
                // JS로 time 체크가 필요하므로, 여기서는 단순히 움직이는 GIF만 보여줍니다.)
                />

                {/* 그림자 */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-20 h-2 bg-[#4d5c14]/40 rounded-[100%] blur-[1px]" />
              </motion.div>

              {/* 똥 */}
              {pet.poop > 0 && (
                <div className="absolute bottom-4 right-8 flex gap-1">
                  {Array.from({ length: pet.poop }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="text-2xl filter sepia brightness-50"
                    >💩</motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="absolute top-2 left-2 z-30 flex gap-2">
              <div className="bg-[#4d5c14]/90 text-[#9bbc0f] px-2 py-0.5 rounded text-sm border border-[#9bbc0f]">
                Lv.{pet.level} {pet.name}
              </div>
            </div>

            <AnimatePresence>
              {showMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-2 left-0 right-0 text-center z-40"
                >
                  <span className="bg-[#0f380f]/90 text-[#9bbc0f] px-3 py-1 rounded-full text-lg border border-[#9bbc0f] shadow-md">
                    {message}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 bg-[#d4d4d4]/30 p-3 rounded-xl border-2 border-[#c0c0c0]">
            <div className="space-y-1">
              <div className="flex justify-between text-lg text-gray-600">
                <span>배고픔</span>
                <span>{Math.round(pet.hunger)}%</span>
              </div>
              <Progress value={pet.hunger} className="h-3 bg-gray-300 rounded-full border border-gray-400" indicatorClassName="bg-[#8bac0f]" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-lg text-gray-600">
                <span>행복도</span>
                <span>{Math.round(pet.happiness)}%</span>
              </div>
              <Progress value={pet.happiness} className="h-3 bg-gray-300 rounded-full border border-gray-400" indicatorClassName="bg-[#8bac0f]" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Button onClick={() => handleAction('feed')} disabled={isEating || isPlaying} className="h-14 rounded-xl bg-amber-300 hover:bg-amber-400 text-amber-900 border-b-4 border-amber-600 active:border-b-0 active:translate-y-1 transition-all flex flex-col gap-0 items-center justify-center"><Utensils className="w-5 h-5 mb-0.5" /><span className="text-base">밥주기</span></Button>
            <Button onClick={() => handleAction('play')} disabled={isEating || isPlaying} className="h-14 rounded-xl bg-sky-300 hover:bg-sky-400 text-sky-900 border-b-4 border-sky-600 active:border-b-0 active:translate-y-1 transition-all flex flex-col gap-0 items-center justify-center"><Gamepad2 className="w-5 h-5 mb-0.5" /><span className="text-base">놀아주기</span></Button>
            <Button onClick={() => handleAction('clean')} disabled={isEating || isPlaying || pet.poop === 0} className="h-14 rounded-xl bg-emerald-300 hover:bg-emerald-400 text-emerald-900 border-b-4 border-emerald-600 active:border-b-0 active:translate-y-1 transition-all flex flex-col gap-0 items-center justify-center disabled:opacity-50"><Droplet className="w-5 h-5 mb-0.5" /><span className="text-base">치우기</span></Button>
          </div>
        </div>
      </div>
    </div>
  )
}