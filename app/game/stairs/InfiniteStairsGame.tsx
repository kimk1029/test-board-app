'use client'

import React, { useEffect, useRef } from 'react'
import * as Phaser from 'phaser'
import { Button } from '@/components/ui/button'

class InfiniteStairsScene extends Phaser.Scene {
    // Constants
    private readonly STEP_WIDTH = 80
    private readonly STEP_HEIGHT = 60 // Reverted to original spacing
    private readonly PLAYER_SPEED = 80
    private readonly MAX_TIME = 100
    private readonly TIME_DRAIN_RATE = 0.2
    private readonly TIME_REFILL_BONUS = 8
    
    // Game State
    private score: number = 0
    private steps: Phaser.GameObjects.Container[] = []
    private stepData: ('left' | 'right')[] = []
    private player!: Phaser.GameObjects.Container
    private playerDirection: 'left' | 'right' = 'right'
    private currentStepIndex: number = 0
    private isMoving: boolean = false
    private timerValue: number = 100
    private isGameOver: boolean = false
    
    // UI
    private scoreText!: Phaser.GameObjects.Text
    private timerBar!: Phaser.GameObjects.Graphics
    private gameOverContainer!: Phaser.GameObjects.Container
    private startPrompt!: Phaser.GameObjects.Text
    private keyGuide!: Phaser.GameObjects.Text
    
    // Inputs
    private keyZ!: Phaser.Input.Keyboard.Key
    private keyX!: Phaser.Input.Keyboard.Key
    private keyR!: Phaser.Input.Keyboard.Key

    constructor() {
        super('InfiniteStairsScene')
    }

    create() {
        this.updateProgress(20)
        this.createBackground()
        this.updateProgress(40)
        this.createAnimations()
        this.updateProgress(60)
        
        // Initial Setup
        this.setupInput()
        this.createUI()
        
        this.initGame()
        this.updateProgress(80)
        
        // Camera
        this.cameras.main.setZoom(1)
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1, 0, 200)
        
        // Resize handler
        this.scale.on('resize', this.resize, this)
        this.resize({ width: this.scale.width, height: this.scale.height })
        
        this.updateProgress(100)
    }

    private updateProgress(val: number) {
        const onProgress = this.registry.get('onLoadingProgress')
        if (onProgress) onProgress(val)
    }

    private createBackground() {
        // Space/Cyberpunk Background
        const graphics = this.add.graphics()
        graphics.fillGradientStyle(0x0f172a, 0x0f172a, 0x334155, 0x334155, 1)
        graphics.fillRect(0, 0, 2000, 2000)
        graphics.setScrollFactor(0)
        graphics.setDepth(-100)
        
        // Stars
        for (let i = 0; i < 100; i++) {
            const x = Phaser.Math.Between(0, this.scale.width)
            const y = Phaser.Math.Between(0, this.scale.height)
            const size = Phaser.Math.Between(1, 3)
            const star = this.add.circle(x, y, size, 0xffffff, Phaser.Math.FloatBetween(0.3, 0.8))
            star.setScrollFactor(0.05) // Parallax
            star.setDepth(-90)
        }
    }

    private createAnimations() {
        // 1. Step Texture (Isometric-ish Block)
        const stepG = this.make.graphics({ x: 0, y: 0 })
        const w = 80 // Reverted width
        const h = 20 // Keep reduced vertical width (thin steps)
        const d = 20 // Reverted depth
        
        // Top Face
        stepG.fillStyle(0x06b6d4) 
        stepG.fillRect(0, 0, w, h)
        stepG.lineStyle(2, 0xa5f3fc)
        stepG.strokeRect(0, 0, w, h)
        
        // Front Face
        stepG.fillStyle(0x0891b2) 
        stepG.fillRect(0, h, w, d)
        stepG.lineStyle(2, 0x0e7490)
        stepG.strokeRect(0, h, w, d)
        
        // Glow
        stepG.lineStyle(4, 0x22d3ee, 0.3)
        stepG.strokeRect(-2, -2, w+4, h+d+4)

        stepG.generateTexture('step', w, h + d)
        
        // 2. Player Texture (Astronaut Side Profile)
        // Original Size (60x90)
        const playerG = this.make.graphics({ x: 0, y: 0 })
        
        // Shadow
        playerG.fillStyle(0x000000, 0.3)
        playerG.fillEllipse(30, 75, 30, 8)
        
        // Backpack (Left side)
        playerG.fillStyle(0x94a3b8) 
        playerG.fillRoundedRect(10, 35, 15, 25, 4)
        
        // Body (Side view)
        playerG.fillStyle(0xffffff)
        playerG.fillRoundedRect(20, 32, 25, 30, 5) 
        
        // Head (Helmet Side View)
        playerG.fillStyle(0xf1f5f9)
        playerG.fillCircle(35, 22, 16) 
        
        // Visor (Right side)
        playerG.fillStyle(0x3b82f6) 
        playerG.beginPath()
        playerG.arc(35, 22, 12, -Math.PI/4, Math.PI/2, false)
        playerG.lineTo(35, 22)
        playerG.closePath()
        playerG.fillPath()
        
        // Legs (Walking stance)
        playerG.lineStyle(8, 0xffffff)
        playerG.beginPath(); playerG.moveTo(35, 60); playerG.lineTo(45, 80); playerG.strokePath()
        playerG.beginPath(); playerG.moveTo(25, 60); playerG.lineTo(15, 80); playerG.strokePath()
        
        // Arms (Swinging)
        playerG.lineStyle(6, 0xffffff)
        playerG.beginPath(); playerG.moveTo(35, 45); playerG.lineTo(50, 50); playerG.strokePath()

        playerG.generateTexture('player', 60, 90)
    }

    private initGame() {
        this.score = 0
        this.currentStepIndex = 0
        this.playerDirection = 'right'
        this.isMoving = false
        this.timerValue = this.MAX_TIME
        this.isGameOver = false
        
        this.steps.forEach(step => step.destroy())
        this.steps = []
        this.stepData = []
        
        if (this.player) this.player.destroy()
        if (this.gameOverContainer) this.gameOverContainer.setVisible(false)
        if (this.startPrompt) this.startPrompt.setVisible(false)
        
        this.scene.resume()

        // Create initial steps (Buffer 30)
        this.addStep('right') 
        for (let i = 0; i < 30; i++) {
            this.addStep(Math.random() > 0.5 ? 'right' : 'left')
        }

        this.createPlayer()
        this.updateScoreUI()
        
        // Reset camera
        this.cameras.main.stopFollow()
        this.cameras.main.setScroll(0, this.player.y - 400) 
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1, 0, 200)
    }

    private setupInput() {
        if (this.input.keyboard) {
            this.keyZ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z)
            this.keyX = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X)
            this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R)
        }
    }
    
    private createUI() {
        const cx = this.scale.width / 2
        
        // Timer Bar
        this.add.graphics().setScrollFactor(0).setDepth(2999)
            .fillStyle(0x1e293b, 0.8)
            .fillRoundedRect(cx - 150, 20, 300, 16, 8)
            
        this.timerBar = this.add.graphics().setScrollFactor(0).setDepth(3000)
        
        // Key Guide
        this.keyGuide = this.add.text(cx, 50, 'Z: 오르기  |  X: 방향전환', {
            fontSize: '18px',
            color: '#94a3b8',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5).setScrollFactor(0).setDepth(3000)

        // Score
        this.scoreText = this.add.text(cx, 100, '0', {
            fontSize: '64px',
            color: '#fff',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 4,
            shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 4, fill: true }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(3000)
        
        // Start Prompt
        this.startPrompt = this.add.text(cx, this.scale.height / 2 + 100, 'Press Z or X to Start', {
            fontSize: '24px',
            color: '#fbbf24',
            align: 'center',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5).setScrollFactor(0).setDepth(3000)
        
        // Game Over UI
        this.gameOverContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(4000).setVisible(false)
        const bg = this.add.rectangle(0, 0, 2000, 2000, 0x000000, 0.8)
        const title = this.add.text(0, -60, 'GAME OVER', {
            fontSize: '64px', color: '#ef4444', fontStyle: 'bold', stroke: '#000', strokeThickness: 6
        }).setOrigin(0.5)
        const restartText = this.add.text(0, 60, 'Press R or Tap to Restart', {
            fontSize: '28px', color: '#fff'
        }).setOrigin(0.5)
        this.gameOverContainer.add([bg, title, restartText])
        
        // Touch restart
        bg.setInteractive()
        bg.on('pointerdown', () => { if(this.isGameOver) this.initGame() })
    }
    
    update() {
        if (this.isGameOver) {
            if (Phaser.Input.Keyboard.JustDown(this.keyR)) {
                this.initGame()
            }
            return
        }
        
        this.handleInput()
        this.updateTimer()
    }
    
    private updateTimer() {
        if (this.score === 0) return 
        
        const drain = this.TIME_DRAIN_RATE + (this.score * 0.0005)
        this.timerValue -= drain
        
        if (this.timerValue <= 0) {
            this.triggerGameOver('time_out')
        }
        
        this.timerBar.clear()
        const color = this.timerValue > 30 ? 0x22c55e : 0xef4444
        const width = (Math.max(0, this.timerValue) / this.MAX_TIME) * 296
        this.timerBar.fillStyle(color)
        this.timerBar.fillRoundedRect(this.scale.width / 2 - 148, 22, width, 12, 6)
    }
    
    private handleInput() {
        if (this.isMoving) return

        let action: 'climb' | 'turn' | null = null

        if (Phaser.Input.Keyboard.JustDown(this.keyZ)) action = 'climb'
        else if (Phaser.Input.Keyboard.JustDown(this.keyX)) action = 'turn'
        
        if (action) this.processAction(action)
    }

    public handleMobileInput(action: 'climb' | 'turn') {
        if (this.isGameOver) {
            this.initGame()
            return
        }
        if (this.isMoving) return
        this.processAction(action)
    }
    
    private processAction(action: 'climb' | 'turn') {
        if (this.startPrompt.visible) this.startPrompt.setVisible(false)

        const nextStepDir = this.stepData[this.currentStepIndex + 1]
        
        if (action === 'climb') {
            if (this.playerDirection === nextStepDir) {
                this.movePlayer()
            } else {
                this.failMove()
            }
        } else if (action === 'turn') {
            if (this.playerDirection !== nextStepDir) {
                this.playerDirection = nextStepDir
                const sprite = this.player.getAt(0) as Phaser.GameObjects.Image
                if (sprite) sprite.setFlipX(this.playerDirection === 'left')
                this.movePlayer()
            } else {
                this.failMove()
            }
        }
    }
    
    private movePlayer() {
        this.isMoving = true
        this.currentStepIndex++
        this.score++
        this.updateScoreUI()
        
        this.timerValue = Math.min(this.MAX_TIME, this.timerValue + this.TIME_REFILL_BONUS)
        
        const nextStep = this.steps[this.currentStepIndex]
        const targetY = nextStep.y - 50 // Adjusted to sit on thin step (-50 for h=20)
        
        this.tweens.add({
            targets: this.player,
            x: nextStep.x,
            y: targetY,
            duration: this.PLAYER_SPEED * 0.8,
            ease: 'Power1',
            onComplete: () => {
                this.isMoving = false
                this.addStep(Math.random() > 0.5 ? 'right' : 'left')
                
                if (this.steps.length > 40) {
                    const oldStep = this.steps.shift()
                    if (oldStep) oldStep.destroy()
                    this.stepData.shift()
                    this.currentStepIndex--
                }
            }
        })
    }
    
    private failMove() {
        this.isMoving = true
        this.isGameOver = true
        this.triggerGameOver('fall') 
        
        this.tweens.add({
            targets: this.player,
            y: this.player.y + 300,
            alpha: 0,
            angle: 180,
            duration: 600
        })
    }
    
    private triggerGameOver(reason: string) {
        this.isGameOver = true
        this.gameOverContainer.setVisible(true)
        this.saveScore(this.score)
    }

    private async saveScore(score: number) {
        if (score <= 0) return
        
        const token = localStorage.getItem('token')
        if (!token) return // No save for guests

        try {
            await fetch('/api/game/score', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    gameType: 'stairs',
                    score: score
                })
            })
        } catch (error) {
            console.error('Score save failed', error)
        }
    }
    
    private addStep(direction: 'left' | 'right') {
        let x = 0
        let y = 0
        
        if (this.steps.length > 0) {
            const lastStep = this.steps[this.steps.length - 1]
            y = lastStep.y - this.STEP_HEIGHT
            if (direction === 'right') x = lastStep.x + this.STEP_WIDTH
            else x = lastStep.x - this.STEP_WIDTH
        } else {
            x = 0
            y = 0
        }
        
        const stepSprite = this.add.image(0, 0, 'step')
        const stepContainer = this.add.container(x, y, [stepSprite])
        stepContainer.setDepth(1000 - this.steps.length)
        
        this.steps.push(stepContainer)
        this.stepData.push(direction)
    }
    
    private createPlayer() {
        const startStep = this.steps[0]
        const playerSprite = this.add.image(0, 0, 'player')
        this.player = this.add.container(startStep.x, startStep.y - 50, [playerSprite]) // Adjusted offset
        this.player.setDepth(2000)
    }
    
    private updateScoreUI() {
        this.scoreText.setText(this.score.toString())
    }
    
    private resize(gameSize: { width: number, height: number }) {
        const width = gameSize.width
        const height = gameSize.height
        const cx = width / 2
        
        this.cameras.main.setViewport(0, 0, width, height)
        if (this.scoreText) this.scoreText.setPosition(cx, 100)
        if (this.keyGuide) this.keyGuide.setPosition(cx, 50)
        if (this.startPrompt) this.startPrompt.setPosition(cx, height/2 + 100)
        
        if (this.gameOverContainer) {
            const bg = this.gameOverContainer.list[0] as Phaser.GameObjects.Rectangle
            if(bg) { bg.setPosition(cx, height/2); bg.setSize(width*2, height*2) }
            const title = this.gameOverContainer.list[1] as Phaser.GameObjects.Text
            if(title) title.setPosition(cx, height/2 - 60)
            const restart = this.gameOverContainer.list[2] as Phaser.GameObjects.Text
            if(restart) restart.setPosition(cx, height/2 + 60)
        }
    }
}

interface InfiniteStairsGameProps {
    onGameOver?: (score: number) => void
    onLoadingProgress?: (progress: number) => void
}

export default function InfiniteStairsGame({ onGameOver, onLoadingProgress }: InfiniteStairsGameProps) {
    const gameRef = useRef<HTMLDivElement>(null)
    const gameInstance = useRef<Phaser.Game | null>(null)
    
    useEffect(() => {
        if (!gameRef.current || gameInstance.current) return
        
        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            scale: {
                mode: Phaser.Scale.RESIZE,
                width: '100%',
                height: '100%',
                autoCenter: Phaser.Scale.NO_CENTER
            },
            parent: gameRef.current,
            backgroundColor: '#0f172a',
            scene: [InfiniteStairsScene],
            physics: { default: 'arcade' }
        }
        
        gameInstance.current = new Phaser.Game(config)
        
        if (onLoadingProgress) {
            gameInstance.current.registry.set('onLoadingProgress', onLoadingProgress)
        }
        
        return () => {
            gameInstance.current?.destroy(true)
            gameInstance.current = null
        }
    }, [])

    useEffect(() => {
        if (gameInstance.current && onLoadingProgress) {
            gameInstance.current.registry.set('onLoadingProgress', onLoadingProgress)
        }
    }, [onLoadingProgress])

    return (
        <div className="relative w-full h-full flex flex-col">
            <div ref={gameRef} className="flex-1 w-full h-full rounded-xl overflow-hidden shadow-2xl border border-white/10" />
            
            {/* Mobile Controls Overlay */}
            <div className="absolute bottom-10 left-0 w-full px-4 sm:px-10 flex justify-between pointer-events-none md:hidden">
                <Button 
                    className="pointer-events-auto w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-blue-600/80 hover:bg-blue-500/90 backdrop-blur text-white text-lg sm:text-xl font-bold border-4 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.5)] active:scale-95 transition-all flex flex-col items-center justify-center gap-1"
                    onPointerDown={() => {
                        const scene = gameInstance.current?.scene.getScene('InfiniteStairsScene') as any
                        if (scene) scene.handleMobileInput('climb')
                    }}
                >
                    <span>오르기</span>
                    <span className="text-xs opacity-70">(Z)</span>
                </Button>
                
                <Button 
                    className="pointer-events-auto w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-pink-600/80 hover:bg-pink-500/90 backdrop-blur text-white text-lg sm:text-xl font-bold border-4 border-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.5)] active:scale-95 transition-all flex flex-col items-center justify-center gap-1"
                    onPointerDown={() => {
                        const scene = gameInstance.current?.scene.getScene('InfiniteStairsScene') as any
                        if (scene) scene.handleMobileInput('turn')
                    }}
                >
                    <span>방향전환</span>
                    <span className="text-xs opacity-70">(X)</span>
                </Button>
            </div>
        </div>
    )
}
