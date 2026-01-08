'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Droplet, Utensils, Gamepad2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

const pixelFontUrl = "https://fonts.googleapis.com/css2?family=VT323&display=swap";

// ------------------------------------------------------------------
// ✅ [SVG 컴포넌트] 세련된 픽셀 시바견 & 리얼한 애니메이션
// ------------------------------------------------------------------
const PixelDog = ({ action, mood, direction }: { action: string, mood: string, direction: number }) => {
  const isEating = action === 'eating';
  const isWalking = action === 'walking' || action === 'running';
  const isSleeping = mood === 'sleeping';
  const isSick = mood === 'sick';

  // 시바견 컬러 팔레트
  const colors = {
    main: isSick ? "#A08060" : "#D99058", // 아프면 창백해짐
    belly: isSick ? "#E0D0B0" : "#F3E5AB",
    outline: "#5A2F0B",
    nose: "#3E2723",
    earInner: "#FFB6C1"
  };

  return (
    <svg
      viewBox="0 0 100 100"
      // shape-rendering="crispEdges"는 픽셀을 선명하게 만들어줍니다.
      shapeRendering="crispEdges"
      className={`w-44 h-44 drop-shadow-md transition-all duration-500 ${isSick ? 'grayscale-[0.3] blur-[0.5px]' : ''}`}
      style={{ transform: `scaleX(${direction})` }}
    >
      {/* 🍖 먹이 아이콘 (입으로 들어가는 애니메이션) */}
      <AnimatePresence>
        {isEating && (
          <motion.g
            initial={{ opacity: 0, x: 80, y: 60, scale: 0.8, rotate: 0 }}
            animate={{
              opacity: [1, 1, 0],
              x: [80, 65, 60], // 입쪽으로 이동
              y: [60, 50, 48],
              scale: [0.8, 0.6, 0], // 작아지며 사라짐
              rotate: [0, -45, -90]
            }}
            transition={{ duration: 2.5, times: [0, 0.7, 1], ease: "easeInOut" }}
          >
            {/* 뼈다귀 모양 */}
            <path d="M5 0 H15 V5 H20 V15 H15 V20 H5 V15 H0 V5 H5 V0 Z" fill="#EEE" stroke={colors.outline} strokeWidth="1" transform="translate(-10, -10) scale(0.8)" />
          </motion.g>
        )}
      </AnimatePresence>


      {/* 강아지 몸통 전체 그룹 */}
      <motion.g
        animate={
          isSleeping ? { y: 12, scaleY: 0.9 } // 잘 때는 웅크림
            : isWalking ? { y: [0, -3, 0] } // 걸을 땐 통통 튐
              : { y: [0, -1, 0] } // 평소엔 숨쉬기
        }
        transition={{
          duration: isWalking ? 0.25 : 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* 1. 꼬리 (말린 꼬리 살랑살랑) */}
        <motion.g
          animate={{ rotate: isSleeping ? 0 : [0, -15, 0, 10, 0] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          style={{ originX: '20px', originY: '55px' }}
        >
          <rect x="10" y="45" width="15" height="10" fill={colors.main} stroke={colors.outline} strokeWidth="1" />
          <rect x="5" y="40" width="10" height="10" fill={colors.belly} stroke={colors.outline} strokeWidth="1" />
        </motion.g>

        {/* 2. 뒷다리 (걷기 교차) */}
        <motion.g animate={isWalking ? { x: [0, -2, 0] } : {}} transition={{ duration: 0.5, repeat: Infinity }}>
          <rect x="30" y="70" width="10" height="15" fill={colors.main} stroke={colors.outline} strokeWidth="1"
            style={isSleeping ? { height: 5, y: 75 } : {}} />
        </motion.g>
        <motion.g animate={isWalking ? { x: [0, 2, 0] } : {}} transition={{ duration: 0.5, repeat: Infinity, delay: 0.25 }}>
          <rect x="45" y="70" width="10" height="15" fill={colors.main} stroke={colors.outline} strokeWidth="1"
            style={isSleeping ? { height: 5, y: 75 } : {}} />
        </motion.g>


        {/* 3. 몸통 */}
        <rect x="25" y="40" width="45" height="35" fill={colors.main} stroke={colors.outline} strokeWidth="1" />
        <rect x="30" y="55" width="35" height="20" fill={colors.belly} /> {/* 배 부분 흰색 */}

        {/* 4. 앞다리 (걷기 교차) */}
        <motion.g animate={isWalking ? { x: [0, 2, 0] } : {}} transition={{ duration: 0.5, repeat: Infinity }}>
          <rect x="55" y="70" width="10" height="15" fill={colors.main} stroke={colors.outline} strokeWidth="1"
            style={isSleeping ? { height: 5, y: 75 } : {}} />
        </motion.g>
        <motion.g animate={isWalking ? { x: [0, -2, 0] } : {}} transition={{ duration: 0.5, repeat: Infinity, delay: 0.25 }}>
          <rect x="70" y="70" width="10" height="15" fill={colors.main} stroke={colors.outline} strokeWidth="1"
            style={isSleeping ? { height: 5, y: 75 } : {}} />
        </motion.g>

        {/* 5. 머리 그룹 (먹을 때 까딱거림) */}
        <motion.g
          animate={isEating ? { rotate: [0, 10, 0], x: [0, 2, 0] } : {}}
          transition={{ duration: 0.5, repeat: Infinity }}
          style={{ originX: '65px', originY: '45px' }}
        >
          {/* 귀 */}
          <polygon points="60,25 55,5 75,25" fill={colors.main} stroke={colors.outline} strokeWidth="1" />
          <polygon points="62,22 58,8 70,22" fill={colors.earInner} /> {/* 귓속 */}
          <polygon points="85,25 100,5 95,25" fill={colors.main} stroke={colors.outline} strokeWidth="1" />
          <polygon points="88,22 97,8 93,22" fill={colors.earInner} />

          {/* 얼굴 형태 */}
          <rect x="55" y="25" width="45" height="40" fill={colors.main} stroke={colors.outline} strokeWidth="1" />
          {/* 얼굴 흰색 패턴 */}
          <polygon points="55,45 70,65 95,65 100,45 100,65 55,65" fill={colors.belly} />
          <rect x="70" y="25" width="15" height="40" fill={colors.belly} />

          {/* 눈 (상태별 변화) */}
          {isSleeping ? (
            // 자는 눈 (- -)
            <g fill={colors.nose}>
              <rect x="65" y="40" width="8" height="2" />
              <rect x="87" y="40" width="8" height="2" />
            </g>
          ) : isSick ? (
            // 아픈 눈 (X X)
            <g stroke={colors.nose} strokeWidth="2">
              <path d="M65 38 L73 46 M73 38 L65 46" />
              <path d="M87 38 L95 46 M95 38 L87 46" />
            </g>
          ) : (
            // 평소 눈 (초롱초롱)
            <g fill={colors.nose}>
              <rect x="66" y="38" width="6" height="6" />
              <rect x="88" y="38" width="6" height="6" />
              <rect x="68" y="39" width="2" height="2" fill="white" /> {/* 눈망울 */}
              <rect x="90" y="39" width="2" height="2" fill="white" />
            </g>
          )}

          {/* 코 */}
          <rect x="76" y="48" width="8" height="6" fill={colors.nose} />

          {/* 입 (먹을 때 벌림) */}
          <motion.g
            animate={isEating ? { scaleY: [1, 1.5, 1] } : { scaleY: 1 }}
            transition={{ duration: 0.4, repeat: Infinity }}
            style={{ originY: '55px' }}
          >
            {/* 혀 (먹을 때만 보임) */}
            <motion.rect x="77" y="60" width="6" height="5" fill="#FF6B6B" animate={{ opacity: isEating ? 1 : 0 }} />
            {/* 입 모양 */}
            <path d="M75 58 H85 V60 H75 Z" fill={isEating ? "#7A1F1F" : colors.nose} />
          </motion.g>

          {/* 볼터치 */}
          {!isSick && !isSleeping && (
            <g fill="#FFA07A" opacity="0.7">
              <rect x="60" y="50" width="5" height="3" />
              <rect x="95" y="50" width="5" height="3" />
            </g>
          )}
        </motion.g>
      </motion.g>
    </svg>
  );
};

// ------------------------------------------------------------------
// 메인 컴포넌트
// ------------------------------------------------------------------
interface Pet {
  id: number; name: string; level: number; exp: number; hunger: number; happiness: number; health: number; poop: number;
}

export default function PetTamagotchi() {
  // 초기 상태: 테스트를 위해 행복도/건강을 조절해보세요. (현재: 건강함)
  const [pet, setPet] = useState<Pet>({
    id: 1, name: '시바견', level: 1, exp: 0, hunger: 60, happiness: 80, health: 100, poop: 0
  })
  const [loading, setLoading] = useState(true)

  const [petMood, setPetMood] = useState<'happy' | 'sad' | 'hungry' | 'sick' | 'sleeping' | 'normal'>('normal')
  const [currentAction, setCurrentAction] = useState<'idle' | 'eating' | 'walking' | 'running'>('idle')
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
    if (pet.health < 40) setPetMood('sick') // 건강이 낮으면 아픔
    else if (pet.happiness < 30) setPetMood('sleeping') // 행복도 낮으면 잠
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
      else if (petMood === 'sick') toast.error("아파서 움직일 수 없어요. 치료가 필요해요.");
      return;
    }

    if (action === 'feed') {
      setCurrentAction('eating')
      showFeedback("냠냠! 맛있다멍!");
      // 먹는 애니메이션 시간 (2.5초) 후 상태 업데이트
      setTimeout(() => {
        setCurrentAction('idle');
        setPet(prev => ({ ...prev, hunger: Math.min(100, prev.hunger + 30), happiness: Math.min(100, prev.happiness + 10), poop: prev.poop + (Math.random() > 0.8 ? 1 : 0) }))
      }, 2500)

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

                {/* ✅ SVG 펫 컴포넌트 호출 */}
                <PixelDog action={currentAction} mood={petMood} direction={direction} />

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