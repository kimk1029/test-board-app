'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Droplet, Utensils, Gamepad2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

const pixelFontUrl = "https://fonts.googleapis.com/css2?family=VT323&display=swap";

// ------------------------------------------------------------------
// Cute chibi Shiba SVG with smooth framer-motion animations
// ------------------------------------------------------------------
const CuteDog = ({ action, mood, direction }: { action: string; mood: string; direction: number }) => {
  const isEating = action === 'eating'
  const isWalking = action === 'walking' || action === 'running'
  const isSleeping = mood === 'sleeping'
  const isSick = mood === 'sick'
  const isPetting = action === 'petting'

  const c = {
    fur: isSick ? '#C4A47A' : '#E8A855',
    furDark: isSick ? '#A08060' : '#D09040',
    white: isSick ? '#EDE0C8' : '#FFF8E7',
    outline: '#5A3010',
    nose: '#3E2723',
    cheek: '#FF9A76',
    earInner: '#FFB6C1',
    tongue: '#FF6B8A',
  }

  return (
    <svg
      viewBox="0 0 120 120"
      className={`w-40 h-40 drop-shadow-lg transition-all duration-500 ${isSick ? 'saturate-50' : ''}`}
      style={{ transform: `scaleX(${direction})` }}
    >
      {/* === whole body bounce === */}
      <motion.g
        animate={
          isSleeping
            ? { y: 6 }
            : isWalking
              ? { y: [0, -5, 0] }
              : { y: [0, -2, 0] }
        }
        transition={{
          duration: isWalking ? 0.35 : 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* ── tail ── */}
        <motion.g
          animate={{ rotate: isSleeping ? 0 : [0, 18, -8, 12, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '32px 70px' }}
        >
          <path d="M20 70 C10 62, 12 50, 24 52 C33 53, 34 64, 28 70 Z" fill={c.fur} stroke={c.outline} strokeWidth="1.6" />
          <path d="M21 64 C17 60, 18 56, 23 56" fill="none" stroke={c.white} strokeWidth="1.2" />
        </motion.g>

        {/* ── back legs (behind torso layer) ── */}
        <motion.g
          animate={isWalking ? { rotate: [8, -8, 8] } : {}}
          transition={{ duration: 0.36, repeat: Infinity }}
          style={{ transformOrigin: '44px 82px' }}
        >
          <rect x="38" y="80" width="11" height={isSleeping ? 6 : 18} rx="5" fill={c.furDark} stroke={c.outline} strokeWidth="1.4" />
          <ellipse cx="43.5" cy={isSleeping ? 86 : 98} rx="7" ry="3" fill={c.white} stroke={c.outline} strokeWidth="1" />
        </motion.g>
        <motion.g
          animate={isWalking ? { rotate: [-8, 8, -8] } : {}}
          transition={{ duration: 0.36, repeat: Infinity, delay: 0.18 }}
          style={{ transformOrigin: '56px 82px' }}
        >
          <rect x="50" y="80" width="11" height={isSleeping ? 6 : 18} rx="5" fill={c.furDark} stroke={c.outline} strokeWidth="1.4" />
          <ellipse cx="55.5" cy={isSleeping ? 86 : 98} rx="7" ry="3" fill={c.white} stroke={c.outline} strokeWidth="1" />
        </motion.g>

        {/* ── torso (connected silhouette) ── */}
        <path
          d="M34 72
             C34 58, 46 50, 60 50
             C78 50, 92 58, 94 72
             C95 78, 92 83, 88 86
             C84 89, 76 90, 67 89
             L52 89
             C44 89, 37 87, 34 82
             C32 79, 33 75, 34 72 Z"
          fill={c.fur}
          stroke={c.outline}
          strokeWidth="2"
        />
        {/* chest + belly patch */}
        <path
          d="M53 62 C62 59, 72 62, 77 68 C82 74, 80 83, 73 86 C66 89, 55 87, 50 81 C46 76, 47 66, 53 62 Z"
          fill={c.white}
        />
        {/* shoulder / hip overlap to visually connect legs */}
        <ellipse cx="79" cy="77" rx="11" ry="8" fill={c.fur} stroke={c.outline} strokeWidth="1.6" />
        <ellipse cx="49" cy="78" rx="10" ry="8" fill={c.fur} stroke={c.outline} strokeWidth="1.6" />

        {/* ── front legs (in front layer) ── */}
        <motion.g
          animate={isWalking ? { rotate: [-10, 10, -10] } : {}}
          transition={{ duration: 0.36, repeat: Infinity }}
          style={{ transformOrigin: '74px 82px' }}
        >
          <rect x="68" y="80" width="12" height={isSleeping ? 6 : 18} rx="5" fill={c.fur} stroke={c.outline} strokeWidth="1.5" />
          <ellipse cx="74" cy={isSleeping ? 86 : 98} rx="7.2" ry="3.1" fill={c.white} stroke={c.outline} strokeWidth="1" />
        </motion.g>
        <motion.g
          animate={isWalking ? { rotate: [10, -10, 10] } : {}}
          transition={{ duration: 0.36, repeat: Infinity, delay: 0.18 }}
          style={{ transformOrigin: '86px 82px' }}
        >
          <rect x="80" y="80" width="12" height={isSleeping ? 6 : 18} rx="5" fill={c.fur} stroke={c.outline} strokeWidth="1.5" />
          <ellipse cx="86" cy={isSleeping ? 86 : 98} rx="7.2" ry="3.1" fill={c.white} stroke={c.outline} strokeWidth="1" />
        </motion.g>

        {/* ── head group ── */}
        <motion.g
          animate={
            isEating
              ? { rotate: [0, 8, 0], y: [0, 2, 0] }
              : isPetting
                ? { rotate: [0, -4, 0, 4, 0] }
                : {}
          }
          transition={{ duration: isEating ? 0.5 : 0.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '65px 50px' }}
        >
          {/* ears */}
          <ellipse cx="42" cy="28" rx="10" ry="16" fill={c.fur} stroke={c.outline} strokeWidth="1.8" transform="rotate(-15 42 28)" />
          <ellipse cx="43" cy="30" rx="6" ry="10" fill={c.earInner} transform="rotate(-15 43 30)" />
          <ellipse cx="88" cy="28" rx="10" ry="16" fill={c.fur} stroke={c.outline} strokeWidth="1.8" transform="rotate(15 88 28)" />
          <ellipse cx="87" cy="30" rx="6" ry="10" fill={c.earInner} transform="rotate(15 87 30)" />

          {/* head shape */}
          <ellipse cx="65" cy="44" rx="28" ry="24" fill={c.fur} stroke={c.outline} strokeWidth="2" />
          {/* face white */}
          <ellipse cx="65" cy="50" rx="18" ry="16" fill={c.white} />

          {/* eyes */}
          {isSleeping ? (
            <g stroke={c.outline} strokeWidth="2" strokeLinecap="round">
              <path d="M52 42 Q55 45 58 42" fill="none" />
              <path d="M72 42 Q75 45 78 42" fill="none" />
            </g>
          ) : isSick ? (
            <g stroke={c.outline} strokeWidth="1.8" strokeLinecap="round">
              <path d="M52 39 L58 45 M58 39 L52 45" fill="none" />
              <path d="M72 39 L78 45 M78 39 L72 45" fill="none" />
            </g>
          ) : (
            <g>
              {/* eye whites */}
              <ellipse cx="55" cy="42" rx="6" ry="6.5" fill="white" stroke={c.outline} strokeWidth="1" />
              <ellipse cx="75" cy="42" rx="6" ry="6.5" fill="white" stroke={c.outline} strokeWidth="1" />
              {/* pupils - animate looking around */}
              <motion.g
                animate={isWalking ? { x: [0, 2, 0, -2, 0] } : { x: [0, 1, 0, -1, 0] }}
                transition={{ duration: isWalking ? 1 : 3, repeat: Infinity }}
              >
                <circle cx="56" cy="43" r="3.5" fill={c.nose} />
                <circle cx="76" cy="43" r="3.5" fill={c.nose} />
                {/* sparkle */}
                <circle cx="57.5" cy="41.5" r="1.2" fill="white" />
                <circle cx="77.5" cy="41.5" r="1.2" fill="white" />
                <circle cx="55" cy="44" r="0.6" fill="white" />
                <circle cx="75" cy="44" r="0.6" fill="white" />
              </motion.g>
            </g>
          )}

          {/* cheeks */}
          {!isSick && !isSleeping && (
            <g opacity="0.5">
              <ellipse cx="45" cy="50" rx="5" ry="3" fill={c.cheek} />
              <ellipse cx="85" cy="50" rx="5" ry="3" fill={c.cheek} />
            </g>
          )}

          {/* nose */}
          <ellipse cx="65" cy="52" rx="4" ry="3" fill={c.nose} />
          <ellipse cx="64" cy="51" rx="1.2" ry="0.8" fill="white" opacity="0.4" />

          {/* mouth */}
          <motion.g
            animate={isEating ? { scaleY: [1, 1.4, 1] } : {}}
            transition={{ duration: 0.4, repeat: Infinity }}
            style={{ transformOrigin: '65px 55px' }}
          >
            <path d="M65 55 Q60 60 57 57" fill="none" stroke={c.nose} strokeWidth="1.2" strokeLinecap="round" />
            <path d="M65 55 Q70 60 73 57" fill="none" stroke={c.nose} strokeWidth="1.2" strokeLinecap="round" />
            {/* tongue */}
            <AnimatePresence>
              {(isEating || isPetting) && (
                <motion.ellipse
                  cx="65"
                  cy="59"
                  rx="3"
                  ry="4"
                  fill={c.tongue}
                  initial={{ scaleY: 0, opacity: 0 }}
                  animate={{ scaleY: 1, opacity: 1 }}
                  exit={{ scaleY: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ transformOrigin: '65px 56px' }}
                />
              )}
            </AnimatePresence>
          </motion.g>
        </motion.g>
      </motion.g>

      {/* food floating in when eating */}
      <AnimatePresence>
        {isEating && (
          <motion.g
            initial={{ opacity: 0, x: 105, y: 30 }}
            animate={{ opacity: [0, 1, 1, 0], x: [105, 85, 70, 65], y: [30, 40, 48, 52], scale: [1, 0.8, 0.5, 0] }}
            transition={{ duration: 2, times: [0, 0.3, 0.7, 1], ease: 'easeInOut' }}
          >
            <circle cx="0" cy="0" r="6" fill="#F5D0A9" stroke="#C08040" strokeWidth="1" />
            <circle cx="-2" cy="-2" r="2" fill="#E0B080" />
            <circle cx="2" cy="1" r="1.5" fill="#E0B080" />
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  )
}

// ------------------------------------------------------------------
// 메인 컴포넌트
// ------------------------------------------------------------------
interface Pet {
  id: number
  name: string
  level: number
  exp: number
  hunger: number
  happiness: number
  health: number
  poop: number
  energy: number
  cleanliness: number
  affection: number
}

export default function PetTamagotchi() {
  // 초기 상태: 테스트를 위해 행복도/건강을 조절해보세요. (현재: 건강함)
  const [pet, setPet] = useState<Pet>({
    id: 1, name: '시바견', level: 1, exp: 0, hunger: 60, happiness: 80, health: 100, poop: 0, energy: 75, cleanliness: 85, affection: 60
  })
  const [loading, setLoading] = useState(true)

  const [petMood, setPetMood] = useState<'happy' | 'sad' | 'hungry' | 'sick' | 'sleeping' | 'normal'>('normal')
  const [currentAction, setCurrentAction] = useState<'idle' | 'eating' | 'walking' | 'running' | 'sleeping' | 'healing' | 'petting'>('idle')
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
        energy: Math.max(0, prev.energy - 1),
        cleanliness: Math.max(0, prev.cleanliness - (prev.poop > 0 ? 2 : 1)),
        affection: Math.max(0, prev.affection - 1),
        health: Math.max(0, prev.health - (prev.cleanliness < 20 ? 1 : 0)),
        poop: Math.random() > 0.92 ? Math.min(3, prev.poop + 1) : prev.poop
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

  // 기분 결정 로직
  useEffect(() => {
    if (pet.health < 40 || pet.cleanliness < 15) setPetMood('sick') // 건강/청결이 낮으면 아픔
    else if (pet.energy < 20) setPetMood('sleeping') // 에너지가 낮으면 잠
    else if (pet.hunger < 30) setPetMood('hungry')
    else if (pet.happiness > 80 && pet.affection > 70) setPetMood('happy')
    else setPetMood('normal')
  }, [pet.hunger, pet.happiness, pet.health, pet.energy, pet.cleanliness, pet.affection])

  const showFeedback = (msg: string, duration = 3000) => {
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    setMessage(msg);
    setShowMessage(true);
    messageTimeoutRef.current = setTimeout(() => setShowMessage(false), duration);
  }

  const handleAction = (action: 'feed' | 'play' | 'clean' | 'sleep' | 'heal' | 'pet') => {
    const isInactive = petMood === 'sleeping' || petMood === 'sick';
    if (currentAction !== 'idle' || (isInactive && action !== 'sleep' && action !== 'heal')) {
      if (petMood === 'sleeping') toast.error("ZZZ... 펫이 자고 있어요.");
      else if (petMood === 'sick') toast.error("아파서 움직일 수 없어요. 치료가 필요해요.");
      return;
    }

    if (action === 'feed') {
      setCurrentAction('eating')
      showFeedback("냠냠! 맛있다멍!");
      // 먹는 애니메이션 시간 (2.5초) 후 상태 업데이트
      setTimeout(() => {
        setCurrentAction('idle');
        setPet(prev => ({
          ...prev,
          hunger: Math.min(100, prev.hunger + 30),
          happiness: Math.min(100, prev.happiness + 10),
          affection: Math.min(100, prev.affection + 5),
          poop: prev.poop + (Math.random() > 0.8 ? 1 : 0),
        }))
      }, 2500)

    } else if (action === 'play') {
      setCurrentAction('running')
      showFeedback("산책 가자! 신난다!");
      setTimeout(() => {
        setCurrentAction('idle');
        setPet(prev => ({
          ...prev,
          happiness: Math.min(100, prev.happiness + 25),
          affection: Math.min(100, prev.affection + 10),
          energy: Math.max(0, prev.energy - 15),
          hunger: Math.max(0, prev.hunger - 20),
        }))
      }, 4000)

    } else if (action === 'clean') {
      if (pet.poop === 0) { toast.error("치울 똥이 없어요."); return; }
      showFeedback("깨끗해졌다멍!");
      setPet(prev => ({
        ...prev,
        poop: 0,
        cleanliness: Math.min(100, prev.cleanliness + 35),
        happiness: Math.min(100, prev.happiness + 5),
      }))
    } else if (action === 'sleep') {
      setCurrentAction('sleeping')
      showFeedback("코오... 에너지를 충전 중이에요.")
      setTimeout(() => {
        setCurrentAction('idle')
        setPet(prev => ({
          ...prev,
          energy: Math.min(100, prev.energy + 45),
          health: Math.min(100, prev.health + 15),
          happiness: Math.min(100, prev.happiness + 10),
        }))
      }, 3500)
    } else if (action === 'heal') {
      if (pet.health > 90) { toast.error('지금은 치료가 필요 없어 보여요.'); return; }
      setCurrentAction('healing')
      showFeedback("치료 중... 금방 괜찮아질 거예요.")
      setTimeout(() => {
        setCurrentAction('idle')
        setPet(prev => ({
          ...prev,
          health: Math.min(100, prev.health + 30),
          cleanliness: Math.min(100, prev.cleanliness + 10),
        }))
      }, 2000)
    } else if (action === 'pet') {
      setCurrentAction('petting')
      showFeedback("쓰담쓰담... 행복해요!")
      setTimeout(() => {
        setCurrentAction('idle')
        setPet(prev => ({
          ...prev,
          affection: Math.min(100, prev.affection + 20),
          happiness: Math.min(100, prev.happiness + 12),
        }))
      }, 1500)
    }
  }

  const isInactive = (petMood === 'sleeping' || petMood === 'sick') && currentAction === 'idle';

  // 컨테이너 이동 애니메이션
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
                {/* 자기 아이콘 */}
                <AnimatePresence>
                  {petMood === 'sleeping' && <motion.div initial={{ opacity: 0, x: 0, y: -10 }} animate={{ opacity: [0, 1, 0], x: 20, y: -30, scale: [0.8, 1.2] }} transition={{ duration: 2.5, repeat: Infinity }} className="absolute right-0 -top-8 text-2xl z-20 font-bold text-blue-900">Zzz...</motion.div>}
                </AnimatePresence>

                {/* 아픔 아이콘 */}
                <AnimatePresence>
                  {petMood === 'sick' && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: -20 }} className="absolute left-0 -top-8 text-3xl z-20">💊</motion.div>}
                </AnimatePresence>
                <AnimatePresence>
                  {currentAction === 'healing' && <motion.div initial={{ opacity: 0, y: 0 }} animate={{ opacity: [0, 1, 0], y: -30 }} transition={{ duration: 1.2, repeat: Infinity }} className="absolute left-10 -top-8 text-2xl z-20">✨</motion.div>}
                </AnimatePresence>
                <AnimatePresence>
                  {currentAction === 'petting' && <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 0.8] }} transition={{ duration: 1.2, repeat: Infinity }} className="absolute right-8 -top-8 text-2xl z-20">💖</motion.div>}
                </AnimatePresence>

                {/* SVG 펫 컴포넌트 */}
                <CuteDog action={currentAction} mood={petMood} direction={direction} />

                {/* 그림자 */}
                <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-24 h-3 bg-[#4d5c14]/40 rounded-[100%] blur-[2px] transition-all duration-500 ${isInactive ? 'opacity-40 scale-90' : ''}`} />
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
              {petMood === 'sick' && <span>🤒</span>}
              {currentAction === 'sleeping' && <span>🛏️</span>}
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
            <div className="space-y-1"><div className="flex justify-between text-lg text-gray-600"><span>건강</span><span>{Math.round(pet.health)}%</span></div><Progress value={pet.health} className="h-3 bg-gray-300 rounded-full border border-gray-400" indicatorClassName={`bg-[#8bac0f] ${pet.health < 40 ? 'bg-red-500' : ''}`} /></div>
            <div className="space-y-1"><div className="flex justify-between text-lg text-gray-600"><span>에너지</span><span>{Math.round(pet.energy)}%</span></div><Progress value={pet.energy} className="h-3 bg-gray-300 rounded-full border border-gray-400" indicatorClassName="bg-blue-500" /></div>
            <div className="space-y-1"><div className="flex justify-between text-lg text-gray-600"><span>청결</span><span>{Math.round(pet.cleanliness)}%</span></div><Progress value={pet.cleanliness} className="h-3 bg-gray-300 rounded-full border border-gray-400" indicatorClassName="bg-emerald-500" /></div>
            <div className="space-y-1 col-span-2"><div className="flex justify-between text-lg text-gray-600"><span>애정</span><span>{Math.round(pet.affection)}%</span></div><Progress value={pet.affection} className="h-3 bg-gray-300 rounded-full border border-gray-400" indicatorClassName="bg-pink-500" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Button onClick={() => handleAction('feed')} disabled={currentAction !== 'idle' || isInactive} className="h-14 rounded-xl bg-amber-300 hover:bg-amber-400 text-amber-900 border-b-4 border-amber-600 active:border-b-0 active:translate-y-1 transition-all flex flex-col gap-0 items-center justify-center disabled:opacity-50 disabled:border-b-0 disabled:translate-y-1"><Utensils className="w-6 h-6 mb-0.5" /><span className="text-lg">밥주기</span></Button>
            <Button onClick={() => handleAction('play')} disabled={currentAction !== 'idle' || isInactive} className="h-14 rounded-xl bg-sky-300 hover:bg-sky-400 text-sky-900 border-b-4 border-sky-600 active:border-b-0 active:translate-y-1 transition-all flex flex-col gap-0 items-center justify-center disabled:opacity-50 disabled:border-b-0 disabled:translate-y-1"><Gamepad2 className="w-6 h-6 mb-0.5" /><span className="text-lg">놀아주기</span></Button>
            <Button onClick={() => handleAction('clean')} disabled={currentAction !== 'idle' || isInactive || pet.poop === 0} className="h-14 rounded-xl bg-emerald-300 hover:bg-emerald-400 text-emerald-900 border-b-4 border-emerald-600 active:border-b-0 active:translate-y-1 transition-all flex flex-col gap-0 items-center justify-center disabled:opacity-50 disabled:border-b-0 disabled:translate-y-1"><Droplet className="w-6 h-6 mb-0.5" /><span className="text-lg">치우기</span></Button>
            <Button onClick={() => handleAction('sleep')} disabled={currentAction !== 'idle'} className="h-14 rounded-xl bg-indigo-300 hover:bg-indigo-400 text-indigo-900 border-b-4 border-indigo-600 active:border-b-0 active:translate-y-1 transition-all flex flex-col gap-0 items-center justify-center disabled:opacity-50 disabled:border-b-0 disabled:translate-y-1"><span className="text-lg">😴</span><span className="text-lg">재우기</span></Button>
            <Button onClick={() => handleAction('heal')} disabled={currentAction !== 'idle'} className="h-14 rounded-xl bg-rose-300 hover:bg-rose-400 text-rose-900 border-b-4 border-rose-600 active:border-b-0 active:translate-y-1 transition-all flex flex-col gap-0 items-center justify-center disabled:opacity-50 disabled:border-b-0 disabled:translate-y-1"><span className="text-lg">💊</span><span className="text-lg">치료</span></Button>
            <Button onClick={() => handleAction('pet')} disabled={currentAction !== 'idle'} className="h-14 rounded-xl bg-pink-300 hover:bg-pink-400 text-pink-900 border-b-4 border-pink-600 active:border-b-0 active:translate-y-1 transition-all flex flex-col gap-0 items-center justify-center disabled:opacity-50 disabled:border-b-0 disabled:translate-y-1"><span className="text-lg">💖</span><span className="text-lg">쓰담</span></Button>
          </div>
        </div>
      </div>
    </div>
  )
}