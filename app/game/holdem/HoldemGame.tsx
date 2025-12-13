'use client'

import { useEffect, useRef } from 'react'
import { Game, AUTO, Scale } from 'phaser'
import { HoldemLoadingScene } from './scenes/HoldemLoadingScene'
import { HoldemScene } from './scenes/HoldemScene'

interface HoldemGameProps {
  roomId: string
}

export default function HoldemGame({ roomId }: HoldemGameProps) {
  const gameRef = useRef<Game | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const config: Phaser.Types.Core.GameConfig = {
      type: AUTO,
      parent: 'phaser-holdem-game',
      width: '100%',
      height: '100%',
      scale: {
        mode: Scale.RESIZE, // 창 크기에 맞춰 리사이즈
        autoCenter: Scale.CENTER_BOTH,
      },
      backgroundColor: '#1a1a1a',
      scene: [HoldemLoadingScene, HoldemScene],
      physics: {
        default: 'arcade',
      },
    }

    const game = new Game(config)
    gameRef.current = game

    // 데이터 전달을 위해 registry 사용 또는 start param 사용
    // 여기서는 LoadingScene이 첫 씬이므로 init에서 받을 수 있음.
    // 하지만 Scene Manager가 초기화되기 전일 수 있으므로 약간의 지연이나 registry 설정이 안전할 수 있음.
    // config 생성 시점에 바로 시작되므로, scene start를 수동으로 호출하기보다 config에 데이터를 주입하는 방법은 복잡함.
    // 대신 registry를 사용하거나, 첫 씬에서 init으로 받게끔 처리.
    // Phaser 3.60+ 에서는 scene data passing이 쉬움.

    // 직접 start 호출하여 데이터 전달 (Scene 목록에 등록되어 있어도 start를 명시적으로 호출하면 재시작됨)
    // 하지만 이미 config.scene으로 인해 자동 시작될 수 있음.
    // 안전하게: LoadingScene 내부에서 init으로 받도록 하고, 여기서 registry에 저장.

    game.registry.set('roomId', roomId);
    // LoadingScene의 init에서 this.registry.get('roomId') 또는 start param 사용.
    // 위 코드에서는 init(data)를 사용했으므로 여기서 scene.start를 호출해야 함.

    // 자동 시작을 막거나, 또는 registry만 세팅.
    // HoldemLoadingScene.ts 수정 필요 없이, 여기서 scene.start를 다시 호출해줌.
    setTimeout(() => {
      if (gameRef.current) {
        gameRef.current.scene.start('HoldemLoadingScene', { roomId });
      }
    }, 100);

    return () => {
      game.destroy(true)
    }
  }, [roomId])

  return <div id="phaser-holdem-game" className="w-full h-full flex justify-center items-center" />
}
