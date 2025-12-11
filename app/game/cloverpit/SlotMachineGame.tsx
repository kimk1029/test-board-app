'use client'

import React, { useEffect, useRef, useState } from 'react'
import * as Phaser from 'phaser'

// --- 1. 정책 및 데이터 정의 (확률 수정됨) ---
const SYMBOL_DATA = [
    { icon: '🍋', value: 1, weight: 24, color: '#ffff00' },   // 24%
    { icon: '🍒', value: 1, weight: 24, color: '#ff0000' },   // 24%
    { icon: '🍇', value: 2, weight: 20, color: '#ff00ff' },   // 20%
    { icon: '🔔', value: 5, weight: 15, color: '#ffffaa' },   // 15%
    { icon: '🍀', value: 10, weight: 9, color: '#00ff00' },   // 9%
    { icon: '💎', value: 20, weight: 5, color: '#00ffff' },   // 5%
    { icon: '7️⃣', value: 50, weight: 3, color: '#ffaa00' },   // 3%
]

// --- 릴(Reel) 클래스 ---
class SlotReel {
    private scene: Phaser.Scene
    public container: Phaser.GameObjects.Container
    private symbols: Phaser.GameObjects.Text[] = []
    
    // Mask related
    private maskShape: Phaser.GameObjects.Graphics

    private spinSpeed: number = 60
    private stopDuration: number = 800

    private readonly SYMBOL_HEIGHT = 140
    private readonly SYMBOL_WIDTH = 180
    private readonly TOTAL_SYMBOLS = 12

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.scene = scene
        this.container = scene.add.container(x, y)

        this.maskShape = scene.make.graphics({})
        this.maskShape.fillStyle(0xffffff)
        this.maskShape.fillRect(x - this.SYMBOL_WIDTH / 2, y - this.SYMBOL_HEIGHT * 1.5, this.SYMBOL_WIDTH, this.SYMBOL_HEIGHT * 3)
        
        const mask = this.maskShape.createGeometryMask()
        this.container.setMask(mask)

        for (let i = 0; i < this.TOTAL_SYMBOLS; i++) {
            const symbolData = this.getRandomSymbolData()
            const yPos = (i - 4) * this.SYMBOL_HEIGHT

            const symbol = scene.add.text(0, yPos, symbolData.icon, {
                fontSize: '80px', fontStyle: 'bold'
            }).setOrigin(0.5)

            this.symbols.push(symbol)
            this.container.add(symbol)
        }
    }

    public updateMask(worldX: number, worldY: number, scale: number) {
        this.maskShape.clear()
        this.maskShape.fillStyle(0xffffff)
        
        const w = this.SYMBOL_WIDTH * scale
        const h = this.SYMBOL_HEIGHT * 3 * scale
        
        // Draw rect relative to the new world position of the reel center
        this.maskShape.fillRect(
            worldX - w / 2, 
            worldY - (this.SYMBOL_HEIGHT * 1.5 * scale), 
            w, 
            h
        )
    }

    public setSpeed(speed: number) { this.spinSpeed = speed }
    public setStopDuration(duration: number) { this.stopDuration = duration }

    private getRandomSymbolData() {
        const totalWeight = SYMBOL_DATA.reduce((sum, item) => sum + item.weight, 0)
        let random = Math.random() * totalWeight
        for (const item of SYMBOL_DATA) {
            if (random < item.weight) return item
            random -= item.weight
        }
        return SYMBOL_DATA[0]
    }

    public spin(delay: number, duration: number, targetSymbols: string[]): Promise<void> {
        return new Promise((resolve) => {
            this.snapPositions()
            this.scene.tweens.add({
                targets: this.symbols,
                y: '-=50',
                duration: 300,
                ease: 'Back.in',
                delay: delay,
                onComplete: () => {
                    this.startInfiniteScroll(duration, targetSymbols, resolve)
                }
            })
        })
    }

    private snapPositions() {
        this.symbols.sort((a, b) => a.y - b.y)
        let centerIndex = 0
        let minDistance = Infinity
        this.symbols.forEach((sym, i) => {
            if (Math.abs(sym.y) < minDistance) {
                minDistance = Math.abs(sym.y)
                centerIndex = i
            }
        })
        this.symbols.forEach((sym, i) => {
            sym.y = (i - centerIndex) * this.SYMBOL_HEIGHT
        })
    }

    private startInfiniteScroll(duration: number, targetSymbols: string[], resolve: () => void) {
        this.symbols.forEach(s => s.setAlpha(0.5).setScale(0.8, 1.2))
        const speed = this.spinSpeed
        const timer = this.scene.time.addEvent({
            delay: 16,
            loop: true,
            callback: () => {
                this.symbols.forEach(symbol => {
                    symbol.y += speed
                })
                const threshold = (this.TOTAL_SYMBOLS / 2) * this.SYMBOL_HEIGHT
                const minY = Math.min(...this.symbols.map(s => s.y))
                this.symbols.forEach(symbol => {
                    if (symbol.y > threshold) {
                        symbol.y = minY - this.SYMBOL_HEIGHT
                        symbol.setText(this.getRandomSymbolData().icon)
                    }
                })
            }
        })
        this.scene.time.delayedCall(duration, () => {
            timer.remove()
            this.stopReel(targetSymbols, resolve)
        })
    }

    private stopReel(targetSymbols: string[], resolve: () => void) {
        this.symbols.forEach(s => s.setAlpha(1).setScale(1))
        const sortedSymbols = [...this.symbols].sort((a, b) => a.y - b.y)
        const topY = sortedSymbols[0].y

        const resultBot = sortedSymbols[sortedSymbols.length - 1]
        const resultMid = sortedSymbols[sortedSymbols.length - 2]
        const resultTop = sortedSymbols[sortedSymbols.length - 3]

        resultBot.y = topY - this.SYMBOL_HEIGHT
        resultMid.y = topY - this.SYMBOL_HEIGHT * 2
        resultTop.y = topY - this.SYMBOL_HEIGHT * 3

        resultTop.setText(targetSymbols[0])
        resultMid.setText(targetSymbols[1])
        resultBot.setText(targetSymbols[2])

        const targetY = 0
        const distance = targetY - resultMid.y

        this.scene.tweens.add({
            targets: this.symbols,
            y: `+=${distance}`,
            duration: this.stopDuration,
            ease: 'Back.out',
            onComplete: () => {
                resolve()
            }
        })
    }
}

// --- 메인 씬 ---
class MainScene extends Phaser.Scene {
    private reels: SlotReel[] = []
    private isSpinning = false
    private paylineGraphics!: Phaser.GameObjects.Graphics

    // UI Groups
    private slotGroup!: Phaser.GameObjects.Container
    private controlGroup!: Phaser.GameObjects.Container
    private infoGroup!: Phaser.GameObjects.Container
    private topBarGroup!: Phaser.GameObjects.Container

    private pointsText!: Phaser.GameObjects.Text
    private logContainer!: Phaser.GameObjects.Container
    private logs: Array<any> = []
    private isX5Mode: boolean = false

    private spinButtonText!: Phaser.GameObjects.Text
    private x5ButtonBg!: Phaser.GameObjects.Rectangle
    private x5Button!: Phaser.GameObjects.Container
    
    private paytableContainer!: Phaser.GameObjects.Container
    private paytableTexts: Phaser.GameObjects.Text[] = []

    private settingsPanel!: Phaser.GameObjects.Container
    private isSettingsOpen: boolean = false

    private spinSpeed: number = 60
    private spinDuration: number = 2000
    private stopDuration: number = 800

    private playerPoints: number = 0
    private background!: Phaser.GameObjects.Rectangle

    constructor() {
        super('MainScene')
    }

    init() {
        this.updateProgress(10)
    }

    preload() {
        this.updateProgress(30)
    }

    create() {
        this.updateProgress(50)
        this.background = this.add.rectangle(0, 0, 0, 0, 0x121212).setOrigin(0,0)

        this.slotGroup = this.add.container(0, 0)
        this.controlGroup = this.add.container(0, 0)
        this.infoGroup = this.add.container(0, 0)
        this.topBarGroup = this.add.container(0, 0)

        this.createTopBar()
        this.createSlotMachine()
        this.createPaytable()
        this.createControlPanel()
        this.createSettingsPanel() // Init hidden
        this.createLogPanel()

        this.input.keyboard?.on('keydown-SPACE', () => this.handleSpin())

        this.updateProgress(80)
        this.loadUserPoints()
        
        this.scale.on('resize', this.resize, this)
        this.resize({ width: this.scale.width, height: this.scale.height })
        
        this.updateProgress(100)
    }
    
    private updateProgress(val: number) {
        const onProgress = this.registry.get('onLoadingProgress')
        if (onProgress) onProgress(val)
    }

    private resize(gameSize: { width: number, height: number }) {
        const w = gameSize.width
        const h = gameSize.height
        
        this.background.setSize(w, h)
        
        const isMobile = w < 800 || h > w

        // 1. Top Bar
        this.topBarGroup.setPosition(w/2, 40)
        // Background width adjustment
        const topBg = this.topBarGroup.getAt(0) as Phaser.GameObjects.Rectangle
        if(topBg) topBg.setSize(w, 80)
        
        // Log button position
        const logBtn = this.topBarGroup.getByName('logBtn') as Phaser.GameObjects.Container
        if(logBtn) logBtn.x = w/2 - 60

        // Back button position
        const backBtn = this.topBarGroup.getByName('backBtn') as Phaser.GameObjects.Container
        if(backBtn) backBtn.x = -w/2 + 60

        // 2. Slot Machine
        if (isMobile) {
            const slotScale = Math.min(1, (w - 40) / 600)
            this.slotGroup.setScale(slotScale)
            this.slotGroup.setPosition(w/2, 100 + (240 * slotScale)) 
            
            const controlY = this.slotGroup.y + (240 * slotScale) + 60
            this.controlGroup.setScale(Math.min(1, w / 500))
            this.controlGroup.setPosition(w/2, controlY)
            
            this.infoGroup.setVisible(false) 
            
        } else {
            this.slotGroup.setScale(1)
            this.slotGroup.setPosition(w/2, h/2 - 20)
            
            this.controlGroup.setScale(1)
            this.controlGroup.setPosition(w/2, h - 80)
            
            this.infoGroup.setVisible(true)
            this.infoGroup.setPosition(150, h/2) 
        }
        
        this.settingsPanel.setPosition(w/2, h/2)
        const sOverlay = this.settingsPanel.list[0] as Phaser.GameObjects.Rectangle
        if(sOverlay) sOverlay.setSize(w, h)

        this.reels.forEach(reel => {
            const wx = this.slotGroup.x + reel.container.x * this.slotGroup.scale
            const wy = this.slotGroup.y + reel.container.y * this.slotGroup.scale
            reel.updateMask(wx, wy, this.slotGroup.scale)
        })
    }

    private createTopBar() {
        const bg = this.add.rectangle(0, 0, 1280, 80, 0x000000, 0.8)
        
        // [뒤로가기]
        const backButton = this.add.container(-580, 0).setName('backBtn')
        const backBg = this.add.circle(0, 0, 25, 0x333333).setInteractive({ useHandCursor: true })
        backBg.setStrokeStyle(2, 0x888888)
        const backIcon = this.add.text(0, 0, '⬅', { fontSize: '24px' }).setOrigin(0.5)
        backButton.add([backBg, backIcon])
        backBg.on('pointerdown', () => window.location.href = '/game')

        // 타이틀
        const title = this.add.text(0, 0, '🎰 CASINO SLOTS', {
            fontSize: '28px', color: '#ffd700', fontFamily: 'Arial Black'
        }).setOrigin(0.5)

        // [설정 버튼]
        const settingsBtn = this.add.container(580, 0).setName('logBtn') 
        const setBg = this.add.circle(0, 0, 25, 0x4a5568).setInteractive({ useHandCursor: true })
        const setIcon = this.add.text(0, 0, '⚙️', { fontSize: '24px' }).setOrigin(0.5)
        settingsBtn.add([setBg, setIcon])
        setBg.on('pointerdown', () => this.toggleSettings())

        this.topBarGroup.add([bg, backButton, title, settingsBtn])
    }

    private createSlotMachine() {
        const frame = this.add.graphics()
        frame.fillStyle(0x222222); frame.fillRoundedRect(-300, -240, 600, 480, 20)
        frame.lineStyle(12, 0xd4af37); frame.strokeRoundedRect(-300, -240, 600, 480, 20)
        this.slotGroup.add(frame)
        
        const bg = this.add.rectangle(0, 0, 560, 440, 0x000000).setAlpha(0.6)
        this.slotGroup.add(bg)

        this.reels = [
            new SlotReel(this, 0, 0), 
            new SlotReel(this, 0, 0),
            new SlotReel(this, 0, 0)
        ]
        this.slotGroup.add(this.reels[0].container)
        this.slotGroup.add(this.reels[1].container)
        this.slotGroup.add(this.reels[2].container)
        
        this.reels[0].container.setPosition(-190, 0)
        this.reels[1].container.setPosition(0, 0)
        this.reels[2].container.setPosition(190, 0)

        this.reels.forEach(r => { r.setSpeed(this.spinSpeed); r.setStopDuration(this.stopDuration); })
        
        this.paylineGraphics = this.add.graphics().setDepth(10)
        this.slotGroup.add(this.paylineGraphics)
    }

    private createPaytable() {
        const bg = this.add.rectangle(0, 0, 220, 480, 0x1a1a1a, 0.9)
        bg.setStrokeStyle(2, 0x444444)
        const title = this.add.text(0, -200, 'PAYTABLE', { fontSize: '24px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5)
        
        this.infoGroup.add([bg, title])
        
        const totalWeight = SYMBOL_DATA.reduce((sum, item) => sum + item.weight, 0)
        SYMBOL_DATA.forEach((data, index) => {
            const y = -130 + index * 50
            const icon = this.add.text(-60, y, data.icon, { fontSize: '32px' }).setOrigin(0.5)
            const valText = this.add.text(0, y - 8, `x3 = ${data.value}pt`, { fontSize: '18px', color: data.color, fontStyle: 'bold' }).setOrigin(0, 0.5)
            this.paytableTexts.push(valText)
            const prob = ((data.weight / totalWeight) * 100).toFixed(1).replace('.0', '')
            const probText = this.add.text(0, y + 12, `(${prob}%)`, { fontSize: '12px', color: '#666' }).setOrigin(0, 0.5)
            this.infoGroup.add([icon, valText, probText])
        })
    }

    private createControlPanel() {
        const spinBg = this.add.rectangle(0, 0, 220, 70, 0xe63946, 1).setInteractive({ useHandCursor: true })
        spinBg.setStrokeStyle(4, 0xffffff)
        this.spinButtonText = this.add.text(0, 0, 'SPIN (0.1)', { fontSize: '28px', fontStyle: 'bold', color: '#fff' }).setOrigin(0.5)
        const spinContainer = this.add.container(0, 0, [spinBg, this.spinButtonText])
        
        spinBg.on('pointerdown', () => { 
            if (!this.isSpinning) { 
                spinContainer.y = 4
                this.handleSpin() 
            } 
        })
        spinBg.on('pointerup', () => { spinContainer.y = 0 })
        spinBg.on('pointerout', () => { spinContainer.y = 0 })

        this.x5ButtonBg = this.add.rectangle(0, 0, 80, 50, 0x333333).setInteractive({ useHandCursor: true })
        this.x5ButtonBg.setStrokeStyle(2, 0x888888)
        const x5Text = this.add.text(0, 0, 'x5', { fontSize: '20px', fontStyle: 'bold', color: '#888' }).setOrigin(0.5)
        this.x5Button = this.add.container(160, 0, [this.x5ButtonBg, x5Text])
        
        this.x5ButtonBg.on('pointerdown', () => {
            this.isX5Mode = !this.isX5Mode
            this.updateButtons()
        })
        
        this.controlGroup.add([spinContainer, this.x5Button])
        
        const pointsBg = this.add.rectangle(-200, 0, 180, 50, 0x000000).setStrokeStyle(2, 0xd4af37)
        this.pointsText = this.add.text(-200, 0, '0.0 P', { fontSize: '24px', color: '#4ade80', fontStyle: 'bold' }).setOrigin(0.5)
        this.controlGroup.add([pointsBg, this.pointsText])
    }

    private createLogPanel() {
        this.logContainer = this.add.container(0,0) 
    }
    
    private updateButtons() {
        if (this.isX5Mode) {
            this.x5ButtonBg.setFillStyle(0xffd700); this.x5ButtonBg.setStrokeStyle(2, 0xffffff)
            this.spinButtonText.setText('SPIN (0.5)'); const text = this.x5Button.getAt(1) as Phaser.GameObjects.Text; text.setColor('#000')
            this.updatePaytable(5)
        } else {
            this.x5ButtonBg.setFillStyle(0x333333); this.x5ButtonBg.setStrokeStyle(2, 0x888888)
            this.spinButtonText.setText('SPIN (0.1)'); const text = this.x5Button.getAt(1) as Phaser.GameObjects.Text; text.setColor('#888')
            this.updatePaytable(1)
        }
    }
    
    private updatePaytable(multiplier: number) {
        this.paytableTexts.forEach((text, index) => {
            const baseValue = SYMBOL_DATA[index].value
            const newValue = baseValue * multiplier
            const displayValue = Number.isInteger(newValue) ? newValue : newValue.toFixed(1)
            text.setText(`x3 = ${displayValue}pt`)
            if (multiplier > 1) { text.setFontStyle('bold'); text.setColor('#ffd700') }
            else { text.setFontStyle('normal'); text.setColor(SYMBOL_DATA[index].color) }
        })
    }

    private createSettingsPanel() {
        this.settingsPanel = this.add.container(0, 0).setVisible(false).setDepth(200)
        const overlay = this.add.rectangle(0, 0, 1280, 720, 0x000000, 0.7).setInteractive()
        const panelBg = this.add.rectangle(0, 0, 400, 350, 0x222222); panelBg.setStrokeStyle(2, 0xffd700).setInteractive()
        const title = this.add.text(0, -140, 'GAME SETTINGS', { fontSize: '24px', color: '#ffd700', fontStyle: 'bold' }).setOrigin(0.5)

        const createSlider = (y: number, label: string, min: number, max: number, current: number, onChange: (val: number) => void) => {
            const labelText = this.add.text(-160, y, label, { fontSize: '16px', color: '#fff' }).setOrigin(0, 0.5)
            const valueText = this.add.text(160, y, Math.round(current).toString(), { fontSize: '16px', color: '#ffd700' }).setOrigin(1, 0.5)
            const track = this.add.rectangle(0, y + 25, 320, 4, 0x555555)
            const progress = (current - min) / (max - min)
            const handleX = -160 + (progress * 320)
            const handle = this.add.circle(handleX, y + 25, 10, 0xffd700).setInteractive({ draggable: true, useHandCursor: true })
            handle.on('drag', (pointer: any, dragX: number, dragY: number) => {
                const newX = Phaser.Math.Clamp(dragX, -160, 160); handle.x = newX
                const ratio = (newX + 160) / 320; const newVal = min + ratio * (max - min)
                valueText.setText(Math.round(newVal).toString()); onChange(newVal)
            })
            return [labelText, valueText, track, handle]
        }

        const s1 = createSlider(-60, 'SPIN SPEED', 30, 120, this.spinSpeed, (val) => { this.spinSpeed = val; this.reels.forEach(r => r.setSpeed(val)) })
        const s2 = createSlider(20, 'SPIN DURATION', 1000, 5000, this.spinDuration, (val) => { this.spinDuration = val })
        const s3 = createSlider(100, 'STOP BOUNCE', 400, 1500, this.stopDuration, (val) => { this.stopDuration = val; this.reels.forEach(r => r.setStopDuration(val)) })
        const closeBtn = this.add.text(0, 150, 'CLOSE', { fontSize: '18px', color: '#fff', backgroundColor: '#e63946', padding: { x: 20, y: 10 } }).setOrigin(0.5).setInteractive({ useHandCursor: true })
        closeBtn.on('pointerdown', () => this.toggleSettings())
        this.settingsPanel.add([overlay, panelBg, title, closeBtn, ...s1, ...s2, ...s3])
    }

    private toggleSettings() {
        this.isSettingsOpen = !this.isSettingsOpen
        this.settingsPanel.setVisible(this.isSettingsOpen)
        if (this.isSettingsOpen) this.settingsPanel.setDepth(9999)
    }

    private addLog(type: string, message: string, change: number, current: number) {
    }

    private async loadUserPoints() {
        const token = localStorage.getItem('token')
        if (!token) {
            this.playerPoints = 10000.0; this.updatePointsText();
            return;
        }
        try {
            const res = await fetch('/api/user/me', { headers: { 'Authorization': `Bearer ${token}` } })
            if (res.ok) {
                const data = await res.json();
                this.playerPoints = data.points || 0;
                this.updatePointsText()
            }
        } catch (e) { console.error("Load Points Error", e) }
    }

    private updatePointsText() {
        if (this.pointsText) {
            this.pointsText.setText(`${this.playerPoints.toFixed(1)} P`)
        }
    }

    private async handleSpin() {
        if (this.isSpinning) return
        const betAmount = this.isX5Mode ? 0.5 : 0.1
        if (this.playerPoints < betAmount) { this.showFloatingText(0, 0, '포인트 부족!', '#ff0000'); return } 

        this.isSpinning = true 
        const previousPoints = this.playerPoints
        
        this.playerPoints = parseFloat((this.playerPoints - betAmount).toFixed(1))
        this.updatePointsText()
        
        const token = localStorage.getItem('token')
        if (token) {
            try {
                const res = await fetch('/api/game/bet', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ action: 'bet', amount: betAmount, gameType: 'cloverpit' })
                })
                
                if (!res.ok) throw new Error('Bet failed')
                
                const data = await res.json()
                if (data && data.points !== undefined) {
                    this.playerPoints = parseFloat(data.points.toFixed(1))
                    this.updatePointsText()
                }
            } catch (err) {
                console.error(err)
                this.playerPoints = previousPoints
                this.updatePointsText()
                this.showFloatingText(0, 0, '통신 오류!', '#ff0000')
                this.isSpinning = false
                return 
            }
        }

        this.paylineGraphics.clear()

        const finalResult = [
            [this.getRand(), this.getRand(), this.getRand()],
            [this.getRand(), this.getRand(), this.getRand()],
            [this.getRand(), this.getRand(), this.getRand()]
        ]

        const promises = this.reels.map((reel, i) => {
            return reel.spin(i * 100, this.spinDuration + i * 500, finalResult[i])
        })

        await Promise.all(promises)
        const currentBet = this.isX5Mode ? 0.5 : 0.1
        this.checkWin(finalResult, this.isX5Mode ? 5 : 1, currentBet)
        this.isSpinning = false
    }

    private getRand() {
        const totalWeight = SYMBOL_DATA.reduce((sum, item) => sum + item.weight, 0)
        let random = Math.random() * totalWeight
        for (const item of SYMBOL_DATA) {
            if (random < item.weight) return item.icon
            random -= item.weight
        }
        return SYMBOL_DATA[0].icon
    }

    private checkWin(matrix: string[][], multiplier: number, betAmount: number) {
        const lines = []
        for (let r = 0; r < 3; r++) { if (matrix[0][r] === matrix[1][r] && matrix[1][r] === matrix[2][r]) lines.push({ type: 'row', index: r, symbol: matrix[0][r] }) }
        for (let c = 0; c < 3; c++) { if (matrix[c][0] === matrix[c][1] && matrix[c][1] === matrix[c][2]) lines.push({ type: 'col', index: c, symbol: matrix[c][0] }) }
        if (matrix[0][0] === matrix[1][1] && matrix[1][1] === matrix[2][2]) lines.push({ type: 'diag', index: 0, symbol: matrix[1][1] })
        if (matrix[0][2] === matrix[1][1] && matrix[1][1] === matrix[2][0]) lines.push({ type: 'diag', index: 1, symbol: matrix[1][1] })

        let baseScore = 0
        lines.forEach(line => {
            const data = SYMBOL_DATA.find(s => s.icon === line.symbol)
            if (data) baseScore += data.value
        })

        const comboMultiplier = lines.length > 0 ? lines.length : 0
        const totalWin = baseScore * multiplier * comboMultiplier

        const center = matrix[1][1]
        const isJackpot = matrix.flat().every(s => s === center)

        if (isJackpot) {
            const jackpotWin = 100 * multiplier
            this.processWin(jackpotWin, true, betAmount, 8) // Jackpot assumed 8 combo or max
        } else if (totalWin > 0) {
            this.processWin(totalWin, false, betAmount, lines.length)
            this.highlightLines(lines)
            if (lines.length > 1) {
                this.time.delayedCall(500, () => this.showFloatingText(0, 0, `${lines.length} COMBO!\nx${lines.length}`, '#ffaa00', 80))
            }
        } else {
            this.syncResultToServer(0, betAmount, 'lose')
        }
    }

    private async syncResultToServer(amount: number, betAmount: number, result: 'win' | 'lose', msg: string = '', comboCount: number = 0) {
        const token = localStorage.getItem('token')
        if (token) {
            try {
                const res = await fetch('/api/game/bet', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ action: 'settle', amount, betAmount, result, gameType: 'cloverpit', comboCount })
                })
                const data = await res.json()
                if (data && data.points !== undefined) {
                    this.playerPoints = parseFloat(data.points.toFixed(1))
                    this.updatePointsText()
                }
            } catch (err) { console.error(err) }
        }
    }

    private async processWin(amount: number, isJackpot: boolean, betAmount: number, comboCount: number = 0) {
        this.playerPoints = parseFloat((this.playerPoints + amount).toFixed(1))
        this.updatePointsText()
        const msg = isJackpot ? `잭팟!` : `당첨!`
        await this.syncResultToServer(amount, betAmount, 'win', msg, comboCount)

        if (isJackpot) {
            this.showFloatingText(0, 0, `JACKPOT\n+${amount}`, '#ff00ff', 100)
            this.cameras.main.shake(500, 0.05)
        } else {
            this.showFloatingText(0, 0, `+${amount.toFixed(1)}`, '#ffff00', 60)
        }
    }

    private showFloatingText(x: number, y: number, msg: string, color: string, size: number = 48) {
        const text = this.add.text(x, y, msg, {
            fontSize: `${size}px`, fontFamily: 'Arial Black', color: color, stroke: '#000', strokeThickness: 6, align: 'center'
        }).setOrigin(0.5).setDepth(100).setScale(0)
        
        this.slotGroup.add(text) 

        this.tweens.add({
            targets: text, scale: 1, duration: 500, ease: 'Back.out',
            onComplete: () => {
                this.tweens.add({ targets: text, y: y - 100, alpha: 0, duration: 1000, delay: 500, onComplete: () => text.destroy() })
            }
        })
    }

    private highlightLines(lines: any[]) {
        this.paylineGraphics.lineStyle(15, 0xffff00, 0.5)
        const symbolH = 140
        lines.forEach(line => {
            if (line.type === 'row') {
                const y = (line.index - 1) * symbolH 
                this.paylineGraphics.lineBetween(-280, y, 280, y)
            } else if (line.type === 'col') {
                const x = (line.index - 1) * 190
                this.paylineGraphics.lineBetween(x, -220, x, 220)
            } else if (line.type === 'diag') {
                const x1 = -190; const x2 = 190
                const y1 = -140; const y2 = 140
                if (line.index === 0) this.paylineGraphics.lineBetween(x1 - 80, y1 - 60, x2 + 80, y2 + 60)
                else this.paylineGraphics.lineBetween(x1 - 80, y2 + 60, x2 + 80, y1 - 60)
            }
        })
        this.tweens.add({ targets: this.paylineGraphics, alpha: 0.2, yoyo: true, repeat: 3, duration: 200 })
    }
}

interface SlotGamePageProps {
    onLoadingProgress?: (progress: number) => void
}

// --- Next.js 컴포넌트 ---
export default function SlotGamePage({ onLoadingProgress }: SlotGamePageProps) {
    const gameRef = useRef<HTMLDivElement>(null)
    const gameInstance = useRef<Phaser.Game | null>(null)
    const [isDemo, setIsDemo] = useState(false)

    useEffect(() => {
        setIsDemo(!localStorage.getItem('token'))
        
        if (gameInstance.current) return
        if (!gameRef.current) return

        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            scale: {
                mode: Phaser.Scale.RESIZE, // Responsive
                width: '100%',
                height: '100%',
                autoCenter: Phaser.Scale.NO_CENTER
            },
            parent: gameRef.current,
            backgroundColor: '#000',
            scene: [MainScene],
            physics: { default: 'arcade' },
            audio: { disableWebAudio: false, noAudio: false },
            disableContextMenu: true
        }

        gameInstance.current = new Phaser.Game(config)

        if (onLoadingProgress) {
            gameInstance.current.registry.set('onLoadingProgress', onLoadingProgress)
        }

        return () => {
            if (gameInstance.current) {
                try {
                    gameInstance.current.destroy(true)
                    gameInstance.current = null
                } catch (e) { }
            }
        }
    }, [])
    
    useEffect(() => {
        if (gameInstance.current && onLoadingProgress) {
            gameInstance.current.registry.set('onLoadingProgress', onLoadingProgress)
        }
    }, [onLoadingProgress])

    return (
        <div className="w-full h-full flex flex-col bg-black relative overflow-hidden">
            {/* Phaser Canvas Container */}
            <div ref={gameRef} className="w-full h-full" />
        </div>
    )
}
