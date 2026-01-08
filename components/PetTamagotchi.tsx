'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Droplet, Utensils, Gamepad2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

// 폰트 로드
const pixelFontUrl = "https://fonts.googleapis.com/css2?family=VT323&display=swap";

// --- 새로운 에셋 정의 (움직이는 GIF) ---
// 주의: 외부 이미지 링크는 시간이 지나면 만료될 수 있습니다. 실제 서비스시에는 직접 호스팅하는 것이 좋습니다.
const PetAssets = {
  // 기본 상태 (가만히 서서 숨쉼/꼬리흔듦)
  idle: "https://media.tenor.com/gTzXm8S91yUAAAAi/eevee-pokemon.gif",
  // 걷는 상태 (다리를 움직임) - '놀아주기' 때 사용
  walking: "https://64.media.tumblr.com/a004233d8ebde15311fc3483339ce5c7/tumblr_mlq1zpUuUo1s60o4bo1_500.gif",
  // 먹는 상태 (기뻐서 방방 뜀/입을 움직임) - '밥주기' 때 사용
  eating: "https://i.pinimg.com/originals/10/a3/61/10a361c2f1636608ba3dc7806a4a28f7.gif",
  // 아픈 상태
  sick: "https://media.tenor.com/images/a7165145162250322549565140319284/tenor.gif",
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

  // 액션 상태 관리
  const [isEating, setIsEating] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    const link = document.createElement('link');
    link.href = pixelFontUrl;
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    // 테스트용 초기 데이터
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
      // 밥 먹는 시간 동안 메시지 표시
      setMessage("냠냠! 맛있다!");
      setShowMessage(true);
      // 3초 후 상태 복귀
      setTimeout(() => {
        setIsEating(false);
        setShowMessage(false);
        // 실제로는 여기서 펫 상태 업데이트 (예: hunger 증가)
        setPet(prev => prev ? { ...prev, hunger: Math.min(100, prev.hunger + 20), poop: prev.poop + (Math.random() > 0.7 ? 1 : 0) } : null)
      }, 3000)

    } else if (action === 'play') {
      setIsPlaying(true)
      setMessage("산책이 즐거워!");
      setShowMessage(true);
      // 4초 동안 산책
      setTimeout(() => {
        setIsPlaying(false);
        setShowMessage(false);
        // 실제로는 여기서 펫 상태 업데이트
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

  // --- 펫 이미지 결정 로직 변경 ---
  const getPetImage = () => {
    // 1순위: 현재 수행 중인 액션이 있다면 그에 맞는 움짤을 보여줍니다.
    if (isEating) return PetAssets.eating;
    if (isPlaying) return PetAssets.walking;

    // 2순위: 특별한 액션이 없다면 기분 상태에 따라 보여줍니다.
    if (petMood === 'sick') return PetAssets.sick;

    // 기본 상태 (Idle)
    return PetAssets.idle;
  }


  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-100 font-['VT323'] text-xl text-gray-500">Loading...</div>
  if (!pet) return <div className="flex h-screen items-center justify-center bg-slate-100 font-['VT323'] text-xl text-gray-500">No Pet Found</div>

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4 font-['VT323']">

      {/* 게임기 본체 */}
      <div className="relative bg-[#f0f0f0] p-6 rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.2),inset_0_-10px_20px_rgba(0,0,0,0.1)] border-4 border-[#d4d4d4] w-full max-w-md select-none">

        {/* 화면 베젤 */}
        <div className="bg-[#5c5c5c] p-4 rounded-3xl shadow-inner mb-6 relative">
          <div className="absolute top-2 right-4 text-xs text-white/50 tracking-widest">TAMAGOTCHI</div>

          {/* 실제 LCD 화면 영역 */}
          <div className="relative w-full aspect-square bg-[#8bac0f] overflow-hidden rounded-xl border-4 border-[#4d5c14] shadow-[inset_0_0_20px_rgba(0,0,0,0.3)]">

            {/* 배경 이미지 (픽셀 룸) */}
            <div
              className="absolute inset-0 opacity-70 mix-blend-multiply"
              style={{
                backgroundImage: 'url(https://i.pinimg.com/originals/f3/78/f6/f378f6356df16a7590d96d747a163152.gif)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                imageRendering: 'pixelated'
              }}
            />

            {/* 스캔라인 효과 */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] z-20 pointer-events-none background-size-[100%_2px,3px_100%]" />

            {/* 펫 & 인터랙션 영역 */}
            <div className="absolute inset-0 flex items-end justify-center z-10 pb-8">

              {/* 펫 컨테이너 - 애니메이션 로직 변경 */}
              <motion.div
                // 이미지가 자체적으로 움직이므로 Framer Motion 움직임은 최소화하거나 상황에 맞게 변경
                animate={
                  isEating ? {
                    scale: [1, 1.05, 1], // 먹을 때는 살짝 커졌다 작아졌다만 함 (GIF가 움직이므로)
                  } : isPlaying ? {
                    x: [-40, 40, -40], // 놀 때는 걷는 GIF와 함께 좌우로 이동
                  } : {
                    y: [0, -4, 0], // 기본 상태는 아주 살짝만 둥실거림
                  }
                }
                transition={
                  isEating ? { duration: 0.5, repeat: Infinity }
                    : isPlaying ? { duration: 4, ease: "linear", repeat: Infinity } // 천천히 걸어다님
                      : { duration: 2, repeat: Infinity, ease: "easeInOut" }
                }
                className="relative"
              >
                {/* 밥 먹을 때 나타나는 음식 아이콘 */}
                <AnimatePresence>
                  {isEating && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute -top-8 left-1/2 -translate-x-1/2 text-3xl filter grayscale-[0.3]"
                    >
                      🍖
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 펫 이미지 (GIF) */}
                {/* key를 변경하여 src가 바뀔 때마다 이미지를 새로 로드하여 애니메이션을 처음부터 재생 */}
                <img
                  key={getPetImage()}
                  src={getPetImage()}
                  alt="Pet"
                  className={`w-32 h-32 object-contain drop-shadow-md ${petMood === 'sick' && !isEating && !isPlaying ? 'grayscale opacity-80' : ''}`}
                  style={{ imageRendering: 'pixelated' }}
                />

                {/* 그림자 */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-20 h-2 bg-[#4d5c14]/40 rounded-[100%] blur-[1px]" />
              </motion.div>

              {/* 똥 영역 */}
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

            {/* 상태 오버레이 (레벨) */}
            <div className="absolute top-2 left-2 z-30 flex gap-2">
              <div className="bg-[#4d5c14]/90 text-[#9bbc0f] px-2 py-0.5 rounded text-sm border border-[#9bbc0f]">
                Lv.{pet.level} {pet.name}
              </div>
            </div>

            {/* 메시지 알림 */}
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

          {/* 상태 바 */}
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
            <Button
              onClick={() => handleAction('feed')}
              disabled={isEating || isPlaying}
              className="h-14 rounded-xl bg-amber-300 hover:bg-amber-400 text-amber-900 border-b-4 border-amber-600 active:border-b-0 active:translate-y-1 transition-all flex flex-col gap-0 items-center justify-center"
            >
              <Utensils className="w-5 h-5 mb-0.5" />
              <span className="text-base">밥주기</span>
            </Button>

            <Button
              onClick={() => handleAction('play')}
              disabled={isEating || isPlaying}
              className="h-14 rounded-xl bg-sky-300 hover:bg-sky-400 text-sky-900 border-b-4 border-sky-600 active:border-b-0 active:translate-y-1 transition-all flex flex-col gap-0 items-center justify-center"
            >
              <Gamepad2 className="w-5 h-5 mb-0.5" />
              <span className="text-base">놀아주기</span>
            </Button>

            <Button
              onClick={() => handleAction('clean')}
              disabled={isEating || isPlaying || pet.poop === 0}
              className="h-14 rounded-xl bg-emerald-300 hover:bg-emerald-400 text-emerald-900 border-b-4 border-emerald-600 active:border-b-0 active:translate-y-1 transition-all flex flex-col gap-0 items-center justify-center disabled:opacity-50"
            >
              <Droplet className="w-5 h-5 mb-0.5" />
              <span className="text-base">치우기</span>
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}