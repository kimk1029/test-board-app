'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import HeaderNavigator from '@/components/HeaderNavigator'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Coins, Loader2, X, ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'

interface CardData {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: string;
}

interface Player {
  id: number
  userId: number
  seatIndex: number
  nickname: string
  holeCards: CardData[]
  chips: number
  currentBet: number
  isActive: boolean
  isAllIn: boolean
  position: string | null
}

interface RoomState {
  id: string
  name: string
  maxPlayers: number
  smallBlind: number
  bigBlind: number
  status: string
  currentRound: string | null
  pot: number
  dealerIndex: number
  communityCards: CardData[]
  gameState: {
    currentTurnSeat: number | null
    lastRaise: number
    minBet: number
    winners?: { seatIndex: number, hand: any, amount: number }[]
  }
}

const SUIT_SYMBOLS = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠'
}

const SUIT_COLORS = {
  hearts: 'text-red-500',
  diamonds: 'text-red-500',
  clubs: 'text-slate-900',
  spades: 'text-slate-900'
}

const PokerCard = ({ card, size = 'md', hidden = false }: { card?: CardData, size?: 'sm' | 'md' | 'lg', hidden?: boolean }) => {
  const sizeClasses = {
    sm: 'w-8 h-12 text-xs rounded',
    md: 'w-12 h-16 text-sm rounded-md',
    lg: 'w-16 h-24 text-xl rounded-lg'
  }

  if (hidden) {
    return (
      <div className={`${sizeClasses[size]} bg-blue-800 border-2 border-white/20 shadow-md flex items-center justify-center`}>
        <div className="w-full h-full bg-[url('/patterns/card-back.png')] opacity-50" />
      </div>
    )
  }

  if (!card) return <div className={`${sizeClasses[size]} border-2 border-white/10 rounded bg-white/5`} />

  return (
    <div className={`${sizeClasses[size]} bg-white shadow-lg flex flex-col items-center justify-center font-bold select-none ${SUIT_COLORS[card.suit]}`}>
      <span>{card.rank}</span>
      <span>{SUIT_SYMBOLS[card.suit]}</span>
    </div>
  )
}

export default function HoldemRoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string

  const [room, setRoom] = useState<RoomState | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null)
  const [joining, setJoining] = useState(false)
  const [raiseAmount, setRaiseAmount] = useState(0)

  // Sound effects refs could go here

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        setCurrentUserId(user.id)
      } catch (e) {
        console.error('Failed to parse user', e)
      }
    }

    fetchRoom()
    const interval = setInterval(fetchRoom, 2000)
    return () => clearInterval(interval)
  }, [roomId])

  const fetchRoom = async () => {
    try {
      const res = await fetch(`/api/holdem/room?roomId=${roomId}`)
      if (res.ok) {
        const data = await res.json()
        setRoom(data.room)
        setPlayers(data.players)
      }
    } catch (error) {
      console.error('Failed to fetch room', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSeatClick = (seatIndex: number) => {
    if (!currentUserId) {
      alert('로그인이 필요합니다.')
      return
    }
    const myPlayer = players.find(p => p.userId === currentUserId)
    if (myPlayer) {
      alert('이미 참가 중입니다.')
      return
    }
    const seatTaken = players.find(p => p.seatIndex === seatIndex)
    if (seatTaken) {
      alert('이미 차지된 좌석입니다.')
      return
    }
    setSelectedSeat(seatIndex)
  }

  const handleJoinSeat = async () => {
    if (selectedSeat === null) return

    setJoining(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/holdem/room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          roomId,
          seatIndex: selectedSeat,
          buyIn: 1000
        })
      })

      if (res.ok) {
        await fetchRoom()
        setSelectedSeat(null)
      } else {
        const error = await res.json()
        alert(error.error || '좌석 참가 실패')
      }
    } catch (error) {
      console.error('Failed to join seat', error)
    } finally {
      setJoining(false)
    }
  }

  const handleAction = async (action: string, amount: number = 0) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/holdem/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ roomId, action, amount })
      })

      if (res.ok) {
        fetchRoom()
      } else {
        const error = await res.json()
        alert(error.error || 'Action failed')
      }
    } catch (error) {
      console.error('Action error', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0c] to-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Room not found</p>
          <Button onClick={() => router.push('/game/holdem')}>Back to Lobby</Button>
        </div>
      </div>
    )
  }

  const seats = Array.from({ length: room.maxPlayers }, (_, i) => i)
  const myPlayer = players.find(p => p.userId === currentUserId)
  const isMyTurn = myPlayer && room.gameState.currentTurnSeat === myPlayer.seatIndex

  // Calculate call amount
  const highestBet = Math.max(...players.map(p => p.currentBet), 0)
  const toCall = myPlayer ? highestBet - myPlayer.currentBet : 0
  const minRaise = room.gameState.lastRaise > 0 ? room.gameState.lastRaise : room.bigBlind
  const canRaise = myPlayer && myPlayer.chips > toCall

  return (
    <div className="min-h-screen bg-[#0f1014] text-slate-100 overflow-hidden font-sans">
      <HeaderNavigator />

      {/* Table Background */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_#1a3c2f_0%,_#0d1f18_60%,_#050a08_100%)] -z-10" />

      <main className="h-screen pt-16 flex flex-col relative">

        {/* Room Info Bar */}
        <div className="absolute top-20 left-4 z-10 bg-black/40 backdrop-blur-md p-3 rounded-lg border border-white/10">
          <h1 className="text-lg font-bold text-white mb-1">{room.name}</h1>
          <div className="text-xs text-slate-400 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Blinds: {room.smallBlind}/{room.bigBlind}
            </div>
            <div>Min Buy-in: 1,000</div>
          </div>
        </div>

        {/* Game Area */}
        <div className="flex-1 flex items-center justify-center relative scale-90 sm:scale-100 transition-transform">

          {/* Poker Table */}
          <div className="relative w-[800px] h-[450px] bg-[#1e4d3b] rounded-[200px] border-[16px] border-[#2a1a11] shadow-[0_0_50px_rgba(0,0,0,0.5)_inset,0_20px_50px_rgba(0,0,0,0.8)]">

            {/* Table Felt Texture/Logo */}
            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
              <span className="text-6xl font-black tracking-widest text-black rotate-12">CASINO</span>
            </div>

            {/* Community Cards */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-2">
              {room.communityCards && room.communityCards.length > 0 ? (
                room.communityCards.map((card, idx) => (
                  <motion.div
                    key={`${card.suit}-${card.rank}-${idx}`}
                    initial={{ scale: 0.8, opacity: 0, y: -20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <PokerCard card={card} size="lg" />
                  </motion.div>
                ))
              ) : (
                <div className="h-24 flex items-center text-white/20 text-sm font-bold tracking-widest">
                  TEXAS HOLDEM
                </div>
              )}
            </div>

            {/* Pot Display */}
            <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2">
              {room.pot > 0 && (
                <div className="bg-black/60 px-4 py-1 rounded-full text-yellow-400 font-bold border border-yellow-500/30 flex items-center gap-2 shadow-lg">
                  <Coins className="w-4 h-4" />
                  {room.pot.toLocaleString()}
                </div>
              )}
            </div>

            {/* Seats */}
            {seats.map((seatIndex) => {
              const player = players.find(p => p.seatIndex === seatIndex)
              const isMySeat = myPlayer?.seatIndex === seatIndex
              const isTurn = room.gameState.currentTurnSeat === seatIndex
              const isWinner = room.gameState.winners?.some(w => w.seatIndex === seatIndex)

              // Elliptical positioning
              const angle = (seatIndex * 360) / room.maxPlayers + 90
              const radian = (angle * Math.PI) / 180
              const radiusX = 440 // slightly wider than table
              const radiusY = 270
              const x = 400 + radiusX * Math.cos(radian)
              const y = 225 + radiusY * Math.sin(radian)

              return (
                <div
                  key={seatIndex}
                  className="absolute"
                  style={{
                    left: x,
                    top: y,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className={`relative flex flex-col items-center ${isTurn ? 'z-20' : 'z-10'}`}>

                    {/* Player Info Card */}
                    <motion.div
                      animate={isTurn ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
                      className={`relative w-32 bg-[#1a1b1e] border-2 rounded-xl p-2 shadow-xl transition-colors ${isTurn ? 'border-yellow-400 ring-4 ring-yellow-400/20' :
                          isWinner ? 'border-emerald-400 ring-4 ring-emerald-400/20' :
                            player ? 'border-slate-700' : 'border-dashed border-slate-800'
                        }`}
                      onClick={() => !player && !myPlayer && handleSeatClick(seatIndex)}
                    >
                      {/* Avatar/Icon */}
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                        <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center overflow-hidden ${player ? 'bg-slate-800 border-slate-600' : 'bg-slate-900/50 border-slate-800'
                          }`}>
                          {player ? (
                            <div className="text-lg font-bold text-white bg-gradient-to-br from-indigo-500 to-purple-600 w-full h-full flex items-center justify-center">
                              {player.nickname.substring(0, 1).toUpperCase()}
                            </div>
                          ) : (
                            <Users className="w-5 h-5 text-slate-600" />
                          )}
                        </div>
                      </div>

                      <div className="mt-5 text-center">
                        {player ? (
                          <>
                            <div className="text-xs font-bold text-white truncate px-1">
                              {player.nickname}
                            </div>
                            <div className="text-xs font-mono text-emerald-400 mt-0.5">
                              {player.chips.toLocaleString()}
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-slate-500 py-2 cursor-pointer">
                            Sit Here
                          </div>
                        )}
                      </div>

                      {/* Status Badges */}
                      {player && (
                        <div className="absolute -right-2 -top-2 flex flex-col gap-1">
                          {player.position === 'dealer' && (
                            <div className="w-5 h-5 rounded-full bg-white text-black font-bold text-[10px] flex items-center justify-center border border-slate-300 shadow-sm">D</div>
                          )}
                          {player.position === 'small_blind' && (
                            <div className="w-5 h-5 rounded-full bg-indigo-500 text-white font-bold text-[10px] flex items-center justify-center shadow-sm">SB</div>
                          )}
                          {player.position === 'big_blind' && (
                            <div className="w-5 h-5 rounded-full bg-purple-500 text-white font-bold text-[10px] flex items-center justify-center shadow-sm">BB</div>
                          )}
                        </div>
                      )}
                    </motion.div>

                    {/* Cards */}
                    {player && player.isActive && (
                      <div className="absolute top-12 left-1/2 -translate-x-1/2 flex -space-x-4 pt-4 filter drop-shadow-xl hover:-space-x-2 transition-all">
                        {/* Show cards if it's me or showdown */}
                        {(isMySeat || room.status === 'finished') ? (
                          player.holeCards?.map((card, i) => (
                            <motion.div
                              key={i}
                              initial={{ y: -10, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: i * 0.1 }}
                            >
                              <PokerCard card={card} size="md" />
                            </motion.div>
                          ))
                        ) : (
                          <>
                            <PokerCard hidden size="md" />
                            <PokerCard hidden size="md" />
                          </>
                        )}
                      </div>
                    )}

                    {/* Current Bet Bubble */}
                    {player && player.currentBet > 0 && (
                      <div className="absolute -bottom-8 bg-black/80 text-yellow-400 text-xs px-2 py-1 rounded-full border border-yellow-500/30 font-mono">
                        {player.currentBet.toLocaleString()}
                      </div>
                    )}

                    {/* Winner Badge */}
                    {isWinner && (
                      <div className="absolute -top-12 animate-bounce bg-yellow-400 text-black font-bold text-xs px-2 py-1 rounded shadow-lg z-30">
                        WINNER!
                      </div>
                    )}

                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Action Controls (Bottom Bar) */}
        <AnimatePresence>
          {isMyTurn && (
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent pb-8 pt-12 px-4"
            >
              <div className="container mx-auto max-w-2xl">
                <div className="flex items-end justify-center gap-4">

                  {/* Fold */}
                  <Button
                    onClick={() => handleAction('fold')}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-200 h-14 px-8 rounded-full font-bold text-lg border-b-4 border-slate-900 active:border-b-0 active:translate-y-1 transition-all"
                  >
                    Fold
                  </Button>

                  {/* Check / Call */}
                  <Button
                    onClick={() => handleAction(toCall > 0 ? 'call' : 'check')}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white h-14 px-10 rounded-full font-bold text-lg border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1 transition-all min-w-[140px]"
                  >
                    {toCall > 0 ? `Call ${toCall}` : 'Check'}
                  </Button>

                  {/* Raise */}
                  <div className="flex flex-col items-center gap-2">
                    {canRaise && (
                      <div className="bg-black/80 rounded-lg p-2 mb-2 flex flex-col items-center w-48">
                        <span className="text-xs text-slate-400 mb-1">Raise Amount: {Math.max(toCall + minRaise, raiseAmount)}</span>
                        <Slider
                          value={[raiseAmount]}
                          onValueChange={(vals) => setRaiseAmount(vals[0])}
                          max={myPlayer.chips}
                          min={toCall + minRaise}
                          step={room.bigBlind}
                          className="w-full"
                        />
                      </div>
                    )}
                    <Button
                      onClick={() => handleAction('raise', Math.max(toCall + minRaise, raiseAmount))}
                      disabled={!canRaise}
                      className="bg-yellow-600 hover:bg-yellow-500 text-white h-14 px-8 rounded-full font-bold text-lg border-b-4 border-yellow-800 active:border-b-0 active:translate-y-1 transition-all"
                    >
                      Raise
                    </Button>
                  </div>

                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected Seat Modal */}
        {selectedSeat !== null && !myPlayer && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
            <Card className="bg-[#1a1b1e] border-slate-700 p-6 max-w-sm w-full">
              <h3 className="text-xl font-bold text-white mb-4">Join Seat {selectedSeat + 1}?</h3>
              <p className="text-slate-400 mb-6 text-sm">
                Buy-in: 1,000 Chips
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={handleJoinSeat}
                  disabled={joining}
                  className="flex-1 bg-red-600 hover:bg-red-500"
                >
                  {joining ? <Loader2 className="animate-spin" /> : 'Join'}
                </Button>
                <Button
                  onClick={() => setSelectedSeat(null)}
                  variant="ghost"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </Card>
          </div>
        )}

      </main>
    </div>
  )
}
