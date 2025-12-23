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

interface GameLog {
  type: 'bet' | 'win' | 'lose' | 'draw' | 'blackjack' | 'info';
  message: string;
  time: string;
  round: number;
  betAmount?: number;
  pointsChange?: number;
  balance?: number;
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
  private insuranceBet: number = 0; // [신규] 속성 추가
  
  // 인슈어런스 정보 임시 저장 (로그 통합용)
  private insuranceInfo: { message: string, amount: number } | null = null;
  
  private roundNumber: number = 0; // 0: 입장 상태

  // 중복 처리 방지 플래그
  private isProcessing: boolean = false;
  
  // 게임 세션 ID (서버 연동용)
  private gameSessionId: string | null = null;
  
  // [최적화] 정적 배경 캐싱
  private staticCanvas: HTMLCanvasElement | null = null;
  private staticCtx: CanvasRenderingContext2D | null = null;

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
    visible: false
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
  
  private scaleFactor: number = 1;
  private isMobile: boolean = false;

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
      return { x: this.gameAreaWidth * 0.5, y: this.canvasHeight * 0.60 }; // Moved up slightly
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
      return { x: this.gameAreaWidth * 0.5, y: this.canvasHeight * 0.40 }; // Moved up
  }
  
  private get chipTrayPosition() { 
      if (this.isMobile) {
          return { x: this.gameAreaWidth * 0.5, y: this.canvasHeight * 0.85 };
      }
      return { x: this.gameAreaWidth * 0.5, y: this.canvasHeight * 0.88 }; 
  }

  private cardSprites: Map<Card, { x: number; y: number; faceUp: boolean; rotation: number; flipRotation?: number }> = new Map()
  // 카드 인덱스 추적 (같은 카드가 여러 장 있을 경우 구분)
  private cardIndices: Map<Card, { target: 'player' | 'dealer', index: number }> = new Map()

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
    if (this.isProcessing) return; // 중복 입력 방지

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
    // 테이블 배경 이미지 (더 안정적인 URL 사용)
    this.tableImage = await this.loadImage('https://images.unsplash.com/photo-1614294148950-1f23c7153a1e?w=800&q=80')
      .catch(() => {
        // 폴백: 단색 배경 사용
        return null;
      });

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
      this.loadImage('https://images.unsplash.com/photo-1614294148950-1f23c7153a1e?w=800&q=80')
      .then(img => {
        this.tableImage = img
        this.updateLoadingProgress()
      })
      .catch(() => {
        // 이미지 로드 실패 시 null로 설정 (단색 배경 사용)
        this.tableImage = null
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

    this.cacheStaticLayer() // [최적화] 배경 캐싱
    this.loadUserPoints()
  }

  // [최적화] 정적 배경 캐싱 메서드
  private cacheStaticLayer() {
      this.staticCanvas = document.createElement('canvas');
      this.staticCanvas.width = this.canvasWidth;
      this.staticCanvas.height = this.canvasHeight;
      this.staticCtx = this.staticCanvas.getContext('2d');
      
      if (!this.staticCtx) return;
      
      const ctx = this.staticCtx; // 별칭
      
      // 1. 배경
      ctx.fillStyle = '#0a3d20';
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
      
      // 2. 테이블
      if (this.tableImage) {
        ctx.drawImage(this.tableImage, 0, 0, this.gameAreaWidth, this.canvasHeight);
      } else {
        this.drawTablePattern(ctx); // ctx 전달
      }
      
      // 3. 사이드바 배경 (고정된 부분만)
      if (this.sidebarWidth > 0) {
          const sx = this.gameAreaWidth;
          const w = this.sidebarWidth;
          
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(sx, 0, w, this.canvasHeight);
          
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sx, 0);
          ctx.lineTo(sx, this.canvasHeight);
          ctx.stroke();
          
          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 20px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('HISTORY', sx + 20, 40);
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
        this.playerPoints = 10000;
        this.addLog('info', '체험판(데모) 모드 - 10,000P 지급됨', 0, 10000);
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
    setTimeout(() => {
        if (this.roundNumber === 0) this.roundNumber = 1;
        this.changeState(GameState.BETTING);
        // 베팅 안내 메시지 표시
        if (this.currentBet === 0) {
          this.showMessage('베팅을 해주세요')
        }
    }, 1000)
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
    this.isProcessing = false; // 입력 허용
    
    if (this.initialBet > 0 && this.currentBet === 0) {
        this.addChipToTable(this.initialBet);
        this.initialBet = 0;
    }
    
    // 베팅 안내 메시지 표시
    if (this.currentBet === 0) {
      this.showMessage('베팅을 해주세요')
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
        if (this.isProcessing) return; // 중복 클릭 방지
        if (this.currentBet > 0) {
          await this.confirmBet()
          // confirmBet 내부에서 이미 상태를 변경하므로 여기서는 변경하지 않음
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
    this.playerPoints -= amount 
    
    if (this.dealButton) this.dealButton.visible = true
  }
  
  private removeChipFromTable(index: number, amount: number) {
      this.betChips.splice(index, 1);
      this.currentBet -= amount;
      this.playerPoints += amount; 
      if (this.currentBet === 0 && this.dealButton) this.dealButton.visible = false;
  }

  private async confirmBet(): Promise<boolean> {
    if (this.isProcessing) return false;
    this.isProcessing = true; 

    const token = localStorage.getItem('token')
    if (!token) {
      this.showMessage('로그인이 필요합니다.')
      this.isProcessing = false;
      return false
    }
    
    if (this.dealButton) this.dealButton.visible = false

    try {
      // 서버에서 게임 시작 (베팅 + 카드 분배)
      const response = await fetch('/api/game/blackjack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'start',
          betAmount: this.currentBet,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        this.gameSessionId = data.sessionId
        this.playerPoints = data.points
        
        // 서버에서 받은 카드로 게임 상태 업데이트
        this.playerHand.cards = data.playerCards.map((c: any) => ({
          ...c,
          faceUp: c.faceUp !== false // 서버에서 faceUp이 true로 설정되어 있음
        }))
        // 딜러 카드: 첫 번째 카드만 받고, 두 번째 카드는 나중에 받음 (보안)
        // 두 번째 카드는 임시로 뒷면 카드 생성 (나중에 서버에서 받음)
        this.dealerHand.cards = [
          {
            ...data.dealerCards[0],
            faceUp: true
          },
          // 두 번째 카드는 임시로 뒷면 카드 생성 (나중에 서버에서 받음)
          {
            suit: 'spades' as any, // 임시 값 (나중에 서버에서 받음)
            value: 'A', // 임시 값 (나중에 서버에서 받음)
            faceUp: false
          }
        ]
        
        // cardSprites의 faceUp 상태도 업데이트
        this.playerHand.cards.forEach(card => {
          const sprite = Array.from(this.cardSprites.entries()).find(
            ([c]) => this.getCardKey(c) === this.getCardKey(card)
          )?.[1]
          if (sprite) {
            sprite.faceUp = card.faceUp
          }
        })
        // 딜러 카드: 첫 번째만 처리 (두 번째는 나중에 받음)
        if (this.dealerHand.cards[0]) {
          const sprite = Array.from(this.cardSprites.entries()).find(
            ([c]) => this.getCardKey(c) === this.getCardKey(this.dealerHand.cards[0])
          )?.[1]
          if (sprite) {
            sprite.faceUp = this.dealerHand.cards[0].faceUp
          }
        }
        
        // 카드 애니메이션
        await this.animateServerCards()
        
        // 블랙잭 체크
        this.updateScores()
        const dealerUp = this.dealerHand.cards[0]
        if (dealerUp.value === 'A') {
          this.changeState(GameState.INSURANCE)
        } else {
          this.changeState(GameState.CHECK_BLACKJACK)
        }
        
        this.isProcessing = false;
        return true
      } else {
        const errorData = await response.json()
        this.showMessage(errorData.error || '베팅에 실패했습니다.')
        this.playerPoints += this.currentBet
        this.currentBet = 0
        this.betChips = []
        if (this.dealButton) this.dealButton.visible = false
        this.isProcessing = false;
        return false
      }
    } catch (error) {
      console.error('Betting error:', error)
      this.showMessage('베팅 중 오류가 발생했습니다.')
      this.playerPoints += this.currentBet
      this.currentBet = 0
      this.betChips = []
      if (this.dealButton) this.dealButton.visible = false
      this.isProcessing = false;
      return false
    }
  }

  // 서버에서 받은 카드 애니메이션
  private async animateServerCards(): Promise<void> {
    // 기존 애니메이션 정리 (중복 방지)
    this.animations = this.animations.filter(anim => anim.type !== 'card')
    
    // 플레이어 카드 애니메이션 (카드는 이미 hand에 있으므로 애니메이션만 처리)
    for (let i = 0; i < this.playerHand.cards.length; i++) {
      const card = this.playerHand.cards[i]
      await this.animateCardToPosition('player', card, card.faceUp, i)
    }
    
    // 딜러 카드 애니메이션
    for (let i = 0; i < this.dealerHand.cards.length; i++) {
      const card = this.dealerHand.cards[i]
      // 두 번째 카드는 뒷면으로 표시 (나중에 서버에서 받음)
      const faceUp = i === 0 ? card.faceUp : false
      await this.animateCardToPosition('dealer', card, faceUp, i)
    }
  }
  
  // 카드 고유 키 생성 (카드 객체 참조를 포함하여 같은 카드도 구분)
  private getCardKey(card: Card, target?: 'player' | 'dealer', index?: number): string {
    // 위치 정보가 있으면 포함 (같은 카드가 여러 장 있을 경우 구분)
    if (target !== undefined && index !== undefined) {
      return `${target}-${index}-${card.suit}-${card.value}`
    }
    // 위치 정보가 없으면 카드 객체 참조를 사용 (같은 카드도 구분)
    return `${card.suit}-${card.value}-${card.toString ? card.toString() : Math.random()}`
  }
  
  // 카드 객체로 고유 키 생성 (카드 객체 참조 기반)
  private getCardObjectKey(card: Card): string {
    // 카드 객체 자체를 키로 사용하기 위해 고유 식별자 생성
    // 같은 suit와 value를 가진 카드도 구분하기 위해 객체 참조 사용
    return `card-${card.suit}-${card.value}-${Date.now()}-${Math.random()}`
  }

  // 카드 애니메이션만 처리 (카드는 이미 hand에 있음)
  private async animateCardToPosition(target: 'player' | 'dealer', card: Card, faceUp: boolean, index: number): Promise<void> {
    // 카드 인덱스 추적 (같은 카드가 여러 장 있을 경우 구분)
    this.cardIndices.set(card, { target, index })
    
    // 이미 애니메이션이 진행 중인 카드는 건너뛰기 (카드 객체 참조로 직접 비교)
    const existingAnimation = this.animations.find(
      anim => anim.type === 'card' && anim.card === card
    )
    if (existingAnimation) {
      return // 이미 애니메이션 중이면 추가하지 않음
    }

    const spacing = (this.isMobile ? 25 : 30) * this.scaleFactor
    const totalW = ((target === 'player' ? this.playerHand : this.dealerHand).cards.length - 1) * spacing
    const baseX = target === 'player' ? this.playerPosition.x : this.dealerPosition.x
    const baseY = target === 'player' ? this.playerPosition.y : this.dealerPosition.y
    
    const targetX = baseX + (index * spacing) - (totalW / 2)
    const targetY = baseY

    // 카드 스프라이트 찾기 (카드 객체 참조로 직접 비교)
    let sprite = this.cardSprites.get(card)

    // 카드 스프라이트가 없으면 생성 (같은 카드가 여러 장 있어도 각각 별도 스프라이트)
    if (!sprite) {
      sprite = {
        x: this.deckPosition.x,
        y: this.deckPosition.y,
        faceUp: faceUp,
        rotation: Math.random() * Math.PI
      }
      this.cardSprites.set(card, sprite)
    } else {
      // 기존 스프라이트의 faceUp 상태 업데이트
      sprite.faceUp = faceUp
    }

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
      rotationStart: sprite.rotation,
      rotationTarget: 0
    })

    await this.delay(300)
  }

  private async handleDealStart() {
    // 이제 confirmBet에서 서버 API를 호출하므로 여기서는 처리하지 않음
    // confirmBet에서 카드를 받아옴
  }

  // 클라이언트에서 직접 카드를 추가할 때 사용 (Hit 등)
  private async dealCard(target: 'player' | 'dealer', faceUp: boolean, index: number): Promise<void> {
    // 이 함수는 클라이언트에서 직접 카드를 추가할 때만 사용
    // 서버에서 받은 카드는 이미 hand에 있으므로 animateCardToPosition 사용
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

    // 카드 스프라이트 생성
    this.cardSprites.set(card, {
      x: this.deckPosition.x,
      y: this.deckPosition.y,
      faceUp: faceUp,
      rotation: Math.random() * Math.PI
    })

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
    this.showMessage('Insurance?')
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
    if (this.isProcessing) return;
    
    const insuranceAmount = Math.floor(this.currentBet * 0.5)
    
    if (this.playerPoints < insuranceAmount) {
      this.showMessage('포인트가 부족합니다.')
      return
    }

    // [수정] 바로 로그 남기지 않고 정보 저장
    this.insuranceInfo = {
        message: `Insurance (-${insuranceAmount.toLocaleString()} P)`,
        amount: insuranceAmount
    };
    
    this.playerPoints -= insuranceAmount
    this.showMessage('Insurance Purchased')

    this.buttons = []
    this.changeState(GameState.CHECK_BLACKJACK)
  }
  
  private declineInsurance() {
      if (this.isProcessing) return;
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
      this.isProcessing = false; 
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
    // 칩 버튼과 겹치지 않도록 버튼 위치를 더 위로 조정
    // 칩 버튼이 아래쪽(0.85/0.88)에 있으므로 버튼은 더 위에 배치
    // 플레이어 위치(0.55/0.60)와 칩 버튼(0.85/0.88) 사이에 배치
    const y = this.isMobile ? this.canvasHeight * 0.68 : this.canvasHeight * 0.70; // 칩과 겹치지 않도록 조정

    this.buttons = actions.map((text, i) => ({
        x: startX + i * (btnW + gap),
        y,
        width: btnW,
        height: btnH,
        text,
        onClick: () => {
            if (this.isProcessing) return; 

            if (text === 'HIT') this.playerHit();
            if (text === 'STAND') this.playerStand();
            if (text === 'DOUBLE') this.playerDouble();
            if (text === 'SPLIT') this.playerSplit();
        },
        visible: true
    }));
  }

  private async playerHit() {
      if (!this.gameSessionId) return
      this.isProcessing = true; 
      
      const token = localStorage.getItem('token')
      if (!token) {
        this.showMessage('로그인이 필요합니다.')
        this.isProcessing = false
        return
      }
      
      try {
        const response = await fetch('/api/game/blackjack', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: 'hit',
            sessionId: this.gameSessionId,
          }),
        })
        
        if (response.ok) {
          const data = await response.json()
          
          // 서버에서 받은 카드로 업데이트
          this.playerHand.cards = data.playerCards.map((c: any) => ({
            ...c,
            faceUp: c.faceUp !== false
          }))
          
          // 새 카드 애니메이션 (서버에서 받은 카드는 이미 hand에 있으므로 애니메이션만)
          const lastCard = this.playerHand.cards[this.playerHand.cards.length - 1]
          if (lastCard) {
            await this.animateCardToPosition('player', lastCard, true, this.playerHand.cards.length - 1)
          }
          
          this.updateScores()
          
          if (data.bust || data.result === 'lose') {
            // 버스트 시 딜러 두 번째 카드 공개 (서버에서 받아옴)
            try {
              const secondCardResponse = await fetch('/api/game/blackjack', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  action: 'getDealerSecondCard',
                  sessionId: this.gameSessionId,
                }),
              })
              
              if (secondCardResponse.ok) {
                const secondCardData = await secondCardResponse.json()
                
                // 딜러 두 번째 카드 업데이트
                if (secondCardData.dealerSecondCard && this.dealerHand.cards[1]) {
                  // 기존 임시 카드의 스프라이트 찾기
                  const oldCard = this.dealerHand.cards[1]
                  const oldSprite = Array.from(this.cardSprites.entries()).find(
                    ([c]) => c === oldCard
                  )?.[1]
                  
                  // 실제 카드로 업데이트
                  const newCard = {
                    ...secondCardData.dealerSecondCard,
                    faceUp: true
                  }
                  this.dealerHand.cards[1] = newCard
                  
                  // 기존 스프라이트를 새 카드로 업데이트
                  if (oldSprite) {
                    this.cardSprites.delete(oldCard)
                    this.cardSprites.set(newCard, {
                      ...oldSprite,
                      faceUp: true
                    })
      } else {
                    // 스프라이트가 없으면 새로 생성
                    this.cardSprites.set(newCard, {
                      x: this.dealerPosition.x,
                      y: this.dealerPosition.y,
                      faceUp: true,
                      rotation: 0
                    })
                  }
                  
                  await this.delay(500) // 카드 공개 애니메이션 대기
                }
              }
            } catch (error) {
              console.error('Get dealer second card error:', error)
            }
            
            // 버스트 메시지 표시
            if (data.bust || this.playerHand.isBust) {
              this.showMessage('버스트 패배!')
            }
            // 서버에서 받은 포인트 업데이트
            if (data.points !== undefined) {
              this.playerPoints = data.points
            }
            this.buttons = []
            await this.settleGame('lose', data.points)
      } else {
            this.isProcessing = false
          }
        } else {
          const errorData = await response.json()
          this.showMessage(errorData.error || 'Hit 실패')
          this.isProcessing = false
        }
      } catch (error) {
        console.error('Hit error:', error)
        this.showMessage('Hit 중 오류가 발생했습니다.')
        this.isProcessing = false
      }
  }

  private async playerStand() {
      if (!this.gameSessionId) return
      this.isProcessing = true;
      this.buttons = [];
      
      const token = localStorage.getItem('token')
      if (!token) {
        this.showMessage('로그인이 필요합니다.')
        this.isProcessing = false
        return
      }
      
      try {
        const response = await fetch('/api/game/blackjack', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: 'stand',
            sessionId: this.gameSessionId,
          }),
        })
        
        if (response.ok) {
          const data = await response.json()
          
          // 딜러 두 번째 카드 공개 (서버에서 받아옴)
          try {
            const secondCardResponse = await fetch('/api/game/blackjack', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                action: 'getDealerSecondCard',
                sessionId: this.gameSessionId,
              }),
            })
            
            if (secondCardResponse.ok) {
              const secondCardData = await secondCardResponse.json()
              
              // 딜러 두 번째 카드 업데이트
              if (secondCardData.dealerSecondCard && this.dealerHand.cards[1]) {
                // 기존 임시 카드의 스프라이트 찾기 (인덱스로 찾기)
                const oldCard = this.dealerHand.cards[1]
                const oldSprite = Array.from(this.cardSprites.entries()).find(
                  ([c]) => c === oldCard
                )?.[1]
                
                // 실제 카드로 업데이트
                const newCard = {
                  ...secondCardData.dealerSecondCard,
                  faceUp: true
                }
                this.dealerHand.cards[1] = newCard
                
                // 기존 스프라이트를 새 카드로 업데이트
                if (oldSprite) {
                  // 기존 스프라이트를 제거하고 새 카드로 추가
                  this.cardSprites.delete(oldCard)
                  const sprite = {
                    ...oldSprite,
                    faceUp: false, // 처음에는 뒷면
                    flipRotation: 0 // 뒤집기 회전 시작
                  }
                  this.cardSprites.set(newCard, sprite)
                  
                  // 카드 뒤집기 애니메이션 추가
                  this.animations.push({
                    type: 'flip',
                    startX: sprite.x,
                    startY: sprite.y,
                    targetX: sprite.x,
                    targetY: sprite.y,
                    duration: 600, // 0.6초 애니메이션
                    startTime: Date.now(),
                    card: newCard,
                    faceUp: true,
                    flipRotation: 0 // 0에서 Math.PI까지 회전
                  })
                  
                  // 애니메이션 완료 대기
                  await this.delay(650)
                } else {
                  // 스프라이트가 없으면 새로 생성
                  this.cardSprites.set(newCard, {
                    x: this.dealerPosition.x,
                    y: this.dealerPosition.y,
                    faceUp: true,
                    rotation: 0
                  })
                }
              }
            }
          } catch (error) {
            console.error('Get dealer second card error:', error)
            // 에러 발생 시 기존 카드 사용
            if (this.dealerHand.cards[1]) {
              this.dealerHand.cards[1].faceUp = true
            }
          }
          
          // 딜러 점수 업데이트
          this.updateScores()
          
          // 딜러가 17 이상이 될 때까지 카드를 하나씩 받음
          // 서버에서 딜러 카드 정보를 단계적으로 받기 위해 API 호출
          const dealerCardCount = data.dealerCardCount || 2
          const dealerFinalScore = data.dealerFinalScore || 0
          
          // 딜러가 추가 카드를 받아야 하는 경우
          if (dealerCardCount > 2) {
            // 딜러가 17 이상이 될 때까지 카드를 하나씩 받음
            while (this.dealerHand.cards.length < dealerCardCount) {
              // 서버에서 딜러 카드를 단계적으로 받기
              try {
                const dealerCardResponse = await fetch('/api/game/blackjack', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    action: 'dealerHit',
                    sessionId: this.gameSessionId,
                    currentCardCount: this.dealerHand.cards.length,
                  }),
                })
                
                if (dealerCardResponse.ok) {
                  const dealerCardData = await dealerCardResponse.json()
                  
                  // 딜러 카드 추가
                  if (dealerCardData.dealerCard) {
                    const newCard = {
                      ...dealerCardData.dealerCard,
                      faceUp: true
                    }
                    this.dealerHand.cards.push(newCard)
                    
                    // 카드 애니메이션
                    await this.animateCardToPosition(
                      'dealer',
                      newCard,
                      true,
                      this.dealerHand.cards.length - 1
                    )
                    
                    // 딜러 점수 업데이트
                    this.updateScores()
                    
                    // 딜러가 17 이상이면 멈춤
                    if (this.dealerHand.score >= 17) {
                      break
                    }
                  }
                } else {
                  // API 호출 실패 시 서버에서 받은 최종 점수로 설정
                  break
                }
              } catch (error) {
                console.error('Dealer hit error:', error)
                break
              }
              
              await this.delay(800) // 다음 카드 받기 전 대기
            }
          }
          
          // 최종 딜러 점수 설정 (서버에서 받은 점수로 동기화)
          if (dealerFinalScore > 0) {
            this.dealerHand.score = dealerFinalScore
          }
          
          // 딜러 카드 상태 업데이트 (서버에서 받은 초기 2장)
          if (data.dealerCards && data.dealerCards.length > 0) {
            // 기존 카드 2장만 업데이트 (추가 카드는 위에서 이미 추가됨)
            for (let i = 0; i < Math.min(2, data.dealerCards.length); i++) {
              if (this.dealerHand.cards[i]) {
                this.dealerHand.cards[i] = {
                  ...data.dealerCards[i],
                  faceUp: data.dealerCards[i].faceUp !== false
                }
              }
            }
          }
          
          // cardSprites 상태 업데이트
          this.dealerHand.cards.forEach((card, index) => {
            const sprite = Array.from(this.cardSprites.entries()).find(
              ([c]) => this.getCardKey(c) === this.getCardKey(card)
            )?.[1]
            if (sprite) {
              sprite.faceUp = card.faceUp
            }
          })
          
          // 최종 점수 업데이트
          this.updateScores()
          
          // 서버에서 받은 포인트 업데이트
          if (data.points !== undefined) {
            this.playerPoints = data.points
          }
          
          // 버스트 체크 및 메시지 표시
          this.updateScores()
          if (this.dealerHand.isBust) {
            this.showMessage('딜러 버스트 승리!')
          }
          
        // 딜러 두 번째 카드 공개 (Double Down 시에도 공개)
        try {
          const secondCardResponse = await fetch('/api/game/blackjack', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              action: 'getDealerSecondCard',
              sessionId: this.gameSessionId,
            }),
          })
          
          if (secondCardResponse.ok) {
            const secondCardData = await secondCardResponse.json()
            
            // 딜러 두 번째 카드 업데이트
            if (secondCardData.dealerSecondCard && this.dealerHand.cards[1]) {
              // 기존 임시 카드의 스프라이트 찾기
              const oldCard = this.dealerHand.cards[1]
              const oldSprite = Array.from(this.cardSprites.entries()).find(
                ([c]) => c === oldCard
              )?.[1]
              
              // 실제 카드로 업데이트
              const newCard = {
                ...secondCardData.dealerSecondCard,
                faceUp: true
              }
              this.dealerHand.cards[1] = newCard
              
              // 기존 스프라이트를 새 카드로 업데이트
              if (oldSprite) {
                this.cardSprites.delete(oldCard)
                this.cardSprites.set(newCard, {
                  ...oldSprite,
                  faceUp: true
                })
              } else {
                // 스프라이트가 없으면 새로 생성
                this.cardSprites.set(newCard, {
                  x: this.dealerPosition.x,
                  y: this.dealerPosition.y,
                  faceUp: true,
                  rotation: 0
                })
              }
              
              await this.delay(500) // 카드 공개 애니메이션 대기
            }
          }
        } catch (error) {
          console.error('Get dealer second card error:', error)
        }
        
        // 서버에서 받은 포인트 업데이트
        if (data.points !== undefined) {
          this.playerPoints = data.points
        }
        
        // 버스트 체크 및 메시지 표시
        this.updateScores()
        if (this.dealerHand.isBust) {
          this.showMessage('딜러 버스트 승리!')
        }
        
        // 최종 결과 처리
        await this.settleGame(data.result, data.points)
        } else {
          const errorData = await response.json()
          this.showMessage(errorData.error || 'Stand 실패')
          this.isProcessing = false
        }
      } catch (error) {
        console.error('Stand error:', error)
        this.showMessage('Stand 중 오류가 발생했습니다.')
        this.isProcessing = false
      }
  }
  
  private async playerDouble() {
    if (!this.gameSessionId) return
    this.isProcessing = true;
    
    if (this.playerPoints < this.currentBet) {
      this.showMessage('포인트가 부족합니다.')
      this.isProcessing = false;
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      this.showMessage('로그인이 필요합니다.')
      this.isProcessing = false
      return
    }
    
    try {
      const response = await fetch('/api/game/blackjack', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
          action: 'double',
          sessionId: this.gameSessionId,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          this.playerPoints = data.points
          this.currentBet *= 2
        
        // 서버에서 받은 카드로 업데이트
        this.playerHand.cards = data.playerCards.map((c: any) => ({
          ...c,
          faceUp: c.faceUp !== false
        }))
        
        // 딜러 카드: 첫 번째만 받고, 두 번째는 나중에 받음 (보안)
        this.dealerHand.cards = [
          {
            ...data.dealerCards[0],
            faceUp: true
          },
          // 두 번째 카드는 임시로 뒷면 카드 생성 (나중에 서버에서 받음)
          {
            suit: 'spades' as any, // 임시 값 (나중에 서버에서 받음)
            value: 'A', // 임시 값 (나중에 서버에서 받음)
            faceUp: false
          }
        ]
        
        // 딜러 두 번째 카드 공개 (Double Down 시에도 공개)
        try {
          const secondCardResponse = await fetch('/api/game/blackjack', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              action: 'getDealerSecondCard',
              sessionId: this.gameSessionId,
            }),
          })
          
          if (secondCardResponse.ok) {
            const secondCardData = await secondCardResponse.json()
            
            // 딜러 두 번째 카드 업데이트
            if (secondCardData.dealerSecondCard && this.dealerHand.cards[1]) {
              // 기존 임시 카드의 스프라이트 찾기
              const oldCard = this.dealerHand.cards[1]
              const oldSprite = Array.from(this.cardSprites.entries()).find(
                ([c]) => c === oldCard
              )?.[1]
              
              // 실제 카드로 업데이트
              const newCard = {
                ...secondCardData.dealerSecondCard,
                faceUp: true
              }
              this.dealerHand.cards[1] = newCard
              
              // 기존 스프라이트를 새 카드로 업데이트
              if (oldSprite) {
                this.cardSprites.delete(oldCard)
                this.cardSprites.set(newCard, {
                  ...oldSprite,
                  faceUp: true
                })
        } else {
                // 스프라이트가 없으면 새로 생성
                this.cardSprites.set(newCard, {
                  x: this.dealerPosition.x,
                  y: this.dealerPosition.y,
                  faceUp: true,
                  rotation: 0
                })
              }
              
              await this.delay(500) // 카드 공개 애니메이션 대기
            }
          }
        } catch (error) {
          console.error('Get dealer second card error:', error)
        }
        
        // cardSprites의 faceUp 상태도 업데이트
        this.playerHand.cards.forEach(card => {
          const sprite = Array.from(this.cardSprites.entries()).find(
            ([c]) => this.getCardKey(c) === this.getCardKey(card)
          )?.[1]
          if (sprite) {
            sprite.faceUp = card.faceUp
          }
        })
        this.dealerHand.cards.forEach((card, index) => {
          const sprite = Array.from(this.cardSprites.entries()).find(
            ([c]) => this.getCardKey(c) === this.getCardKey(card)
          )?.[1]
          if (sprite) {
            sprite.faceUp = card.faceUp
          }
          // 카드 객체 자체도 업데이트
          card.faceUp = card.faceUp !== false
        })
        
        // 딜러 두 번째 카드는 위에서 서버에서 받아와서 공개됨
        
        // 새 카드 애니메이션 (서버에서 받은 카드는 이미 hand에 있으므로 애니메이션만)
        const lastPlayerCard = this.playerHand.cards[this.playerHand.cards.length - 1]
        if (lastPlayerCard) {
          await this.animateCardToPosition('player', lastPlayerCard, true, this.playerHand.cards.length - 1)
        }
        
        // 딜러 카드 애니메이션
        for (let i = 2; i < this.dealerHand.cards.length; i++) {
          const dealerCard = this.dealerHand.cards[i]
          if (dealerCard) {
            await this.animateCardToPosition('dealer', dealerCard, true, i)
          }
        }
        
        // 최종 결과 처리
        // 서버에서 받은 포인트 업데이트
        if (data.points !== undefined) {
          this.playerPoints = data.points
        }
        await this.settleGame(data.result, data.points)
        } else {
        const errorData = await response.json()
        this.showMessage(errorData.error || 'Double Down 실패')
          this.isProcessing = false;
          return
        }
      } catch (error) {
        console.error('Double down error:', error)
      this.showMessage('Double Down 중 오류가 발생했습니다.')
        this.isProcessing = false;
        return
      }
  }
  
  private playerSplit() {
      this.showMessage('Split 기능은 준비중입니다.');
  }

  private async handleDealerTurn() {
      this.isProcessing = true;
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
      this.isProcessing = true; 
      this.updateScores();
      const pScore = this.playerHand.score;
      const dScore = this.dealerHand.score;
      let result: 'win' | 'lose' | 'draw' | 'blackjack' = 'lose';

      // 버스트 체크 및 메시지 표시
      if (this.playerHand.isBust) {
        result = 'lose';
        this.showMessage('버스트 패배!')
      } else if (this.dealerHand.isBust) {
        result = 'win';
        this.showMessage('딜러 버스트 승리!')
      } else if (isBlackjack(this.playerHand) && isBlackjack(this.dealerHand)) {
        result = 'draw';
      } else if (isBlackjack(this.playerHand)) {
        result = 'blackjack';
      } else if (pScore > dScore) {
        result = 'win';
      } else if (pScore < dScore) {
        result = 'lose';
      } else {
        result = 'draw';
      }

      this.settleGame(result);
  }

  private async settleGame(result: 'win' | 'lose' | 'draw' | 'blackjack', serverPoints?: number) {
    // Stand나 Double에서 이미 서버에서 정산이 완료되었으므로
    // 여기서는 UI 업데이트만 수행
    
    // 서버에서 받은 포인트로 업데이트 (가장 중요!)
    if (serverPoints !== undefined) {
      this.playerPoints = serverPoints
    }
    
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

    // 포인트는 서버 응답에서 이미 업데이트됨
    this.updateScores()
        
        this.gameResult = {
          type: result,
          message: message,
          winnings: result === 'draw' ? 0 : winnings - this.currentBet,
          startTime: Date.now(),
          visible: true
        }
        
        let logMsg = '';
        let pointsChange = 0;
        
        if (result === 'win' || result === 'blackjack') {
            pointsChange = winnings - this.currentBet;
            logMsg = 'WIN';
        } else if (result === 'draw') {
            pointsChange = 0;
            logMsg = 'DRAW (Push)';
        } else {
            pointsChange = -this.currentBet;
            logMsg = 'LOSE';
        }
        
        if (this.insuranceInfo) {
            logMsg += `\n${this.insuranceInfo.message}`;
        }
        
    this.addLog(result === 'blackjack' ? 'win' : (result as any), logMsg, pointsChange, this.playerPoints, this.currentBet);

    await this.delay(3000)
    this.gameResult.visible = false
    
    await this.delay(500)
    this.handleRoundEnd()
  }
  
  private async handleRoundEnd() {
    await this.discardCards()
    
    // 모든 게임 상태 완전 초기화
    this.playerHand = { cards: [], score: 0, isBlackjack: false, isBust: false }
    this.dealerHand = { cards: [], score: 0, isBlackjack: false, isBust: false }
    this.betChips = []
    this.currentBet = 0
    this.initialBet = 0
    
    // 인슈어런스 초기화
    this.insuranceBet = 0
    this.insuranceInfo = null
    
    // 게임 세션 초기화
    this.gameSessionId = null
    
    // 카드 스프라이트 완전 초기화
    this.cardSprites.clear()
    
    // 애니메이션 초기화
    this.animations = []
    
    // 버튼 초기화
    this.buttons = []
    this.dealButton = null
    
    // 게임 결과 초기화
    this.gameResult = {
      type: null,
      message: '',
      winnings: 0,
      startTime: 0,
      visible: false
    }
    
    // 처리 상태 초기화
    this.isProcessing = false
    
    this.roundNumber++; 
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
    
    // [최적화] 배경 그리기 (캐시 사용)
    if (this.staticCanvas) {
        this.ctx.drawImage(this.staticCanvas, 0, 0);
    } else {
        // 폴백
        this.ctx.fillStyle = '#0a3d20'
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)
        if (this.tableImage) {
            this.ctx.drawImage(this.tableImage, 0, 0, this.gameAreaWidth, this.canvasHeight)
        } else {
            this.drawTablePattern()
        }
    }

    this.renderGameElements()
    this.renderSidebarContent() // 이름 변경
    this.renderGameResult()

    this.updateAnimations()
    this.animationFrameId = requestAnimationFrame(() => this.render())
  }

  private drawTablePattern(targetCtx?: CanvasRenderingContext2D) {
      const ctx = targetCtx || this.ctx;
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)';
      ctx.lineWidth = 3 * this.scaleFactor;
      ctx.beginPath();
      ctx.arc(this.gameAreaWidth / 2, -400 * this.scaleFactor, 1000 * this.scaleFactor, 0, Math.PI, false);
      ctx.stroke();
      
      ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
      ctx.font = `bold ${40 * this.scaleFactor}px serif`;
      ctx.textAlign = 'center';
      ctx.fillText("BLACKJACK PAYS 3 TO 2", this.gameAreaWidth / 2, this.canvasHeight * 0.4);
      ctx.font = `${20 * this.scaleFactor}px serif`;
      ctx.fillText("Dealer must stand on 17 and draw to 16", this.gameAreaWidth / 2, this.canvasHeight * 0.45);
  }

  private renderGameElements() {
    this.renderDeck()

    // 포인트 표시 (왼쪽 위)
    this.ctx.fillStyle = '#ffffff'
    this.ctx.font = `bold ${18 * this.scaleFactor}px Arial`
    this.ctx.textAlign = 'left'
    this.ctx.fillText(`Points: ${this.playerPoints.toLocaleString()}`, 20, 30)

    this.ctx.fillStyle = '#ffffff'
    this.ctx.font = `bold ${20 * this.scaleFactor}px Arial`
    this.ctx.textAlign = 'center'
    
    if (this.gameState !== GameState.BETTING && this.gameState !== GameState.SHUFFLE) {
        // 딜러 점수 표시: 두 번째 카드가 공개되지 않았으면 "?", 공개되었으면 실제 점수
        let dScoreText = "?";
        const dealerSecondCard = this.dealerHand.cards[1];
        const isDealerSecondCardRevealed = dealerSecondCard?.faceUp === true;
        
        if (isDealerSecondCardRevealed || this.gameState === GameState.DEALER_TURN || this.gameState === GameState.SETTLEMENT) {
            // 딜러 두 번째 카드가 공개되었거나 딜러 턴/정산 단계면 실제 점수 표시
            this.updateScores(); // 점수 업데이트
            dScoreText = `${this.dealerHand.score}`;
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
      
      // 카드 뒤집기 애니메이션 처리
      if (sprite.flipRotation !== undefined) {
        // Y축 회전 (카드 뒤집기) - scale을 사용하여 3D 효과
        const scaleY = Math.cos(sprite.flipRotation);
        this.ctx.scale(1, scaleY);
      }
      
      // 카드와 스프라이트의 faceUp 상태 모두 확인 (스프라이트 우선)
      // 뒤집기 중간 지점을 넘으면 앞면 표시
      const isFaceUp = sprite.flipRotation !== undefined 
        ? (sprite.flipRotation >= Math.PI / 2 ? (sprite.faceUp || card.faceUp) : false)
        : (sprite.faceUp !== undefined ? sprite.faceUp : card.faceUp);
      
      this.ctx.shadowColor = 'transparent'; // 성능 최적화: 그림자 제거
      this.ctx.shadowBlur = 0;

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

      this.ctx.shadowColor = 'transparent'; // 최적화
      this.ctx.shadowBlur = 0;
      this.ctx.shadowOffsetY = 0;

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
          
          this.ctx.shadowColor = 'transparent'; // 최적화
          this.ctx.shadowBlur = 0;
          this.ctx.shadowOffsetY = 0;

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

    this.ctx.shadowColor = 'transparent' // 최적화
    this.ctx.shadowBlur = 0
    this.ctx.shadowOffsetX = 0
    this.ctx.shadowOffsetY = 0

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

  private renderSidebarContent() {
      if (this.sidebarWidth === 0) return;
      
      const sx = this.gameAreaWidth;
      
      const logStartY = 60;
      const logEndY = this.canvasHeight - 20;
      let y = logStartY;
      const lineHeight = 20; // 메타데이터 줄 높이
      const innerLineHeight = 16; // 같은 라운드 내부 줄간격 (좁게)
      const spacing = 14; // 라운드 간 간격 (넓게)
      const padding = 4; // 배경 패딩
      
      // [수정] 로그 렌더링 로직 (멀티라인 지원, 겹침 방지, row별 배경)
      this.logs.forEach((log, index) => {
          const lines = log.message.split('\n');

          // 높이 계산 수정 (내부 줄간격 반영)
          let totalHeight = 0;
          const pointsHeight = (log.pointsChange !== undefined && log.balance !== undefined) ? innerLineHeight : 0;

          if (log.round > 0) {
              // 일반 로그: 메타데이터(1) + 메시지(N) + 포인트(옵션) + 간격
              const metaHeight = lineHeight;
              const msgHeight = lines.length * innerLineHeight;
              totalHeight = metaHeight + msgHeight + pointsHeight + spacing;
          } else {
              // 입장 로그: 한 줄에 모두 표시 + 간격
              totalHeight = lineHeight + spacing;
          }
          
          const currentY = y; // 현재 로그 항목의 시작 y 위치 저장
          
          // 히스토리 영역을 벗어나면 건너뛰기
          if (currentY + totalHeight > logEndY) {
              return;
          }
          
          // row 순서에 따라 배경색 번갈아 표시 (홀수/짝수)
          const bgColor = index % 2 === 0
              ? 'rgba(30, 41, 59, 0.5)'   // 짝수 row: 어두운 slate (색1)
              : 'rgba(51, 65, 85, 0.3)';  // 홀수 row: 밝은 slate (색2)
          
          this.ctx.fillStyle = bgColor;
          this.roundRect(
              sx + padding, 
              currentY - lineHeight + 6, 
              this.sidebarWidth - padding * 2, 
              totalHeight - spacing + 2,
              4
          );
          this.ctx.fill();
          
          // 시간 표시
          this.ctx.font = '12px monospace';
          this.ctx.fillStyle = '#64748b';
          this.ctx.fillText(`[${log.time}]`, sx + 40, currentY);
          
          if (log.round > 0) {
              // 라운드 번호
              this.ctx.fillStyle = '#94a3b8';
              this.ctx.font = '12px monospace';
              this.ctx.fillText(`${log.round}R`, sx + 90, currentY);
              
              // 베팅 금액
              if (log.betAmount) {
                  this.ctx.fillStyle = '#fbbf24'; 
                  this.ctx.font = '12px monospace';
                  this.ctx.fillText(`${log.betAmount.toLocaleString()}`, sx + 130, currentY);
              }
              
              // 결과 타입 색상
              let resultColor = '#fff';
              if (log.type === 'win' || log.type === 'blackjack') resultColor = '#4ade80';
              else if (log.type === 'lose') resultColor = '#f87171';
              else if (log.type === 'draw') resultColor = '#fbbf24';
              else if (log.type === 'info') resultColor = '#94a3b8'; 
              
              // 첫 번째 줄 메시지 (WIN/LOSE 등)
              this.ctx.fillStyle = resultColor;
              this.ctx.font = 'bold 12px monospace';
              const maxWidth = this.sidebarWidth - 220; // 최대 텍스트 너비
              const firstLine = lines[0].length > 20 ? lines[0].substring(0, 20) + '...' : lines[0];
              this.ctx.fillText(firstLine, sx + 20, currentY + lineHeight);
              
              // 추가 줄들 (Insurance 등) - 내부 줄간격 사용
              let lineY = currentY + lineHeight;
              for (let i = 1; i < lines.length; i++) {
                  lineY += innerLineHeight;
                  this.ctx.fillStyle = '#94a3b8';
                  this.ctx.font = '11px monospace';
                  const lineText = lines[i].length > 25 ? lines[i].substring(0, 25) + '...' : lines[i];
                  this.ctx.fillText(lineText, sx + 20, lineY);
              }
              
              // 포인트 변경 정보 - 내부 줄간격 사용
              if (log.pointsChange !== undefined && log.balance !== undefined) {
                  lineY += innerLineHeight;
                  const changeSign = log.pointsChange >= 0 ? '+' : '';
                  const changeText = `${changeSign}${log.pointsChange.toLocaleString()}`;
                  
                  this.ctx.font = '11px sans-serif';
                  this.ctx.fillStyle = log.pointsChange >= 0 ? '#4ade80' : '#f87171';
                  this.ctx.fillText(changeText, sx + 20, lineY);
                  
                  this.ctx.fillStyle = '#94a3b8';
                  this.ctx.font = '11px sans-serif';
                  const balanceText = `Bal: ${log.balance.toLocaleString()}`;
                  this.ctx.fillText(balanceText, sx + 100, lineY);
              }
          } else {
              // 라운드가 0이면 "입장"으로 처리
              this.ctx.fillStyle = '#94a3b8';
              this.ctx.font = '12px monospace';
              this.ctx.fillText("입장", sx + 90, currentY);
              
              // 시작포인트 정보를 오른쪽 끝에 정렬
              this.ctx.font = '11px sans-serif';
              this.ctx.fillStyle = '#fbbf24';
              this.ctx.textAlign = 'right';
              const infoText = log.message.replace('접속 성공 - ', '');
              this.ctx.fillText(infoText, sx + this.sidebarWidth - 10, currentY);
              this.ctx.textAlign = 'left'; // 원상복구
          }
          
          // 다음 로그 항목을 위한 y 위치 업데이트 (정확한 높이 사용)
          y = currentY + totalHeight;
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
          } else if (anim.type === 'flip' && anim.card) {
              // 카드 뒤집기 애니메이션 (Y축 회전)
              const sprite = this.cardSprites.get(anim.card);
              if (sprite) {
                  // 0에서 Math.PI까지 회전 (뒷면 -> 앞면)
                  sprite.flipRotation = Math.PI * progress;
                  
                  // 중간 지점(Math.PI/2)을 넘으면 앞면으로 전환
                  if (progress >= 0.5 && !sprite.faceUp) {
                      sprite.faceUp = anim.faceUp || true;
                  }
                  
                  // 애니메이션 완료
                  if (progress >= 1) {
                      sprite.flipRotation = undefined;
                      this.animations.splice(i, 1);
                  }
              } else {
                  // 스프라이트가 없으면 애니메이션 제거
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
