'use client'

import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'

const HoldemGame = dynamic(() => import('../HoldemGame'), { ssr: false })

export default function HoldemRoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string

  return (
    <div className="w-full h-screen bg-black flex flex-col">
      <div className="absolute top-4 left-4 z-10">
        <Button
          variant="outline"
          onClick={() => router.push('/game')}
          className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700"
        >
          나가기
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <HoldemGame roomId={roomId} />
      </div>
    </div>
  )
}
