'use client'

import React, { useEffect, useRef } from 'react'
import * as Phaser from 'phaser'

interface LottoGameProps {
  onLoadingProgress?: (progress: number) => void
}

interface Racer {
  sprite: Phaser.Physics.Arcade.Sprite
  particles: Phaser.GameObjects.Particles.ParticleEmitter
  number: number
  name: string
  color: number
  finished: boolean
  nameText: Phaser.GameObjects.Text
  laneOffset: number
  basePower: number
  originalBasePower: number // 원래 속도 저장
  obstacleSlowdownTimer: number // 장애물 충돌 후 회복 타이머 (ms)
}

class SpaceRaceScene extends Phaser.Scene {
  private progressCallback?: (progress: number) => void
  private racers: Racer[] = []
  private finishOrder: number[] = []
  private isRacing: boolean = false
  private trackPath?: Phaser.Curves.Path
  private restartButtonShown: boolean = false
  private rankTexts: Phaser.GameObjects.Text[] = []

  private racerCount: number = 8
  private racerNames: string[] = []

  private WORLD_HEIGHT = 12000
  private WORLD_WIDTH = 800
  private obstacleGroup?: Phaser.Physics.Arcade.StaticGroup

  constructor() {
    super('SpaceRaceScene')
  }

  init(data: any) {
    this.progressCallback = data.onLoadingProgress
    if (this.progressCallback) this.progressCallback(10)
  }

  preload() {
    // SVG 로드 시도 (실패해도 Graphics로 대체)
    this.load.svg('ship-asset', 'https://raw.githubusercontent.com/runarberg/space-invaders/master/img/player.svg')
      .on('filecomplete', () => {
        if (this.progressCallback) this.progressCallback(50)
      })
      .on('loaderror', () => {
        if (this.progressCallback) this.progressCallback(50)
      })

    if (this.progressCallback) this.progressCallback(50)
  }

  create() {
    if (this.progressCallback) this.progressCallback(70)

    // 우주선 텍스처 생성 (SVG 실패 시 대체)
    if (!this.textures.exists('ship-asset')) {
      const shipG = this.make.graphics({ x: 0, y: 0 })
      // 우주선 본체 (하단)
      shipG.fillStyle(0x4a90e2, 1)
      shipG.beginPath()
      shipG.moveTo(16, 30)
      shipG.lineTo(10, 28)
      shipG.lineTo(8, 24)
      shipG.lineTo(6, 20)
      shipG.lineTo(4, 16)
      shipG.lineTo(0, 12)
      shipG.lineTo(0, 8)
      shipG.lineTo(4, 4)
      shipG.lineTo(8, 2)
      shipG.lineTo(12, 0)
      shipG.lineTo(20, 0)
      shipG.lineTo(24, 2)
      shipG.lineTo(28, 4)
      shipG.lineTo(32, 8)
      shipG.lineTo(32, 12)
      shipG.lineTo(28, 16)
      shipG.lineTo(26, 20)
      shipG.lineTo(24, 24)
      shipG.lineTo(22, 28)
      shipG.lineTo(16, 30)
      shipG.closePath()
      shipG.fillPath()

      // 우주선 상단 (캐노피)
      shipG.fillStyle(0x00f2ff, 0.8)
      shipG.beginPath()
      shipG.moveTo(12, 6)
      shipG.lineTo(16, 2)
      shipG.lineTo(20, 6)
      shipG.lineTo(18, 10)
      shipG.lineTo(14, 10)
      shipG.closePath()
      shipG.fillPath()

      // 엔진 빛
      shipG.fillStyle(0xff9900, 0.9)
      shipG.fillCircle(12, 28, 2)
      shipG.fillCircle(20, 28, 2)
      shipG.fillStyle(0xffff00, 0.7)
      shipG.fillCircle(12, 28, 1)
      shipG.fillCircle(20, 28, 1)

      shipG.generateTexture('ship-asset', 32, 32)
    }

    // 장애물 텍스처 생성 (붉은 운석)
    const obstacleG = this.make.graphics({ x: 0, y: 0 })
    obstacleG.fillStyle(0xff3b3b, 0.9)
    obstacleG.fillCircle(16, 16, 14)
    obstacleG.fillStyle(0x8b1e1e, 0.7)
    obstacleG.fillCircle(10, 12, 5)
    obstacleG.generateTexture('obstacle', 32, 32)

    if (this.progressCallback) this.progressCallback(85)

    this.createBackground()
    this.showSetupPanel()

    if (this.progressCallback) this.progressCallback(100)
  }

  private createBackground() {
    const bg = this.add.graphics()
    bg.fillGradientStyle(0x000205, 0x000205, 0x0a0e1a, 0x0a0e1a, 1)
    bg.fillRect(0, 0, this.WORLD_WIDTH, this.WORLD_HEIGHT)
    bg.setScrollFactor(0)

    for (let i = 0; i < 300; i++) {
      this.add.circle(Phaser.Math.Between(0, this.WORLD_WIDTH), Phaser.Math.Between(0, this.WORLD_HEIGHT), Phaser.Math.Between(0.5, 1.5), 0xffffff, 0.5)
    }
  }

  private showSetupPanel() {
    const { width, height } = this.scale
    const panel = this.add.container(width / 2, height / 2).setDepth(100)
    const bg = this.add.rectangle(0, 0, 500, 500, 0x0a192f, 0.9).setStrokeStyle(3, 0x00f2ff)
    const title = this.add.text(0, -220, 'MISSION CONTROL', { fontSize: '32px', fontStyle: 'bold', color: '#00f2ff' }).setOrigin(0.5)
    const hintText = this.add.text(0, -170, '콤마로 구분, 이름*개수 형식 지원 (예: 짱구,봉미선,철수*5)', { fontSize: '14px', color: '#aaa' }).setOrigin(0.5)

    const inputHtml = `
      <textarea id="racer-names-input" placeholder="짱구,봉미선,철수*5" 
        style="width: 400px; height: 200px; padding: 12px; background: #0a192f; border: 1px solid #00f2ff; color: white; outline: none; resize: none; font-family: inherit; font-size: 14px;"></textarea>
    `
    const domElement = this.add.dom(0, -30).createFromHTML(inputHtml).setOrigin(0.5)

    const startBtn = this.add.rectangle(0, 180, 200, 50, 0x00f2ff, 0.2).setStrokeStyle(2, 0x00f2ff).setInteractive({ useHandCursor: true })
    const startTxt = this.add.text(0, 180, 'LAUNCH', { fontSize: '24px', fontStyle: 'bold', color: '#00f2ff' }).setOrigin(0.5)

    panel.add([bg, title, hintText, domElement, startBtn, startTxt])

    startBtn.on('pointerdown', () => {
      this.racerNames = [];

      const textarea = document.getElementById('racer-names-input') as HTMLTextAreaElement;
      const inputValue = textarea?.value?.trim() || '';

      if (inputValue) {
        // 콤마로 구분하여 이름 추출
        const parts = inputValue.split(',').map(part => part.trim()).filter(part => part.length > 0);

        for (const part of parts) {
          if (this.racerNames.length >= 50) break; // 최대 50개 제한

          // 이름*개수 형식 확인 (예: 짱구*5)
          if (part.includes('*')) {
            const [name, countStr] = part.split('*');
            const nameStr = name.trim();
            const count = parseInt(countStr.trim()) || 1;
            const remainingSlots = 50 - this.racerNames.length;
            const totalCount = Math.min(count, remainingSlots);

            for (let i = 0; i < totalCount; i++) {
              if (this.racerNames.length >= 50) break;
              this.racerNames.push(i === 0 ? nameStr : `${nameStr}-${i + 1}`);
            }
          } else {
            // 일반 이름 (예: 짱구, 봉미선)
            this.racerNames.push(part);
          }
        }
      }

      // 레이서 개수 업데이트 (실제 생성된 이름 개수, 최대 50)
      this.racerCount = Math.max(this.racerNames.length, 1);

      panel.destroy();
      this.initRace();
    })
  }

  private initRace() {
    this.physics.world.setBounds(0, 0, this.WORLD_WIDTH, this.WORLD_HEIGHT)
    this.cameras.main.setBounds(0, 0, this.WORLD_WIDTH, this.WORLD_HEIGHT)

    const centerX = this.WORLD_WIDTH / 2
    this.trackPath = new Phaser.Curves.Path(centerX, 100)
    for (let y = 2000; y < this.WORLD_HEIGHT - 500; y += 2000) {
      this.trackPath.splineTo([
        new Phaser.Math.Vector2(centerX + Phaser.Math.Between(-200, 200), y - 1000),
        new Phaser.Math.Vector2(centerX + Phaser.Math.Between(-200, 200), y)
      ])
    }
    this.trackPath.lineTo(centerX, this.WORLD_HEIGHT - 100)

    // 장애물 그룹 생성
    this.obstacleGroup = this.physics.add.staticGroup()
    for (let i = 0; i < 60; i++) {
      const t = 0.1 + (i * 0.8 / 60)
      const p = this.trackPath.getPoint(t)
      const obs = this.physics.add.staticImage(p.x + Phaser.Math.Between(-180, 180), p.y + Phaser.Math.Between(-100, 100), 'obstacle')
      obs.setAlpha(0.8)
      if (obs.body) {
        (obs.body as Phaser.Physics.Arcade.StaticBody).setCircle(14)
      }
      this.obstacleGroup.add(obs)
    }

    const colors = [0x00f2ff, 0xff0066, 0x33ff00, 0xffff00, 0xff9900, 0xcc00ff, 0x00ccff, 0xffffff]
    for (let i = 0; i < this.racerCount; i++) {
      const startP = this.trackPath.getPoint(0)
      const ship = this.physics.add.sprite(startP.x + (i * 40 - (this.racerCount * 20)), startP.y, 'ship-asset')
      ship.setDisplaySize(30, 30).setTint(colors[i % colors.length]).setDrag(0.992)

      const emitter = this.add.particles(0, 0, 'ship-asset', {
        follow: ship, scale: { start: 0.2, end: 0 }, alpha: { start: 0.4, end: 0 },
        tint: colors[i % colors.length], lifespan: 400, frequency: 50, blendMode: 'ADD'
      })

      const nameText = this.add.text(ship.x, ship.y - 35, this.racerNames[i], { fontSize: '12px', color: '#fff' }).setOrigin(0.5).setStroke('#000', 4)

      const basePower = Phaser.Math.Between(110, 160) * 0.8 // ✅ 스피드 20% 감소
      const racer: Racer = {
        sprite: ship, particles: emitter, number: i + 1, name: this.racerNames[i],
        color: colors[i % colors.length], finished: false, nameText,
        laneOffset: (i - (this.racerCount / 2)) * 42,
        basePower: basePower, originalBasePower: basePower, obstacleSlowdownTimer: 0
      }

      this.physics.add.overlap(ship, this.obstacleGroup, (s, o) => this.hitObstacle(racer, o as any))
      this.racers.push(racer)
    }
    this.isRacing = true
  }

  private hitObstacle(racer: Racer, obstacle: Phaser.GameObjects.GameObject) {
    obstacle.destroy() // 장애물 파괴 연출

        const body = racer.sprite.body as Phaser.Physics.Arcade.Body
        if (body) {
          // ✅ 속도 -60% 감소 (40% 속도로) - 즉시 적용
          body.setVelocityY(body.velocity.y * 0.4)
          body.setVelocityX(body.velocity.x * 0.4)
        }
    
        // ✅ 속도 -60% 감소 (40% 속도로) 및 회복 타이머 가동
        racer.basePower = racer.originalBasePower * 0.4
        racer.obstacleSlowdownTimer = 3000 // 3초간 회복 (40% -> 100%로)

    // 충돌 시각 효과 (붉은색 점멸)
    this.tweens.add({
      targets: racer.sprite,
      tint: 0xff0000,
      duration: 100,
      yoyo: true,
      repeat: 2,
      onComplete: () => racer.sprite.setTint(racer.color)
    })
  }

  update(time: number, delta: number) {
    if (!this.isRacing) return

    let leader: any = null
    let maxProgress = -1

    this.racers.forEach(r => {
      if (r.finished) return

      // ✅ 점진적 속도 회복 로직 (40%에서 원래 속도로)
      if (r.obstacleSlowdownTimer > 0) {
        r.obstacleSlowdownTimer -= delta
        const progress = 1 - (r.obstacleSlowdownTimer / 3000)
        r.basePower = r.originalBasePower * (0.4 + (0.6 * Phaser.Math.Clamp(progress, 0, 1)))
      }

      r.nameText.setPosition(r.sprite.x, r.sprite.y - 35)
      r.sprite.setAccelerationY(r.basePower + Phaser.Math.Between(-10, 20))

      const t = Phaser.Math.Clamp(r.sprite.y / this.WORLD_HEIGHT, 0, 1)
      const pathP = this.trackPath!.getPoint(t)
      const targetX = pathP.x + r.laneOffset + Math.sin(time * 0.001) * 20
      r.sprite.setVelocityX((targetX - r.sprite.x) * 1.2)
      r.sprite.rotation = Math.atan2(r.sprite.body!.velocity.y, r.sprite.body!.velocity.x) - Math.PI / 2

      if (r.sprite.y > maxProgress) {
        maxProgress = r.sprite.y
        leader = r.sprite
      }

      if (r.sprite.y > this.WORLD_HEIGHT - 150) {
        r.finished = true
        r.sprite.setAcceleration(0, 0).setVelocity(0, 0).setAlpha(0.3)
        this.finishOrder.push(r.number)
        this.showRank(r.name, this.finishOrder.length, r.color)
      }
    })

    if (leader) this.cameras.main.startFollow(leader, true, 0.04, 0.04, 0, -250)
  }

  private showRank(name: string, rank: number, color: number) {
    const yPos = 50 + (rank * 35)
    const rankText = this.add.text(20, yPos, `${rank}st: ${name}`, { fontSize: '20px', color: '#fff', fontStyle: 'bold' })
      .setScrollFactor(0).setStroke('#000', 4).setTint(color)
    this.rankTexts.push(rankText)

    if (rank === this.racerCount && !this.restartButtonShown) {
      this.restartButtonShown = true
      const resetBtn = this.add.rectangle(this.scale.width / 2, this.scale.height - 100, 250, 60, 0x00f2ff, 0.2)
        .setStrokeStyle(3, 0x00f2ff)
        .setInteractive({ useHandCursor: true })
        .setScrollFactor(0)
        .setDepth(200)
      const resetTxt = this.add.text(this.scale.width / 2, this.scale.height - 100, 'RESTART', {
        fontSize: '32px', fontStyle: 'bold', color: '#00f2ff'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(200)
      resetBtn.on('pointerdown', () => this.resetGame())
    }
  }

  private resetGame() {
    // 모든 레이서 객체 제거
    this.racers.forEach(racer => {
      if (racer.sprite) racer.sprite.destroy()
      if (racer.particles) racer.particles.destroy()
      if (racer.nameText) racer.nameText.destroy()
    })
    this.racers = []

    // 장애물 그룹 제거
    if (this.obstacleGroup) {
      this.obstacleGroup.clear(true, true)
      this.obstacleGroup = undefined
    }

    // 랭킹 텍스트 제거
    this.rankTexts.forEach(text => {
      if (text) text.destroy()
    })
    this.rankTexts = []

    // 트랙 경로 초기화
    this.trackPath = undefined

    // 게임 상태 초기화
    this.isRacing = false
    this.finishOrder = []
    this.restartButtonShown = false
    this.racerCount = 8
    this.racerNames = []

    // 카메라 리셋
    this.cameras.main.setScroll(0, 0)
    this.cameras.main.stopFollow()

    // setup 패널 다시 표시
    this.showSetupPanel()
  }
}

export default function LottoGame({ onLoadingProgress }: LottoGameProps) {
  const gameRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!gameRef.current) return
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 600,
      height: 900,
      parent: gameRef.current,
      dom: { createContainer: true },
      backgroundColor: '#000',
      physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },
      scene: SpaceRaceScene,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
    }
    const game = new Phaser.Game(config)
    game.scene.start('SpaceRaceScene', { onLoadingProgress })
    return () => game.destroy(true)
  }, [onLoadingProgress])
  return <div ref={gameRef} className="w-full h-screen bg-black" />
}