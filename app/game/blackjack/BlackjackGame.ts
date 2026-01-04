import { GameState, Card, Hand } from '../types'
import {
  createDeck,
  shuffleDeck,
  calculateHandScore,
  isBlackjack,
  isBust,
  isSameValue,
} from '../utils'

interface GameLog {
  type: 'bet' | 'win' | 'lose' | 'draw' | 'blackjack' | 'info'
  message: string
  time: string
  round: number
  betAmount?: number
  pointsChange?: number
  balance?: number
}

interface Chip {
  amount: number
  x: number
  y: number
  element: HTMLImageElement | null
}

interface Button {
  x: number
  y: number
  width: number
  height: number
  text: string
  onClick: () => void
  visible: boolean
}

export class BlackjackGame {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private gameState: GameState = GameState.IDLE

  private deck: Card[] = []
  private discardedCards: Card[] = []

  private playerHand: Hand = { cards: [], score: 0, isBlackjack: false, isBust: false }
  private dealerHand: Hand = { cards: [], score: 0, isBlackjack: false, isBust: false }

  private currentBet: number = 0
  private playerPoints: number = 0
  private initialBet: number = 0

  // 서버에서 받은 딜러 최종 점수를 저장
  private serverDealerFinalScore: number | null = null

  private insuranceBet: number = 0
  private insuranceInfo: { message: string; amount: number } | null = null

  private roundNumber: number = 0
  private isProcessing: boolean = false
  private gameSessionId: string | null = null

  // [최적화] 정적 배경 캐싱
  private staticCanvas: HTMLCanvasElement | null = null
  private staticCtx: CanvasRenderingContext2D | null = null

  private cardImages: Map<string, HTMLImageElement> = new Map()
  private cardBackImage: HTMLImageElement | null = null
  private tableImage: HTMLImageElement | null = null
  private imagesLoaded: number = 0
  private totalImages: number = 0

  private chipButtons: Chip[] = []
  private betChips: Chip[] = []
  private buttons: Button[] = []
  private dealButton: Button | null = null

  private logs: GameLog[] = []
  private logScrollOffset: number = 0

  private gameResult: {
    type: 'win' | 'lose' | 'draw' | 'blackjack' | null
    message: string
    winnings: number
    startTime: number
    visible: boolean
  } = {
    type: null,
    message: '',
    winnings: 0,
    startTime: 0,
    visible: false,
  }

  private animations: Array<{
    type: 'card' | 'chip' | 'discard' | 'flip'
    startX: number
    startY: number
    targetX: number
    targetY: number
    duration: number
    startTime: number
    card?: Card
    chip?: Chip
    faceUp?: boolean
    rotationStart?: number
    rotationTarget?: number
    flipRotation?: number
  }> = []

  private canvasWidth: number = 1200
  private canvasHeight: number = 800
  private sidebarWidth: number = 300
  private gameAreaWidth: number = 900

  private scaleFactor: number = 1
  private isMobile: boolean = false

  private get deckPosition() {
    if (this.isMobile) return { x: this.gameAreaWidth * 0.85, y: this.canvasHeight * 0.12 }
    return { x: this.gameAreaWidth * 0.85, y: this.canvasHeight * 0.15 }
  }

  private get playerPosition() {
    if (this.isMobile) return { x: this.gameAreaWidth * 0.5, y: this.canvasHeight * 0.55 }
    return { x: this.gameAreaWidth * 0.5, y: this.canvasHeight * 0.60 }
  }

  private get dealerPosition() {
    return { x: this.gameAreaWidth * 0.5, y: this.canvasHeight * 0.20 }
  }

  private get bettingArea() {
    return { x: this.gameAreaWidth * 0.5, y: this.canvasHeight * 0.40 }
  }

  private get chipTrayPosition() {
    if (this.isMobile) return { x: this.gameAreaWidth * 0.5, y: this.canvasHeight * 0.85 }
    return { x: this.gameAreaWidth * 0.5, y: this.canvasHeight * 0.88 }
  }

  // 카드 스프라이트 (카드 객체 참조 기반이므로, 서버 카드 갱신은 반드시 in-place로 해야 함)
  private cardSprites: Map<
    Card,
    { x: number; y: number; faceUp: boolean; rotation: number; flipRotation?: number }
  > = new Map()

  private onStateChange?: (state: GameState) => void
  private onMessage?: (message: string) => void
  private onLoadingProgress?: (progress: number) => void

  private animationFrameId: number | null = null
  private isRunning: boolean = false

  constructor(canvas: HTMLCanvasElement, betAmount: number = 0, width: number = 1200, height: number = 800) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.initialBet = betAmount

    this.resize(width, height)

    this.setupEventListeners()
    this.loadImages()
  }

  public resize(width: number, height: number) {
    this.canvasWidth = width
    this.canvasHeight = height
    this.canvas.width = width
    this.canvas.height = height

    this.isMobile = width < 768

    if (this.isMobile) {
      this.sidebarWidth = 0
      this.gameAreaWidth = width
      this.scaleFactor = Math.min(width / 400, 1.2)
    } else if (width < 1024) {
      this.sidebarWidth = width * 0.25
      this.gameAreaWidth = width - this.sidebarWidth
      this.scaleFactor = Math.min(width / 1000, 1.0)
    } else {
      this.sidebarWidth = 300
      this.gameAreaWidth = width - this.sidebarWidth
      this.scaleFactor = 1.0
    }

    if (this.gameState === GameState.BETTING) {
      this.createChipButtons()
      this.createDealButton()
    } else if (this.gameState === GameState.PLAYER_TURN) {
      this.createActionButtons()
    } else if (this.gameState === GameState.INSURANCE) {
      this.createInsuranceButtons()
    }

    this.cacheStaticLayer()

    if (!this.isRunning) {
      this.render()
    }
  }

  setStateChangeCallback(callback: (state: GameState) => void) {
    this.onStateChange = callback
  }

  setMessageCallback(callback: (message: string) => void) {
    this.onMessage = callback
  }

  setLoadingProgressCallback(callback: (progress: number) => void) {
    this.onLoadingProgress = callback
  }

  private changeState(newState: GameState) {
    this.gameState = newState
    this.onStateChange?.(newState)
    this.handleState()
  }

  private showMessage(text: string) {
    this.onMessage?.(text)
  }

  private addLog(
    type: 'bet' | 'win' | 'lose' | 'draw' | 'blackjack' | 'info',
    message: string,
    pointsChange?: number,
    balance?: number,
    betAmount?: number
  ) {
    const now = new Date()
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`

    this.logs.unshift({
      type,
      message,
      time: timeString,
      round: this.roundNumber,
      pointsChange,
      balance: balance !== undefined ? balance : this.playerPoints,
      betAmount,
    })

    if (this.logs.length > 50) this.logs.pop()
    this.logScrollOffset = 0
  }

  private setupEventListeners() {
    const handleInput = (clientX: number, clientY: number) => {
      const rect = this.canvas.getBoundingClientRect()
      const scaleX = this.canvas.width / rect.width
      const scaleY = this.canvas.height / rect.height
      const x = (clientX - rect.left) * scaleX
      const y = (clientY - rect.top) * scaleY
      this.handleClick(x, y)
    }

    this.canvas.addEventListener('click', (e) => handleInput(e.clientX, e.clientY))

    this.canvas.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length > 0) {
          e.preventDefault()
          handleInput(e.touches[0].clientX, e.touches[0].clientY)
        }
      },
      { passive: false }
    )

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect()
      const scaleX = this.canvas.width / rect.width
      const scaleY = this.canvas.height / rect.height
      const x = (e.clientX - rect.left) * scaleX
      const y = (e.clientY - rect.top) * scaleY
      this.canvas.style.cursor = this.getCursorAt(x, y)
    })

    this.canvas.addEventListener('wheel', (e) => {
      const rect = this.canvas.getBoundingClientRect()
      const x = e.clientX - rect.left

      if (!this.isMobile && x > this.gameAreaWidth) {
        e.preventDefault()
        const scrollAmount = e.deltaY > 0 ? 30 : -30
        const maxScroll = Math.max(0, this.logs.length * 30 - (this.canvasHeight - 200))
        this.logScrollOffset = Math.max(0, Math.min(maxScroll, this.logScrollOffset + scrollAmount))
        this.render()
      }
    })
  }

  private getCursorAt(x: number, y: number): string {
    if (x > this.gameAreaWidth) return 'default'

    const allButtons = [...this.buttons]
    if (this.dealButton) allButtons.push(this.dealButton)

    for (const button of allButtons) {
      if (button.visible) {
        if (x >= button.x && x <= button.x + button.width && y >= button.y && y <= button.y + button.height) {
          return 'pointer'
        }
      }
    }

    const chipRadius = (this.isMobile ? 30 : 35) * this.scaleFactor * 1.3
    for (const chip of this.chipButtons) {
      const dist = Math.hypot(x - chip.x, y - chip.y)
      if (dist <= chipRadius) return 'pointer'
    }

    if (this.gameState === GameState.BETTING) {
      for (const chip of this.betChips) {
        const dist = Math.hypot(x - chip.x, y - chip.y)
        if (dist <= chipRadius) return 'pointer'
      }
    }

    return 'default'
  }

  private handleClick(x: number, y: number) {
    if (this.isProcessing) return
    if (x > this.gameAreaWidth) return

    const allButtons = [...this.buttons]
    if (this.dealButton) allButtons.push(this.dealButton)

    for (const button of allButtons) {
      if (button.visible) {
        if (x >= button.x && x <= button.x + button.width && y >= button.y && y <= button.y + button.height) {
          button.onClick()
          return
        }
      }
    }

    const chipRadius = (this.isMobile ? 30 : 35) * this.scaleFactor * 1.3
    for (const chip of this.chipButtons) {
      const dist = Math.hypot(x - chip.x, y - chip.y)
      if (dist <= chipRadius) {
        this.addChipToTable(chip.amount)
        return
      }
    }

    if (this.gameState === GameState.BETTING) {
      for (let i = this.betChips.length - 1; i >= 0; i--) {
        const chip = this.betChips[i]
        const dist = Math.hypot(x - chip.x, y - chip.y)
        if (dist <= chipRadius) {
          this.removeChipFromTable(i, chip.amount)
          return
        }
      }
    }
  }

  private async loadImages() {
    this.tableImage = await this.loadImage('https://images.unsplash.com/photo-1614294148950-1f23c7153a1e?w=800&q=80').catch(
      () => null
    )

    this.cardBackImage = await this.loadImage('https://deckofcardsapi.com/static/img/back.png')

    const suits = ['hearts', 'diamonds', 'clubs', 'spades']
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
    const suitMap: Record<string, string> = { hearts: 'H', diamonds: 'D', clubs: 'C', spades: 'S' }

    this.totalImages = suits.length * values.length + 2
    this.imagesLoaded = 0

    const promises: Promise<any>[] = []

    for (const suit of suits) {
      for (const value of values) {
        const valueCode = value === '10' ? '0' : value.charAt(0)
        const suitCode = suitMap[suit]
        const cardKey = `card-${suit}-${value}`
        const url = `https://deckofcardsapi.com/static/img/${valueCode}${suitCode}.png`

        promises.push(
          this.loadImage(url).then((img) => {
            this.cardImages.set(cardKey, img)
            this.updateLoadingProgress()
          })
        )
      }
    }

    promises.push(
      this.loadImage('https://images.unsplash.com/photo-1614294148950-1f23c7153a1e?w=800&q=80')
        .then((img) => {
          this.tableImage = img
          this.updateLoadingProgress()
        })
        .catch(() => {
          this.tableImage = null
          this.updateLoadingProgress()
        })
    )

    promises.push(
      this.loadImage('https://deckofcardsapi.com/static/img/back.png')
        .then((img) => {
          this.cardBackImage = img
          this.updateLoadingProgress()
        })
        .catch(() => {
          this.updateLoadingProgress()
          return null
        })
    )

    await Promise.all(promises)

    this.cacheStaticLayer()
    this.loadUserPoints()
  }

  private cacheStaticLayer() {
    this.staticCanvas = document.createElement('canvas')
    this.staticCanvas.width = this.canvasWidth
    this.staticCanvas.height = this.canvasHeight
    this.staticCtx = this.staticCanvas.getContext('2d')
    if (!this.staticCtx) return

    const ctx = this.staticCtx

    ctx.fillStyle = '#0a3d20'
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)

    if (this.tableImage) {
      ctx.drawImage(this.tableImage, 0, 0, this.gameAreaWidth, this.canvasHeight)
    } else {
      this.drawTablePattern(ctx)
    }

    if (this.sidebarWidth > 0) {
      const sx = this.gameAreaWidth
      const w = this.sidebarWidth

      ctx.fillStyle = '#1e293b'
      ctx.fillRect(sx, 0, w, this.canvasHeight)

      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(sx, 0)
      ctx.lineTo(sx, this.canvasHeight)
      ctx.stroke()

      ctx.fillStyle = '#94a3b8'
      ctx.font = 'bold 20px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('HISTORY', sx + 20, 40)
    }
  }

  private updateLoadingProgress() {
    this.imagesLoaded++
    if (this.onLoadingProgress) {
      const progress = Math.min(100, Math.round((this.imagesLoaded / this.totalImages) * 100))
      this.onLoadingProgress(progress)
    }
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })
  }

  private async loadUserPoints() {
    const token = localStorage.getItem('token')
    if (!token) {
      this.playerPoints = 10000
      this.addLog('info', '체험판(데모) 모드 - 10,000P 지급됨', 0, 10000)
      this.changeState(GameState.SHUFFLE)
      return
    }

    try {
      const response = await fetch('/api/user/me', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        this.playerPoints = data.points || 0
        this.addLog('info', `접속 성공 - 시작포인트: ${this.playerPoints.toLocaleString()} P`, 0, this.playerPoints)
      } else {
        this.playerPoints = 10000
      }
    } catch (error) {
      console.error('Failed to load user points:', error)
      this.playerPoints = 10000
    }

    this.changeState(GameState.SHUFFLE)
  }

  private handleState() {
    switch (this.gameState) {
      case GameState.SHUFFLE:
        this.handleShuffle()
        break
      case GameState.BETTING:
        this.handleBetting()
        break
      case GameState.DEAL_START:
        this.handleDealStart()
        break
      case GameState.INSURANCE:
        this.handleInsurance()
        break
      case GameState.CHECK_BLACKJACK:
        this.handleCheckBlackjack()
        break
      case GameState.PLAYER_TURN:
        this.handlePlayerTurn()
        break
      case GameState.DEALER_TURN:
        this.handleDealerTurn()
        break
      case GameState.SETTLEMENT:
        this.handleSettlement()
        break
      case GameState.ROUND_END:
        this.handleRoundEnd()
        break
    }
  }

  private handleShuffle() {
    this.deck = this.createDeckExcludingDiscarded()
    setTimeout(() => {
      if (this.roundNumber === 0) this.roundNumber = 1
      this.changeState(GameState.BETTING)
      if (this.currentBet === 0) this.showMessage('베팅을 해주세요')
    }, 800)
  }

  private createDeckExcludingDiscarded(): Card[] {
    const allCards = createDeck()
    const discardedSet = new Set(this.discardedCards.map((card) => `${card.suit}-${card.value}`))
    const availableCards = allCards.filter((card) => !discardedSet.has(`${card.suit}-${card.value}`))

    if (availableCards.length < 20) {
      this.discardedCards = []
      return shuffleDeck(createDeck())
    }

    return shuffleDeck(availableCards)
  }

  private handleBetting() {
    this.createChipButtons()
    this.createDealButton()
    this.isProcessing = false

    if (this.initialBet > 0 && this.currentBet === 0) {
      this.addChipToTable(this.initialBet)
      this.initialBet = 0
    }

    if (this.currentBet === 0) this.showMessage('베팅을 해주세요')
  }

  private createChipButtons() {
    const betAmounts = [1, 5, 10, 50, 100]
    const spacing = this.isMobile ? this.gameAreaWidth * 0.16 : this.gameAreaWidth * 0.12
    const startX = this.chipTrayPosition.x - ((betAmounts.length - 1) * spacing) / 2

    this.chipButtons = betAmounts.map((amount, index) => ({
      amount,
      x: startX + index * spacing,
      y: this.chipTrayPosition.y,
      element: null,
    }))
  }

  private createDealButton() {
    const w = (this.isMobile ? 120 : this.gameAreaWidth * 0.2) * 1
    const h = (this.isMobile ? 50 : 50) * this.scaleFactor

    this.dealButton = {
      x: this.gameAreaWidth * 0.5 - w / 2,
      y: this.isMobile ? this.canvasHeight * 0.50 : this.canvasHeight * 0.55,
      width: w,
      height: h,
      text: 'DEAL',
      onClick: async () => {
        if (this.isProcessing) return
        if (this.currentBet > 0) {
          await this.confirmBet()
        } else {
          this.showMessage('베팅을 해주세요!')
        }
      },
      visible: this.currentBet > 0,
    }
  }

  private addChipToTable(amount: number) {
    if (this.playerPoints < amount) return

    const chipCount = this.betChips.length
    const jitterX = (Math.random() - 0.5) * 5
    const jitterY = (Math.random() - 0.5) * 5

    const chip: Chip = {
      amount,
      x: this.bettingArea.x + jitterX,
      y: this.bettingArea.y - chipCount * 4 + jitterY,
      element: null,
    }

    const startChip = this.chipButtons.find((c) => c.amount === amount)

    this.animations.push({
      type: 'chip',
      startX: startChip ? startChip.x : this.chipTrayPosition.x,
      startY: startChip ? startChip.y : this.canvasHeight,
      targetX: chip.x,
      targetY: chip.y,
      duration: 400,
      startTime: Date.now(),
      chip,
    })

    this.betChips.push(chip)
    this.currentBet += amount
    this.playerPoints -= amount

    if (this.dealButton) this.dealButton.visible = true
  }

  private removeChipFromTable(index: number, amount: number) {
    this.betChips.splice(index, 1)
    this.currentBet -= amount
    this.playerPoints += amount
    if (this.currentBet === 0 && this.dealButton) this.dealButton.visible = false
  }

  /**
   * ✅ 핵심: 서버 카드 적용은 "in-place"로 갱신해서
   * cardSprites(Map<Card,...>)가 깨지지 않도록 한다.
   */
  private applyServerCardsToHand(targetHand: Hand, serverCards: any[], options?: { hideSecondDealerCard?: boolean }) {
    const hideSecondDealerCard = options?.hideSecondDealerCard === true

    // 필요한 길이까지 card 객체 유지/생성
    for (let i = 0; i < serverCards.length; i++) {
      const s = serverCards[i]
      if (!targetHand.cards[i]) {
        targetHand.cards[i] = {
          suit: s.suit,
          value: s.value,
          faceUp: s.faceUp !== false,
        } as Card
      } else {
        // 기존 객체를 유지한 채 값만 업데이트
        targetHand.cards[i].suit = s.suit
        targetHand.cards[i].value = s.value
        targetHand.cards[i].faceUp = s.faceUp !== false
      }
    }

    // 서버가 준 카드 길이보다 hand가 길면 잘라냄
    if (targetHand.cards.length > serverCards.length) {
      // 잘려나가는 카드들의 스프라이트는 정리 (고스트 카드 방지)
      for (let i = serverCards.length; i < targetHand.cards.length; i++) {
        const c = targetHand.cards[i]
        this.cardSprites.delete(c)
      }
      targetHand.cards.length = serverCards.length
    }

    // 딜러 2번째 카드를 숨기는 모드(보안용): placeholder를 유지
    if (hideSecondDealerCard) {
      // 딜러는 최소 2장 구조가 필요
      if (!targetHand.cards[1]) {
        targetHand.cards[1] = { suit: 'spades' as any, value: 'A', faceUp: false } as Card
      } else {
        targetHand.cards[1].faceUp = false
      }
    }
  }

  private ensureSprite(card: Card, faceUp: boolean) {
    const sprite = this.cardSprites.get(card)
    if (!sprite) {
      this.cardSprites.set(card, {
        x: this.deckPosition.x,
        y: this.deckPosition.y,
        faceUp,
        rotation: Math.random() * Math.PI,
      })
      return
    }
    sprite.faceUp = faceUp
  }

  private async confirmBet(): Promise<boolean> {
    if (this.isProcessing) return false
    this.isProcessing = true

    const token = localStorage.getItem('token')
    if (!token) {
      this.showMessage('로그인이 필요합니다.')
      this.isProcessing = false
      return false
    }

    if (this.dealButton) this.dealButton.visible = false

    try {
      const response = await fetch('/api/game/blackjack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'start', betAmount: this.currentBet }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        this.showMessage(errorData.error || '베팅에 실패했습니다.')
        this.playerPoints += this.currentBet
        this.currentBet = 0
        this.betChips = []
        if (this.dealButton) this.dealButton.visible = false
        this.isProcessing = false
        return false
      }

      const data = await response.json()

      this.gameSessionId = data.sessionId
      this.playerPoints = data.points

      // ✅ in-place로 적용 (스프라이트 깨짐 방지)
      const prevPlayerLen = this.playerHand.cards.length
      this.applyServerCardsToHand(this.playerHand, data.playerCards)

      // 딜러는 1번 카드만 적용하고 2번은 placeholder로 숨김
      this.applyServerCardsToHand(this.dealerHand, [data.dealerCards[0]], { hideSecondDealerCard: true })

      // 스프라이트 보장
      this.playerHand.cards.forEach((c) => this.ensureSprite(c, c.faceUp !== false))
      this.dealerHand.cards.forEach((c, idx) => this.ensureSprite(c, idx === 0 ? c.faceUp !== false : false))

      await this.animateServerCards(prevPlayerLen)

      this.updateScores()

      const dealerUp = this.dealerHand.cards[0]
      if (dealerUp?.value === 'A') this.changeState(GameState.INSURANCE)
      else this.changeState(GameState.CHECK_BLACKJACK)

      this.isProcessing = false
      return true
    } catch (error) {
      console.error('Betting error:', error)
      this.showMessage('베팅 중 오류가 발생했습니다.')
      this.playerPoints += this.currentBet
      this.currentBet = 0
      this.betChips = []
      if (this.dealButton) this.dealButton.visible = false
      this.isProcessing = false
      return false
    }
  }

  private async animateServerCards(prevPlayerLen: number): Promise<void> {
    // 기존 카드 애니메이션 정리
    this.animations = this.animations.filter((anim) => anim.type !== 'card')

    // 플레이어: 새로 늘어난 카드만 애니메이션 (기존 카드까지 다시 날리면 어색함)
    for (let i = prevPlayerLen; i < this.playerHand.cards.length; i++) {
      const card = this.playerHand.cards[i]
      await this.animateCardToPosition('player', card, true, i)
    }

    // 딜러: 최초 시작이면 2장(1장은 앞, 2장은 뒤) 애니메이션
    // 이미 스프라이트가 있으면 중복 애니메이션을 피함
    for (let i = 0; i < this.dealerHand.cards.length; i++) {
      const card = this.dealerHand.cards[i]
      const sprite = this.cardSprites.get(card)
      if (!sprite) continue
      // sprite가 덱 근처면 애니메이션 (초기만)
      const nearDeck = Math.hypot(sprite.x - this.deckPosition.x, sprite.y - this.deckPosition.y) < 5
      if (nearDeck) {
        await this.animateCardToPosition('dealer', card, i === 0, i)
      }
    }
  }

  private async animateCardToPosition(target: 'player' | 'dealer', card: Card, faceUp: boolean, index: number) {
    const spacing = (this.isMobile ? 25 : 30) * this.scaleFactor
    const targetHand = target === 'player' ? this.playerHand : this.dealerHand
    const totalW = (targetHand.cards.length - 1) * spacing

    const baseX = target === 'player' ? this.playerPosition.x : this.dealerPosition.x
    const baseY = target === 'player' ? this.playerPosition.y : this.dealerPosition.y

    const targetX = baseX + index * spacing - totalW / 2
    const targetY = baseY

    this.ensureSprite(card, faceUp)
    const sprite = this.cardSprites.get(card)!
    const rotationStart = sprite.rotation

    // 중복 애니메이션 방지
    const existing = this.animations.find((a) => a.type === 'card' && a.card === card)
    if (existing) return

    this.animations.push({
      type: 'card',
      startX: this.deckPosition.x,
      startY: this.deckPosition.y,
      targetX,
      targetY,
      duration: 500,
      startTime: Date.now(),
      card,
      faceUp,
      rotationStart,
      rotationTarget: 0,
    })

    await this.delay(280)
  }

  private async handleDealStart() {
    // confirmBet에서 처리
  }

  private handleInsurance() {
    this.createInsuranceButtons()
    this.showMessage('Insurance?')
  }

  private createInsuranceButtons() {
    const w = 120 * this.scaleFactor
    const h = 40 * this.scaleFactor
    const cx = this.gameAreaWidth * 0.5
    const cy = this.canvasHeight * 0.5

    this.buttons = [
      { x: cx - w - 10, y: cy, width: w, height: h, text: 'Insurance', onClick: () => this.buyInsurance(), visible: true },
      { x: cx + 10, y: cy, width: w, height: h, text: 'No Thanks', onClick: () => this.declineInsurance(), visible: true },
    ]
  }

  private buyInsurance() {
    if (this.isProcessing) return
    const insuranceAmount = Math.floor(this.currentBet * 0.5)

    if (this.playerPoints < insuranceAmount) {
      this.showMessage('포인트가 부족합니다.')
      return
    }

    this.insuranceInfo = {
      message: `Insurance (-${insuranceAmount.toLocaleString()} P)`,
      amount: insuranceAmount,
    }

    this.playerPoints -= insuranceAmount
    this.insuranceBet = insuranceAmount
    this.showMessage('Insurance Purchased')

    this.buttons = []
    this.changeState(GameState.CHECK_BLACKJACK)
  }

  private declineInsurance() {
    if (this.isProcessing) return
    this.buttons = []
    this.changeState(GameState.CHECK_BLACKJACK)
  }

  private handleCheckBlackjack() {
    this.updateScores()
    if (isBlackjack(this.playerHand)) {
      // 플레이어가 블랙잭이면 서버 결과에 따라 정산 (일단 딜러 턴으로 넘김)
      this.changeState(GameState.DEALER_TURN)
    } else {
      this.changeState(GameState.PLAYER_TURN)
    }
  }

  private handlePlayerTurn() {
    this.createActionButtons()
    this.isProcessing = false
  }

  /**
   * ✅ 버튼-점수 겹침 제거:
   * - 버튼 y를 "칩 트레이 위"로 올려서 카드/점수 영역과 분리
   */
  private createActionButtons() {
    const actions = ['HIT', 'STAND', 'DOUBLE']
    if (this.playerHand.cards.length === 2 && isSameValue(this.playerHand.cards[0], this.playerHand.cards[1])) {
      actions.push('SPLIT')
    }

    const btnW = (this.isMobile ? 80 : 100) * this.scaleFactor
    const btnH = (this.isMobile ? 50 : 45) * this.scaleFactor
    const gap = (this.isMobile ? 10 : 15) * this.scaleFactor

    const totalW = actions.length * btnW + (actions.length - 1) * gap
    const startX = (this.gameAreaWidth - totalW) / 2

    const chipTop = this.chipTrayPosition.y - (this.isMobile ? 95 : 110) * this.scaleFactor
    const cardH = 130 * this.scaleFactor
    const playerBottom = this.playerPosition.y + cardH / 2 + (this.isMobile ? 55 : 65) * this.scaleFactor

    // 버튼은 (플레이어 카드 아래)와 (칩 위) 사이에 안전하게 배치
    const y = Math.min(chipTop, playerBottom)

    this.buttons = actions.map((text, i) => ({
      x: startX + i * (btnW + gap),
      y,
      width: btnW,
      height: btnH,
      text,
      onClick: () => {
        if (this.isProcessing) return
        if (text === 'HIT') this.playerHit()
        if (text === 'STAND') this.playerStand()
        if (text === 'DOUBLE') this.playerDouble()
        if (text === 'SPLIT') this.playerSplit()
      },
      visible: true,
    }))
  }

  private async playerHit() {
    if (!this.gameSessionId) return
    this.isProcessing = true

    const token = localStorage.getItem('token')
    if (!token) {
      this.showMessage('로그인이 필요합니다.')
      this.isProcessing = false
      return
    }

    try {
      const prevLen = this.playerHand.cards.length

      const response = await fetch('/api/game/blackjack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'hit', sessionId: this.gameSessionId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        this.showMessage(errorData.error || 'Hit 실패')
        this.isProcessing = false
        return
      }

      const data = await response.json()

      // ✅ in-place 적용
      this.applyServerCardsToHand(this.playerHand, data.playerCards)
      // 새 카드(늘어난 카드)만 애니메이션
      if (this.playerHand.cards.length > prevLen) {
        const lastCard = this.playerHand.cards[this.playerHand.cards.length - 1]
        lastCard.faceUp = true
        await this.animateCardToPosition('player', lastCard, true, this.playerHand.cards.length - 1)
      }

      this.updateScores()

      if (data.bust || data.result === 'lose' || this.playerHand.isBust) {
        // 버스트면 딜러 2번째 카드 공개 + 점수 표시까지
        await this.revealDealerSecondCardFromServer(token, true)
        this.updateScores()

        if (data.points !== undefined) this.playerPoints = data.points
        this.buttons = []
        await this.settleGame('lose', data.points)
      } else {
        this.isProcessing = false
      }
    } catch (error) {
      console.error('Hit error:', error)
      this.showMessage('Hit 중 오류가 발생했습니다.')
      this.isProcessing = false
    }
  }

  /**
   * ✅ Stand 시 요구사항:
   * - 딜러 2번째 카드 공개(Flip)
   * - 공개 즉시 딜러 합(점수) 표시
   * - 이후 딜러 draw 처리(서버 기반)
   */
  private async playerStand() {
    if (!this.gameSessionId) return
    this.isProcessing = true
    this.buttons = []

    const token = localStorage.getItem('token')
    if (!token) {
      this.showMessage('로그인이 필요합니다.')
      this.isProcessing = false
      return
    }

    try {
      const response = await fetch('/api/game/blackjack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'stand', sessionId: this.gameSessionId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        this.showMessage(errorData.error || 'Stand 실패')
        this.isProcessing = false
        return
      }

      const data = await response.json()

      // (옵션) 서버 최종 딜러 점수를 받는다면 저장 (있을 때만)
      if (typeof data.dealerFinalScore === 'number') this.serverDealerFinalScore = data.dealerFinalScore

      // ✅ 딜러 2번째 카드 공개 + 즉시 점수 표시
      // 서버 응답에 딜러 카드가 있으면 직접 사용
      if (data.dealerCards && data.dealerCards.length >= 2) {
        const dealerSecondCard = data.dealerCards[1]
        if (!this.dealerHand.cards[1]) {
          this.dealerHand.cards[1] = { ...dealerSecondCard, faceUp: false } as Card
        } else {
          this.dealerHand.cards[1].suit = dealerSecondCard.suit
          this.dealerHand.cards[1].value = dealerSecondCard.value
        }
        this.dealerHand.cards[1].faceUp = true
        const sprite = this.cardSprites.get(this.dealerHand.cards[1])
        if (sprite) {
          sprite.faceUp = true
        } else {
          this.ensureSprite(this.dealerHand.cards[1], true)
        }
      } else {
        // 서버 응답에 없으면 별도 API 호출
        await this.revealDealerSecondCardFromServer(token, true)
      }
      
      // 딜러 두 번째 카드가 확실히 공개되었는지 확인
      if (this.dealerHand.cards[1]) {
        this.dealerHand.cards[1].faceUp = true
        const sprite = this.cardSprites.get(this.dealerHand.cards[1])
        if (sprite) sprite.faceUp = true
      }
      
      this.updateScores(this.serverDealerFinalScore ?? undefined)

      // ✅ 딜러 추가 카드가 필요하다면 서버에서 단계적으로 받아 애니메이션
      const dealerCardCount = data.dealerCardCount || this.dealerHand.cards.length
      if (dealerCardCount > this.dealerHand.cards.length) {
        while (this.dealerHand.cards.length < dealerCardCount) {
          try {
            const dealerCardResponse = await fetch('/api/game/blackjack', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                action: 'dealerHit',
                sessionId: this.gameSessionId,
                currentCardCount: this.dealerHand.cards.length,
              }),
            })

            if (!dealerCardResponse.ok) break
            const dealerCardData = await dealerCardResponse.json()
            if (!dealerCardData.dealerCard) break

            // 새 카드 객체 생성(추가분은 기존이 없으니)
            const newCard: Card = { ...dealerCardData.dealerCard, faceUp: true }
            this.dealerHand.cards.push(newCard)
            this.ensureSprite(newCard, true)

            await this.animateCardToPosition('dealer', newCard, true, this.dealerHand.cards.length - 1)
            this.updateScores(this.serverDealerFinalScore ?? undefined)

            if (this.dealerHand.score >= 17) break
          } catch (e) {
            console.error('Dealer hit error:', e)
            break
          }

          await this.delay(650)
        }
      }

      // 서버 포인트 반영
      if (data.points !== undefined) this.playerPoints = data.points

      // 최종 정산(UI)
      await this.settleGame(data.result, data.points)
    } catch (error) {
      console.error('Stand error:', error)
      this.showMessage('Stand 중 오류가 발생했습니다.')
      this.isProcessing = false
    }
  }

  private async playerDouble() {
    if (!this.gameSessionId) return
    this.isProcessing = true

    if (this.playerPoints < this.currentBet) {
      this.showMessage('포인트가 부족합니다.')
      this.isProcessing = false
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      this.showMessage('로그인이 필요합니다.')
      this.isProcessing = false
      return
    }

    try {
      const prevLen = this.playerHand.cards.length

      const response = await fetch('/api/game/blackjack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'double', sessionId: this.gameSessionId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        this.showMessage(errorData.error || 'Double Down 실패')
        this.isProcessing = false
        return
      }

      const data = await response.json()

      // 서버 포인트 및 베팅 업데이트
      if (data.points !== undefined) this.playerPoints = data.points
      this.currentBet *= 2

      // ✅ in-place 업데이트
      this.applyServerCardsToHand(this.playerHand, data.playerCards)
      if (this.playerHand.cards.length > prevLen) {
        const last = this.playerHand.cards[this.playerHand.cards.length - 1]
        last.faceUp = true
        await this.animateCardToPosition('player', last, true, this.playerHand.cards.length - 1)
      }

      // 딜러 2번째는 공개되어야 함
      await this.revealDealerSecondCardFromServer(token, true)
      this.updateScores()

      // 서버 결과로 정산
      await this.settleGame(data.result, data.points)
    } catch (error) {
      console.error('Double down error:', error)
      this.showMessage('Double Down 중 오류가 발생했습니다.')
      this.isProcessing = false
    }
  }

  private playerSplit() {
    this.showMessage('Split 기능은 준비중입니다.')
  }

  private async revealDealerSecondCardFromServer(token: string, withFlip: boolean) {
    if (!this.gameSessionId) return

    try {
      const secondCardResponse = await fetch('/api/game/blackjack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'getDealerSecondCard', sessionId: this.gameSessionId }),
      })

      if (!secondCardResponse.ok) {
        console.error('Failed to get dealer second card:', secondCardResponse.status)
        // 실패해도 카드가 이미 있으면 공개만 시도
        if (this.dealerHand.cards[1]) {
          this.dealerHand.cards[1].faceUp = true
          const sprite = this.cardSprites.get(this.dealerHand.cards[1])
          if (sprite) sprite.faceUp = true
        }
        return
      }
      
      const secondCardData = await secondCardResponse.json()
      if (!secondCardData.dealerSecondCard) {
        console.error('No dealer second card in response')
        // 응답에 카드가 없어도 이미 있는 카드를 공개
        if (this.dealerHand.cards[1]) {
          this.dealerHand.cards[1].faceUp = true
          const sprite = this.cardSprites.get(this.dealerHand.cards[1])
          if (sprite) sprite.faceUp = true
        }
        return
      }

      // ✅ placeholder(기존 객체)를 유지한 채 값만 바꾼다 (스프라이트 유지)
      if (!this.dealerHand.cards[1]) {
        this.dealerHand.cards[1] = { ...secondCardData.dealerSecondCard, faceUp: false } as Card
      } else {
        this.dealerHand.cards[1].suit = secondCardData.dealerSecondCard.suit
        this.dealerHand.cards[1].value = secondCardData.dealerSecondCard.value
        this.dealerHand.cards[1].faceUp = false
      }

      const secondCard = this.dealerHand.cards[1]
      this.ensureSprite(secondCard, false)

      // flip 애니메이션
      if (withFlip) {
        const sprite = this.cardSprites.get(secondCard)
        if (sprite) {
          sprite.faceUp = false
          sprite.flipRotation = 0

          this.animations.push({
            type: 'flip',
            startX: sprite.x,
            startY: sprite.y,
            targetX: sprite.x,
            targetY: sprite.y,
            duration: 600,
            startTime: Date.now(),
            card: secondCard,
            faceUp: true,
            flipRotation: 0,
          })

          await this.delay(650)
          const finalSprite = this.cardSprites.get(secondCard)
          if (finalSprite) {
            finalSprite.faceUp = true
            finalSprite.flipRotation = undefined
          }
          secondCard.faceUp = true
        } else {
          // sprite가 없으면 즉시 공개
          secondCard.faceUp = true
          this.ensureSprite(secondCard, true)
        }
      } else {
        secondCard.faceUp = true
        const sprite = this.cardSprites.get(secondCard)
        if (sprite) sprite.faceUp = true
      }
    } catch (error) {
      console.error('Get dealer second card error:', error)
      // 에러가 발생해도 이미 있는 카드를 공개 시도
      if (this.dealerHand.cards[1]) {
        this.dealerHand.cards[1].faceUp = true
        const sprite = this.cardSprites.get(this.dealerHand.cards[1])
        if (sprite) sprite.faceUp = true
      }
    }
  }

  private async handleDealerTurn() {
    this.isProcessing = true
    this.revealDealerCard()
    await this.delay(500)
    this.updateScores()

    while (this.dealerHand.score < 17) {
      await this.dealCardLocal('dealer', true, this.dealerHand.cards.length)
      this.updateScores()
    }
    this.changeState(GameState.SETTLEMENT)
  }

  private revealDealerCard() {
    const hidden = this.dealerHand.cards.find((c) => !c.faceUp)
    if (hidden) hidden.faceUp = true
  }

  // (로컬 fallback) 서버가 아닌 경우에만 사용
  private async dealCardLocal(target: 'player' | 'dealer', faceUp: boolean, index: number) {
    if (this.deck.length === 0) this.deck = createDeck()
    const card = this.deck.pop()!
    card.faceUp = faceUp

    const targetHand = target === 'player' ? this.playerHand : this.dealerHand
    targetHand.cards.push(card)

    this.ensureSprite(card, faceUp)

    await this.animateCardToPosition(target, card, faceUp, index)
  }

  private handleSettlement() {
    this.isProcessing = true
    this.updateScores()

    const pScore = this.playerHand.score
    const dScore = this.dealerHand.score
    let result: 'win' | 'lose' | 'draw' | 'blackjack' = 'lose'

    if (this.playerHand.isBust) {
      result = 'lose'
      this.showMessage('버스트 패배!')
    } else if (this.dealerHand.isBust) {
      result = 'win'
      this.showMessage('딜러 버스트 승리!')
    } else if (isBlackjack(this.playerHand) && isBlackjack(this.dealerHand)) {
      result = 'draw'
    } else if (isBlackjack(this.playerHand)) {
      result = 'blackjack'
    } else if (pScore > dScore) {
      result = 'win'
    } else if (pScore < dScore) {
      result = 'lose'
    } else {
      result = 'draw'
    }

    this.settleGame(result)
  }

  private async settleGame(result: 'win' | 'lose' | 'draw' | 'blackjack', serverPoints?: number) {
    if (serverPoints !== undefined) this.playerPoints = serverPoints

    let message = ''
    let winnings = 0

    if (result === 'win') {
      winnings = this.currentBet * 2
      message = '승리!'
    } else if (result === 'blackjack') {
      winnings = Math.floor(this.currentBet * 2.5)
      message = '블랙잭!'
    } else if (result === 'draw') {
      winnings = this.currentBet
      message = '무승부'
    } else {
      winnings = 0
      message = '패배'
    }

    this.updateScores(this.serverDealerFinalScore ?? undefined)

    this.gameResult = {
      type: result,
      message,
      winnings: result === 'draw' ? 0 : winnings - this.currentBet,
      startTime: Date.now(),
      visible: true,
    }

    let logMsg = ''
    let pointsChange = 0

    if (result === 'win' || result === 'blackjack') {
      pointsChange = winnings - this.currentBet
      logMsg = 'WIN'
    } else if (result === 'draw') {
      pointsChange = 0
      logMsg = 'DRAW (Push)'
    } else {
      pointsChange = -this.currentBet
      logMsg = 'LOSE'
    }

    if (this.insuranceInfo) logMsg += `\n${this.insuranceInfo.message}`

    this.addLog(result === 'blackjack' ? 'win' : (result as any), logMsg, pointsChange, this.playerPoints, this.currentBet)

    await this.delay(3000)
    this.gameResult.visible = false

    await this.delay(500)
    this.handleRoundEnd()
  }

  private async handleRoundEnd() {
    await this.discardCards()

    // 상태 초기화
    this.playerHand = { cards: [], score: 0, isBlackjack: false, isBust: false }
    this.dealerHand = { cards: [], score: 0, isBlackjack: false, isBust: false }
    this.betChips = []
    this.currentBet = 0
    this.initialBet = 0

    this.insuranceBet = 0
    this.insuranceInfo = null

    this.gameSessionId = null
    this.serverDealerFinalScore = null

    this.cardSprites.clear()
    this.animations = []
    this.buttons = []
    this.dealButton = null

    this.gameResult = { type: null, message: '', winnings: 0, startTime: 0, visible: false }

    this.isProcessing = false

    this.roundNumber++
    this.changeState(GameState.SHUFFLE)
  }

  private async discardCards() {
    const discardX = this.canvasWidth - 50
    const discardY = this.canvasHeight * 0.5

    const allCards = [...this.playerHand.cards, ...this.dealerHand.cards]
    if (allCards.length === 0) return

    for (let i = 0; i < allCards.length; i++) {
      const card = allCards[i]
      const sprite = this.cardSprites.get(card)

      if (sprite) {
        this.animations.push({
          type: 'discard',
          startX: sprite.x,
          startY: sprite.y,
          targetX: discardX,
          targetY: discardY + i * 2,
          duration: 500,
          startTime: Date.now(),
          card,
          rotationStart: sprite.rotation,
          rotationTarget: Math.PI * 0.5,
        })

        this.discardedCards.push(card)
      }

      await this.delay(40)
    }

    await this.delay(600)

    allCards.forEach((card) => this.cardSprites.delete(card))
  }

  private delay(ms: number) {
    return new Promise((r) => setTimeout(r, ms))
  }

  private updateScores(useServerDealerScore?: number) {
    // 플레이어: 공개 카드만
    const visiblePlayerCards = this.playerHand.cards.filter((c) => c.faceUp !== false)
    this.playerHand.score = calculateHandScore({ cards: visiblePlayerCards })

    // 딜러: 서버 점수 우선(있을 때만), 없으면 공개 카드 기준
    const serverScore =
      useServerDealerScore !== undefined ? useServerDealerScore : this.serverDealerFinalScore

    if (serverScore !== null && typeof serverScore === 'number' && serverScore > 0) {
      this.dealerHand.score = serverScore
    } else {
      const visibleDealerCards = this.dealerHand.cards.filter((c) => c.faceUp === true)
      this.dealerHand.score = calculateHandScore({ cards: visibleDealerCards })
    }

    this.playerHand.isBust = isBust(this.playerHand)
    this.playerHand.isBlackjack = isBlackjack(this.playerHand)
    this.dealerHand.isBust = isBust(this.dealerHand)
  }

  start() {
    if (this.isRunning) return
    this.isRunning = true
    this.render()
  }

  render() {
    if (!this.isRunning) return

    this.updateAnimations()

    if (this.staticCanvas) this.ctx.drawImage(this.staticCanvas, 0, 0)
    else {
      this.ctx.fillStyle = '#0a3d20'
      this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)
      if (this.tableImage) this.ctx.drawImage(this.tableImage, 0, 0, this.gameAreaWidth, this.canvasHeight)
      else this.drawTablePattern()
    }

    this.renderGameElements()
    this.renderSidebarContent()
    this.renderGameResult()

    this.animationFrameId = requestAnimationFrame(() => this.render())
  }

  private drawTablePattern(targetCtx?: CanvasRenderingContext2D) {
    const ctx = targetCtx || this.ctx
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)'
    ctx.lineWidth = 3 * this.scaleFactor
    ctx.beginPath()
    ctx.arc(this.gameAreaWidth / 2, -400 * this.scaleFactor, 1000 * this.scaleFactor, 0, Math.PI, false)
    ctx.stroke()

    ctx.fillStyle = 'rgba(255, 215, 0, 0.1)'
    ctx.font = `bold ${40 * this.scaleFactor}px serif`
    ctx.textAlign = 'center'
    ctx.fillText('BLACKJACK PAYS 3 TO 2', this.gameAreaWidth / 2, this.canvasHeight * 0.4)
    ctx.font = `${20 * this.scaleFactor}px serif`
    ctx.fillText('Dealer must stand on 17 and draw to 16', this.gameAreaWidth / 2, this.canvasHeight * 0.45)
  }

  private renderGameElements() {
    this.renderDeck()

    // 포인트 표시
    this.ctx.fillStyle = '#ffffff'
    this.ctx.font = `bold ${18 * this.scaleFactor}px Arial`
    this.ctx.textAlign = 'left'
    this.ctx.fillText(`Points: ${this.playerPoints.toLocaleString()}`, 20, 30)

    this.ctx.fillStyle = '#ffffff'
    this.ctx.font = `bold ${20 * this.scaleFactor}px Arial`
    this.ctx.textAlign = 'center'

    // ✅ 점수 텍스트 위치를 카드 기준으로 재배치 (겹침 방지)
    const cardH = 130 * this.scaleFactor

    if (this.gameState !== GameState.BETTING && this.gameState !== GameState.SHUFFLE) {
      this.updateScores(this.serverDealerFinalScore ?? undefined)

      const dealerSecondCard = this.dealerHand.cards[1]
      const isDealerSecondCardRevealed = dealerSecondCard?.faceUp === true

      let dScoreText = '?'
      if (isDealerSecondCardRevealed || this.gameState === GameState.DEALER_TURN || this.gameState === GameState.SETTLEMENT) {
        dScoreText = `${this.dealerHand.score}`
      }

      // DEALER: 카드 위쪽
      this.ctx.fillText(`DEALER: ${dScoreText}`, this.dealerPosition.x, this.dealerPosition.y - cardH / 2 - 18 * this.scaleFactor)

      // PLAYER: 카드 아래쪽
      this.ctx.fillText(`PLAYER: ${this.playerHand.score}`, this.playerPosition.x, this.playerPosition.y + cardH / 2 + 26 * this.scaleFactor)
    }

    this.renderCards()
    this.renderChips()
    this.renderButtons()
  }

  private renderDeck() {
    const w = 80 * this.scaleFactor
    const h = 120 * this.scaleFactor
    const { x, y } = this.deckPosition

    for (let i = 0; i < 5; i++) {
      this.ctx.fillStyle = '#ccc'
      this.ctx.fillRect(x - w / 2 - i, y - h / 2 - i, w, h)
      this.ctx.strokeStyle = '#999'
      this.ctx.strokeRect(x - w / 2 - i, y - h / 2 - i, w, h)
    }
    if (this.cardBackImage) this.ctx.drawImage(this.cardBackImage, x - w / 2 - 5, y - h / 2 - 5, w, h)
  }

  private renderCards() {
    this.cardSprites.forEach((sprite, card) => {
      const w = 90 * this.scaleFactor
      const h = 130 * this.scaleFactor

      this.ctx.save()
      this.ctx.translate(sprite.x, sprite.y)
      this.ctx.rotate(sprite.rotation)

      if (sprite.flipRotation !== undefined) {
        const scaleY = Math.cos(sprite.flipRotation)
        this.ctx.scale(1, scaleY)
      }

      const isFaceUp =
        sprite.flipRotation !== undefined
          ? sprite.flipRotation >= Math.PI / 2
            ? sprite.faceUp || card.faceUp
            : false
          : sprite.faceUp !== undefined
          ? sprite.faceUp
          : card.faceUp

      this.ctx.shadowColor = 'transparent'
      this.ctx.shadowBlur = 0

      if (isFaceUp) {
        const key = `card-${card.suit}-${card.value}`
        const img = this.cardImages.get(key)
        if (img) this.ctx.drawImage(img, -w / 2, -h / 2, w, h)
        else {
          this.ctx.fillStyle = 'white'
          this.ctx.fillRect(-w / 2, -h / 2, w, h)
          this.ctx.fillStyle = 'black'
          this.ctx.fillText(String(card.value), 0, 0)
        }
      } else {
        if (this.cardBackImage) this.ctx.drawImage(this.cardBackImage, -w / 2, -h / 2, w, h)
        else {
          this.ctx.fillStyle = 'red'
          this.ctx.fillRect(-w / 2, -h / 2, w, h)
        }
      }

      this.ctx.restore()
    })
  }

  private renderChips() {
    this.chipButtons.forEach((chip) => this.drawFancyChip(chip.x, chip.y, chip.amount))
    this.betChips.forEach((chip) => this.drawFancyChip(chip.x, chip.y, chip.amount))
  }

  private drawFancyChip(x: number, y: number, amount: number) {
    const r = (this.isMobile ? 30 : 35) * this.scaleFactor

    let color = '#fff'
    let stripeColor = '#ccc'
    if (amount === 5) {
      color = '#d92b2b'
      stripeColor = '#fff'
    } else if (amount === 10) {
      color = '#2b4cd9'
      stripeColor = '#fff'
    } else if (amount === 50) {
      color = '#2bd94c'
      stripeColor = '#fff'
    } else if (amount === 100) {
      color = '#111'
      stripeColor = '#d9b02b'
    }

    this.ctx.save()
    this.ctx.translate(x, y)

    this.ctx.shadowColor = 'transparent'
    this.ctx.shadowBlur = 0
    this.ctx.shadowOffsetY = 0

    this.ctx.fillStyle = color
    this.ctx.beginPath()
    this.ctx.arc(0, 0, r, 0, Math.PI * 2)
    this.ctx.fill()

    this.ctx.strokeStyle = stripeColor
    this.ctx.lineWidth = 8 * this.scaleFactor
    this.ctx.setLineDash([10, 15])
    this.ctx.beginPath()
    this.ctx.arc(0, 0, r - 4, 0, Math.PI * 2)
    this.ctx.stroke()
    this.ctx.setLineDash([])

    this.ctx.fillStyle = 'rgba(255,255,255,0.1)'
    this.ctx.beginPath()
    this.ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2)
    this.ctx.fill()

    this.ctx.strokeStyle = 'rgba(0,0,0,0.2)'
    this.ctx.lineWidth = 1
    this.ctx.stroke()

    this.ctx.fillStyle = amount === 100 ? '#d9b02b' : amount === 1 ? '#000' : '#fff'
    this.ctx.font = `bold ${18 * this.scaleFactor}px Arial`
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText(`${amount}`, 0, 0)

    this.ctx.restore()
  }

  private renderButtons() {
    const buttons = [...this.buttons]
    if (this.dealButton) buttons.push(this.dealButton)

    buttons.forEach((btn) => {
      if (!btn.visible) return

      this.ctx.save()

      this.ctx.shadowColor = 'transparent'
      this.ctx.shadowBlur = 0
      this.ctx.shadowOffsetY = 0

      let baseColor = '#eab308'
      if (btn.text === 'HIT') baseColor = '#22c55e'
      if (btn.text === 'STAND') baseColor = '#ef4444'

      this.ctx.fillStyle = baseColor
      this.ctx.beginPath()
      ;(this.ctx as any).roundRect(btn.x, btn.y, btn.width, btn.height, 8 * this.scaleFactor)
      this.ctx.fill()

      this.ctx.fillStyle = '#fff'
      this.ctx.font = `bold ${18 * this.scaleFactor}px sans-serif`
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      this.ctx.fillText(btn.text, btn.x + btn.width / 2, btn.y + btn.height / 2)

      this.ctx.restore()
    })
  }

  private renderGameResult() {
    if (!this.gameResult.visible) return

    const elapsed = Date.now() - this.gameResult.startTime
    const totalDuration = 3000

    let alpha = 1
    if (elapsed < 500) alpha = elapsed / 500
    else if (elapsed > totalDuration - 500) alpha = (totalDuration - elapsed) / 500

    let scale = 1
    if (elapsed < 500) scale = 0.5 + (elapsed / 500) * 0.5

    const centerX = this.gameAreaWidth * 0.5
    const centerY = this.canvasHeight * 0.5

    this.ctx.fillStyle = `rgba(0, 0, 0, ${0.7 * alpha})`
    this.ctx.fillRect(0, 0, this.gameAreaWidth, this.canvasHeight)

    let bgColor = '#4caf50'
    let textColor = '#ffffff'

    if (this.gameResult.type === 'lose') bgColor = '#f44336'
    else if (this.gameResult.type === 'draw') bgColor = '#ff9800'
    else if (this.gameResult.type === 'blackjack') {
      bgColor = '#ffd700'
      textColor = '#000000'
    }

    this.ctx.save()
    this.ctx.translate(centerX, centerY)
    this.ctx.scale(scale, scale)
    this.ctx.globalAlpha = alpha

    const boxWidth = 400 * this.scaleFactor
    const boxHeight = 200 * this.scaleFactor
    const borderRadius = 20 * this.scaleFactor

    const gradient = this.ctx.createLinearGradient(-boxWidth / 2, -boxHeight / 2, -boxWidth / 2, boxHeight / 2)
    gradient.addColorStop(0, bgColor)
    gradient.addColorStop(1, this.darkenColor(bgColor, 0.2))

    this.ctx.fillStyle = gradient
    this.roundRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, borderRadius)
    this.ctx.fill()

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    this.ctx.lineWidth = 3
    this.roundRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, borderRadius)
    this.ctx.stroke()

    this.ctx.fillStyle = textColor
    this.ctx.font = `bold ${60 * this.scaleFactor}px Arial`
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText(this.gameResult.message, 0, -30 * this.scaleFactor)

    if (this.gameResult.winnings !== 0) {
      const pointsText = this.gameResult.winnings > 0 ? `+${this.gameResult.winnings} P` : `${this.gameResult.winnings} P`
      this.ctx.font = `bold ${32 * this.scaleFactor}px Arial`
      this.ctx.fillText(pointsText, 0, 30 * this.scaleFactor)
    }

    this.ctx.font = `${24 * this.scaleFactor}px Arial`
    this.ctx.fillStyle = `rgba(${textColor === '#ffffff' ? '255,255,255' : '0,0,0'}, 0.8)`
    this.ctx.fillText(`플레이어: ${this.playerHand.score} | 딜러: ${this.dealerHand.score}`, 0, 70 * this.scaleFactor)

    this.ctx.restore()
  }

  private roundRect(x: number, y: number, width: number, height: number, radius: number) {
    this.ctx.beginPath()
    this.ctx.moveTo(x + radius, y)
    this.ctx.lineTo(x + width - radius, y)
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    this.ctx.lineTo(x + width, y + height - radius)
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    this.ctx.lineTo(x + radius, y + height)
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    this.ctx.lineTo(x, y + radius)
    this.ctx.quadraticCurveTo(x, y, x + radius, y)
    this.ctx.closePath()
  }

  private darkenColor(color: string, amount: number): string {
    const num = parseInt(color.replace('#', ''), 16)
    const r = Math.max(0, ((num >> 16) & 0xff) * (1 - amount))
    const g = Math.max(0, ((num >> 8) & 0xff) * (1 - amount))
    const b = Math.max(0, (num & 0xff) * (1 - amount))
    return `#${Math.floor(r).toString(16).padStart(2, '0')}${Math.floor(g).toString(16).padStart(2, '0')}${Math.floor(b).toString(16).padStart(2, '0')}`
  }

  private renderSidebarContent() {
    if (this.sidebarWidth === 0) return

    const sx = this.gameAreaWidth

    const logStartY = 60
    const logEndY = this.canvasHeight - 20
    let y = logStartY

    const lineHeight = 20
    const innerLineHeight = 16
    const spacing = 14
    const padding = 4

    this.logs.forEach((log, index) => {
      const lines = log.message.split('\n')
      let totalHeight = 0
      const pointsHeight = log.pointsChange !== undefined && log.balance !== undefined ? innerLineHeight : 0

      if (log.round > 0) {
        const metaHeight = lineHeight
        const msgHeight = lines.length * innerLineHeight
        totalHeight = metaHeight + msgHeight + pointsHeight + spacing
      } else {
        totalHeight = lineHeight + spacing
      }

      const currentY = y
      if (currentY + totalHeight > logEndY) return

      const bgColor = index % 2 === 0 ? 'rgba(30, 41, 59, 0.5)' : 'rgba(51, 65, 85, 0.3)'

      this.ctx.fillStyle = bgColor
      this.roundRect(sx + padding, currentY - lineHeight + 6, this.sidebarWidth - padding * 2, totalHeight - spacing + 2, 4)
      this.ctx.fill()

      this.ctx.font = '12px monospace'
      this.ctx.fillStyle = '#64748b'
      this.ctx.fillText(`[${log.time}]`, sx + 40, currentY)

      if (log.round > 0) {
        this.ctx.fillStyle = '#94a3b8'
        this.ctx.font = '12px monospace'
        this.ctx.fillText(`${log.round}R`, sx + 90, currentY)

        if (log.betAmount) {
          this.ctx.fillStyle = '#fbbf24'
          this.ctx.font = '12px monospace'
          this.ctx.fillText(`${log.betAmount.toLocaleString()}`, sx + 130, currentY)
        }

        let resultColor = '#fff'
        if (log.type === 'win' || log.type === 'blackjack') resultColor = '#4ade80'
        else if (log.type === 'lose') resultColor = '#f87171'
        else if (log.type === 'draw') resultColor = '#fbbf24'
        else if (log.type === 'info') resultColor = '#94a3b8'

        this.ctx.fillStyle = resultColor
        this.ctx.font = 'bold 12px monospace'
        const firstLine = lines[0].length > 20 ? lines[0].substring(0, 20) + '...' : lines[0]
        this.ctx.fillText(firstLine, sx + 20, currentY + lineHeight)

        let lineY = currentY + lineHeight
        for (let i = 1; i < lines.length; i++) {
          lineY += innerLineHeight
          this.ctx.fillStyle = '#94a3b8'
          this.ctx.font = '11px monospace'
          const lineText = lines[i].length > 25 ? lines[i].substring(0, 25) + '...' : lines[i]
          this.ctx.fillText(lineText, sx + 20, lineY)
        }

        if (log.pointsChange !== undefined && log.balance !== undefined) {
          lineY += innerLineHeight
          const changeSign = log.pointsChange >= 0 ? '+' : ''
          const changeText = `${changeSign}${log.pointsChange.toLocaleString()}`

          this.ctx.font = '11px sans-serif'
          this.ctx.fillStyle = log.pointsChange >= 0 ? '#4ade80' : '#f87171'
          this.ctx.fillText(changeText, sx + 20, lineY)

          this.ctx.fillStyle = '#94a3b8'
          this.ctx.font = '11px sans-serif'
          this.ctx.fillText(`Bal: ${log.balance.toLocaleString()}`, sx + 100, lineY)
        }
      } else {
        this.ctx.fillStyle = '#94a3b8'
        this.ctx.font = '12px monospace'
        this.ctx.fillText('입장', sx + 90, currentY)

        this.ctx.font = '11px sans-serif'
        this.ctx.fillStyle = '#fbbf24'
        this.ctx.textAlign = 'right'
        const infoText = log.message.replace('접속 성공 - ', '')
        this.ctx.fillText(infoText, sx + this.sidebarWidth - 10, currentY)
        this.ctx.textAlign = 'left'
      }

      y = currentY + totalHeight
    })
  }

  private updateAnimations() {
    const now = Date.now()

    for (let i = this.animations.length - 1; i >= 0; i--) {
      const anim = this.animations[i]
      const elapsed = now - anim.startTime
      const progress = Math.min(elapsed / anim.duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)

      if (anim.type === 'card' && anim.card) {
        const sprite = this.cardSprites.get(anim.card)
        if (!sprite) continue

        sprite.x = anim.startX + (anim.targetX - anim.startX) * ease
        sprite.y = anim.startY + (anim.targetY - anim.startY) * ease

        if (anim.rotationStart !== undefined && anim.rotationTarget !== undefined) {
          sprite.rotation = anim.rotationStart + (anim.rotationTarget - anim.rotationStart) * ease
        }

        if (progress >= 1) {
          sprite.x = anim.targetX
          sprite.y = anim.targetY
          if (anim.rotationTarget !== undefined) sprite.rotation = anim.rotationTarget
          this.animations.splice(i, 1)
        }
      } else if (anim.type === 'flip' && anim.card) {
        const sprite = this.cardSprites.get(anim.card)
        if (!sprite) {
          this.animations.splice(i, 1)
          continue
        }

        sprite.flipRotation = Math.PI * progress
        if (progress >= 0.5 && !sprite.faceUp) {
          sprite.faceUp = anim.faceUp || true
        }

        if (progress >= 1) {
          sprite.flipRotation = undefined
          this.animations.splice(i, 1)
        }
      } else if (anim.type === 'discard' && anim.card) {
        const sprite = this.cardSprites.get(anim.card)
        if (!sprite) {
          this.animations.splice(i, 1)
          continue
        }

        sprite.x = anim.startX + (anim.targetX - anim.startX) * ease
        sprite.y = anim.startY + (anim.targetY - anim.startY) * ease

        if (anim.rotationStart !== undefined && anim.rotationTarget !== undefined) {
          sprite.rotation = anim.rotationStart + (anim.rotationTarget - anim.rotationStart) * ease
        }

        if (progress >= 1) {
          this.cardSprites.delete(anim.card)
          this.animations.splice(i, 1)
        }
      } else if (anim.type === 'chip' && anim.chip) {
        anim.chip.x = anim.startX + (anim.targetX - anim.startX) * ease
        anim.chip.y = anim.startY + (anim.targetY - anim.startY) * ease
        if (progress >= 1) {
          anim.chip.x = anim.targetX
          anim.chip.y = anim.targetY
          this.animations.splice(i, 1)
        }
      }
    }
  }

  destroy() {
    this.isRunning = false
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    this.cardSprites.clear()
    this.cardImages.clear()
    this.animations = []
    this.buttons = []
    this.chipButtons = []
    this.betChips = []
    this.logs = []
  }
}
