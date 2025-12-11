'use client'

import React, { useEffect, useRef } from 'react'
import * as Phaser from 'phaser'
import { Button } from '@/components/ui/button'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import Link from 'next/link'

class InfiniteStairsScene extends Phaser.Scene {
    // Constants
    private readonly STEP_WIDTH = 80
    private readonly STEP_HEIGHT = 60 // Increased for better visual
    private readonly PLAYER_SPEED = 80
    private readonly MAX_TIME = 100
    private readonly TIME_DRAIN_RATE = 0.3 // Increased difficulty slightly
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
    
    // Inputs
    private keyZ!: Phaser.Input.Keyboard.Key
    private keyX!: Phaser.Input.Keyboard.Key
    private keyR!: Phaser.Input.Keyboard.Key

    constructor() {
        super('InfiniteStairsScene')
    }

    create() {
        this.createBackground()
        this.createAnimations()
        
        // Initial Setup
        this.setupInput()
        this.createUI()
        
        this.initGame()
        
        // Camera
        this.cameras.main.setZoom(0.8)
        this.cameras.main.startFollow(this.player, false, 0.1, 0.1, 0, 200)
        
        // Resize handler
        this.scale.on('resize', this.resize, this)
        this.resize({ width: this.scale.width, height: this.scale.height })
    }

    private createBackground() {
        // Gradient Background
        const graphics = this.add.graphics()
        graphics.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e293b, 0x1e293b, 1)
        graphics.fillRect(0, 0, 2000, 4000) // Large enough coverage
        graphics.setScrollFactor(0)
        graphics.setDepth(-100)
        
        // Cityscape silhouette or grid? Let's use a cyberpunk grid
        const grid = this.add.grid(0, 0, 2000, 4000, 100, 100, 0x000000, 0, 0x4ade80, 0.1)
        grid.setScrollFactor(0.1) // Parallax
        grid.setDepth(-90)
    }

    private createAnimations() {
        // Generate textures for Player and Steps
        
        // 1. Step Texture (Neon Block)
        const stepG = this.make.graphics({ x: 0, y: 0 })
        // Top face
        stepG.fillStyle(0x3b82f6) // Blue top
        stepG.fillRect(0, 0, 80, 40)
        stepG.lineStyle(2, 0x60a5fa)
        stepG.strokeRect(0, 0, 80, 40)
        
        // Side face (Front)
        stepG.fillStyle(0x1d4ed8) // Darker blue side
        stepG.fillRect(0, 40, 80, 20)
        stepG.lineStyle(2, 0x2563eb)
        stepG.strokeRect(0, 40, 80, 20)
        
        stepG.generateTexture('step', 80, 60)
        
        // 2. Player Texture (Robot)
        // Idle/Run frame
        const playerG = this.make.graphics({ x: 0, y: 0 })
        
        // Glow
        playerG.fillStyle(0xffff00, 0.3)
        playerG.fillCircle(30, 30, 25)
        
        // Body
        playerG.fillStyle(0xfacc15) // Yellow
        playerG.fillCircle(30, 20, 10) // Head
        playerG.fillRect(20, 30, 20, 25) // Torso
        
        // Limbs (Simple)
        playerG.lineStyle(4, 0xfacc15)
        playerG.beginPath()
        playerG.moveTo(30, 40)
        playerG.lineTo(15, 50) // Arm L
        playerG.moveTo(30, 40)
        playerG.lineTo(45, 50) // Arm R
        playerG.moveTo(25, 55)
        playerG.lineTo(20, 70) // Leg L
        playerG.moveTo(35, 55)
        playerG.lineTo(40, 70) // Leg R
        playerG.strokePath()
        
        playerG.generateTexture('player', 60, 80)
    }

    private initGame() {
        this.score = 0
        this.currentStepIndex = 0
        this.playerDirection = 'right'
        this.isMoving = false
        this.timerValue = this.MAX_TIME
        this.isGameOver = false
        
        // Clean up old steps
        this.steps.forEach(step => step.destroy())
        this.steps = []
        this.stepData = []
        
        if (this.player) this.player.destroy()
        if (this.gameOverContainer) this.gameOverContainer.setVisible(false)
        if (this.startPrompt) this.startPrompt.setVisible(true)
        
        this.scene.resume()

        // Create initial steps
        this.addStep('right') // First step base
        for (let i = 0; i < 20; i++) {
            this.addStep(Math.random() > 0.5 ? 'right' : 'left')
        }

        this.createPlayer()
        this.updateScoreUI()
    }

    private setupInput() {
        if (this.input.keyboard) {
            this.keyZ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z)
            this.keyX = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X)
            this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R)
        }
        
        // Touch/Mouse input for Mobile
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.isGameOver) return

            // Simple screen split: Left side = Climb(Z), Right side = Turn(X)
            // Or better: Button zones.
            // Let's implement button zones in createUI or just use screen halves
            if (pointer.x < this.scale.width / 2) {
                // Left side: Turn/Switch (Like 'X' in prompt description "Z(O) / X(Turn)")?
                // User said: Z (O) / X (Turn).
                // Usually Left button = Change Dir, Right button = Climb.
                // Let's stick to key mapping logic.
                
                // Let's assume Left Click = Climb (Z), Right Click = Turn (X) ?
                // No, standard mobile stair games:
                // Button 1 (Left): Change Direction
                // Button 2 (Right): Climb
                // Let's use visual buttons for clarity.
            }
        })
    }
    
    private createUI() {
        // Score
        this.scoreText = this.add.text(this.scale.width / 2, 80, '0', {
            fontSize: '64px',
            color: '#fff',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100)
        
        // Timer Bar Background
        this.add.graphics().setScrollFactor(0).setDepth(99)
            .fillStyle(0x333333, 0.8)
            .fillRoundedRect(this.scale.width / 2 - 150, 40, 300, 20, 10)
            
        // Timer Bar
        this.timerBar = this.add.graphics().setScrollFactor(0).setDepth(100)
        
        // Start Prompt
        this.startPrompt = this.add.text(this.scale.width / 2, this.scale.height / 2 + 100, 'Press Z to Climb\nPress X to Turn', {
            fontSize: '24px',
            color: '#fbbf24',
            align: 'center',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100)
        
        // Game Over UI
        this.gameOverContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(200).setVisible(false)
        
        const bg = this.add.rectangle(this.scale.width/2, this.scale.height/2, this.scale.width, this.scale.height, 0x000000, 0.8)
        
        const title = this.add.text(this.scale.width/2, this.scale.height/2 - 50, 'GAME OVER', {
            fontSize: '64px',
            color: '#ef4444',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5)
        
        const restartText = this.add.text(this.scale.width/2, this.scale.height/2 + 50, 'Press R to Restart', {
            fontSize: '32px',
            color: '#fff'
        }).setOrigin(0.5)
        
        this.gameOverContainer.add([bg, title, restartText])
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
        if (this.currentStepIndex === 0 && this.timerValue === this.MAX_TIME) return
        
        // Drain faster as score increases?
        const drain = this.TIME_DRAIN_RATE + (this.score * 0.001)
        this.timerValue -= drain
        
        if (this.timerValue <= 0) {
            this.triggerGameOver('time_out')
        }
        
        this.timerBar.clear()
        const color = this.timerValue > 30 ? 0x4ade80 : 0xef4444
        const width = (Math.max(0, this.timerValue) / this.MAX_TIME) * 296
        this.timerBar.fillStyle(color)
        this.timerBar.fillRoundedRect(this.scale.width / 2 - 148, 42, width, 16, 8)
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
        // Start game on first input
        if (this.currentStepIndex === 0 && this.startPrompt.visible) {
            this.startPrompt.setVisible(false)
        }

        const nextStepDir = this.stepData[this.currentStepIndex + 1]
        
        if (action === 'climb') {
            // Must match direction
            if (this.playerDirection === nextStepDir) {
                this.movePlayer()
            } else {
                this.failMove('wrong_direction')
            }
        } else if (action === 'turn') {
            // Must NOT match direction
            if (this.playerDirection !== nextStepDir) {
                this.playerDirection = nextStepDir
                
                // Flip player visual
                const sprite = this.player.getAt(0) as Phaser.GameObjects.Image
                if (sprite) sprite.setFlipX(this.playerDirection === 'left')
                
                this.movePlayer()
            } else {
                this.failMove('wrong_turn')
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
        const targetY = nextStep.y - 45 // Adjust for player pivot
        
        this.tweens.add({
            targets: this.player,
            x: nextStep.x,
            y: targetY,
            duration: this.PLAYER_SPEED,
            ease: 'Power1',
            onComplete: () => {
                this.isMoving = false
                
                // Generate next step
                this.addStep(Math.random() > 0.5 ? 'right' : 'left')
                
                // Cleanup old steps
                if (this.steps.length > 20) {
                    const oldStep = this.steps.shift()
                    if (oldStep) oldStep.destroy()
                    this.stepData.shift()
                    this.currentStepIndex--
                }
            }
        })
    }
    
    private failMove(reason: string) {
        this.isMoving = true
        this.triggerGameOver(reason)
        
        // Fall animation
        this.tweens.add({
            targets: this.player,
            y: this.player.y + 200,
            alpha: 0,
            angle: 180,
            duration: 500
        })
    }
    
    private triggerGameOver(reason: string) {
        this.isGameOver = true
        // this.scene.pause() // Don't pause so falling anim plays
        this.gameOverContainer.setVisible(true)
        
        // Send score to server? (Maybe later)
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
            // Initial step at center
            x = 0 // Will be centered by camera/container logic? 
            // Actually coordinates are world based.
            x = 0
            y = 0
        }
        
        const stepSprite = this.add.image(0, 0, 'step')
        const stepContainer = this.add.container(x, y, [stepSprite])
        
        // Depth: newer steps behind? No, higher steps should be behind lower steps to look like stacking up?
        // Or newer steps in front?
        // In 2D stairs, usually top steps are "behind" visually if looking up.
        stepContainer.setDepth(1000 - this.steps.length)
        
        this.steps.push(stepContainer)
        this.stepData.push(direction)
    }
    
    private createPlayer() {
        const startStep = this.steps[0]
        const playerSprite = this.add.image(0, 0, 'player')
        
        // Adjust player to sit on step
        this.player = this.add.container(startStep.x, startStep.y - 45, [playerSprite])
        this.player.setDepth(2000)
    }
    
    private updateScoreUI() {
        this.scoreText.setText(this.score.toString())
    }
    
    private resize(gameSize: { width: number, height: number }) {
        const width = gameSize.width
        const height = gameSize.height
        
        this.cameras.main.setViewport(0, 0, width, height)
        if (this.scoreText) this.scoreText.setPosition(width / 2, 80)
        if (this.timerBar) {
            // Repaint graphics if needed or just clear in update
        }
        if (this.startPrompt) this.startPrompt.setPosition(width/2, height/2 + 100)
        
        if (this.gameOverContainer) {
            const bg = this.gameOverContainer.list[0] as Phaser.GameObjects.Rectangle
            if(bg) {
                bg.setPosition(width/2, height/2)
                bg.setSize(width, height)
            }
            const title = this.gameOverContainer.list[1] as Phaser.GameObjects.Text
            if(title) title.setPosition(width/2, height/2 - 50)
            const restart = this.gameOverContainer.list[2] as Phaser.GameObjects.Text
            if(restart) restart.setPosition(width/2, height/2 + 50)
        }
    }
}

// React Component
interface InfiniteStairsGameProps {
    onGameOver?: (score: number) => void
}

export default function InfiniteStairsGame({ onGameOver }: InfiniteStairsGameProps) {
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
        
        return () => {
            gameInstance.current?.destroy(true)
            gameInstance.current = null
        }
    }, [])

    // Mobile Controls
    const handleBtnClick = (action: 'climb' | 'turn') => {
        const scene = gameInstance.current?.scene.getScene('InfiniteStairsScene') as any
        if (scene && !scene.isGameOver) {
             const key = action === 'climb' ? scene.keyZ : scene.keyX
             // Simulate key press logic
             // Ideally we call a public method on scene
             if (action === 'climb') {
                 // Trigger logic
                 const event = { keyCode: Phaser.Input.Keyboard.KeyCodes.Z } as any
                 scene.input.keyboard.emit('keydown-Z', event) // Tricky to simulate exact JustDown
                 
                 // Better: direct method call
                 scene.handleMobileInput(action)
             } else {
                 scene.handleMobileInput(action)
             }
        } else if (scene && scene.isGameOver) {
             scene.initGame()
        }
    }

    return (
        <div className="relative w-full h-full flex flex-col">
            <div ref={gameRef} className="flex-1 w-full h-full rounded-xl overflow-hidden shadow-2xl border border-white/10" />
            
            {/* Mobile Controls Overlay */}
            <div className="absolute bottom-10 left-0 w-full px-10 flex justify-between pointer-events-none md:hidden">
                <Button 
                    className="pointer-events-auto w-32 h-32 rounded-full bg-blue-500/50 hover:bg-blue-500/80 backdrop-blur text-white text-xl font-bold border-4 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.5)] active:scale-95 transition-all"
                    onPointerDown={() => {
                        const scene = gameInstance.current?.scene.getScene('InfiniteStairsScene') as any
                        if (scene) scene.handleMobileInput('climb')
                    }}
                >
                    CLIMB (Z)
                </Button>
                
                <Button 
                    className="pointer-events-auto w-32 h-32 rounded-full bg-pink-500/50 hover:bg-pink-500/80 backdrop-blur text-white text-xl font-bold border-4 border-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.5)] active:scale-95 transition-all"
                    onPointerDown={() => {
                        const scene = gameInstance.current?.scene.getScene('InfiniteStairsScene') as any
                        if (scene) scene.handleMobileInput('turn')
                    }}
                >
                    TURN (X)
                </Button>
            </div>
        </div>
    )
}

