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

    private spinSpeed: number = 60
    private stopDuration: number = 800

    private readonly SYMBOL_HEIGHT = 140
    private readonly SYMBOL_WIDTH = 180
    private readonly TOTAL_SYMBOLS = 12

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.scene = scene
        this.container = scene.add.container(x, y)

        const maskShape = scene.make.graphics({})
        maskShape.fillStyle(0xffffff)
        maskShape.fillRect(x - this.SYMBOL_WIDTH / 2, y - this.SYMBOL_HEIGHT * 1.5, this.SYMBOL_WIDTH, this.SYMBOL_HEIGHT * 3)
        const mask = maskShape.createGeometryMask()
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

    public getVisibleSymbolObjects(): Phaser.GameObjects.Text[] {
        const sorted = [...this.symbols].sort((a, b) => a.y - b.y)
        let midIndex = 0
        let minDistance = Infinity
        sorted.forEach((sym, i) => {
            if (Math.abs(sym.y) < minDistance) {
                minDistance = Math.abs(sym.y)
                midIndex = i
            }
        })
        return [sorted[midIndex - 1], sorted[midIndex], sorted[midIndex + 1]]
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

    // UI 요소
    private pointsText!: Phaser.GameObjects.Text
    private logContainer!: Phaser.GameObjects.Container
    private logPanel!: Phaser.GameObjects.Container
    private isLogOpen: boolean = true
    private logs: Array<any> = []
    private isX5Mode: boolean = false

    // 버튼 관련
    private spinButton!: Phaser.GameObjects.Container
    private x5Button!: Phaser.GameObjects.Container
    private settingsButton!: Phaser.GameObjects.Container
    private logButton!: Phaser.GameObjects.Container
    private backButton!: Phaser.GameObjects.Container

    private spinButtonText!: Phaser.GameObjects.Text
    private x5ButtonBg!: Phaser.GameObjects.Rectangle

    private paytableTexts: Phaser.GameObjects.Text[] = []

    // 설정 관련
    private settingsPanel!: Phaser.GameObjects.Container
    private isSettingsOpen: boolean = false

    private spinSpeed: number = 60
    private spinDuration: number = 2000
    private stopDuration: number = 800

    private playerPoints: number = 0

    constructor() {
        super('MainScene')
    }

    create() {
        this.add.rectangle(640, 360, 1280, 720, 0x121212)

        // UI 생성 (동기)
        this.createTopBar()
        this.createSlotMachine()
        this.createPaytable()
        this.createControlPanel()
        this.createSettingsUI()
        this.createLogPanel()

        this.input.keyboard?.on('keydown-SPACE', () => this.handleSpin())

        // 데이터 로딩 (비동기)
        this.loadUserPoints()
    }

    private createTopBar() {
        this.add.rectangle(640, 40, 1280, 80, 0x000000, 0.8)

        // [뒤로가기]
        this.backButton = this.add.container(60, 40)
        const backBg = this.add.circle(0, 0, 25, 0x333333).setInteractive({ useHandCursor: true })
        backBg.setStrokeStyle(2, 0x888888)
        const backIcon = this.add.text(0, 0, '⬅', { fontSize: '24px' }).setOrigin(0.5)
        this.backButton.add([backBg, backIcon])

        backBg.on('pointerdown', () => {
            window.location.href = '/game'
        })

        // 타이틀
        this.add.text(640, 40, '🎰 CASINO SLOTS', {
            fontSize: '28px', color: '#ffd700', fontFamily: 'Arial Black'
        }).setOrigin(0.5)

        // [로그 버튼]
        this.logButton = this.add.container(1220, 40)
        this.logButton.setDepth(9999)

        const logBg = this.add.circle(0, 0, 25, 0x4a5568).setInteractive({ useHandCursor: true })
        const logIcon = this.add.text(0, 0, '📋', { fontSize: '24px' }).setOrigin(0.5)
        this.logButton.add([logBg, logIcon])

        logBg.on('pointerdown', () => this.toggleLogPanel())
    }

    private createSlotMachine() {
        const centerX = 640; const centerY = 380
        const frame = this.add.graphics()
        frame.fillStyle(0x222222); frame.fillRoundedRect(centerX - 300, centerY - 240, 600, 480, 20)
        frame.lineStyle(12, 0xd4af37); frame.strokeRoundedRect(centerX - 300, centerY - 240, 600, 480, 20)
        this.add.rectangle(centerX, centerY, 560, 440, 0x000000).setAlpha(0.6)
        this.reels = [
            new SlotReel(this, centerX - 190, centerY),
            new SlotReel(this, centerX, centerY),
            new SlotReel(this, centerX + 190, centerY)
        ]
        this.reels.forEach(r => { r.setSpeed(this.spinSpeed); r.setStopDuration(this.stopDuration); })
        this.paylineGraphics = this.add.graphics().setDepth(10)
    }

    private createPaytable() {
        const startX = 130
        const bg = this.add.rectangle(startX, 380, 220, 480, 0x1a1a1a, 0.9)
        bg.setStrokeStyle(2, 0x444444)
        this.add.text(startX, 180, 'PAYTABLE', { fontSize: '24px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5)

        this.paytableTexts = []

        const totalWeight = SYMBOL_DATA.reduce((sum, item) => sum + item.weight, 0)

        SYMBOL_DATA.forEach((data, index) => {
            const y = 250 + index * 50

            // 아이콘
            this.add.text(startX - 60, y, data.icon, { fontSize: '32px' }).setOrigin(0.5)

            // 가치
            const valText = this.add.text(startX, y - 8, `x3 = ${data.value}pt`, {
                fontSize: '18px', color: data.color, fontStyle: 'bold'
            }).setOrigin(0, 0.5)
            this.paytableTexts.push(valText)

            // 확률
            const probability = ((data.weight / totalWeight) * 100).toFixed(1).replace('.0', '')
            this.add.text(startX, y + 12, `(${probability}%)`, {
                fontSize: '12px', color: '#666'
            }).setOrigin(0, 0.5)
        })

        const ruleY = 620
        this.add.line(0, 0, startX - 90, ruleY - 30, startX + 90, ruleY - 30, 0x666666)
        this.add.text(startX, ruleY, '🔥 COMBO RULE 🔥', { fontSize: '18px', color: '#ffaa00', fontStyle: 'bold' }).setOrigin(0.5)
        this.add.text(startX, ruleY + 30, '라인이 겹치면', { fontSize: '14px', color: '#ccc' }).setOrigin(0.5)
        this.add.text(startX, ruleY + 50, '점수가 배가 됩니다!', { fontSize: '14px', color: '#ffff00' }).setOrigin(0.5)
    }

    private updatePaytable(multiplier: number) {
        this.paytableTexts.forEach((text, index) => {
            const baseValue = SYMBOL_DATA[index].value
            const newValue = baseValue * multiplier
            const displayValue = Number.isInteger(newValue) ? newValue : newValue.toFixed(1)
            text.setText(`x3 = ${displayValue}pt`)

            if (multiplier > 1) {
                text.setFontStyle('bold'); text.setColor('#ffd700')
            } else {
                text.setFontStyle('normal'); text.setColor(SYMBOL_DATA[index].color)
            }
        })
    }

    private createControlPanel() {
        const panelY = 660
        this.spinButton = this.add.container(640, panelY)
        const spinBg = this.add.rectangle(0, 0, 220, 70, 0xe63946, 1).setInteractive({ useHandCursor: true })
        spinBg.setStrokeStyle(4, 0xffffff)
        this.spinButtonText = this.add.text(0, 0, 'SPIN (0.1)', { fontSize: '28px', fontStyle: 'bold', color: '#fff' }).setOrigin(0.5)
        this.spinButton.add([spinBg, this.spinButtonText])
        spinBg.on('pointerdown', () => { if (!this.isSpinning) { this.spinButton.y += 4; this.handleSpin() } })
        spinBg.on('pointerup', () => { this.spinButton.y -= 4 })

        this.x5Button = this.add.container(800, panelY)
        this.x5ButtonBg = this.add.rectangle(0, 0, 80, 50, 0x333333).setInteractive({ useHandCursor: true })
        this.x5ButtonBg.setStrokeStyle(2, 0x888888)
        const x5Text = this.add.text(0, 0, 'x5', { fontSize: '20px', fontStyle: 'bold', color: '#888' }).setOrigin(0.5)
        this.x5Button.add([this.x5ButtonBg, x5Text])
        this.x5ButtonBg.on('pointerdown', () => {
            this.isX5Mode = !this.isX5Mode
            this.updateButtons()
        })
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

    private createSettingsUI() {
        this.settingsButton = this.add.container(920, 660)
        const bg = this.add.circle(0, 0, 25, 0x333333).setInteractive({ useHandCursor: true })
        bg.setStrokeStyle(2, 0x888888)
        const icon = this.add.text(0, 0, '⚙️', { fontSize: '24px' }).setOrigin(0.5)
        this.settingsButton.add([bg, icon])
        bg.on('pointerdown', () => { this.toggleSettings(); this.settingsButton.y += 2 })
        bg.on('pointerup', () => this.settingsButton.y -= 2)
        this.createSettingsPanel()
    }

    private createSettingsPanel() {
        const centerX = 640; const centerY = 360
        this.settingsPanel = this.add.container(centerX, centerY).setVisible(false).setDepth(200)
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

    private createLogPanel() {
        const screenW = 1280
        const screenH = 720
        const panelW = 300

        // 화면 안쪽(1280-300=980) 또는 바깥(1280)
        const startX = this.isLogOpen ? screenW - panelW : screenW

        this.logPanel = this.add.container(startX, screenH / 2)
        this.logPanel.setDepth(1000)

        const bg = this.add.rectangle(panelW / 2, 0, panelW, screenH, 0x111111, 0.95)
        const border = this.add.rectangle(0, 0, 4, screenH, 0xffd700)

        // 잔액 표시
        const balanceContainer = this.add.container(panelW / 2, -300)
        const balanceTitle = this.add.text(0, -20, 'CURRENT BALANCE', { fontSize: '14px', color: '#888', fontStyle: 'bold' }).setOrigin(0.5)
        this.pointsText = this.add.text(0, 10, '0.0 P', { fontSize: '28px', color: '#4ade80', fontFamily: 'Arial Black' }).setOrigin(0.5)
        const divider = this.add.rectangle(0, 40, 240, 2, 0x333333)
        balanceContainer.add([balanceTitle, this.pointsText, divider])

        const logTitle = this.add.text(panelW / 2, -240, 'HISTORY', { fontSize: '16px', color: '#ffd700', fontStyle: 'bold' }).setOrigin(0.5)
        this.logContainer = this.add.container(20, -200)

        this.logPanel.add([bg, border, balanceContainer, logTitle, this.logContainer])
    }

    private toggleLogPanel() {
        this.isLogOpen = !this.isLogOpen
        const targetX = this.isLogOpen ? 1280 - 300 : 1280
        this.tweens.add({ targets: this.logPanel, x: targetX, duration: 300, ease: 'Power2' })
    }

    private addLog(type: string, message: string, change: number, current: number) {
        const time = new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
        this.logs.unshift({ type, message, change, current, time })
        if (this.logs.length > 30) this.logs.pop()
        this.renderLogs()
    }

    private renderLogs() {
        this.logContainer.removeAll(true)
        let y = 0
        this.logs.forEach(log => {
            let color = '#aaaaaa'
            if (log.change > 0) color = '#4ade80'
            else if (log.change < 0) color = '#f87171'

            const timeText = this.add.text(0, y, `[${log.time}]`, { fontSize: '12px', color: '#666' })
            const msgText = this.add.text(0, y + 15, log.message, { fontSize: '13px', color: '#fff', wordWrap: { width: 250 } })

            if (log.change !== 0) {
                const changeStr = log.change > 0 ? `+${log.change.toFixed(1)}` : `${log.change.toFixed(1)}`
                const changeText = this.add.text(250, y, `${changeStr}P`, { fontSize: '14px', color: color, fontStyle: 'bold' }).setOrigin(1, 0)
                const balText = this.add.text(250, y + 15, `(잔액: ${log.current.toFixed(1)})`, { fontSize: '11px', color: '#888' }).setOrigin(1, 0)
                this.logContainer.add([timeText, msgText, changeText, balText])
            } else {
                this.logContainer.add([timeText, msgText])
            }
            y += 55
        })
    }

    private async loadUserPoints() {
        const token = localStorage.getItem('token')
        if (!token) {
            this.playerPoints = 100.0; this.updatePointsText();
            this.addLog('info', '테스트 모드 (100P 지급)', 0, 100.0)
            return;
        }
        try {
            const res = await fetch('/api/user/me', { headers: { 'Authorization': `Bearer ${token}` } })
            if (res.ok) {
                const data = await res.json();
                this.playerPoints = data.points || 0;
                this.updatePointsText()
                this.addLog('info', `접속 성공`, 0, this.playerPoints)
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
        if (this.playerPoints < betAmount) { this.showFloatingText(640, 600, '포인트 부족!', '#ff0000'); return }

        // [수정] 스핀 시작 전 서버 확인 및 잠금
        this.isSpinning = true // 중복 실행 방지
        const previousPoints = this.playerPoints
        
        // 낙관적 업데이트
        this.playerPoints = parseFloat((this.playerPoints - betAmount).toFixed(1))
        this.updatePointsText()
        
        const token = localStorage.getItem('token')
        if (token) {
            try {
                const res = await fetch('/api/game/bet', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ action: 'bet', amount: betAmount })
                })
                
                if (!res.ok) {
                    throw new Error('Bet failed')
                }
                
                const data = await res.json()
                if (data && data.points !== undefined) {
                    // 서버 데이터로 정확하게 동기화
                    this.playerPoints = parseFloat(data.points.toFixed(1))
                    this.updatePointsText()
                    this.addLog('bet', `${this.isX5Mode ? 'MAX' : '기본'} 스핀 구매`, -betAmount, this.playerPoints)
                }
            } catch (err) {
                console.error(err)
                // 실패 시 롤백 및 중단
                this.playerPoints = previousPoints
                this.updatePointsText()
                this.showFloatingText(640, 600, '통신 오류!', '#ff0000')
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
        this.checkWin(finalResult, this.isX5Mode ? 5 : 1)
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

    private checkWin(matrix: string[][], multiplier: number) {
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
            this.processWin(jackpotWin, true)
        } else if (totalWin > 0) {
            this.processWin(totalWin, false)
            this.highlightLines(lines)
            if (lines.length > 1) {
                this.time.delayedCall(500, () => this.showFloatingText(640, 300, `${lines.length} COMBO!\nx${lines.length}`, '#ffaa00', 80))
            }
        }
    }

    private async processWin(amount: number, isJackpot: boolean) {
        // 우선 시각적 업데이트 (낙관적)
        this.playerPoints = parseFloat((this.playerPoints + amount).toFixed(1))
        this.updatePointsText()
        
        const msg = isJackpot ? `잭팟!` : `당첨!`
        
        // 서버 동기화 및 정확한 포인트 반영
        await this.syncWinToServer(amount, msg)

        if (isJackpot) {
            this.showFloatingText(640, 360, `JACKPOT\n+${amount}`, '#ff00ff', 100)
            this.cameras.main.shake(500, 0.05)
        } else {
            this.showFloatingText(640, 360, `+${amount.toFixed(1)}`, '#ffff00', 60)
        }
    }

    private async syncWinToServer(amount: number, msg: string) {
        const token = localStorage.getItem('token')
        if (token) {
            try {
                const res = await fetch('/api/game/bet', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ action: 'settle', amount, result: 'win' })
                })
                const data = await res.json()
                if (data && data.points !== undefined) {
                    // 서버 데이터로 덮어쓰기 (가장 정확함)
                    this.playerPoints = parseFloat(data.points.toFixed(1))
                    this.updatePointsText()
                    this.addLog('win', msg, amount, this.playerPoints)
                }
            } catch (err) {
                console.error(err)
                // 에러 처리 로직 (필요 시 재시도 등)
            }
        } else {
            this.addLog('win', msg, amount, this.playerPoints)
        }
    }

    private showFloatingText(x: number, y: number, msg: string, color: string, size: number = 48) {
        const text = this.add.text(x, y, msg, {
            fontSize: `${size}px`, fontFamily: 'Arial Black', color: color, stroke: '#000', strokeThickness: 6, align: 'center'
        }).setOrigin(0.5).setDepth(100).setScale(0)
        this.tweens.add({
            targets: text, scale: 1, duration: 500, ease: 'Back.out',
            onComplete: () => {
                this.tweens.add({ targets: text, y: y - 100, alpha: 0, duration: 1000, delay: 500, onComplete: () => text.destroy() })
            }
        })
    }

    private highlightLines(lines: any[]) {
        this.paylineGraphics.lineStyle(15, 0xffff00, 0.5)
        const centerY = 380; const symbolH = 140
        lines.forEach(line => {
            if (line.type === 'row') {
                const y = centerY + (line.index - 1) * symbolH
                this.paylineGraphics.lineBetween(640 - 280, y, 640 + 280, y)
            } else if (line.type === 'col') {
                const x = this.reels[line.index].container.x
                this.paylineGraphics.lineBetween(x, centerY - 220, x, centerY + 220)
            } else if (line.type === 'diag') {
                const x1 = 640 - 190; const x2 = 640 + 190
                const y1 = centerY - 140; const y2 = centerY + 140
                if (line.index === 0) this.paylineGraphics.lineBetween(x1 - 80, y1 - 60, x2 + 80, y2 + 60)
                else this.paylineGraphics.lineBetween(x1 - 80, y2 + 60, x2 + 80, y1 - 60)
            }
        })
        this.tweens.add({ targets: this.paylineGraphics, alpha: 0.2, yoyo: true, repeat: 3, duration: 200 })
    }
}

// --- Next.js 컴포넌트 ---
export default function SlotGamePage() {
    const gameRef = useRef<HTMLDivElement>(null)
    const gameInstance = useRef<Phaser.Game | null>(null)

    useEffect(() => {
        if (gameInstance.current) return
        if (!gameRef.current) return

        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            width: 1280,
            height: 720,
            parent: gameRef.current,
            backgroundColor: '#000',
            scene: [MainScene],
            physics: { default: 'arcade' },
            audio: { disableWebAudio: false, noAudio: false },
            disableContextMenu: true
        }

        gameInstance.current = new Phaser.Game(config)

        return () => {
            if (gameInstance.current) {
                gameInstance.current.destroy(true)
                gameInstance.current = null
            }
        }
    }, [])

    return (
        <div className="flex items-center justify-center min-h-screen bg-black">
            <div ref={gameRef} className="shadow-2xl" />
        </div>
    )
}