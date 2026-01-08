'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Droplet, Utensils, Gamepad2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

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

  useEffect(() => {
    fetchPet()
    // 30초마다 펫 상태 갱신
    const interval = setInterval(fetchPet, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (pet) {
      // 펫 기분 결정
      if (pet.health < 30) {
        setPetMood('sick')
      } else if (pet.hunger < 30) {
        setPetMood('hungry')
      } else if (pet.happiness < 30) {
        setPetMood('sad')
      } else if (pet.happiness > 70 && pet.hunger > 70) {
        setPetMood('happy')
      } else {
        setPetMood('normal')
      }
    }
  }, [pet])

  const fetchPet = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        return
      }

      const res = await fetch('/api/pet', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setPet(data)
      }
    } catch (error) {
      console.error('펫 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (action: 'feed' | 'play' | 'clean') => {
    if (!pet || actionLoading) return

    setActionLoading(action)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        toast.error('로그인이 필요합니다.')
        return
      }

      const res = await fetch(`/api/pet/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await res.json()

      if (res.ok) {
        setPet(data.pet)
        setMessage(data.message)
        setShowMessage(true)
        setTimeout(() => setShowMessage(false), 3000)
        toast.success(data.message)
      } else {
        toast.error(data.error || '작업에 실패했습니다.')
      }
    } catch (error) {
      console.error(`${action} 오류:`, error)
      toast.error('작업에 실패했습니다.')
    } finally {
      setActionLoading(null)
    }
  }

  const getPetEmoji = () => {
    if (!pet) return '🐾'
    
    switch (petMood) {
      case 'happy':
        return '😊'
      case 'sad':
        return '😢'
      case 'hungry':
        return '😋'
      case 'sick':
        return '🤒'
      default:
        return '😐'
    }
  }

  const getPetColor = () => {
    switch (petMood) {
      case 'happy':
        return 'from-yellow-400 to-orange-500'
      case 'sad':
        return 'from-blue-400 to-indigo-500'
      case 'hungry':
        return 'from-red-400 to-pink-500'
      case 'sick':
        return 'from-gray-400 to-slate-500'
      default:
        return 'from-green-400 to-emerald-500'
    }
  }

  const getNextLevelExp = () => {
    if (!pet) return 100
    return pet.level * 100
  }

  const getExpProgress = () => {
    if (!pet) return 0
    const currentLevelExp = (pet.level - 1) * 100
    const nextLevelExp = pet.level * 100
    const progress = ((pet.exp - currentLevelExp) / (nextLevelExp - currentLevelExp)) * 100
    return Math.min(100, Math.max(0, progress))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-slate-400">펫을 불러오는 중...</div>
      </div>
    )
  }

  if (!pet) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-slate-400">펫이 없습니다.</div>
      </div>
    )
  }

  // 쿨다운 계산
  const getCooldown = (lastAction: string | null, cooldownMinutes: number) => {
    if (!lastAction) return 0
    const now = new Date()
    const last = new Date(lastAction)
    const minutesSince = (now.getTime() - last.getTime()) / (1000 * 60)
    return Math.max(0, cooldownMinutes - minutesSince)
  }

  const feedCooldown = getCooldown(pet.lastFedAt, 5)
  const playCooldown = getCooldown(pet.lastPlayedAt, 3)

  return (
    <div className="w-full">
      <div className="bg-[#131316] border border-white/10 rounded-2xl p-6 overflow-hidden relative">
        {/* 배경 그라데이션 */}
        <div className={`absolute inset-0 bg-gradient-to-br ${getPetColor()} opacity-10 pointer-events-none`} />
        
        <div className="relative z-10">
          {/* 펫 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">{pet.name}</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Lv. {pet.level}</span>
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-yellow-400" />
                  <span className="text-xs text-yellow-400">{pet.exp} EXP</span>
                </div>
              </div>
            </div>
            <div className="text-6xl">{getPetEmoji()}</div>
          </div>

          {/* 경험치 바 */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>경험치</span>
              <span>{pet.exp} / {getNextLevelExp()}</span>
            </div>
            <Progress value={getExpProgress()} className="h-2 bg-white/10" indicatorClassName="bg-gradient-to-r from-yellow-500 to-orange-500" />
          </div>

          {/* 상태 바 */}
          <div className="space-y-3 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Utensils className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-slate-300">배고픔</span>
                <span className="text-xs text-slate-500 ml-auto">{Math.round(pet.hunger)}%</span>
              </div>
              <Progress 
                value={pet.hunger} 
                className="h-2 bg-white/10" 
                indicatorClassName={`${pet.hunger < 30 ? 'bg-red-500' : pet.hunger < 60 ? 'bg-orange-500' : 'bg-green-500'}`}
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">😊</span>
                <span className="text-sm text-slate-300">행복도</span>
                <span className="text-xs text-slate-500 ml-auto">{Math.round(pet.happiness)}%</span>
              </div>
              <Progress 
                value={pet.happiness} 
                className="h-2 bg-white/10" 
                indicatorClassName={`${pet.happiness < 30 ? 'bg-red-500' : pet.happiness < 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-4 h-4 text-red-400" />
                <span className="text-sm text-slate-300">건강</span>
                <span className="text-xs text-slate-500 ml-auto">{Math.round(pet.health)}%</span>
              </div>
              <Progress 
                value={pet.health} 
                className="h-2 bg-white/10" 
                indicatorClassName={`${pet.health < 30 ? 'bg-red-500' : pet.health < 60 ? 'bg-orange-500' : 'bg-green-500'}`}
              />
            </div>

            {pet.poop > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">💩</span>
                  <span className="text-sm text-slate-300">똥</span>
                  <span className="text-xs text-slate-500 ml-auto">{pet.poop}개</span>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 flex-1 rounded ${i < pet.poop ? 'bg-amber-700' : 'bg-white/5'}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 액션 버튼 */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={() => handleAction('feed')}
              disabled={actionLoading === 'feed' || feedCooldown > 0}
              className="bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-50"
              size="sm"
            >
              {actionLoading === 'feed' ? (
                '처리 중...'
              ) : feedCooldown > 0 ? (
                `${Math.ceil(feedCooldown)}분`
              ) : (
                <>
                  <Utensils className="w-4 h-4 mr-1" />
                  밥주기
                </>
              )}
            </Button>

            <Button
              onClick={() => handleAction('play')}
              disabled={actionLoading === 'play' || playCooldown > 0}
              className="bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
              size="sm"
            >
              {actionLoading === 'play' ? (
                '처리 중...'
              ) : playCooldown > 0 ? (
                `${Math.ceil(playCooldown)}분`
              ) : (
                <>
                  <Gamepad2 className="w-4 h-4 mr-1" />
                  놀아주기
                </>
              )}
            </Button>

            <Button
              onClick={() => handleAction('clean')}
              disabled={actionLoading === 'clean' || pet.poop === 0}
              className="bg-amber-700 hover:bg-amber-600 text-white disabled:opacity-50"
              size="sm"
            >
              {actionLoading === 'clean' ? (
                '처리 중...'
              ) : (
                <>
                  <Droplet className="w-4 h-4 mr-1" />
                  똥치우기
                </>
              )}
            </Button>
          </div>

          {/* 메시지 */}
          <AnimatePresence>
            {showMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 text-center text-sm text-green-400 font-bold"
              >
                {message}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
