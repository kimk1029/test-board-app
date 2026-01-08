'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Droplet, Utensils, Gamepad2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

const pixelFontUrl = "https://fonts.googleapis.com/css2?family=VT323&display=swap";

// ✅ 수정됨: 귀여운 픽셀 강아지 에셋 (웹 URL 적용)
// 출처: itch.io 무료 에셋 데모 이미지
const PetAssets = {
  idle: "https://img.itch.zone/aW1hZ2UvMjE3ODc3LzEwMjY2OTcuZ2lm/original/7s%2F3qX.gif",      // 서서 대기
  walking: "https://img.itch.zone/aW1hZ2UvMjE3ODc3LzEwMjY3MDAuZ2lm/original/4y%2Bd1s.gif",   // 걷기
  eating: "https://img.itch.zone/aW1hZ2UvMjE3ODc3LzEwMjY2OTguZ2lm/original/sK%2FqC%2B.gif",  // 밥먹기 (그릇 포함)
  sleeping: "https://img.itch.zone/aW1hZ2UvMjE3ODc3LzEwMjY2OTkuZ2lm/original/yXq5%2F%2B.gif", // 자기
  // 아픔: 별도 이미지가 없어 자는 이미지를 흑백처리해서 사용
  sick: "https://img.itch.zone/aW1hZ2UvMjE3ODc3LzEwMjY2OTkuZ2lm/original/yXq5%2F%2B.gif",
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
  // petMood 타입에 'sleeping' 포함
  const [petMood, setPetMood] = useState<'happy' | 'sad' | 'hungry' | 'sick' | 'sleeping' | 'normal'>('normal')
  const [showMessage, setShowMessage] = useState(false)
  const [message, setMessage] = useState('')

  const [isEating, setIsEating] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    const link = document.createElement('link');
    link.href = pixelFontUrl;
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    setTimeout(() => {
      // 초기 데이터: 이름 변경, 자는 모습 테스트를 위해 행복도 낮춤
      setPet({
        id: 1, name: '멍멍이', level: 1, exp: 20, hunger: 60, happiness: 70, health: 80, poop: 1,
        lastFedAt: null, lastPlayedAt: null, lastCleanedAt: null
      })
      setLoading(false)
    }, 1000)
  }, []);

  // 펫 상태에 따른 기분 결정 로직
  useEffect(() => {
    if (pet) {
      if (pet.health < 30) setPetMood('sick')
      // 행복도가 너무 낮으면 잠을 자도록 설정
      else if (pet.happiness < 30) setPetMood('sleeping')
      else if (pet.hunger < 30) setPetMood('hungry')
      else if (pet.happiness > 70 && pet.hunger > 70) setPetMood('happy')
      else setPetMood('normal')
    }
  }, [pet])


  const handleAction = async (action: 'feed' | 'play' | 'clean') => {
    // 자고 있거나 아플 때는 행동 불가능하게 막기
    if (!pet || actionLoading || isEating || isPlaying || petMood === 'sleeping' || petMood === 'sick') {
      if (petMood === 'sleeping') toast.error("지금은 자고 있어요. 나중에 놀아주세요.");
      if (petMood === 'sick') toast.error("아파서 움직일 수 없어요.");
      return;
    }

    if (action === 'feed') {
      setIsEating(true)
      setMessage("와구와구! 맛있다멍!");
      setShowMessage(true);
      setTimeout(() => {
        setIsEating(false);
        setShowMessage(false);
        setPet(prev => prev ? { ...prev, hunger: Math.min(100, prev.hunger + 30), happiness: Math.min(100, prev.happiness + 5), poop: prev.poop + (Math.random() > 0.7 ? 1 : 0) } : null)
      }, 3000) // 먹는 시간 3초

    } else if (action === 'play') {
      setIsPlaying(true)
      setMessage("산책 짱 좋아! 헥헥!");
      setShowMessage(true);
      setTimeout(() => {
        setIsPlaying(false);
        setShowMessage(false);
        setPet(prev => prev ? { ...prev, happiness: Math.min(100, prev.happiness + 20), hunger: Math.max(0, prev.hunger - 15) } : null)
      }, 5000) // 산책 시간 5초로 늘림

    } else if (action === 'clean') {
      setMessage("깨끗해졌멍!");
      setShowMessage(true);
      setTimeout(() => {
        setShowMessage(false);
        setPet(prev => prev ? { ...prev, poop: 0, happiness: Math.min(100, prev.happiness + 10) } : null)
      }, 2000);
    }
  }

  // 상황별 이미지 반환 로직
  const getPetImage = () => {
    if (isEating) return PetAssets.eating;
    if (isPlaying) return PetAssets.walking;
    if (petMood === 'sick') return PetAssets.sick;
    if (petMood === 'sleeping') return PetAssets.sleeping;
    // 그 외 모든 상태는 기본 대기 이미지
    return PetAssets.idle;
  }


  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-100 font-['VT323'] text-xl text-gray-500">Loading...</div>
  if (!pet) return <div className="flex h-screen items-center justify-center bg-slate-100 font-['VT323'] text-xl text-gray-500">No Pet Found</div>

  // 현재 상태가 자거나 아픈 상태인지 확인하는 헬퍼 변수
  const isInactive = petMood === 'sleeping' || petMood === 'sick';

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
                // 새 GIF 에셋에 맞춰 애니메이션 조정
                animate={
                  isEating ? {
                    y: 0, // 먹는 GIF 자체에 모션이 있으므로 제자리에 고정
                  } : isPlaying ? {
                    x: [-40, 40, -40], // 산책: 천천히 좌우로 이동
                  } : isInactive ? {
                    y: 0, // 자거나 아플 땐 움직임 없음
                  } : {
                    y: [0, -3, 0], // 평소: 아주 가벼운 숨쉬기
                  }
                }
                transition={
                  isEating ? { duration: 0 } // 움직임 없음
                    : isPlaying ? { duration: 6, ease: "linear", repeat: Infinity } // 천천히 걷기
                      : { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
                }
                className="relative"
              >
                {/* 밥 아이콘 제거됨 (GIF에 포함됨) */}

                {/* 자는 표시 (Zzz...) */}
                <AnimatePresence>
                  {petMood === 'sleeping' && (
                    <motion.div
                      initial={{ opacity: 0, x: 0, y: -10 }}
                      animate={{ opacity: [0, 1, 0], x: 20, y: -30, scale: [0.8, 1.2] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                      className="absolute right-2 -top-6 text-xl z-20 font-bold text-blue-900"
                    >
                      Zzz...
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 펫 이미지 */}
                <img
                  key={getPetImage()} // src가 바뀔 때마다 새로 렌더링하여 GIF 처음부터 재생
                  src={getPetImage()}
                  alt="Pet"
                  // 아플 때는 흑백처리 및 흐림 효과
                  className={`w-32 h-32 object-contain drop-shadow-md transition-all duration-300 ${petMood === 'sick' ? 'grayscale opacity-70 blur-[1px]' : ''}`}
                  style={{
                    imageRendering: 'pixelated',
                  }}
                />

                {/* 그림자 */}
                <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-16 h-2 bg-[#4d5c14]/40 rounded-[100%] blur-[1px] transition-all ${isInactive ? 'opacity-50 scale-90' : ''}`} />
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

            {/* 상단 정보 */}
            <div className="absolute top-2 left-2 z-30 flex gap-2">
              <div className="bg-[#4d5c14]/90 text-[#9bbc0f] px-2 py-0.5 rounded text-sm border border-[#9bbc0f]">
                Lv.{pet.level} {pet.name}
              </div>
              {/* 상태 아이콘 */}
              {petMood === 'sleeping' && <span className="text-lg">🌙</span>}
              {petMood === 'sick' && <span className="text-lg">🤒</span>}
            </div>

            {/* 메시지 */}
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

        {/* 하단 컨트롤 패널 */}
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

          {/* 버튼 그룹 */}
          <div className="grid grid-cols-3 gap-3">
            <Button onClick={() => handleAction('feed')} disabled={isEating || isPlaying || isInactive} className="h-14 rounded-xl bg-amber-300 hover:bg-amber-400 text-amber-900 border-b-4 border-amber-600 active:border-b-0 active:translate-y-1 transition-all flex flex-col gap-0 items-center justify-center disabled:opacity-50 disabled:border-b-0 disabled:translate-y-1"><Utensils className="w-5 h-5 mb-0.5" /><span className="text-base">밥주기</span></Button>
            <Button onClick={() => handleAction('play')} disabled={isEating || isPlaying || isInactive} className="h-14 rounded-xl bg-sky-300 hover:bg-sky-400 text-sky-900 border-b-4 border-sky-600 active:border-b-0 active:translate-y-1 transition-all flex flex-col gap-0 items-center justify-center disabled:opacity-50 disabled:border-b-0 disabled:translate-y-1"><Gamepad2 className="w-5 h-5 mb-0.5" /><span className="text-base">놀아주기</span></Button>
            <Button onClick={() => handleAction('clean')} disabled={isEating || isPlaying || isInactive || pet.poop === 0} className="h-14 rounded-xl bg-emerald-300 hover:bg-emerald-400 text-emerald-900 border-b-4 border-emerald-600 active:border-b-0 active:translate-y-1 transition-all flex flex-col gap-0 items-center justify-center disabled:opacity-50 disabled:border-b-0 disabled:translate-y-1"><Droplet className="w-5 h-5 mb-0.5" /><span className="text-base">치우기</span></Button>
          </div>
        </div>
      </div>
    </div>
  )
}