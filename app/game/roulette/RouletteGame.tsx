'use client'

import React, { useEffect, useRef } from 'react'
import * as Phaser from 'phaser'

// --- Roulette Data ---
const WHEEL_ORDER = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
]
const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]
const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]

const CHIP_VALUES = [1, 5, 10, 50, 100]

class RouletteScene extends Phaser.Scene {
    private wheelContainer!: Phaser.GameObjects.Container
    private ball!: Phaser.Physics.Arcade.Image
    private walls!: Phaser.Physics.Arcade.StaticGroup
    private centerCollider!: Phaser.Physics.Arcade.Image
    
    private isSpinning: boolean = false
    
    private playerPoints: number = 0
    private pointsText!: Phaser.GameObjects.Text
    
    private currentChipValue: number = 1
    private bets: { [zoneId: string]: number } = {}
    private betChips: Phaser.GameObjects.Container[] = []
    
    private logs: string[] = []
    private logText!: Phaser.GameObjects.Text
    
    private selectedChipIndicator!: Phaser.GameObjects.Arc
    private tableContainer!: Phaser.GameObjects.Container
    private uiContainer!: Phaser.GameObjects.Container
    private helpModal!: Phaser.GameObjects.Container
    
    private resultDisplay!: Phaser.GameObjects.Container
    private resultText!: Phaser.GameObjects.Text
    private resultCircle!: Phaser.GameObjects.Arc
    
    private background!: Phaser.GameObjects.Graphics

    private pendingResultNumber: number | null = null
    private pendingTotalBet: number = 0
    private spinStartTime: number = 0
    private cleanupTimer: NodeJS.Timeout | null = null

    // New: Store bet zones for blinking effect
    private betZones: { [key: string]: Phaser.GameObjects.Rectangle } = {}

    constructor() {
        super('RouletteScene')
    }

    init() {
        this.updateProgress(10)
    }

    preload() {
        // Simulate asset loading or generate heavy textures here if needed
        this.updateProgress(30)
    }

    create() {
        this.updateProgress(50)
        this.createBackground()
        
        this.createWheel()
        this.createBettingBoard()
        this.createUI()
        this.createResultDisplay()
        this.createHelpModal()
        
        this.updateProgress(70)

        // Create 1x1 transparent texture for physics bodies
        const pixelGraphics = this.make.graphics({ x: 0, y: 0 })
        pixelGraphics.fillStyle(0xffffff, 0) // Transparent
        pixelGraphics.fillRect(0, 0, 1, 1)
        pixelGraphics.generateTexture('pixelTexture', 1, 1)

        // Physics Setup
        this.walls = this.physics.add.staticGroup()
        const graphics = this.make.graphics({ x: 0, y: 0 })
        graphics.fillStyle(0xffffff)
        graphics.fillCircle(6, 6, 6)
        graphics.generateTexture('ballTexture', 12, 12)
        
        this.ball = this.physics.add.image(0, 0, 'ballTexture')
        this.ball.setCircle(6)
        this.ball.setBounce(0.7)
        this.ball.setDrag(100)
        this.ball.setVisible(false)
        
        // Center collider (obstacle) - Using physics image instead of adding body to circle
        this.centerCollider = this.physics.add.staticImage(0, 0, 'pixelTexture')
        
        // Set collision body size
        if (this.centerCollider.body) {
            (this.centerCollider.body as Phaser.Physics.Arcade.StaticBody).setCircle(110)
        }
        
        this.physics.add.collider(this.ball, this.centerCollider)

        this.updateProgress(80)
        this.loadUserPoints()
        
        this.scale.on('resize', this.resize, this)
        this.resize({ width: this.scale.width, height: this.scale.height })
    }

    private updateProgress(val: number) {
        const onProgress = this.registry.get('onLoadingProgress')
        if (onProgress) onProgress(val)
    }

    private createBackground() {
        this.background = this.add.graphics()
    }

    private drawBackground(width: number, height: number) {
        this.background.clear()
        this.background.fillGradientStyle(0x1a2a1a, 0x1a2a1a, 0x050505, 0x050505, 1)
        this.background.fillRect(0, 0, width, height)
    }

    update(time: number, delta: number) {
        if (this.isSpinning && this.ball && this.ball.active && this.ball.visible) {
            const body = this.ball.body as Phaser.Physics.Arcade.Body
            const speed = body.velocity.length()
            const elapsed = time - this.spinStartTime
            
            const wheelX = this.wheelContainer.x
            const wheelY = this.wheelContainer.y
            const scale = this.wheelContainer.scale
            const outerRadius = 195 * scale // Slightly less than visual radius (200)
            const ballRadius = 6 * scale

            // Circular Constraint Logic
            const dx = this.ball.x - wheelX
            const dy = this.ball.y - wheelY
            const dist = Math.sqrt(dx*dx + dy*dy)

            if (dist + ballRadius > outerRadius) {
                // Ball hit the outer wall
                const angle = Math.atan2(dy, dx)
                
                // 1. Constrain position
                const constrainDist = outerRadius - ballRadius
                this.ball.setPosition(
                    wheelX + Math.cos(angle) * constrainDist,
                    wheelY + Math.sin(angle) * constrainDist
                )
                
                // 2. Adjust velocity to slide along the wall (tangent)
                // Calculate normal vector (outward)
                const nx = Math.cos(angle)
                const ny = Math.sin(angle)
                
                // Current velocity
                const vx = body.velocity.x
                const vy = body.velocity.y
                
                // Dot product of velocity and normal (radial component of velocity)
                const vDotN = vx * nx + vy * ny
                
                // Remove radial component (make it tangent) and apply slight friction
                const friction = 0.999
                body.velocity.x = (vx - vDotN * nx) * friction
                body.velocity.y = (vy - vDotN * ny) * friction
            }

            // Stop when speed is low enough and minimum time passed
            if (this.pendingResultNumber !== null && speed < 350 * scale && elapsed > 1000) {
                this.finalizeSpin(this.pendingResultNumber)
                this.pendingResultNumber = null
            }
        }
    }
    
    private resize(gameSize: { width: number, height: number }) {
        const width = gameSize.width
        const height = gameSize.height
        
        this.drawBackground(width, height)
        
        let wheelX = 0, wheelY = 0, wheelScale = 1
        
        const isMobile = width < 800 || height > width 
        
        if (isMobile) {
            // Stack Vertically: Wheel -> Board -> UI (All Centered)
            const centerX = width * 0.5
            
            // 1. Wheel
            wheelScale = Math.min(0.7, width / 450)
            const wheelRadius = 200 * wheelScale
            
            // 2. Board
            const boardWidth = 750
            const boardScale = Math.min(1.0, (width - 20) / boardWidth)
            const boardScaledHeight = 320 * boardScale
            
            // 3. UI (Visual width approx 880)
            const uiWidthContent = 880 
            const uiScale = Math.min(0.6, (width - 10) / uiWidthContent)
            const uiHeight = 60 * uiScale
            
            // Calculate Total Height
            const gap = 20
            const totalContentHeight = (wheelRadius * 2) + gap + boardScaledHeight + gap + uiHeight
            
            // Start Y (Center vertically, but ensure top padding)
            let startY = (height - totalContentHeight) / 2
            if (startY < 80) startY = 80
            
            // Position Wheel
            wheelX = centerX
            wheelY = startY + wheelRadius
            this.wheelContainer.setScale(wheelScale)
            this.wheelContainer.setPosition(wheelX, wheelY)
            this.resultDisplay.setScale(wheelScale)
            this.resultDisplay.setPosition(wheelX, wheelY)
            
            // Position Board
            this.tableContainer.setScale(boardScale)
            const boardY = wheelY + wheelRadius + gap
            this.tableContainer.setPosition(centerX - (boardWidth * boardScale) / 2, boardY)
            
            // Position UI (Visual center offset approx 347.5)
            this.uiContainer.setScale(uiScale)
            const uiY = boardY + boardScaledHeight + gap + (25 * uiScale)
            this.uiContainer.setPosition(centerX - (347.5 * uiScale), uiY)

        } else {
            const leftAreaWidthRatio = 0.35 
            
            wheelX = width * (leftAreaWidthRatio / 2)
            wheelY = height * 0.5
            wheelScale = Math.min(1.1, height / 600, (width * leftAreaWidthRatio) / 450)
            
            this.resultDisplay.setScale(wheelScale)
            this.resultDisplay.setPosition(wheelX, wheelY)
            
            const rightAreaStart = width * leftAreaWidthRatio
            const rightAreaWidth = width * (1 - leftAreaWidthRatio)
            const rightCenterX = rightAreaStart + rightAreaWidth * 0.5
            
            const boardWidth = 750
            // Calculate scale to fit width and height reasonably
            const boardScale = Math.min(1.4, (rightAreaWidth - 20) / boardWidth, (height * 0.6) / 300)
            
            this.tableContainer.setScale(boardScale)
            const boardScaledWidth = boardWidth * boardScale
            const boardScaledHeight = 300 * boardScale
            
            const uiWidth = 800
            const uiScale = Math.min(1.1, (rightAreaWidth - 20) / uiWidth)
            this.uiContainer.setScale(uiScale)
            const uiScaledWidth = uiWidth * uiScale
            
            const gap = 30
            const totalContentHeight = boardScaledHeight + gap + (80 * uiScale)
            const startY = (height - totalContentHeight) / 2
            
            this.tableContainer.setPosition(rightCenterX - boardScaledWidth * 0.5, startY)
            
            this.uiContainer.setPosition(rightCenterX - uiScaledWidth * 0.5, startY + boardScaledHeight + gap + 25)
        }
        
        this.wheelContainer.setScale(wheelScale)
        this.wheelContainer.setPosition(wheelX, wheelY)
        
        this.recreatePhysicsBodies(wheelX, wheelY, wheelScale)
        
        if (this.helpModal) this.helpModal.setPosition(width/2, height/2)
    }

    private recreatePhysicsBodies(x: number, y: number, scale: number) {
        // Walls are now handled by update() constraint logic for smooth circular motion
        if (this.walls) this.walls.clear(true, true)
        
        if (this.centerCollider) {
            this.centerCollider.setPosition(x, y)
            this.centerCollider.setScale(scale)
            if (this.centerCollider.body) {
                const centerBody = this.centerCollider.body as Phaser.Physics.Arcade.StaticBody
                centerBody.setCircle(110 * scale) 
                centerBody.updateFromGameObject() 
            }
        }
    }
    
    private createWheel() {
        this.wheelContainer = this.add.container(0, 0)
        const radius = 200
        const innerRadius = 120
        const segmentAngle = 360 / 37
        const wheelBase = this.add.circle(0, 0, radius + 20, 0x5c3a21)
        wheelBase.setStrokeStyle(4, 0x3e2716) 
        this.wheelContainer.add(wheelBase)
        WHEEL_ORDER.forEach((num, index) => {
            const startAngle = Phaser.Math.DegToRad(index * segmentAngle - 90 - (segmentAngle / 2))
            const endAngle = Phaser.Math.DegToRad((index + 1) * segmentAngle - 90 - (segmentAngle / 2))
            let color = 0x000000 
            if (num === 0) color = 0x008000
            else if (RED_NUMBERS.includes(num)) color = 0xd92b2b
            else color = 0x111111
            const graphics = this.add.graphics()
            graphics.fillStyle(color, 1)
            graphics.slice(0, 0, radius, startAngle, endAngle, false)
            graphics.fillPath()
            graphics.lineStyle(1, 0xaaaaaa, 0.5)
            graphics.slice(0, 0, radius, startAngle, endAngle, false)
            graphics.strokePath()
            const midAngle = startAngle + (endAngle - startAngle) / 2
            const textRadius = radius - 20
            const x = Math.cos(midAngle) * textRadius
            const y = Math.sin(midAngle) * textRadius
            const text = this.add.text(x, y, num.toString(), { fontSize: '12px', fontStyle: 'bold', color: '#fff' }).setOrigin(0.5)
            text.setRotation(midAngle + Math.PI / 2)
            this.wheelContainer.add(graphics)
            this.wheelContainer.add(text)
        })
        const centerCircle = this.add.circle(0, 0, innerRadius, 0x1a1a1a)
        centerCircle.setStrokeStyle(4, 0xd4af37)
        this.wheelContainer.add(centerCircle)
    }

    private createBettingBoard() {
        this.tableContainer = this.add.container(0, 0)
        const cellW = 45; const cellH = 40; const gap = 2; const offsetX = 50; const offsetY = 0;
        this.createBetZone('n_0', 0, 0, 45, cellH * 3 + gap * 2, '0', 0x008000)
        for (let i = 1; i <= 36; i++) {
            const col = Math.ceil(i / 3) - 1; const row = 2 - ((i - 1) % 3)
            const x = offsetX + col * (cellW + gap); const y = offsetY + row * (cellH + gap)
            let color = RED_NUMBERS.includes(i) ? 0xd92b2b : 0x222222
            this.createBetZone(`n_${i}`, x, y, cellW, cellH, i.toString(), color)
        }
        const colStartX = offsetX + 12 * (cellW + gap)
        this.createBetZone('col_1', colStartX, offsetY, cellW, cellH, '2:1', 0x111111)
        this.createBetZone('col_2', colStartX, offsetY + cellH + gap, cellW, cellH, '2:1', 0x111111)
        this.createBetZone('col_3', colStartX, offsetY + (cellH + gap) * 2, cellW, cellH, '2:1', 0x111111)
        const dozY = offsetY + (cellH + gap) * 3 + 10; const dozW = (cellW + gap) * 4 - gap
        this.createBetZone('doz_1', offsetX, dozY, dozW, cellH, '1st 12', 0x111111)
        this.createBetZone('doz_2', offsetX + dozW + gap, dozY, dozW, cellH, '2nd 12', 0x111111)
        this.createBetZone('doz_3', offsetX + (dozW + gap) * 2, dozY, dozW, cellH, '3rd 12', 0x111111)
        const bottomY = dozY + cellH + gap; const bottomW = (cellW + gap) * 2 - gap
        this.createBetZone('low', offsetX, bottomY, bottomW, cellH, '1-18', 0x111111)
        this.createBetZone('even', offsetX + bottomW + gap, bottomY, bottomW, cellH, 'EVEN', 0x111111)
        this.createBetZone('red', offsetX + (bottomW + gap) * 2, bottomY, bottomW, cellH, 'RED', 0xd92b2b)
        this.createBetZone('black', offsetX + (bottomW + gap) * 3, bottomY, bottomW, cellH, 'BLACK', 0x222222)
        this.createBetZone('odd', offsetX + (bottomW + gap) * 4, bottomY, bottomW, cellH, 'ODD', 0x111111)
        this.createBetZone('high', offsetX + (bottomW + gap) * 5, bottomY, bottomW, cellH, '19-36', 0x111111)
    }
    private createBetZone(id: string, x: number, y: number, w: number, h: number, text: string, color: number) {
        const zone = this.add.rectangle(x + w/2, y + h/2, w, h, color)
        zone.setStrokeStyle(1, 0x555555); zone.setInteractive({ useHandCursor: true })
        const label = this.add.text(x + w/2, y + h/2, text, { fontSize: '11px', fontStyle: 'bold', color: '#fff' }).setOrigin(0.5)
        this.tableContainer.add(zone); this.tableContainer.add(label)
        this.betZones[id] = zone // Store reference for blinking
        zone.on('pointerover', () => zone.setAlpha(0.8)); zone.on('pointerout', () => zone.setAlpha(1)); zone.on('pointerdown', () => this.placeBet(id, x + w/2, y + h/2))
    }
    private createResultDisplay() {
        this.resultDisplay = this.add.container(0, 0); this.resultDisplay.setAlpha(0)
        this.resultCircle = this.add.circle(0, 0, 80, 0x000000); this.resultCircle.setStrokeStyle(4, 0xffffff)
        this.resultText = this.add.text(0, 0, '', { fontSize: '48px', fontStyle: 'bold', color: '#fff' }).setOrigin(0.5)
        this.resultDisplay.add(this.resultCircle); this.resultDisplay.add(this.resultText)
    }
    private placeBet(zoneId: string, x: number, y: number) {
        if (this.isSpinning) return
        if (this.playerPoints < this.currentChipValue) { this.addLog('포인트가 부족합니다.'); return }
        this.playerPoints -= this.currentChipValue
        this.bets[zoneId] = (this.bets[zoneId] || 0) + this.currentChipValue
        this.updatePointsText()
        const jitterX = (Math.random() - 0.5) * 5; const jitterY = (Math.random() - 0.5) * 5
        const chipKey = this.createChipTexture(this.currentChipValue, 10) 
        const chipContainer = this.add.container(x + jitterX, y + jitterY)
        const chipImg = this.add.sprite(0, 0, chipKey)
        chipContainer.add(chipImg); this.tableContainer.add(chipContainer); this.betChips.push(chipContainer)
    }
    private createChipTexture(amount: number, radius: number = 30) {
        const key = `chip-${amount}-${radius}`; if (this.textures.exists(key)) return key
        const graphics = this.make.graphics({ x: 0, y: 0 })
        let color = 0xffffff; let stripeColor = 0xcccccc; let textColor = '#000000'
        if (amount === 1) { color = 0xffffff; stripeColor = 0xcccccc; textColor = '#000000'; }
        else if (amount === 5) { color = 0xd92b2b; stripeColor = 0xffffff; textColor = '#ffffff'; }
        else if (amount === 10) { color = 0x2b4cd9; stripeColor = 0xffffff; textColor = '#ffffff'; }
        else if (amount === 50) { color = 0x2bd94c; stripeColor = 0xffffff; textColor = '#ffffff'; }
        else if (amount === 100) { color = 0x111111; stripeColor = 0xd9b02b; textColor = '#d9b02b'; }
        graphics.fillStyle(color, 1); graphics.fillCircle(radius, radius, radius)
        graphics.lineStyle(radius > 15 ? 4 : 2, stripeColor, 1); graphics.strokeCircle(radius, radius, radius - (radius > 15 ? 4 : 2))
        graphics.lineStyle(1, 0x000000, 0.2); graphics.strokeCircle(radius, radius, radius)
        graphics.generateTexture(key, radius * 2, radius * 2); return key
    }
    private createUI() {
        this.uiContainer = this.add.container(0, 0)
        const balanceBg = this.add.rectangle(0, 0, 180, 50, 0x000000, 0.8).setStrokeStyle(2, 0xd4af37)
        const balanceLabel = this.add.text(0, -15, 'BALANCE', { fontSize: '10px', color: '#d4af37' }).setOrigin(0.5)
        this.pointsText = this.add.text(0, 5, '0 P', { fontSize: '20px', color: '#4ade80', fontStyle: 'bold' }).setOrigin(0.5)
        this.uiContainer.add([balanceBg, balanceLabel, this.pointsText])
        this.selectedChipIndicator = this.add.circle(0, 0, 34, 0xffff00).setStrokeStyle(3, 0xffff00).setVisible(false)
        this.uiContainer.add(this.selectedChipIndicator)
        const chipStartX = 180; const chipGap = 70
        CHIP_VALUES.forEach((chip, i) => {
            const x = chipStartX + i * chipGap; const y = 0
            const textureKey = this.createChipTexture(chip, 28)
            const chipSprite = this.add.sprite(x, y, textureKey).setInteractive({ useHandCursor: true })
            const textColor = (chip === 100) ? '#d9b02b' : ((chip === 1 || chip === 5 || chip === 10 || chip === 50) ? (chip === 1 ? '#000' : '#fff') : '#fff')
            const chipText = this.add.text(x, y, chip.toString(), { fontSize: '16px', color: textColor, fontStyle: 'bold' }).setOrigin(0.5).setStroke('#000', chip === 100 ? 2 : 0)
            this.uiContainer.add([chipSprite, chipText])
            if (chip === this.currentChipValue) { this.selectedChipIndicator.setPosition(x, y).setVisible(true) }
            chipSprite.on('pointerdown', () => { this.currentChipValue = chip; this.selectedChipIndicator.setPosition(x, y).setVisible(true) })
        })
        const btnStartX = chipStartX + CHIP_VALUES.length * chipGap + 40
        const clearBtn = this.add.rectangle(btnStartX, 0, 90, 40, 0xef4444).setInteractive({ useHandCursor: true })
        clearBtn.setStrokeStyle(2, 0xffffff)
        const clearText = this.add.text(btnStartX, 0, 'CLEAR', { fontSize: '16px', fontStyle: 'bold', color: '#fff' }).setOrigin(0.5)
        clearBtn.on('pointerdown', () => this.clearBets(true))
        const spinBtn = this.add.rectangle(btnStartX + 110, 0, 110, 50, 0xeab308).setInteractive({ useHandCursor: true })
        spinBtn.setStrokeStyle(2, 0xffffff)
        const spinText = this.add.text(btnStartX + 110, 0, 'SPIN', { fontSize: '22px', fontStyle: 'bold', color: '#000' }).setOrigin(0.5)
        spinBtn.on('pointerdown', () => this.spin())
        const infoBtn = this.add.circle(btnStartX + 200, 0, 15, 0x3b82f6).setInteractive({ useHandCursor: true })
        infoBtn.setStrokeStyle(2, 0xffffff)
        const infoText = this.add.text(btnStartX + 200, 0, 'i', { fontSize: '18px', fontStyle: 'bold', color: '#fff' }).setOrigin(0.5)
        infoBtn.on('pointerdown', () => this.toggleHelp())
        this.uiContainer.add([clearBtn, clearText, spinBtn, spinText, infoBtn, infoText])
        this.logText = this.add.text(-100, 50, '', { fontSize: '12px', color: '#aaa' })
        this.uiContainer.add(this.logText)
    }
    private createHelpModal() {
        this.helpModal = this.add.container(0, 0); this.helpModal.setVisible(false); this.helpModal.setDepth(100)
        const bg = this.add.rectangle(0, 0, 400, 300, 0x000000, 0.9); bg.setStrokeStyle(2, 0xd4af37)
        const title = this.add.text(0, -120, 'BETTING PAYOUTS', { fontSize: '24px', fontStyle: 'bold', color: '#d4af37' }).setOrigin(0.5)
        const rules = ['Single Number: 35 to 1', 'Dozen / Column: 2 to 1', 'Red / Black: 1 to 1', 'Even / Odd: 1 to 1', 'Low (1-18) / High (19-36): 1 to 1']
        rules.forEach((rule, i) => { const text = this.add.text(0, -70 + i * 35, rule, { fontSize: '18px', color: '#ffffff' }).setOrigin(0.5); this.helpModal.add(text) })
        const closeText = this.add.text(0, 120, '(Click to Close)', { fontSize: '14px', color: '#888' }).setOrigin(0.5)
        this.helpModal.add([bg, title, closeText])
        bg.setInteractive({ useHandCursor: true }); bg.on('pointerdown', () => this.toggleHelp())
    }
    private toggleHelp() { this.helpModal.setVisible(!this.helpModal.visible) }
    private clearBets(isRefund: boolean = false) {
        if (this.isSpinning) return
        if (isRefund) {
            let refund = 0; Object.values(this.bets).forEach(amount => refund += amount)
            this.playerPoints += refund; this.updatePointsText()
        }
        this.bets = {}; 
        this.betChips.forEach(c => c.destroy()); this.betChips = []
    }
    private updatePointsText() { if (this.pointsText && this.pointsText.active) this.pointsText.setText(this.playerPoints.toLocaleString() + ' P') }
    private addLog(msg: string) { this.logs.push(msg); if (this.logs.length > 3) this.logs.shift(); this.logText.setText(this.logs.join(' | ')) }

    private async spin() {
        if (this.isSpinning) return
        
        // Clear any pending cleanup or animations
        if (this.cleanupTimer) {
            clearTimeout(this.cleanupTimer)
            this.cleanupTimer = null
        }
        this.tweens.killTweensOf(this.ball)
        this.tweens.killTweensOf(this.resultDisplay)
        this.ball.setVisible(false) // Hide temporarily
        this.resultDisplay.setAlpha(0)

        const totalBet = Object.values(this.bets).reduce((a, b) => a + b, 0)
        if (totalBet === 0) { this.addLog('베팅을 해주세요!'); return }

        this.isSpinning = true
        
        const token = localStorage.getItem('token')
        if (token) {
            try {
                const res = await fetch('/api/game/bet', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ action: 'bet', amount: totalBet, gameType: 'roulette' }) })
                if (!res.ok) throw new Error('Bet failed'); const data = await res.json()
                this.playerPoints = data.points; this.updatePointsText()
            } catch (e) { console.error(e); this.isSpinning = false; this.addLog('베팅 처리 실패'); return }
        }
        const randomIndex = Math.floor(Math.random() * 37); const winningNumber = WHEEL_ORDER[randomIndex]
        this.pendingResultNumber = winningNumber; this.pendingTotalBet = totalBet; this.spinStartTime = this.time.now
        this.ball.setVisible(true); this.ball.setVelocity(0,0)
        const wx = this.wheelContainer.x; const wy = this.wheelContainer.y; const wScale = this.wheelContainer.scale
        const launchRadius = 180 * wScale; const launchX = wx; const launchY = wy - launchRadius
        this.ball.setPosition(launchX, launchY); this.ball.setScale(wScale); this.ball.enableBody(true, launchX, launchY, true, true)
        
        // Higher speed for more spins, scaled
        const speed = (1800 + Math.random() * 500) * wScale 
        this.ball.setVelocityX(speed)
        this.ball.setVelocityY((Math.random() * 100 - 50) * wScale)
        
        // Drag for spin duration control (approx 10-15s)
        this.ball.setDrag(150 * wScale) 
        this.ball.setAngularVelocity(1500)
    }
    private finalizeSpin(winningNumber: number) {
        // Capture current physics state before disabling
        const currentVelocity = (this.ball.body as Phaser.Physics.Arcade.Body).velocity.length()
        this.ball.disableBody(true, false)
        
        const targetIndex = WHEEL_ORDER.indexOf(winningNumber)
        const segmentAngle = 360 / 37
        // Target angle logic: Index 0 is -90 deg. Sequence is Clockwise.
        const targetAngleDeg = (targetIndex * segmentAngle) - 90 
        const targetRad = Phaser.Math.DegToRad(targetAngleDeg)
        
        const wx = this.wheelContainer.x
        const wy = this.wheelContainer.y
        const wScale = this.wheelContainer.scale
        const landRadius = 140 * wScale
        
        // 1. Calculate current angle and radius
        const currentAngle = Math.atan2(this.ball.y - wy, this.ball.x - wx)
        const currentRadius = Math.sqrt(Math.pow(this.ball.x - wx, 2) + Math.pow(this.ball.y - wy, 2))
        
        // 2. Calculate delta to target (Clockwise)
        let diff = targetRad - currentAngle
        while (diff < 0) diff += Math.PI * 2
        while (diff >= Math.PI * 2) diff -= Math.PI * 2
        
        // 3. Calculate duration to match current velocity (Smooth transition)
        // w0 = v / r
        const w0 = Math.max(0.1, currentVelocity / currentRadius) // Avoid divide by zero
        
        // Find total angle such that duration is reasonable (2-5s)
        // using Quadratic deceleration: theta = 0.5 * w0 * t  =>  t = 2 * theta / w0
        
        let k = 0
        let relativeAngle = diff
        let duration = (2 * relativeAngle / w0) * 1000 // ms
        
        // Ensure visual effect isn't too short
        while (duration < 2500) {
            k++
            relativeAngle = diff + (Math.PI * 2 * k)
            duration = (2 * relativeAngle / w0) * 1000
        }
        
        // Cap max duration to avoid boring wait
        if (duration > 6000) {
            duration = 6000
        }
        
        const finalAngle = currentAngle + relativeAngle
        
        // 4. Circular Tween
        const tweenData = { angle: currentAngle, radius: currentRadius }
        
        this.tweens.add({
            targets: tweenData,
            angle: finalAngle,
            radius: landRadius,
            duration: duration,
            ease: 'Quad.out', // Matches linear deceleration
            onUpdate: () => {
                const nx = wx + Math.cos(tweenData.angle) * tweenData.radius
                const ny = wy + Math.sin(tweenData.angle) * tweenData.radius
                this.ball.setPosition(nx, ny)
            },
            onComplete: () => {
                this.handleResult(winningNumber, this.pendingTotalBet)
            }
        })
    }
    private async handleResult(number: number, totalBet: number) {
        this.isSpinning = false
        let color = 0x000000; if (number === 0) color = 0x008000; else if (RED_NUMBERS.includes(number)) color = 0xd92b2b; else color = 0x111111
        this.resultCircle.setFillStyle(color); this.resultCircle.setStrokeStyle(4, 0xffd700); this.resultText.setText(number.toString())
        this.tweens.add({ targets: this.resultDisplay, alpha: 1, scale: { from: 0, to: 1 }, duration: 500, ease: 'Back.Out' })
        
        let payout = 0
        
        // Calculate Payout based on bets
        for (const [zone, amount] of Object.entries(this.bets)) {
            let win = false; let multiplier = 0
            if (zone.startsWith('n_')) { const betNum = parseInt(zone.split('_')[1]); if (betNum === number) { win = true; multiplier = 35; } }
            else if (zone === 'red') { if (RED_NUMBERS.includes(number)) { win = true; multiplier = 1; } }
            else if (zone === 'black') { if (BLACK_NUMBERS.includes(number)) { win = true; multiplier = 1; } }
            else if (zone === 'even') { if (number !== 0 && number % 2 === 0) { win = true; multiplier = 1; } }
            else if (zone === 'odd') { if (number !== 0 && number % 2 !== 0) { win = true; multiplier = 1; } }
            else if (zone === 'low') { if (number >= 1 && number <= 18) { win = true; multiplier = 1; } }
            else if (zone === 'high') { if (number >= 19 && number <= 36) { win = true; multiplier = 1; } }
            else if (zone === 'doz_1') { if (number >= 1 && number <= 12) { win = true; multiplier = 2; } }
            else if (zone === 'doz_2') { if (number >= 13 && number <= 24) { win = true; multiplier = 2; } }
            else if (zone === 'doz_3') { if (number >= 25 && number <= 36) { win = true; multiplier = 2; } }
            else if (zone === 'col_1') { if (number !== 0 && number % 3 === 0) { win = true; multiplier = 2; } }
            else if (zone === 'col_2') { if (number !== 0 && number % 3 === 2) { win = true; multiplier = 2; } }
            else if (zone === 'col_3') { if (number !== 0 && number % 3 === 1) { win = true; multiplier = 2; } }
            
            if (win) {
                payout += amount * multiplier + amount
            }
        }
        
        // Identify ALL winning zones for visual highlight
        const winningZones: string[] = []
        if (number === 0) {
            winningZones.push('n_0')
        } else {
            winningZones.push(`n_${number}`)
            if (RED_NUMBERS.includes(number)) winningZones.push('red'); else winningZones.push('black')
            if (number % 2 === 0) winningZones.push('even'); else winningZones.push('odd')
            if (number <= 18) winningZones.push('low'); else winningZones.push('high')
            if (number <= 12) winningZones.push('doz_1'); else if (number <= 24) winningZones.push('doz_2'); else winningZones.push('doz_3')
            if (number % 3 === 0) winningZones.push('col_1'); else if (number % 3 === 2) winningZones.push('col_2'); else winningZones.push('col_3')
        }
        
        // Highlight Winning Zones (Yellow Transparent Blink x3)
        winningZones.forEach(id => {
            const zone = this.betZones[id]
            if (zone) {
                const highlight = this.add.rectangle(zone.x, zone.y, zone.width, zone.height, 0xffff00)
                highlight.setAlpha(0)
                this.tableContainer.add(highlight) // Ensure it moves with table
                
                this.tweens.add({
                    targets: highlight,
                    alpha: 0.5,
                    yoyo: true,
                    repeat: 3,
                    duration: 300,
                    onComplete: () => highlight.destroy()
                })
            }
        })

        let msg = `Result: ${number}`; 
        if (payout > 0) {
            msg += ` WIN! (+${payout})`
            this.fireConfetti()
            this.showWinText(payout)
        } else {
            msg += ' LOSE'
        }
        this.addLog(msg)

        const token = localStorage.getItem('token')
        if (token) {
            try {
                const res = await fetch('/api/game/bet', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ action: 'settle', result: payout > 0 ? 'win' : 'lose', amount: payout, betAmount: totalBet, gameType: 'roulette' }) })
                const data = await res.json(); if (data.points !== undefined) { this.playerPoints = data.points; this.updatePointsText() }
            } catch (e) { console.error(e) }
        } else { this.playerPoints += payout; this.updatePointsText() }
        
        this.cleanupTimer = setTimeout(() => {
            this.clearBets(false)
            this.ball.setVisible(false)
            this.tweens.add({ targets: this.resultDisplay, alpha: 0, duration: 500 })
            this.cleanupTimer = null
        }, 3000)
    }

    private fireConfetti() {
        // Simple manual confetti
        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffffff]
        for(let i=0; i<80; i++) {
            const x = this.scale.width / 2
            const y = this.scale.height / 2
            const color = colors[Math.floor(Math.random() * colors.length)]
            
            // Random shape: Square or Circle
            let p: Phaser.GameObjects.Shape
            if (Math.random() > 0.5) {
                p = this.add.rectangle(x, y, 10, 10, color)
            } else {
                p = this.add.circle(x, y, 5, color)
            }
            
            this.physics.add.existing(p)
            const body = p.body as Phaser.Physics.Arcade.Body
            
            // Explode outwards
            const angle = Math.random() * Math.PI * 2
            const speed = Phaser.Math.Between(200, 600)
            body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed)
            body.setGravityY(800)
            body.setDrag(100)
            body.setCollideWorldBounds(false)
            
            this.tweens.add({
                targets: p,
                angle: 360 * 2,
                alpha: 0,
                duration: 2000 + Math.random() * 1000,
                onComplete: () => p.destroy()
            })
        }
    }

    private showWinText(amount: number) {
        const text = this.add.text(this.scale.width/2, this.scale.height/2, `WIN!\n+${amount}`, {
            fontSize: '80px',
            fontStyle: 'bold',
            color: '#ffff00',
            stroke: '#ff0000',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setScale(0).setDepth(200)

        this.tweens.add({
            targets: text,
            scale: 1,
            angle: 360,
            duration: 500,
            ease: 'Back.out',
            onComplete: () => {
                this.tweens.add({
                    targets: text,
                    scale: 1.2,
            yoyo: true,
                    repeat: 3,
                    duration: 300,
                    onComplete: () => {
                        this.tweens.add({
                            targets: text,
                            alpha: 0,
                            scale: 2,
                            duration: 500,
                            onComplete: () => text.destroy()
                        })
                    }
                })
            }
        })
    }

    private async loadUserPoints() {
        const token = localStorage.getItem('token')
        if (!token) { this.playerPoints = 10000; this.updatePointsText(); this.addLog('데모 모드 (10,000P)'); this.updateProgress(100); return }
        try {
            const res = await fetch('/api/user/me', { headers: { 'Authorization': `Bearer ${token}` } })
            if (res.ok) { const data = await res.json(); this.playerPoints = data.points; this.updatePointsText() }
        } catch (e) { console.error(e) }
        this.updateProgress(100)
    }
}

interface RouletteGameProps {
    onLoadingProgress?: (progress: number) => void
}

export default function RouletteGame({ onLoadingProgress }: RouletteGameProps) {
    const gameRef = useRef<HTMLDivElement>(null)
    const gameInstance = useRef<Phaser.Game | null>(null)

    useEffect(() => {
        if (!gameRef.current || gameInstance.current) return

        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%', autoCenter: Phaser.Scale.NO_CENTER },
            parent: gameRef.current,
            backgroundColor: '#1a1a1a',
            physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },
            scene: [RouletteScene],
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
        <div ref={gameRef} data-testid="roulette-game-container" className="w-full h-full flex-1 rounded-xl overflow-hidden shadow-2xl border border-white/10" />
    )
}
