'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Droplet, Utensils, Gamepad2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

// ✅ 픽셀 폰트 로드
const pixelFontUrl = "https://fonts.googleapis.com/css2?family=VT323&display=swap";

// ------------------------------------------------------------------
// ✅ [SVG 컴포넌트] 코드로 직접 그린 픽셀 강아지 (이미지 깨짐 없음)
// ------------------------------------------------------------------
const PixelDog = ({ action, mood, direction }: { action: string, mood: string, direction: number }) => {
  // 상태에 따른 애니메이션 변수
  const isEating = action === 'eating';
  const isWalking = action === 'walking' || action === 'running';
  const isSleeping = mood === 'sleeping';
  const isSick = mood === 'sick';

  return (
    <svg
      viewBox="0 0 100 100"
      className={`w-40 h-40 drop-shadow-md transition-all duration-500 ${isSick ? 'grayscale opacity-80 blur-[0.5px]' : ''}`}
      style={{
        transform: `scaleX(${direction})`, // 방향 전환
        imageRendering: 'pixelated'
      }}
    >
      <motion.g
        // 몸통 전체의 움직임 (대기 중 숨쉬기 / 걷기 중 튀기)
        animate={
          isWalking ? { y: [0, -4, 0] }
            : isEating ? { y: 0 }
              : isSleeping ? { y: 5 } // 잘 때는 낮게 웅크림
                : { y: [0, -1, 0] }
        }
        transition={{
          duration: isWalking ? 0.2 : 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* 1. 꼬리 (살랑살랑) */}
        <motion.path
          d="M25 55 L15 50 L10 55"
          stroke="#8B4513"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          animate={{ rotate: isSleeping ? 0 : [0, -20, 0, 10, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
          style={{ originX: '100%', originY: '100%' }}
        />

        {/* 2. 다리 (걷을 때 교차 애니메이션) */}
        {/* 뒷다리 */}
        <motion.rect x="35" y="75" width="8" height="15" fill="#8B4513"
          animate={isWalking ? { rotate: [-15, 15, -15], y: [0, -2, 0] } : isSleeping ? { height: 5, y: 10 } : {}}
          transition={{ duration: 0.4, repeat: Infinity }}
        />
        <motion.rect x="65" y="75" width="8" height="15" fill="#8B4513"
          animate={isWalking ? { rotate: [15, -15, 15], y: [0, -2, 0] } : isSleeping ? { height: 5, y: 10 } : {}}
          transition={{ duration: 0.4, repeat: Infinity, delay: 0.2 }}
        />

        {/* 3. 몸통 */}
        <rect x="30" y="45" width="50" height="35" rx="5" fill="#CD853F" />

        {/* 4. 앞다리 (걷을 때 교차) */}
        <motion.rect x="35" y="75" width="8" height="15" fill="#CD853F"
          animate={isWalking ? { rotate: [15, -15, 15], y: [0, -2, 0] } : isSleeping ? { height: 5, y: 10 } : {}}
          transition={{ duration: 0.4, repeat: Infinity }}
        />
        <motion.rect x="65" y="75" width="8" height="15" fill="#CD853F"
          animate={isWalking ? { rotate: [-15, 15, -15], y: [0, -2, 0] } : isSleeping ? { height: 5, y: 10 } : {}}
          transition={{ duration: 0.4, repeat: Infinity, delay: 0.2 }}
        />

        {/* 5. 머리 그룹 */}
        <motion.g animate={isEating ? { rotate: [0, 5, 0] } : {}} transition={{ duration: 0.3, repeat: Infinity }}>
          {/* 얼굴 형태 */}
          <rect x="55" y="25" width="40" height="35" rx="8" fill="#CD853F" />

          {/* 귀 */}
          <path d="M60 25 L55 10 L70 25" fill="#8B4513" />
          <path d="M85 25 L100 10 L95 25" fill="#8B4513" />

          {/* 눈 (상태에 따라 변함) */}
          {isSleeping || isSick ? (
            // 자거나 아플 때: 감은 눈 (- -)
            <g>
              <rect x="65" y="38" width="8" height="2" fill="#333" />
              <rect x="82" y="38" width="8" height="2" fill="#333" />
            </g>
          ) : (
            // 평소: 뜬 눈
            <g>
              <circle cx="68" cy="38" r="3" fill="black" />
              <circle cx="86" cy="38" r="3" fill="black" />
            </g>
          )}

          {/* 코 */}
          <circle cx="77" cy="45" r="2" fill="black" />

          {/* 입 (먹을 때 벌림) */}
          <motion.path
            d={isEating ? "M72 52 Q77 60 82 52" : "M72 52 Q77 55 82 52"}
            stroke="black"
            strokeWidth="2"
            fill={isEating ? "#FF6347" : "none"} // 먹을 땐 입안이 빨개짐
            animate={isEating ? { d: ["M72 52 Q77 55 82 52", "M72 52 Q77 65 82 52", "M72 52 Q77 55 82 52"] } : {}}
            transition={{ duration: 0.4, repeat: Infinity }}
          />

          {/* 볼터치 (행복할 때) */}
          {mood === 'happy' && !isSleeping && (
            <g opacity="0.6">
              <circle cx="62" cy="45" r="3" fill="#FF69B4" />
              <circle cx="92" cy="45" r="3" fill="#FF69B4" />
            </g>
          )}
        </motion.g>
      </motion.g>
    </svg>
  );
};
// ------------------------------------------------------------------

interface Pet {
  id: number; name: string; level: number; exp: number; hunger: number; happiness: number; health: number; poop: number;
}

export default function PetTamagotchi() {
  const [pet, setPet] = useState<Pet>({
    id: 1, name: '바둑이', level: 1, exp: 0, hunger: 60, happiness: 50, health: 100, poop: 0
  })
  const [loading, setLoading] = useState(true)

  const [petMood, setPetMood] = useState<'happy' | 'sad' | 'hungry' | 'sick' | 'sleeping' | 'normal'>('normal')
  const [currentAction, setCurrentAction] = useState<'idle' | 'eating' | 'walking' | 'running'>('idle')

  // 1: 오른쪽, -1: 왼쪽
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
        poop: Math.random() > 0.9 ? Math.min(3, prev.poop + 1) : prev.poop
      }))
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // 산책 시 방향 전환
  useEffect(() => {
    if (currentAction === 'running' || currentAction === 'walking') {
      const dirInterval = setInterval(() => {
        setDirection(prev => prev * -1);
      }, 2000);
      return () => clearInterval(dirInterval);
    } else {
      setDirection(1);
    }
  }, [currentAction]);

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
    if (currentAction !== 'idle' || isInactive) {
      if (petMood === 'sleeping') toast.error("ZZZ... 펫이 자고 있어요.");
      else if (petMood === 'sick') toast.error("아파서 움직일 수 없어요.");
      return;
    }

    if (action === 'feed') {
      setCurrentAction('eating')
      showFeedback("냠냠! 맛있다!");
      setTimeout(() => {
        setCurrentAction('idle');
        setPet(prev => ({ ...prev, hunger: Math.min(100, prev.hunger + 30), happiness: Math.min(100, prev.happiness + 10), poop: prev.poop + (Math.random() > 0.8 ? 1 : 0) }))
      }, 3000)

    } else if (action === 'play') {
      setCurrentAction('running')
      showFeedback("산책 가자! 신난다!");
      setTimeout(() => {
        setCurrentAction('idle');
        setPet(prev => ({ ...prev, happiness: Math.min(100, prev.happiness + 25), hunger: Math.max(0, prev.hunger - 20) }))
      }, 4000)

    } else if (action === 'clean') {
      if (pet.poop === 0) { toast.error("치울 똥이 없어요."); return; }
      showFeedback("깨끗해졌다멍!");
      setPet(prev => ({ ...prev, poop: 0, happiness: Math.min(100, prev.happiness + 5) }))
    }
  }

  const isInactive = petMood === 'sleeping' || petMood === 'sick';

  // 컨테이너 이동 애니메이션 (화면 상 위치 이동)
  let containerAnimate = {};
  if (currentAction === 'running') {
    containerAnimate = { x: direction === 1 ? 60 : -60 };
  } else {
    containerAnimate = { x: 0 };
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

              {/* 펫 이동 컨테이너 */}
              <motion.div
                animate={containerAnimate}
                transition={{ duration: 2, ease: "linear" }}
                className="relative"
              >
                {/* 밥 아이콘 */}
                <AnimatePresence>
                  {currentAction === 'eating' && (
                    <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1, y: -20 }} exit={{ opacity: 0 }} className="absolute left-1/2 -translate-x-1/2 -top-10 text-4xl z-20">
                      🍖
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 자기 아이콘 */}
                <AnimatePresence>
                  {petMood === 'sleeping' && <motion.div initial={{ opacity: 0, x: 0, y: -10 }} animate={{ opacity: [0, 1, 0], x: 20, y: -30, scale: [0.8, 1.2] }} transition={{ duration: 2.5, repeat: Infinity }} className="absolute right-0 -top-8 text-2xl z-20 font-bold text-blue-900">Zzz...</motion.div>}
                </AnimatePresence>

                {/* 아픔 아이콘 */}
                <AnimatePresence>
                  {petMood === 'sick' && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: -20 }} className="absolute left-0 -top-8 text-3xl z-20">💊</motion.div>}
                </AnimatePresence>

                {/* ✅ SVG 펫 컴포넌트 호출 */}
                <PixelDog action={currentAction} mood={petMood} direction={direction} />

                {/* 그림자 */}
                <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-20 h-2 bg-[#4d5c14]/40 rounded-[100%] blur-[2px] transition-all duration-500 ${isInactive ? 'opacity-40 scale-75' : ''}`} />
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
            <Button onClick={() => handleAction('feed')} disabled={currentAction !== 'idle' || isInactive} className="h-14 rounded-xl bg-amber-300 hover:bg-amber-400 text-amber-900 border-b-4 border-amber-600 active:border-b-0 active:translate-y-1 transition-all flex flex-col gap-0 items-center justify-center disabled:opacity-50 disabled:border-b-0 disabled:translate-y-1"><Utensils className="w-6 h-6 mb-0.5" /><span className="text-lg">밥주기</span></Button>
            <Button onClick={() => handleAction('play')} disabled={currentAction !== 'idle' || isInactive} className="h-14 rounded-xl bg-sky-300 hover:bg-sky-400 text-sky-900 border-b-4 border-sky-600 active:border-b-0 active:translate-y-1 transition-all flex flex-col gap-0 items-center justify-center disabled:opacity-50 disabled:border-b-0 disabled:translate-y-1"><Gamepad2 className="w-6 h-6 mb-0.5" /><span className="text-lg">놀아주기</span></Button>
            <Button onClick={() => handleAction('clean')} disabled={currentAction !== 'idle' || isInactive || pet.poop === 0} className="h-14 rounded-xl bg-emerald-300 hover:bg-emerald-400 text-emerald-900 border-b-4 border-emerald-600 active:border-b-0 active:translate-y-1 transition-all flex flex-col gap-0 items-center justify-center disabled:opacity-50 disabled:border-b-0 disabled:translate-y-1"><Droplet className="w-6 h-6 mb-0.5" /><span className="text-lg">치우기</span></Button>
          </div>
        </div>
      </div>
    </div>
  )
}