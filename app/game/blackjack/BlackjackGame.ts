import { GameState, Card, Hand } from '../types'
import {
  createDeck,
  shuffleDeck,
  calculateHandScore,
  isBlackjack,
  isBust,
  getCardImageUrl,
  isSameValue,
} from '../utils'

// [수정] 로그 인터페이스 개선
interface GameLog {
  type: 'bet' | 'win' | 'lose' | 'draw' | 'blackjack' | 'info';
  message: string;
  time: string;
  round: number; // 라운드 번호
  betAmount?: number; // 베팅액
  pointsChange?: number; // 포인트 변화량
  balance?: number; // 잔액
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
  private discardedCards: Card[] = [] // 버려진 카드들
  private playerHand: Hand = { cards: [], score: 0, isBlackjack: false, isBust: false }
  private dealerHand: Hand = { cards: [], score: 0, isBlackjack: false, isBust: false }
  private currentBet: number = 0
  private playerPoints: number = 0
  private initialBet: number = 0
  private insuranceBet: number = 0
  
  // [신규] 라운드 관리
  private roundNumber: number = 1;

  // 이미지 리소스
  private cardImages: Map<string, HTMLImageElement> = new Map()
  private cardBackImage: HTMLImageElement | null = null
  private tableImage: HTMLImageElement | null = null
  private imagesLoaded: number = 0
  private totalImages: number = 0

  // UI 요소
  private chipButtons: Chip[] = []
  private betChips: Chip[] = []
  private buttons: Button[] = []
  private dealButton: Button | null = null

  // 히스토리 로그
  private logs: GameLog[] = []
  private logScrollOffset: number = 0

  // 게임 결과 표시
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
    visible: false
  }

  // 애니메이션
  private animations: Array<{
    type: 'card' | 'chip' | 'discard'
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
  }> = []

  // 캔버스 및 레이아웃 설정
  private canvasWidth: number = 1200
  private canvasHeight: number = 800
  private sidebarWidth: number = 300
  private gameAreaWidth: number = 900
  
  // 반응형 스케일 팩터
  private scaleFactor: number = 1;
  private isMobile: boolean = false;

  // 위치 정의
  private get deckPosition() { 
      if (this.isMobile) {
          return { x: this.gameAreaWidth * 0.85, y: this.canvasHeight * 0.12 };
      }
      return { x: this.gameAreaWidth * 0.85, y: this.canvasHeight * 0.15 }; 
  }
  
  private get playerPosition() { 
      if (this.isMobile) {
          return { x: this.gameAreaWidth * 0.5, y: this.canvasHeight * 0.55 };
      }
      return { x: this.gameAreaWidth * 0.5, y: this.canvasHeight * 0.65 };
  }
  
  private get dealerPosition() { 
      if (this.isMobile) {
          return { x: this.gameAreaWidth * 0.5, y: this.canvasHeight * 0.20 };
      }
      return { x: this.gameAreaWidth * 0.5, y: this.canvasHeight * 0.20 }; 
  }
  
  private get bettingArea() { 
      if (this.isMobile) {
          return { x: this.gameAreaWidth * 0.5, y: this.canvasHeight * 0.40 };
      }
      return { x: this.gameAreaWidth * 0.5, y: this.canvasHeight * 0.45 }; 
  }
  
  private get chipTrayPosition() { 
      if (this.isMobile) {
          return { x: this.gameAreaWidth * 0.5, y: this.canvasHeight * 0.85 };
      }
      return { x: this.gameAreaWidth * 0.5, y: this.canvasHeight * 0.88 }; 
  }

  private cardSprites: Map<Card, { x: number; y: number; faceUp: boolean; rotation: number }> = new Map()

  private onStateChange?: (state: GameState) => void
  private onMessage?: (message: string) => void
  private onLoadingProgress?: (progress: number) => void

  constructor(canvas: HTMLCanvasElement, betAmount: number = 0, width: number = 1200, height: number = 800) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.initialBet = betAmount
    
    this.resize(width, height);

    this.setupEventListeners()
    this.loadImages()
  }

  public resize(width: number, height: number) {
      this.canvasWidth = width;
      this.canvasHeight = height;
      this.canvas.width = width;
      this.canvas.height = height;

      this.isMobile = width < 768;

      if (this.isMobile) {
          this.sidebarWidth = 0;
          this.gameAreaWidth = width;
          this.scaleFactor = Math.min(width / 400, 1.2); 
      } else if (width < 1024) {
          this.sidebarWidth = width * 0.25;
          this.gameAreaWidth = width - this.sidebarWidth;
          this.scaleFactor = Math.min(width / 1000, 1.0);
      } else {
          this.sidebarWidth = 300;
          this.gameAreaWidth = width - this.sidebarWidth;
          this.scaleFactor = 1.0;
      }

      if (this.gameState === GameState.BETTING) {
          this.createChipButtons();
          this.createDealButton();
      } else if (this.gameState === GameState.PLAYER_TURN) {
          this.createActionButtons();
      } else if (this.gameState === GameState.INSURANCE) {
          this.createInsuranceButtons();
      }
      
      if (!this.isRunning) {
          this.render();
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
    if (this.onStateChange) {
      this.onStateChange(newState)
    }
    this.handleState()
  }

  private showMessage(text: string) {
    if (this.onMessage) {
      this.onMessage(text)
    }
  }

  // [수정] 로그 추가 로직 변경 (옵션 객체 파라미터 사용 권장되지만 기존 구조 유지하며 확장)
  private addLog(
    type: 'bet' | 'win' | 'lose' | 'draw' | 'blackjack' | 'info', 
    message: string, 
    pointsChange?: number, 
    balance?: number,
    betAmount?: number
  ) {
    const now = new Date()
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
    
    this.logs.unshift({ 
      type, 
      message, 
      time: timeString,
      round: this.roundNumber,
      pointsChange,
      balance: balance !== undefined ? balance : this.playerPoints,
      betAmount
    })
    if (this.logs.length > 50) {
      this.logs.pop()
    }
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

    this.canvas.addEventListener('click', (e) => {
      handleInput(e.clientX, e.clientY)
    })

    this.canvas.addEventListener('touchstart', (e) => {
        if(e.touches.length > 0) {
            e.preventDefault(); 
            handleInput(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: false });

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
        const maxScroll = Math.max(0, (this.logs.length * 30) - (this.canvasHeight - 200))
        this.logScrollOffset = Math.max(0, Math.min(maxScroll, this.logScrollOffset + scrollAmount))
        this.render()
      }
    })
  }

  private getCursorAt(x: number, y: number): string {
    if (x > this.gameAreaWidth) return 'default'

    const allButtons = [...this.buttons];
    if (this.dealButton) allButtons.push(this.dealButton);

    for (const button of allButtons) {
      if (button.visible) {
        if (x >= button.x && x <= button.x + button.width && y >= button.y && y <= button.y + button.height) {
          return 'pointer'
        }
      }
    }

    // [수정] 칩 인식 반경 1.3배 확대
    const chipRadius = (this.isMobile ? 30 : 35) * this.scaleFactor * 1.3; 
    for (const chip of this.chipButtons) {
      const dist = Math.sqrt(Math.pow(x - chip.x, 2) + Math.pow(y - chip.y, 2))
      if (dist <= chipRadius) return 'pointer'
    }

    if (this.gameState === GameState.BETTING) {
      for (const chip of this.betChips) {
        const dist = Math.sqrt(Math.pow(x - chip.x, 2) + Math.pow(y - chip.y, 2))
        if (dist <= chipRadius) return 'pointer'
      }
    }

    return 'default'
  }

  private handleClick(x: number, y: number) {
    if (x > this.gameAreaWidth) return

    const allButtons = [...this.buttons];
    if (this.dealButton) allButtons.push(this.dealButton);

    for (const button of allButtons) {
      if (button.visible) {
        if (x >= button.x && x <= button.x + button.width && y >= button.y && y <= button.y + button.height) {
          button.onClick()
          return
        }
      }
    }

    // [수정] 칩 클릭 반경 1.3배 확대
    const chipRadius = (this.isMobile ? 30 : 35) * this.scaleFactor * 1.3;
    for (const chip of this.chipButtons) {
      const dist = Math.sqrt(Math.pow(x - chip.x, 2) + Math.pow(y - chip.y, 2))
      if (dist <= chipRadius) {
        this.addChipToTable(chip.amount)
        return
      }
    }

    if (this.gameState === GameState.BETTING) {
      for (let i = this.betChips.length - 1; i >= 0; i--) {
        const chip = this.betChips[i]
        const dist = Math.sqrt(Math.pow(x - chip.x, 2) + Math.pow(y - chip.y, 2))
        if (dist <= chipRadius) {
          this.removeChipFromTable(i, chip.amount)
          return
        }
      }
    }
  }

  private async loadImages() {
    this.tableImage = await this.loadImage('https://media.istockphoto.com/id/479815970/photo/green-felt-fabric-texture-background.jpg?s=612x612&w=0&k=20&c=NbC-xQk6-X4-lQ3aD6A5D6Q3A5d6Q3aD6A5D6Q3A5d6Q3aD6A5D6Q3A5d6=')
      .catch(() => null);

    this.cardBackImage = await this.loadImage('https://deckofcardsapi.com/static/img/back.png')

    const suits = ['hearts', 'diamonds', 'clubs', 'spades']
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
    const suitMap: Record<string, string> = { hearts: 'H', diamonds: 'D', clubs: 'C', spades: 'S' }

    this.totalImages = suits.length * values.length + 2
    this.imagesLoaded = 0

    const promises = []
    for (const suit of suits) {
      for (const value of values) {
        let valueCode = value === '10' ? '0' : value.charAt(0)
        const suitCode = suitMap[suit]
        const cardKey = `card-${suit}-${value}`
        const url = `https://deckofcardsapi.com/static/img/${valueCode}${suitCode}.png`
        
        promises.push(
          this.loadImage(url).then(img => {
            this.cardImages.set(cardKey, img)
            this.updateLoadingProgress()
          })
        )
      }
    }
    
    promises.push(
      this.loadImage('https://media.istockphoto.com/id/479815970/photo/green-felt-fabric-texture-background.jpg?s=612x612&w=0&k=20&c=NbC-xQk6-X4-lQ3aD6A5D6Q3A5d6Q3aD6A5D6Q3A5d6Q3aD6A5D6Q3A5d6=')
      .then(img => {
        this.tableImage = img
        this.updateLoadingProgress()
      })
      .catch(() => {
        this.updateLoadingProgress()
        return null
      })
    )

    promises.push(
      this.loadImage('https://deckofcardsapi.com/static/img/back.png')
      .then(img => {
        this.cardBackImage = img
        this.updateLoadingProgress()
      })
      .catch(() => {
        this.updateLoadingProgress()
        return null
      })
    )

    await Promise.all(promises)

    this.loadUserPoints()
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
        this.playerPoints = 10000;
        this.changeState(GameState.SHUFFLE)
        return
    }

    try {
      const response = await fetch('/api/user/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        this.playerPoints = data.points || 0
        this.addLog('info', `게임 접속 - 포인트: ${this.playerPoints.toLocaleString()} P`, 0, this.playerPoints)
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
      case GameState.SHUFFLE: this.handleShuffle(); break;
      case GameState.BETTING: this.handleBetting(); break;
      case GameState.DEAL_START: this.handleDealStart(); break;
      case GameState.INSURANCE: this.handleInsurance(); break;
      case GameState.CHECK_BLACKJACK: this.handleCheckBlackjack(); break;
      case GameState.PLAYER_TURN: this.handlePlayerTurn(); break;
      case GameState.DEALER_TURN: this.handleDealerTurn(); break;
      case GameState.SETTLEMENT: this.handleSettlement(); break;
      case GameState.ROUND_END: this.handleRoundEnd(); break;
    }
  }

  private handleShuffle() {
    this.deck = this.createDeckExcludingDiscarded()
    // 셔플 로그는 삭제하거나 간단히
    // this.addLog('info', '덱이 셔플되었습니다.') 
    setTimeout(() => this.changeState(GameState.BETTING), 1000)
  }

  private createDeckExcludingDiscarded(): Card[] {
    const allCards = createDeck()
    const discardedSet = new Set(
      this.discardedCards.map(card => `${card.suit}-${card.value}`)
    )
    const availableCards = allCards.filter(
      card => !discardedSet.has(`${card.suit}-${card.value}`)
    )
    
    if (availableCards.length < 20) {
      this.discardedCards = []
      return shuffleDeck(createDeck())
    }
    
    return shuffleDeck(availableCards)
  }

  private handleBetting() {
    this.createChipButtons()
    this.createDealButton()
    
    if (this.initialBet > 0 && this.currentBet === 0) {
        this.addChipToTable(this.initialBet);
        this.initialBet = 0;
    }
  }

  private createChipButtons() {
    const betAmounts = [1, 5, 10, 50, 100]
    const spacing = (this.isMobile ? this.gameAreaWidth * 0.16 : this.gameAreaWidth * 0.12)
    const startX = this.chipTrayPosition.x - ((betAmounts.length - 1) * spacing) / 2
    
    this.chipButtons = betAmounts.map((amount, index) => ({
      amount,
      x: startX + index * spacing,
      y: this.chipTrayPosition.y,
      element: null,
    }))
  }

  private createDealButton() {
    const w = (this.isMobile ? 120 : this.gameAreaWidth * 0.2) * (this.isMobile ? 1 : 1);
    const h = (this.isMobile ? 50 : 50) * this.scaleFactor;
    
    this.dealButton = {
      x: this.gameAreaWidth * 0.5 - w / 2,
      y: (this.isMobile ? this.canvasHeight * 0.50 : this.canvasHeight * 0.55),
      width: w,
      height: h,
      text: 'DEAL',
      onClick: async () => {
        if (this.currentBet > 0) {
          const success = await this.confirmBet()
          if (success) {
             this.changeState(GameState.DEAL_START)
          }
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
      y: this.bettingArea.y - (chipCount * 4) + jitterY,
      element: null,
    }

    const startChip = this.chipButtons.find(c => c.amount === amount)
    
    this.animations.push({
      type: 'chip',
      startX: startChip ? startChip.x : this.chipTrayPosition.x,
      startY: startChip ? startChip.y : this.canvasHeight,
      targetX: chip.x,
      targetY: chip.y,
      duration: 400,
      startTime: Date.now(),
      chip
    })

    this.betChips.push(chip)
    this.currentBet += amount
    this.playerPoints -= amount // 시각적 즉시 차감
    
    if (this.dealButton) this.dealButton.visible = true
  }
  
  private removeChipFromTable(index: number, amount: number) {
      this.betChips.splice(index, 1);
      this.currentBet -= amount;
      this.playerPoints += amount; // 시각적 즉시 반환
      if (this.currentBet === 0 && this.dealButton) this.dealButton.visible = false;
  }

  private async confirmBet(): Promise<boolean> {
    const token = localStorage.getItem('token')
    if (!token) {
      this.showMessage('로그인이 필요합니다.')
      return false
    }
    
    if (this.dealButton) this.dealButton.visible = false

    try {
      const response = await fetch('/api/game/bet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'bet',
          amount: this.currentBet,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        // [중요] 서버 데이터로 포인트 동기화 (오류 방지)
        this.playerPoints = data.points
        // 베팅 로그는 게임 시작 시점이 아닌 결과 정산 시점에 통합하여 보여주거나,
        // 여기서 보여준다면 "베팅 성공" 정도만 표시. 요청대로 결과 로그에 합치기 위해 여기선 로그 생략 가능.
        // 하지만 유저 피드백을 위해 간단히.
        // this.addLog('bet', `베팅 완료: ${this.currentBet}`, -this.currentBet, data.points)
        return true
      } else {
        const errorData = await response.json()
        this.showMessage(errorData.error || '베팅에 실패했습니다.')
        // 실패 시 롤백
        this.playerPoints += this.currentBet
        this.currentBet = 0
        this.betChips = []
        if (this.dealButton) this.dealButton.visible = false
        return false
      }
    } catch (error) {
      console.error('Betting error:', error)
      this.showMessage('베팅 중 오류가 발생했습니다.')
      this.playerPoints += this.currentBet
      this.currentBet = 0
      this.betChips = []
      if (this.dealButton) this.dealButton.visible = false
      return false
    }
  }

  private async handleDealStart() {
    this.chipButtons = []
    if (this.dealButton) this.dealButton.visible = false
    // 딜링 시작 로그 생략 (깔끔하게)

    this.playerHand = { cards: [], score: 0, isBlackjack: false, isBust: false }
    this.dealerHand = { cards: [], score: 0, isBlackjack: false, isBust: false }

    await this.dealCard('player', true, 0)
    await this.dealCard('dealer', true, 0)
    await this.dealCard('player', true, 1)
    await this.dealCard('dealer', false, 1)

    const dealerUp = this.dealerHand.cards[0]
    if (dealerUp.value === 'A') {
        this.changeState(GameState.INSURANCE)
    } else {
        this.changeState(GameState.CHECK_BLACKJACK)
    }
  }

  private async dealCard(target: 'player' | 'dealer', faceUp: boolean, index: number): Promise<void> {
    if (this.deck.length === 0) this.deck = createDeck()
    const card = this.deck.pop()!
    card.faceUp = faceUp

    const targetHand = target === 'player' ? this.playerHand : this.dealerHand
    targetHand.cards.push(card)

    const spacing = (this.isMobile ? 25 : 30) * this.scaleFactor
    const totalW = (targetHand.cards.length - 1) * spacing
    const baseX = target === 'player' ? this.playerPosition.x : this.dealerPosition.x
    const baseY = target === 'player' ? this.playerPosition.y : this.dealerPosition.y
    
    const targetX = baseX + (index * spacing) - (totalW / 2)
    const targetY = baseY

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
      rotationStart: Math.random() * Math.PI,
      rotationTarget: 0
    })

    await this.delay(300)
  }

  private handleInsurance() {
    this.createInsuranceButtons()
    this.addLog('info', 'Insurance?', undefined, undefined, undefined)
  }

  private createInsuranceButtons() {
     const w = 120 * this.scaleFactor; 
     const h = 40 * this.scaleFactor;
     const cx = this.gameAreaWidth * 0.5;
     const cy = this.canvasHeight * 0.5;
     
     this.buttons = [
         { x: cx - w - 10, y: cy, width: w, height: h, text: 'Insurance', onClick: () => this.buyInsurance(), visible: true },
         { x: cx + 10, y: cy, width: w, height: h, text: 'No Thanks', onClick: () => this.declineInsurance(), visible: true }
     ]
  }

  private buyInsurance() {
    const insuranceAmount = Math.floor(this.currentBet * 0.5)
    
    if (this.playerPoints < insuranceAmount) {
      this.showMessage('포인트가 부족합니다.')
      return
    }

    this.insuranceBet = insuranceAmount
    this.playerPoints -= insuranceAmount
    // 로그 통합을 위해 여기선 생략 또는 간단히
    this.buttons = []
    this.changeState(GameState.CHECK_BLACKJACK)
  }
  
  private declineInsurance() {
      this.buttons = [];
      this.changeState(GameState.CHECK_BLACKJACK);
  }

  private handleCheckBlackjack() {
      this.updateScores();
      if (isBlackjack(this.playerHand)) {
          this.changeState(GameState.DEALER_TURN);
      } else {
          this.changeState(GameState.PLAYER_TURN);
      }
  }

  private handlePlayerTurn() {
      this.createActionButtons();
  }

  private createActionButtons() {
    const actions = ['HIT', 'STAND', 'DOUBLE'];
    if (this.playerHand.cards.length === 2 && isSameValue(this.playerHand.cards[0], this.playerHand.cards[1])) {
        actions.push('SPLIT');
    }
    
    const btnW = (this.isMobile ? 80 : 100) * this.scaleFactor; 
    const btnH = (this.isMobile ? 50 : 45) * this.scaleFactor; 
    const gap = (this.isMobile ? 10 : 15) * this.scaleFactor;
    
    const totalW = actions.length * btnW + (actions.length - 1) * gap;
    const startX = (this.gameAreaWidth - totalW) / 2;
    const y = (this.isMobile ? this.canvasHeight * 0.75 : this.canvasHeight * 0.5);

    this.buttons = actions.map((text, i) => ({
        x: startX + i * (btnW + gap),
        y,
        width: btnW,
        height: btnH,
        text,
        onClick: () => {
            if (text === 'HIT') this.playerHit();
            if (text === 'STAND') this.playerStand();
            if (text === 'DOUBLE') this.playerDouble();
            if (text === 'SPLIT') this.playerSplit();
        },
        visible: true
    }));
  }

  private async playerHit() {
      await this.dealCard('player', true, this.playerHand.cards.length);
      this.updateScores();
      if (this.playerHand.score > 21) {
          this.buttons = [];
          this.changeState(GameState.SETTLEMENT);
      }
  }

  private async playerStand() {
      this.buttons = [];
      this.changeState(GameState.DEALER_TURN);
  }
  
  private async playerDouble() {
    if (this.playerPoints < this.currentBet) {
      this.showMessage('포인트가 부족합니다.')
      return
    }

    const token = localStorage.getItem('token')
    if (token) {
      try {
        const response = await fetch('/api/game/bet', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: 'bet',
            amount: this.currentBet,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          this.playerPoints = data.points
          this.currentBet *= 2
        } else {
          this.showMessage('Double Down 실패')
          return
        }
      } catch (error) {
        console.error('Double down error:', error)
        this.showMessage('오류 발생')
        return
      }
    } else {
      this.playerPoints -= this.currentBet
      this.currentBet *= 2
    }

    await this.dealCard('player', true, this.playerHand.cards.length);
    this.buttons = [];
    this.changeState(GameState.DEALER_TURN);
  }
  
  private playerSplit() {
      this.showMessage('Split 기능은 준비중입니다.');
  }

  private async handleDealerTurn() {
      this.revealDealerCard();
      await this.delay(500);
      this.updateScores();
      
      while (this.dealerHand.score < 17) {
          await this.dealCard('dealer', true, this.dealerHand.cards.length);
          this.updateScores();
      }
      this.changeState(GameState.SETTLEMENT);
  }
  
  private revealDealerCard() {
      const hidden = this.dealerHand.cards.find(c => !c.faceUp);
      if (hidden) hidden.faceUp = true;
  }

  private handleSettlement() {
      this.updateScores();
      const pScore = this.playerHand.score;
      const dScore = this.dealerHand.score;
      let result: 'win' | 'lose' | 'draw' | 'blackjack' = 'lose';

      if (this.playerHand.isBust) result = 'lose';
      else if (this.dealerHand.isBust) result = 'win';
      else if (isBlackjack(this.playerHand) && isBlackjack(this.dealerHand)) result = 'draw';
      else if (isBlackjack(this.playerHand)) result = 'blackjack';
      else if (pScore > dScore) result = 'win';
      else if (pScore < dScore) result = 'lose';
      else result = 'draw';

      this.settleGame(result);
  }

  private async settleGame(result: 'win' | 'lose' | 'draw' | 'blackjack') {
    const token = localStorage.getItem('token')
    if (!token) {
      this.showMessage('로그인이 필요합니다.')
      return
    }

    let winnings = 0
    let message = ''
    
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

    try {
      const response = await fetch('/api/game/bet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'settle',
          result: result,
          betAmount: this.currentBet,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        this.playerPoints = data.points
        
        this.gameResult = {
          type: result,
          message: message,
          winnings: result === 'draw' ? 0 : winnings - this.currentBet,
          startTime: Date.now(),
          visible: true
        }
        
        // [수정] 통합 로그 기록 (라운드, 베팅, 결과, 잔액)
        let logMsg = '';
        let pointsChange = 0;
        
        if (result === 'win' || result === 'blackjack') {
            pointsChange = winnings - this.currentBet;
            logMsg = 'WIN';
            this.addLog('win', logMsg, pointsChange, data.points, this.currentBet);
        } else if (result === 'draw') {
            pointsChange = 0;
            logMsg = 'DRAW (Push)';
            this.addLog('draw', logMsg, pointsChange, data.points, this.currentBet);
        } else {
            pointsChange = -this.currentBet;
            logMsg = 'LOSE';
            this.addLog('lose', logMsg, pointsChange, data.points, this.currentBet);
        }

      } else {
        const errorData = await response.json()
        this.showMessage(errorData.error || '정산에 실패했습니다.')
        return
      }
    } catch (error) {
      console.error('Settlement error:', error)
      this.showMessage('정산 중 오류가 발생했습니다.')
      return
    }

    await this.delay(3000)
    this.gameResult.visible = false
    
    await this.delay(500)
    this.handleRoundEnd()
  }
  
  private async handleRoundEnd() {
    await this.discardCards()
    
    this.playerHand = { cards: [], score: 0, isBlackjack: false, isBust: false }
    this.dealerHand = { cards: [], score: 0, isBlackjack: false, isBust: false }
    this.betChips = []
    this.currentBet = 0
    this.insuranceBet = 0
    
    this.roundNumber++; // 라운드 증가
    this.changeState(GameState.SHUFFLE)
  }

  private async discardCards(): Promise<void> {
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
          targetY: discardY + (i * 2),
          duration: 500,
          startTime: Date.now(),
          card,
          rotationStart: sprite.rotation,
          rotationTarget: Math.PI * 0.5
        })
        
        this.discardedCards.push(card)
      }
      
      await this.delay(50)
    }
    
    await this.delay(600)
    
    allCards.forEach(card => {
      this.cardSprites.delete(card)
    })
  }

  private delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
  private updateScores() {
      this.playerHand.score = calculateHandScore(this.playerHand)
      this.dealerHand.score = calculateHandScore(this.dealerHand)
      this.playerHand.isBust = isBust(this.playerHand)
      this.playerHand.isBlackjack = isBlackjack(this.playerHand)
      this.dealerHand.isBust = isBust(this.dealerHand)
  }

  private animationFrameId: number | null = null
  private isRunning: boolean = false

  start() {
    if (this.isRunning) return
    this.isRunning = true
    this.render()
  }

  render() {
    if (!this.isRunning) return
    
    this.ctx.fillStyle = '#0a3d20'
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)
    
    if (this.tableImage) {
        this.ctx.drawImage(this.tableImage, 0, 0, this.gameAreaWidth, this.canvasHeight)
    } else {
        this.drawTablePattern()
    }

    this.renderGameElements()
    this.renderSidebar()
    this.renderGameResult()

    this.updateAnimations()
    this.animationFrameId = requestAnimationFrame(() => this.render())
  }

  private drawTablePattern() {
      this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)';
      this.ctx.lineWidth = 3 * this.scaleFactor;
      this.ctx.beginPath();
      this.ctx.arc(this.gameAreaWidth / 2, -400 * this.scaleFactor, 1000 * this.scaleFactor, 0, Math.PI, false);
      this.ctx.stroke();
      
      this.ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
      this.ctx.font = `bold ${40 * this.scaleFactor}px serif`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText("BLACKJACK PAYS 3 TO 2", this.gameAreaWidth / 2, this.canvasHeight * 0.4);
      this.ctx.font = `${20 * this.scaleFactor}px serif`;
      this.ctx.fillText("Dealer must stand on 17 and draw to 16", this.gameAreaWidth / 2, this.canvasHeight * 0.45);
  }

  private renderGameElements() {
    this.renderDeck()

    this.ctx.fillStyle = '#ffffff'
    this.ctx.font = `bold ${20 * this.scaleFactor}px Arial`
    this.ctx.textAlign = 'center'
    
    if (this.gameState !== GameState.BETTING && this.gameState !== GameState.SHUFFLE) {
        let dScoreText = `${this.dealerHand.score}`;
        if (this.gameState === GameState.PLAYER_TURN && this.dealerHand.cards.length > 0) {
            dScoreText = "?";
        }
        this.ctx.fillText(`DEALER: ${dScoreText}`, this.dealerPosition.x, this.dealerPosition.y - (80 * this.scaleFactor))
        
        this.ctx.fillText(`PLAYER: ${this.playerHand.score}`, this.playerPosition.x, this.playerPosition.y + (100 * this.scaleFactor))
    }

    this.renderCards()
    this.renderChips()
    this.renderButtons()
  }

  private renderDeck() {
     const w = 80 * this.scaleFactor; 
     const h = 120 * this.scaleFactor;
     const { x, y } = this.deckPosition;
     
     for(let i=0; i<5; i++) {
         this.ctx.fillStyle = '#ccc';
         this.ctx.fillRect(x - w/2 - i, y - h/2 - i, w, h);
         this.ctx.strokeStyle = '#999';
         this.ctx.strokeRect(x - w/2 - i, y - h/2 - i, w, h);
     }
     if (this.cardBackImage) {
         this.ctx.drawImage(this.cardBackImage, x - w/2 - 5, y - h/2 - 5, w, h);
     }
  }

  private renderCards() {
    this.cardSprites.forEach((sprite, card) => {
      const w = 90 * this.scaleFactor; 
      const h = 130 * this.scaleFactor;
      this.ctx.save();
      this.ctx.translate(sprite.x, sprite.y);
      this.ctx.rotate(sprite.rotation);
      
      const isFaceUp = card.faceUp;
      
      this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
      this.ctx.shadowBlur = 10;

      if (isFaceUp) {
        const key = `card-${card.suit}-${card.value}`;
        const img = this.cardImages.get(key);
        if (img) this.ctx.drawImage(img, -w/2, -h/2, w, h);
        else {
            this.ctx.fillStyle = 'white'; this.ctx.fillRect(-w/2, -h/2, w, h);
            this.ctx.fillStyle = 'black'; this.ctx.fillText(card.value, 0, 0);
        }
      } else {
        if (this.cardBackImage) this.ctx.drawImage(this.cardBackImage, -w/2, -h/2, w, h);
        else {
             this.ctx.fillStyle = 'red'; this.ctx.fillRect(-w/2, -h/2, w, h);
        }
      }
      this.ctx.restore();
    });
  }

  private renderChips() {
      this.chipButtons.forEach(chip => this.drawFancyChip(chip.x, chip.y, chip.amount));
      this.betChips.forEach(chip => this.drawFancyChip(chip.x, chip.y, chip.amount));
  }

  private drawFancyChip(x: number, y: number, amount: number) {
      const r = (this.isMobile ? 30 : 35) * this.scaleFactor;
      
      let color = '#fff';
      let stripeColor = '#ccc';
      if (amount === 5) { color = '#d92b2b'; stripeColor = '#fff'; }
      else if (amount === 10) { color = '#2b4cd9'; stripeColor = '#fff'; }
      else if (amount === 50) { color = '#2bd94c'; stripeColor = '#fff'; }
      else if (amount === 100) { color = '#111'; stripeColor = '#d9b02b'; }

      this.ctx.save();
      this.ctx.translate(x, y);

      this.ctx.shadowColor = 'rgba(0,0,0,0.4)';
      this.ctx.shadowBlur = 5;
      this.ctx.shadowOffsetY = 3;

      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, r, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.shadowColor = 'transparent';

      this.ctx.strokeStyle = stripeColor;
      this.ctx.lineWidth = 8 * this.scaleFactor;
      this.ctx.setLineDash([10, 15]);
      this.ctx.beginPath();
      this.ctx.arc(0, 0, r - 4, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();

      this.ctx.fillStyle = (amount === 100) ? '#d9b02b' : (amount === 1 ? '#000' : '#fff');
      this.ctx.font = `bold ${18 * this.scaleFactor}px Arial`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(`${amount}`, 0, 0);

      this.ctx.restore();
  }

  private renderButtons() {
      const buttons = [...this.buttons];
      if (this.dealButton) buttons.push(this.dealButton);

      buttons.forEach(btn => {
          if (!btn.visible) return;
          
          this.ctx.save();
          
          this.ctx.shadowColor = 'rgba(0,0,0,0.4)';
          this.ctx.shadowBlur = 4;
          this.ctx.shadowOffsetY = 4;

          let baseColor = '#eab308';
          if (btn.text === 'HIT') baseColor = '#22c55e';
          if (btn.text === 'STAND') baseColor = '#ef4444';
          
          this.ctx.fillStyle = baseColor;
          this.ctx.beginPath();
          this.ctx.roundRect(btn.x, btn.y, btn.width, btn.height, 8 * this.scaleFactor);
          this.ctx.fill();
          
          this.ctx.shadowColor = 'transparent';

          this.ctx.fillStyle = '#fff';
          this.ctx.font = `bold ${18 * this.scaleFactor}px sans-serif`;
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(btn.text, btn.x + btn.width/2, btn.y + btn.height/2);
          
          this.ctx.restore();
      });
  }

  private renderGameResult() {
    if (!this.gameResult.visible) return

    const elapsed = Date.now() - this.gameResult.startTime
    const totalDuration = 3000
    
    let alpha = 1
    if (elapsed < 500) {
      alpha = elapsed / 500
    } else if (elapsed > totalDuration - 500) {
      alpha = (totalDuration - elapsed) / 500
    }

    let scale = 1
    if (elapsed < 500) {
      scale = 0.5 + (elapsed / 500) * 0.5
    }

    const centerX = this.gameAreaWidth * 0.5
    const centerY = this.canvasHeight * 0.5

    this.ctx.fillStyle = `rgba(0, 0, 0, ${0.7 * alpha})`
    this.ctx.fillRect(0, 0, this.gameAreaWidth, this.canvasHeight)

    let bgColor = '#4caf50'
    let textColor = '#ffffff'
    
    if (this.gameResult.type === 'lose') {
      bgColor = '#f44336'
    } else if (this.gameResult.type === 'draw') {
      bgColor = '#ff9800'
    } else if (this.gameResult.type === 'blackjack') {
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

    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
    this.ctx.shadowBlur = 20
    this.ctx.shadowOffsetX = 0
    this.ctx.shadowOffsetY = 10

    const gradient = this.ctx.createLinearGradient(-boxWidth/2, -boxHeight/2, -boxWidth/2, boxHeight/2)
    gradient.addColorStop(0, bgColor)
    gradient.addColorStop(1, this.darkenColor(bgColor, 0.2))
    
    this.ctx.fillStyle = gradient
    this.roundRect(-boxWidth/2, -boxHeight/2, boxWidth, boxHeight, borderRadius)
    this.ctx.fill()

    this.ctx.shadowColor = 'transparent'
    this.ctx.shadowBlur = 0
    this.ctx.shadowOffsetX = 0
    this.ctx.shadowOffsetY = 0

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    this.ctx.lineWidth = 3
    this.roundRect(-boxWidth/2, -boxHeight/2, boxWidth, boxHeight, borderRadius)
    this.ctx.stroke()

    this.ctx.fillStyle = textColor
    this.ctx.font = `bold ${60 * this.scaleFactor}px Arial`
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText(this.gameResult.message, 0, -30 * this.scaleFactor)

    if (this.gameResult.winnings !== 0) {
      const pointsText = this.gameResult.winnings > 0 
        ? `+${this.gameResult.winnings} P`
        : `${this.gameResult.winnings} P`
      
      this.ctx.font = `bold ${32 * this.scaleFactor}px Arial`
      this.ctx.fillText(pointsText, 0, 30 * this.scaleFactor)
    }

    this.ctx.font = `${24 * this.scaleFactor}px Arial`
    this.ctx.fillStyle = `rgba(${textColor === '#ffffff' ? '255,255,255' : '0,0,0'}, 0.8)`
    this.ctx.fillText(
      `플레이어: ${this.playerHand.score} | 딜러: ${this.dealerHand.score}`,
      0,
      70 * this.scaleFactor
    )

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

  private renderSidebar() {
      if (this.sidebarWidth === 0) return;
      
      const sx = this.gameAreaWidth;
      const w = this.sidebarWidth;
      
      this.ctx.fillStyle = '#1e293b';
      this.ctx.fillRect(sx, 0, w, this.canvasHeight);
      
      this.ctx.strokeStyle = '#334155';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(sx, 0);
      this.ctx.lineTo(sx, this.canvasHeight);
      this.ctx.stroke();
      
      this.ctx.fillStyle = '#94a3b8';
      this.ctx.font = 'bold 20px sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.fillText('HISTORY', sx + 20, 40);
      
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '16px sans-serif';
      this.ctx.fillText(`Points: ${this.playerPoints.toLocaleString()}`, sx + 20, 80);
      
      const logStartY = 130;
      const logEndY = this.canvasHeight - 20;
      let y = logStartY - this.logScrollOffset;
      
      // [수정] 로그 렌더링 스타일 변경
      this.logs.forEach(log => {
          if (y + 30 < logStartY || y > logEndY) {
              y += 35; // 높이 조금 더 확보
              return;
          }
          
          const timeText = `[${log.time}]`;
          
          this.ctx.font = '13px monospace';
          this.ctx.fillStyle = '#64748b';
          this.ctx.fillText(timeText, sx + 20, y);
          
          // 라운드/베팅/결과 표시
          if (log.round) {
              const roundText = `${log.round}R`;
              this.ctx.fillStyle = '#94a3b8';
              this.ctx.fillText(roundText, sx + 90, y);
              
              if (log.betAmount) {
                  const betText = `${log.betAmount.toLocaleString()} bet`;
                  this.ctx.fillStyle = '#fbbf24'; // Gold
                  this.ctx.fillText(betText, sx + 130, y);
              }
              
              // 결과
              let resultColor = '#fff';
              if (log.type === 'win' || log.type === 'blackjack') resultColor = '#4ade80';
              else if (log.type === 'lose') resultColor = '#f87171';
              else if (log.type === 'draw') resultColor = '#fbbf24';
              
              this.ctx.fillStyle = resultColor;
              this.ctx.font = 'bold 13px monospace';
              this.ctx.fillText(log.message, sx + 200, y);
              
              // 잔액 및 변화량 (다음 줄에 표시하거나 옆에)
              // 공간 부족 시 다음 줄
              if (log.pointsChange !== undefined && log.balance !== undefined) {
                  y += 20;
                  const changeSign = log.pointsChange >= 0 ? '+' : '';
                  const changeText = `${changeSign}${log.pointsChange.toLocaleString()}`;
                  
                  this.ctx.font = '12px sans-serif';
                  this.ctx.fillStyle = log.pointsChange >= 0 ? '#4ade80' : '#f87171';
                  this.ctx.fillText(changeText, sx + 20, y);
                  
                  this.ctx.fillStyle = '#94a3b8';
                  this.ctx.fillText(`(Bal: ${log.balance.toLocaleString()})`, sx + 100, y);
              }
          } else {
              // 일반 Info 로그
              this.ctx.fillStyle = '#94a3b8';
              this.ctx.font = '13px sans-serif';
              this.ctx.fillText(log.message, sx + 90, y);
          }
          
          y += 35; // 간격 벌림
      });
  }

  private updateAnimations() {
      const now = Date.now();
      for (let i = this.animations.length - 1; i >= 0; i--) {
          const anim = this.animations[i];
          const elapsed = now - anim.startTime;
          const progress = Math.min(elapsed / anim.duration, 1);
          
          const ease = 1 - Math.pow(1 - progress, 3);
          
          if (anim.type === 'card' && anim.card) {
              const sprite = this.cardSprites.get(anim.card);
              if (!sprite) {
                  this.cardSprites.set(anim.card, {
                      x: anim.startX,
                      y: anim.startY,
                      faceUp: anim.faceUp || false,
                      rotation: 0
                  });
              }
              const s = this.cardSprites.get(anim.card)!;
              
              s.x = anim.startX + (anim.targetX - anim.startX) * ease;
              s.y = anim.startY + (anim.targetY - anim.startY) * ease;
              
              if (anim.rotationStart !== undefined && anim.rotationTarget !== undefined) {
                  s.rotation = anim.rotationStart + (anim.rotationTarget - anim.rotationStart) * ease;
              }

              if (progress >= 1) {
                  s.x = anim.targetX;
                  s.y = anim.targetY;
                  s.rotation = anim.rotationTarget || 0;
                  this.animations.splice(i, 1);
              }
          } else if (anim.type === 'discard' && anim.card) {
              const sprite = this.cardSprites.get(anim.card);
              if (sprite) {
                  sprite.x = anim.startX + (anim.targetX - anim.startX) * ease;
                  sprite.y = anim.startY + (anim.targetY - anim.startY) * ease;
                  
                  if (anim.rotationStart !== undefined && anim.rotationTarget !== undefined) {
                      sprite.rotation = anim.rotationStart + (anim.rotationTarget - anim.rotationStart) * ease;
                  }
              }

              if (progress >= 1) {
                  if (sprite) {
                      this.cardSprites.delete(anim.card);
                  }
                  this.animations.splice(i, 1);
              }
          } else if (anim.type === 'chip' && anim.chip) {
              anim.chip.x = anim.startX + (anim.targetX - anim.startX) * ease;
              anim.chip.y = anim.startY + (anim.targetY - anim.startY) * ease;
              if (progress >= 1) {
                  anim.chip.x = anim.targetX;
                  anim.chip.y = anim.targetY;
                  this.animations.splice(i, 1);
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
