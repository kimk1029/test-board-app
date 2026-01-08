'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Droplet, Utensils, Gamepad2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

const pixelFontUrl = "https://fonts.googleapis.com/css2?family=VT323&display=swap";

// ✅ 100% 작동하는 푸신 캣(Pusheen) 웹 GIF 에셋
const PetAssets = {
  // 대기: 꼬리 흔들기
  idle: "https://media.tenor.com/aKFaZBrZFYkAAAAi/pusheen-cat.gif",
  // 걷기/뛰기: 다다다다 달림
  running: "https://media.tenor.com/Hl5a8t0CV1IAAAAi/pusheen-running.gif",
  // 먹기: 국수/간식 먹기
  eating: "https://media.tenor.com/7v1qZk-QoM0AAAAi/pusheen-eat.gif",
  // 자기: 쿨쿨 잠
  sleeping: "https://media.tenor.com/P1F9Q4-N0HAAAAAi/pusheen-sleep.gif",
  // 아픔/슬픔: 눈물 흘림
  sick: "https://media.tenor.com/1s9-85yvOQ4AAAAi/pusheen-crying.gif",
};

interface Pet {
  id: number; name: string; level: number; exp: number; hunger: number; happiness: number; health: number; poop: number;
}

export default function PetTamagotchi() {
  // 초기 데이터 (행복도 50으로 시작)
  const [pet, setPet] = useState<Pet>({
    id: 1, name: '푸신', level: 1, exp: 0, hunger: 60, happiness: 50, health: 100, poop: 0
  })
  const [loading, setLoading] = useState(true)

  const [petMood, setPetMood] = useState<'happy' | 'sad' | 'hungry' | 'sick' | 'sleeping' | 'normal'>('normal')
  const [isEating, setIsEating] = useState(false)
  const [isRunning, setIsRunning] = useState(false)

  // 산책 시 방향 전환을 위한 상태 (1: 오른쪽, -1: 왼쪽)
  const [direction, setDirection] = useState(1);

  const [showMessage, setShowMessage] = useState(false)
  const [message, setMessage] = useState('')
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const link = document.createElement('link'); link.href = pixelFontUrl; link.rel = 'stylesheet'; document.head.appendChild(link);
    setTimeout(() => setLoading(false), 1000)
  }, []);

  // 상태 변화 시뮬레이션
  useEffect(() => {
    const interval = setInterval(() => {
      setPet(prev => ({
        ...prev,
        hunger: Math.max(0, prev.hunger - 2),
        happiness: Math.max(0, prev.happiness - 1),
        poop: Math.random() > 0.9 ? Math.min(5, prev.poop + 1) : prev.poop
      }))
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // 산책 중 방향 전환 로직
  useEffect(() => {
    if (isRunning) {
      // 2초마다 방향 바꿈
      const dirInterval = setInterval(() => {
        setDirection(prev => prev * -1);
      }, 2000);
      return () => clearInterval(dirInterval);
    } else {
      setDirection(1); // 멈추면 정면(오른쪽) 보기
    }
  }, [isRunning]);

  useEffect(() => {
    if (pet.health < 30) setPetMood('sick')
    else if (pet.happiness < 30) setPetMood('sleeping')
    else if (pet.hunger < 30) setPetMood('hungry')
    else if (pet.happiness > 80) setPetMood('happy')
    else setPetMood('normal')
  }, [pet.hunger, pet.happiness, pet.health])

  const showFeedback = (msg: string, duration = 3000) => {
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    setMessage(msg);
    setShowMessage(true);
    messageTimeoutRef.current = setTimeout(() => setShowMessage(false), duration);
  }

  const handleAction = (action: 'feed' | 'play' | 'clean') => {
    const isInactive = petMood === 'sleeping' || petMood === 'sick';
    if (isEating || isRunning || isInactive) {
      if (petMood === 'sleeping') toast.error("ZZZ... 푸신이 자고 있어요.");
      else if (petMood === 'sick') toast.error("아파서 움직일 수 없어요.");
      return;
    }

    if (action === 'feed') {
      setIsEating(true)
      showFeedback("냠냠! 호로록!");
      setTimeout(() => {
        setIsEating(false);
        setPet(prev => ({ ...prev, hunger: Math.min(100, prev.hunger + 30), happiness: Math.min(100, prev.happiness + 10), poop: prev.poop + (Math.random() > 0.8 ? 1 : 0) }))
      }, 3000)

    } else if (action === 'play') {
      setIsRunning(true)
      showFeedback("우다다다! 신난다!");
      setTimeout(() => {
        setIsRunning(false);
        setPet(prev => ({ ...prev, happiness: Math.min(100, prev.happiness + 25), hunger: Math.max(0, prev.hunger - 20) }))
      }, 4000)

    } else if (action === 'clean') {
      if (pet.poop === 0) { toast.error("치울 똥이 없어요."); return; }
      showFeedback("깨끗해졌다냥!");
      setPet(prev => ({ ...prev, poop: 0, happiness: Math.min(100, prev.happiness + 5) }))
    }
  }

  // ✅ 핵심 로직: 현재 상태에 맞는 GIF 이미지 주소 반환
  const getPetImage = () => {
    if (isEating) return PetAssets.eating;
    if (isRunning) return PetAssets.running;
    if (petMood === 'sick') return PetAssets.sick;
    if (petMood === 'sleeping') return PetAssets.sleeping;
    return PetAssets.idle;
  }

  const currentImageSrc = getPetImage();
  const isInactive = petMood === 'sleeping' || petMood === 'sick';

  // 애니메이션 변수 설정
  let containerAnimate = {};
  let containerTransition = {};

  if (isRunning) {
    // 산책 중일 때만 좌우로 이동
    containerAnimate = { x: direction === 1 ? 60 : -60 };
    containerTransition = { duration: 2, ease: "linear" };
  } else {
    // 그 외에는 제자리
    containerAnimate = { x: 0 };
    containerTransition = { duration: 0.5 };
  }

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-100 font-['VT323'] text-2xl text-gray-500">Loading...</div>

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4 font-['VT323']">
      <div className="relative bg-[#f0f0f0] p-6 rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.2),inset_0_-10px_20px_rgba(0,0,0,0.1)] border-4 border-[#d4d4d4] w-full max-w-md select-none">
        <div className="bg-[#5c5c5c] p-4 rounded-3xl shadow-inner mb-6 relative">
          <div className="absolute top-2 right-4 text-xs text-white/50 tracking-widest">TAMAGOTCHI</div>
          <div className="relative w-full aspect-square bg-[#8bac0f] overflow-hidden rounded-xl border-4 border-[#4d5c14] shadow-[inset_0_0_20px_rgba(0,0,0,0.3)]">

            {/* 배경 */}
            <div className="absolute inset-0 opacity-70 mix-blend-multiply" style={{ backgroundImage: 'url(https://i.pinimg.com/originals/f3/78/f6/f378f6356df16a7590d96d747a163152.gif)', backgroundSize: 'cover', backgroundPosition: 'center', imageRendering: 'pixelated' }} />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] z-20 pointer-events-none background-size-[100%_2px,3px_100%]" />

            <div className="absolute inset-0 flex items-end justify-center z-10 pb-8">
              {/* 펫 컨테이너 */}
              <motion.div
                animate={containerAnimate}
                transition={containerTransition}
                className="relative"
              >
                {/* 자기 아이콘 (Zzz...) */}
                <AnimatePresence>
                  {petMood === 'sleeping' && <motion.div initial={{ opacity: 0, x: 0, y: -10 }} animate={{ opacity: [0, 1, 0], x: 20, y: -30, scale: [0.8, 1.2] }} transition={{ duration: 2.5, repeat: Infinity }} className="absolute right-0 -top-8 text-2xl z-20 font-bold text-blue-900">Zzz...</motion.div>}
                </AnimatePresence>

                {/* 아픔 아이콘 (💊) */}
                <AnimatePresence>
                  {petMood === 'sick' && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: -20 }} className="absolute left-0 -top-8 text-3xl z-20">💊</motion.div>}
                </AnimatePresence>

                {/* ✅ 펫 이미지 */}
                <img
                  key={currentImageSrc}
                  src={currentImageSrc}
                  alt="Pet"
                  // 산책 중 왼쪽으로 갈 때 이미지 반전 (좌우대칭)
                  style={{
                    transform: isRunning && direction === -1 ? 'scaleX(-1)' : 'none',
                  }}
                  className={`w-40 h-40 object-contain drop-shadow-md transition-all duration-300 ${petMood === 'sick' ? 'grayscale opacity-80 blur-[1px]' : ''}`}
                />

                {/* 그림자 */}
                <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-3 bg-[#4d5c14]/40 rounded-[100%] blur-[2px] transition-all duration-500 ${isInactive ? 'opacity-40 scale-75' : ''}`} />
              </motion.div>

              {/* 똥 */}
              <div className="absolute bottom-4 right-8 flex gap-1">
                {Array.from({ length: pet.poop }).map((_, i) => (<motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-2xl filter sepia brightness-50">💩</motion.div>))}
              </div>
            </div>

            {/* 상단 정보 */}
            <div className="absolute top-2 left-2 z-30 flex items-center gap-2 bg-[#4d5c14]/80 text-[#9bbc0f] pl-3 pr-2 py-1 rounded-full text-sm border border-[#9bbc0f] shadow-sm">
              <span>Lv.{pet.level} {pet.name}</span>
              {petMood === 'sleeping' && <span>🌙</span>}
              {petMood === 'hungry' && <span className="animate-pulse">🥣</span>}
              {petMood === 'happy' && <span className="animate-bounce">❤️</span>}
            </div>

            {/* 메시지 */}
            <AnimatePresence>
              {showMessage && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute bottom-2 left-0 right-0 text-center z-40"><span className="bg-[#0f380f]/90 text-[#9bbc0f] px-4 py-1 rounded-full text-lg border border-[#9bbc0f] shadow-md">{message}</span></motion.div>}
            </AnimatePresence>
          </div>
        </div>

        {/* 하단 컨트롤 패널 */}
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 bg-[#d4d4d4]/30 p-3 rounded-xl border-2 border-[#c0c0c0]">
            <div className="space-y-1"><div className="flex justify-between text-lg text-gray-600"><span>배고픔</span><span>{Math.round(pet.hunger)}%</span></div><Progress value={pet.hunger} className="h-3 bg-gray-300 rounded-full border border-gray-400" indicatorClassName="bg-[#8bac0f]" /></div>
            <div className="space-y-1"><div className="flex justify-between text-lg text-gray-600"><span>행복도</span><span>{Math.round(pet.happiness)}%</span></div><Progress value={pet.happiness} className="h-3 bg-gray-300 rounded-full border border-gray-400" indicatorClassName="bg-[#8bac0f]" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Button onClick={() => handleAction('feed')} disabled={isEating || isRunning || isInactive} className="h-14 rounded-xl bg-amber-300 hover:bg-amber-400 text-amber-900 border-b-4 border-amber-600 active:border-b-0 active:translate-y-1 transition-all flex flex-col gap-0 items-center justify-center disabled:opacity-50 disabled:border-b-0 disabled:translate-y-1"><Utensils className="w-6 h-6 mb-0.5" /><span className="text-lg">밥주기</span></Button>
            <Button onClick={() => handleAction('play')} disabled={isEating || isRunning || isInactive} className="h-14 rounded-xl bg-sky-300 hover:bg-sky-400 text-sky-900 border-b-4 border-sky-600 active:border-b-0 active:translate-y-1 transition-all flex flex-col gap-0 items-center justify-center disabled:opacity-50 disabled:border-b-0 disabled:translate-y-1"><Gamepad2 className="w-6 h-6 mb-0.5" /><span className="text-lg">놀아주기</span></Button>
            <Button onClick={() => handleAction('clean')} disabled={isEating || isRunning || isInactive || pet.poop === 0} className="h-14 rounded-xl bg-emerald-300 hover:bg-emerald-400 text-emerald-900 border-b-4 border-emerald-600 active:border-b-0 active:translate-y-1 transition-all flex flex-col gap-0 items-center justify-center disabled:opacity-50 disabled:border-b-0 disabled:translate-y-1"><Droplet className="w-6 h-6 mb-0.5" /><span className="text-lg">치우기</span></Button>
          </div>
        </div>
      </div>
    </div>
  )
}