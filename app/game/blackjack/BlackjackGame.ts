import { GameState, Card, Hand } from '../types'
import {
  createDeck,
  shuffleDeck,
  calculateHandScore,
  isBlackjack,
  isBust,
  getCardImageUrl,
  isSoft17,
  isSameValue,
} from '../utils'

// [신규] 로그 인터페이스
interface GameLog {
  type: 'bet' | 'win' | 'lose' | 'draw' | 'blackjack' | 'info';
  message: string;
  time: string;
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

  // 이미지 리소스
  private cardImages: Map<string, HTMLImageElement> = new Map()
  private cardBackImage: HTMLImageElement | null = null
  private tableImage: HTMLImageElement | null = null // [신규] 테이블 배경
  private imagesLoaded: number = 0
  private totalImages: number = 0

  // UI 요소
  private chipButtons: Chip[] = []
  private betChips: Chip[] = []
  private buttons: Button[] = []
  private dealButton: Button | null = null

  // [신규] 히스토리 로그
  private logs: GameLog[] = []
  private logScrollOffset: number = 0 // 로그 스크롤 오프셋

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
    rotationStart?: number // [신규] 회전 애니메이션용
    rotationTarget?: number
  }> = []

  // 캔버스 및 레이아웃 설정
  private canvasWidth: number = 1200
  private canvasHeight: number = 800
  private sidebarWidth: number = 300 // [신규] 사이드바 너비
  private gameAreaWidth: number = 900 // [신규] 게임 영역 너비

  // 위치 정의 (gameAreaWidth 기준 비율로 계산하여 겹침 방지)
  private get deckPosition() { return { x: this.gameAreaWidth * 0.85, y: this.canvasHeight * 0.15 } } // 우상단 슈(Shoe) 위치
  private get playerPosition() { return { x: this.gameAreaWidth * 0.5, y: this.canvasHeight * 0.65 } } // 플레이어 위치 약간 위로
  private get dealerPosition() { return { x: this.gameAreaWidth * 0.5, y: this.canvasHeight * 0.20 } } // 딜러 위치
  private get bettingArea() { return { x: this.gameAreaWidth * 0.5, y: this.canvasHeight * 0.45 } } // 베팅 칩 놓는 곳
  private get chipTrayPosition() { return { x: this.gameAreaWidth * 0.5, y: this.canvasHeight * 0.88 } } // 하단 칩 선택 영역

  // 카드 스프라이트 관리
  private cardSprites: Map<Card, { x: number; y: number; faceUp: boolean; rotation: number }> = new Map()

  // 이벤트 콜백
  private onStateChange?: (state: GameState) => void
  private onMessage?: (message: string) => void
  private onLoadingProgress?: (progress: number) => void // [신규]

  constructor(canvas: HTMLCanvasElement, betAmount: number = 0, width: number = 1200, height: number = 800) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.initialBet = betAmount
    
    // 레이아웃 계산
    this.canvasWidth = width
    this.canvasHeight = height
    
    // 반응형 레이아웃: 모바일/태블릿/PC
    if (width < 768) {
      // 모바일: 사이드바 없음
      this.sidebarWidth = 0
      this.gameAreaWidth = width
    } else if (width < 1024) {
      // 태블릿: 사이드바 축소
      this.sidebarWidth = width * 0.2
      this.gameAreaWidth = width - this.sidebarWidth
    } else {
      // PC: 고정 레이아웃
      this.sidebarWidth = width * 0.25
      this.gameAreaWidth = width - this.sidebarWidth
    }

    this.canvas.width = width
    this.canvas.height = height

    this.setupEventListeners()
    this.loadImages()
  }

  // ... (setStateChangeCallback, setMessageCallback, changeState 등 기존 메서드 유지) ...
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

  // [신규] 로그 추가 메서드
  private addLog(type: 'bet' | 'win' | 'lose' | 'draw' | 'blackjack' | 'info', message: string, pointsChange?: number, balance?: number) {
    const now = new Date()
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
    
    this.logs.unshift({ 
      type, 
      message, 
      time: timeString,
      pointsChange,
      balance: balance !== undefined ? balance : this.playerPoints
    })
    if (this.logs.length > 50) {
      this.logs.pop()
    }
    // 새 로그 추가 시 스크롤 초기화
    this.logScrollOffset = 0
  }

  // ... (setupEventListeners, getCursorAt, handleClick 등은 위치 계산 로직만 수정) ...
  
  private setupEventListeners() {
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      this.handleClick(x, y)
    })

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      this.canvas.style.cursor = this.getCursorAt(x, y)
    })

    // 로그 영역 스크롤 (마우스 휠)
    this.canvas.addEventListener('wheel', (e) => {
      const rect = this.canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      
      // 사이드바 영역에서만 스크롤
      if (x > this.gameAreaWidth) {
        e.preventDefault()
        const scrollAmount = e.deltaY > 0 ? 30 : -30
        const maxScroll = Math.max(0, (this.logs.length * 30) - (this.canvasHeight - 200))
        this.logScrollOffset = Math.max(0, Math.min(maxScroll, this.logScrollOffset + scrollAmount))
        this.render()
      }
    })
  }

  private getCursorAt(x: number, y: number): string {
    // 사이드바 영역은 클릭 불가
    if (x > this.gameAreaWidth) return 'default'

    // 버튼들 체크
    const allButtons = [...this.buttons];
    if (this.dealButton) allButtons.push(this.dealButton);

    for (const button of allButtons) {
      if (button.visible) {
        if (x >= button.x && x <= button.x + button.width && y >= button.y && y <= button.y + button.height) {
          return 'pointer'
        }
      }
    }

    // 칩 버튼 체크
    const chipRadius = this.gameAreaWidth * 0.035
    for (const chip of this.chipButtons) {
      const dist = Math.sqrt(Math.pow(x - chip.x, 2) + Math.pow(y - chip.y, 2))
      if (dist <= chipRadius) return 'pointer'
    }

    // 베팅된 칩 체크 (취소용)
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

    // 버튼 클릭
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

    // 칩 버튼 클릭
    const chipRadius = this.gameAreaWidth * 0.035
    for (const chip of this.chipButtons) {
      const dist = Math.sqrt(Math.pow(x - chip.x, 2) + Math.pow(y - chip.y, 2))
      if (dist <= chipRadius) {
        this.addChipToTable(chip.amount)
        return
      }
    }

    // 베팅 취소
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
    // [신규] 테이블 배경 이미지 로드
    this.tableImage = await this.loadImage('https://media.istockphoto.com/id/479815970/photo/green-felt-fabric-texture-background.jpg?s=612x612&w=0&k=20&c=NbC-xQk6-X4-lQ3aD6A5D6Q3A5d6Q3aD6A5D6Q3A5d6=')
      .catch(() => null); // 로드 실패시 null (드로잉으로 대체)

    this.cardBackImage = await this.loadImage('https://deckofcardsapi.com/static/img/back.png')

    const suits = ['hearts', 'diamonds', 'clubs', 'spades']
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
    const suitMap: Record<string, string> = { hearts: 'H', diamonds: 'D', clubs: 'C', spades: 'S' }

    this.totalImages = suits.length * values.length + 2 // 카드 52장 + 뒷면 + 테이블
    this.imagesLoaded = 0

    // 비동기로 빠르게 로드
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
    
    // 테이블 이미지 로드 (진행률 포함)
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

    // 카드 뒷면 로드 (진행률 포함)
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
        this.playerPoints = 10000; // 테스트용
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
        this.addLog('info', `포인트: ${this.playerPoints.toLocaleString()} P`)
      } else {
        this.playerPoints = 10000 // 기본값
      }
    } catch (error) {
      console.error('Failed to load user points:', error)
      this.playerPoints = 10000 // 기본값
    }

    this.changeState(GameState.SHUFFLE)
  }
  
  private handleState() {
     // ... 기존 스위치문 유지 ...
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
    // 버려진 카드를 제외한 새 덱 생성
    this.deck = this.createDeckExcludingDiscarded()
    this.addLog('info', '덱이 셔플되었습니다.')
    setTimeout(() => this.changeState(GameState.BETTING), 1000)
  }

  // 버려진 카드를 제외한 새 덱 생성
  private createDeckExcludingDiscarded(): Card[] {
    const allCards = createDeck()
    
    // 버려진 카드들을 제외
    const discardedSet = new Set(
      this.discardedCards.map(card => `${card.suit}-${card.value}`)
    )
    
    const availableCards = allCards.filter(
      card => !discardedSet.has(`${card.suit}-${card.value}`)
    )
    
    // 사용 가능한 카드가 부족하면 버려진 카드 초기화하고 새 덱 생성
    if (availableCards.length < 20) {
      this.discardedCards = []
      return shuffleDeck(createDeck())
    }
    
    return shuffleDeck(availableCards)
  }

  private handleBetting() {
    this.createChipButtons()
    this.createDealButton()
    
    // 초기 베팅이 있으면 자동 설정
    if (this.initialBet > 0 && this.currentBet === 0) {
        this.addChipToTable(this.initialBet);
        this.initialBet = 0; // 한 번만 적용
    }
  }

  // [수정] 칩 버튼 생성 (하단 중앙 정렬)
  private createChipButtons() {
    const betAmounts = [1, 5, 10, 50, 100]
    const spacing = this.gameAreaWidth * 0.12
    const startX = this.chipTrayPosition.x - ((betAmounts.length - 1) * spacing) / 2
    
    this.chipButtons = betAmounts.map((amount, index) => ({
      amount,
      x: startX + index * spacing,
      y: this.chipTrayPosition.y,
      element: null,
    }))
  }

  // [수정] Deal 버튼 위치 조정
  private createDealButton() {
    const w = this.gameAreaWidth * 0.2
    const h = 50
    this.dealButton = {
      x: this.gameAreaWidth * 0.5 - w / 2,
      y: this.canvasHeight * 0.55, // 테이블 중앙 부근
      width: w,
      height: h,
      text: 'DEAL',
      onClick: async () => {
        if (this.currentBet > 0) {
          // [수정] 서버 확정 후에만 게임 시작
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

  // ... (addChipToTable, removeChipFromTable 등은 로직 유지하되 애니메이션 좌표만 수정) ...
  private addChipToTable(amount: number) {
    if (this.playerPoints < amount) return

    const chipCount = this.betChips.length
    // 칩 쌓는 위치를 약간씩 랜덤하게 하여 리얼함 추가
    const jitterX = (Math.random() - 0.5) * 5
    const jitterY = (Math.random() - 0.5) * 5
    
    const chip: Chip = {
      amount,
      x: this.bettingArea.x + jitterX,
      y: this.bettingArea.y - (chipCount * 4) + jitterY, // 위로 쌓임
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
    this.playerPoints -= amount // 즉시 차감 시각화
    
    if (this.dealButton) this.dealButton.visible = true
  }
  
  private removeChipFromTable(index: number, amount: number) {
      this.betChips.splice(index, 1);
      this.currentBet -= amount;
      this.playerPoints += amount; // 반환
      if (this.currentBet === 0 && this.dealButton) this.dealButton.visible = false;
  }

  private async confirmBet(): Promise<boolean> {
    const token = localStorage.getItem('token')
    if (!token) {
      this.showMessage('로그인이 필요합니다.')
      return false
    }
    
    // [신규] 중복 요청 방지용 잠금 (UI 레벨에서 버튼을 숨기더라도 이중 안전장치)
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
        this.playerPoints = data.points
        this.addLog('bet', `베팅: ${this.currentBet} 포인트`, -this.currentBet, data.points)
        return true
      } else {
        const errorData = await response.json()
        this.showMessage(errorData.error || '베팅에 실패했습니다.')
        // 베팅 실패 시 롤백
        this.playerPoints += this.currentBet
        this.currentBet = 0
        this.betChips = []
        if (this.dealButton) this.dealButton.visible = false // 칩 다시 선택하게 유도
        return false
      }
    } catch (error) {
      console.error('Betting error:', error)
      this.showMessage('베팅 중 오류가 발생했습니다.')
      // 베팅 실패 시 롤백
      this.playerPoints += this.currentBet
      this.currentBet = 0
      this.betChips = []
      if (this.dealButton) this.dealButton.visible = false
      return false
    }
  }

  // ... (handleDealStart, dealCard 로직 개선) ...
  private async handleDealStart() {
    this.chipButtons = [] // 칩 버튼 숨김
    if (this.dealButton) this.dealButton.visible = false
    this.addLog('info', '게임 시작! 카드를 딜링합니다.')

    this.playerHand = { cards: [], score: 0, isBlackjack: false, isBust: false }
    this.dealerHand = { cards: [], score: 0, isBlackjack: false, isBust: false }

    await this.dealCard('player', true, 0)
    await this.dealCard('dealer', true, 0)
    await this.dealCard('player', true, 1)
    await this.dealCard('dealer', false, 1) // 딜러 두번째 카드는 뒷면

    // 블랙잭 체크 로직 등...
    const dealerUp = this.dealerHand.cards[0]
    if (dealerUp.value === 'A') {
        this.changeState(GameState.INSURANCE)
    } else {
        this.changeState(GameState.CHECK_BLACKJACK)
    }
  }

  // [수정] 리얼한 딜링 애니메이션
  private async dealCard(target: 'player' | 'dealer', faceUp: boolean, index: number): Promise<void> {
    if (this.deck.length === 0) this.deck = createDeck()
    const card = this.deck.pop()!
    card.faceUp = faceUp

    const targetHand = target === 'player' ? this.playerHand : this.dealerHand
    targetHand.cards.push(card)

    // 카드 위치 계산 (겹치지 않게)
    const spacing = 30 // 카드 간격 줄임
    const totalW = (targetHand.cards.length - 1) * spacing
    const baseX = target === 'player' ? this.playerPosition.x : this.dealerPosition.x
    const baseY = target === 'player' ? this.playerPosition.y : this.dealerPosition.y
    
    const targetX = baseX + (index * spacing) - (totalW / 2) // 중앙 정렬 보정
    const targetY = baseY

    // 애니메이션: 슈(deckPosition)에서 날아오면서 회전
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
      rotationStart: Math.random() * Math.PI, // 랜덤 회전 시작
      rotationTarget: 0 // 똑바로 안착
    })

    await this.delay(300) // 딜링 속도
  }

  private handleInsurance() {
    this.createInsuranceButtons()
    this.addLog('info', 'Insurance를 구매하시겠습니까? (원 베팅의 50%)')
  }

  private createInsuranceButtons() {
     // gameAreaWidth 기준으로 버튼 생성
     const w = 120; const h = 40;
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
    this.addLog('bet', `Insurance 구매: ${insuranceAmount} P`)
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

  // [수정] 액션 버튼 위치
  private createActionButtons() {
    const actions = ['HIT', 'STAND', 'DOUBLE'];
    if (this.playerHand.cards.length === 2 && isSameValue(this.playerHand.cards[0], this.playerHand.cards[1])) {
        actions.push('SPLIT');
    }
    
    const btnW = 100; const btnH = 45; const gap = 15;
    const totalW = actions.length * btnW + (actions.length - 1) * gap;
    const startX = (this.gameAreaWidth - totalW) / 2;
    const y = this.canvasHeight * 0.5; // 화면 중앙

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

  // ... (playerHit, playerStand 등 액션 메서드 유지, 로그 추가) ...
  private async playerHit() {
      this.addLog('info', '플레이어 HIT');
      await this.dealCard('player', true, this.playerHand.cards.length);
      this.updateScores();
      if (this.playerHand.score > 21) {
          this.buttons = [];
          this.changeState(GameState.SETTLEMENT);
      }
  }

  private async playerStand() {
      this.addLog('info', '플레이어 STAND');
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
          this.addLog('bet', `DOUBLE DOWN: 베팅 ${this.currentBet} P`)
        } else {
          this.showMessage('Double Down에 실패했습니다.')
          return
        }
      } catch (error) {
        console.error('Double down error:', error)
        this.showMessage('Double Down 중 오류가 발생했습니다.')
        return
      }
    } else {
      // 테스트용
      this.playerPoints -= this.currentBet
      this.currentBet *= 2
    }

    await this.dealCard('player', true, this.playerHand.cards.length);
    this.buttons = [];
    this.changeState(GameState.DEALER_TURN); // 더블은 카드 1장 받고 턴 종료
  }
  
  private playerSplit() {
      this.showMessage('Split 기능은 준비중입니다.');
  }

  // ... (handleDealerTurn, handleSettlement 유지) ...
  private async handleDealerTurn() {
      this.revealDealerCard(); // 홀 카드 공개
      await this.delay(500);
      this.updateScores();
      
      while (this.dealerHand.score < 17) {
          this.addLog('info', '딜러 HIT');
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

    // 먼저 서버에 반영 (사용자가 브라우저를 닫아도 반영되도록)
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
        // 서버에서 반환된 포인트로 업데이트 (무승부 시 베팅 금액이 반환됨)
        this.playerPoints = data.points
        
        // 서버 반영 후 화면에 결과 표시
        this.gameResult = {
          type: result,
          message: message,
          winnings: result === 'draw' ? 0 : winnings - this.currentBet, // 무승부는 0으로 표시
          startTime: Date.now(),
          visible: true
        }
        
        if (result === 'win' || result === 'blackjack') {
          this.addLog('win', `승리! (+${winnings - this.currentBet} P)`)
        } else if (result === 'draw') {
          this.addLog('draw', `무승부 (Push) - 베팅 금액 반환: ${this.currentBet} P`)
        } else {
          this.addLog('lose', `패배 (-${this.currentBet} P)`)
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

    // 결과 애니메이션 표시 시간 (3초)
    await this.delay(3000)
    this.gameResult.visible = false
    
    await this.delay(500)
    this.handleRoundEnd()
  }
  
  private async handleRoundEnd() {
    // 이전 카드들을 버리는 애니메이션
    await this.discardCards()
    
    // 핸드 초기화
    this.playerHand = { cards: [], score: 0, isBlackjack: false, isBust: false }
    this.dealerHand = { cards: [], score: 0, isBlackjack: false, isBust: false }
    this.betChips = []
    this.currentBet = 0
    this.insuranceBet = 0
    
    this.changeState(GameState.SHUFFLE)
  }

  // 카드를 버리는 애니메이션
  private async discardCards(): Promise<void> {
    const discardX = this.canvasWidth - 50 // 오른쪽 끝
    const discardY = this.canvasHeight * 0.5 // 중앙
    
    const allCards = [...this.playerHand.cards, ...this.dealerHand.cards]
    
    if (allCards.length === 0) return
    
    for (let i = 0; i < allCards.length; i++) {
      const card = allCards[i]
      const sprite = this.cardSprites.get(card)
      
      if (sprite) {
        // 버리는 애니메이션 추가
        this.animations.push({
          type: 'discard',
          startX: sprite.x,
          startY: sprite.y,
          targetX: discardX,
          targetY: discardY + (i * 2), // 약간씩 겹치게
          duration: 500,
          startTime: Date.now(),
          card,
          rotationStart: sprite.rotation,
          rotationTarget: Math.PI * 0.5 // 90도 회전
        })
        
        // 버려진 카드 목록에 추가
        this.discardedCards.push(card)
      }
      
      await this.delay(50) // 카드마다 약간의 딜레이
    }
    
    // 애니메이션 완료 대기
    await this.delay(600)
    
    // 카드 스프라이트에서 제거
    allCards.forEach(card => {
      this.cardSprites.delete(card)
    })
  }

  // 유틸리티
  private delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
  private updateScores() {
      this.playerHand.score = calculateHandScore(this.playerHand)
      this.dealerHand.score = calculateHandScore(this.dealerHand)
      this.playerHand.isBust = isBust(this.playerHand)
      this.playerHand.isBlackjack = isBlackjack(this.playerHand)
      this.dealerHand.isBust = isBust(this.dealerHand)
  }

  // ================= RENDER START =================

  private animationFrameId: number | null = null
  private isRunning: boolean = false

  start() {
    if (this.isRunning) return
    this.isRunning = true
    this.render()
  }

  render() {
    if (!this.isRunning) return
    
    // 1. 배경 그리기
    this.ctx.fillStyle = '#0a3d20' // 기본 짙은 녹색
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)
    
    // 테이블 이미지 또는 패턴
    if (this.tableImage) {
        this.ctx.drawImage(this.tableImage, 0, 0, this.gameAreaWidth, this.canvasHeight)
    } else {
        // 테이블 이미지 로드 실패시 드로잉 폴백
        this.drawTablePattern()
    }

    // 2. 게임 영역 요소 그리기
    this.renderGameElements()

    // 3. 사이드바 그리기 (오른쪽)
    this.renderSidebar()

    // 4. 게임 결과 표시 (가장 위에)
    this.renderGameResult()

    // 애니메이션 업데이트 및 루프
    this.updateAnimations()
    this.animationFrameId = requestAnimationFrame(() => this.render())
  }

  private drawTablePattern() {
      // 심플한 테이블 라인 드로잉
      this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)'; // Gold color
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(this.gameAreaWidth / 2, -400, 1000, 0, Math.PI, false);
      this.ctx.stroke();
      
      this.ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
      this.ctx.font = 'bold 40px serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText("BLACKJACK PAYS 3 TO 2", this.gameAreaWidth / 2, this.canvasHeight * 0.4);
      this.ctx.font = '20px serif';
      this.ctx.fillText("Dealer must stand on 17 and draw to 16", this.gameAreaWidth / 2, this.canvasHeight * 0.45);
  }

  private renderGameElements() {
    // 덱
    this.renderDeck()

    // 텍스트 정보 (점수 등)
    this.ctx.fillStyle = '#ffffff'
    this.ctx.font = 'bold 20px Arial'
    this.ctx.textAlign = 'center'
    
    // 딜러 점수
    if (this.gameState !== GameState.BETTING && this.gameState !== GameState.SHUFFLE) {
        let dScoreText = `${this.dealerHand.score}`;
        if (this.gameState === GameState.PLAYER_TURN && this.dealerHand.cards.length > 0) {
            // 첫 장만 계산해서 보여주는 건 복잡하니 일단 가림 처리
            dScoreText = "?";
        }
        this.ctx.fillText(`DEALER: ${dScoreText}`, this.dealerPosition.x, this.dealerPosition.y - 80)
        
        // 플레이어 점수
        this.ctx.fillText(`PLAYER: ${this.playerHand.score}`, this.playerPosition.x, this.playerPosition.y + 100)
    }

    // 카드
    this.renderCards()

    // 칩
    this.renderChips()

    // 버튼
    this.renderButtons()
  }

  private renderDeck() {
     // 덱 그림자 및 형태
     const w = 80; const h = 120;
     const { x, y } = this.deckPosition;
     
     // 덱 두께 표현
     for(let i=0; i<5; i++) {
         this.ctx.fillStyle = '#ccc';
         this.ctx.fillRect(x - w/2 - i, y - h/2 - i, w, h);
         this.ctx.strokeStyle = '#999';
         this.ctx.strokeRect(x - w/2 - i, y - h/2 - i, w, h);
     }
     // 맨 윗장 (뒷면)
     if (this.cardBackImage) {
         this.ctx.drawImage(this.cardBackImage, x - w/2 - 5, y - h/2 - 5, w, h);
     }
  }

  private renderCards() {
    this.cardSprites.forEach((sprite, card) => {
      const w = 90; const h = 130;
      this.ctx.save();
      this.ctx.translate(sprite.x, sprite.y);
      this.ctx.rotate(sprite.rotation);
      
      const isFaceUp = card.faceUp;
      
      // 그림자
      this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
      this.ctx.shadowBlur = 10;

      if (isFaceUp) {
        const key = `card-${card.suit}-${card.value}`;
        const img = this.cardImages.get(key);
        if (img) this.ctx.drawImage(img, -w/2, -h/2, w, h);
        else { // 이미지 로드 전 폴백
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

  // [중요] 리얼한 칩 그리기
  private renderChips() {
      // 칩 버튼 (트레이)
      this.chipButtons.forEach(chip => this.drawFancyChip(chip.x, chip.y, chip.amount));
      // 테이블 위 베팅 칩
      this.betChips.forEach(chip => this.drawFancyChip(chip.x, chip.y, chip.amount));
  }

  private drawFancyChip(x: number, y: number, amount: number) {
      const r = 35; // 반지름
      
      // 색상 매핑 (카지노 표준)
      let color = '#fff'; // 1
      let stripeColor = '#ccc';
      if (amount === 5) { color = '#d92b2b'; stripeColor = '#fff'; } // Red
      else if (amount === 10) { color = '#2b4cd9'; stripeColor = '#fff'; } // Blue
      else if (amount === 50) { color = '#2bd94c'; stripeColor = '#fff'; } // Green
      else if (amount === 100) { color = '#111'; stripeColor = '#d9b02b'; } // Black

      this.ctx.save();
      this.ctx.translate(x, y);

      // 1. 그림자
      this.ctx.shadowColor = 'rgba(0,0,0,0.4)';
      this.ctx.shadowBlur = 5;
      this.ctx.shadowOffsetY = 3;

      // 2. 기본 원
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, r, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.shadowColor = 'transparent'; // 그림자 끔

      // 3. 줄무늬 (Dashed Edge)
      this.ctx.strokeStyle = stripeColor;
      this.ctx.lineWidth = 8;
      this.ctx.setLineDash([10, 15]); // 점선 패턴
      this.ctx.beginPath();
      this.ctx.arc(0, 0, r - 4, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.setLineDash([]); // 초기화

      // 4. 내부 원
      this.ctx.fillStyle = 'rgba(255,255,255,0.1)'; // 약간 밝게
      this.ctx.beginPath();
      this.ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();

      // 5. 텍스트
      this.ctx.fillStyle = (amount === 100) ? '#d9b02b' : (amount === 1 ? '#000' : '#fff');
      this.ctx.font = 'bold 18px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(`${amount}`, 0, 0);

      this.ctx.restore();
  }

  private renderButtons() {
      // 딜 버튼, 액션 버튼들
      const buttons = [...this.buttons];
      if (this.dealButton) buttons.push(this.dealButton);

      buttons.forEach(btn => {
          if (!btn.visible) return;
          
          this.ctx.save();
          
          // 그림자
          this.ctx.shadowColor = 'rgba(0,0,0,0.4)';
          this.ctx.shadowBlur = 4;
          this.ctx.shadowOffsetY = 4;

          // 그라데이션 배경
          let baseColor = '#eab308'; // Gold (기본)
          if (btn.text === 'HIT') baseColor = '#22c55e';
          if (btn.text === 'STAND') baseColor = '#ef4444';
          
          this.ctx.fillStyle = baseColor;
          this.ctx.beginPath();
          this.ctx.roundRect(btn.x, btn.y, btn.width, btn.height, 8);
          this.ctx.fill();
          
          this.ctx.shadowColor = 'transparent';

          // 텍스트
          this.ctx.fillStyle = '#fff';
          this.ctx.font = 'bold 18px sans-serif';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(btn.text, btn.x + btn.width/2, btn.y + btn.height/2);
          
          this.ctx.restore();
      });
  }

  private renderGameResult() {
    if (!this.gameResult.visible) return

    const elapsed = Date.now() - this.gameResult.startTime
    const totalDuration = 3000 // 3초
    
    // 페이드인/아웃 계산
    let alpha = 1
    if (elapsed < 500) {
      // 페이드인 (0.5초)
      alpha = elapsed / 500
    } else if (elapsed > totalDuration - 500) {
      // 페이드아웃 (마지막 0.5초)
      alpha = (totalDuration - elapsed) / 500
    }

    // 스케일 애니메이션 (0.5초 동안 확대)
    let scale = 1
    if (elapsed < 500) {
      scale = 0.5 + (elapsed / 500) * 0.5 // 0.5에서 1.0으로
    }

    const centerX = this.gameAreaWidth * 0.5
    const centerY = this.canvasHeight * 0.5

    // 배경 (반투명 검은색)
    this.ctx.fillStyle = `rgba(0, 0, 0, ${0.7 * alpha})`
    this.ctx.fillRect(0, 0, this.gameAreaWidth, this.canvasHeight)

    // 결과에 따른 색상
    let bgColor = '#4caf50' // 승리 (녹색)
    let textColor = '#ffffff'
    
    if (this.gameResult.type === 'lose') {
      bgColor = '#f44336' // 패배 (빨간색)
    } else if (this.gameResult.type === 'draw') {
      bgColor = '#ff9800' // 무승부 (주황색)
    } else if (this.gameResult.type === 'blackjack') {
      bgColor = '#ffd700' // 블랙잭 (금색)
      textColor = '#000000'
    }

    this.ctx.save()
    this.ctx.translate(centerX, centerY)
    this.ctx.scale(scale, scale)
    this.ctx.globalAlpha = alpha

    // 결과 박스
    const boxWidth = 400
    const boxHeight = 200
    const borderRadius = 20

    // 그림자
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
    this.ctx.shadowBlur = 20
    this.ctx.shadowOffsetX = 0
    this.ctx.shadowOffsetY = 10

    // 배경 그라데이션
    const gradient = this.ctx.createLinearGradient(-boxWidth/2, -boxHeight/2, -boxWidth/2, boxHeight/2)
    gradient.addColorStop(0, bgColor)
    gradient.addColorStop(1, this.darkenColor(bgColor, 0.2))
    
    this.ctx.fillStyle = gradient
    this.roundRect(-boxWidth/2, -boxHeight/2, boxWidth, boxHeight, borderRadius)
    this.ctx.fill()

    // 그림자 초기화
    this.ctx.shadowColor = 'transparent'
    this.ctx.shadowBlur = 0
    this.ctx.shadowOffsetX = 0
    this.ctx.shadowOffsetY = 0

    // 테두리
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    this.ctx.lineWidth = 3
    this.roundRect(-boxWidth/2, -boxHeight/2, boxWidth, boxHeight, borderRadius)
    this.ctx.stroke()

    // 메인 텍스트
    this.ctx.fillStyle = textColor
    this.ctx.font = 'bold 60px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText(this.gameResult.message, 0, -30)

    // 포인트 변화 표시
    if (this.gameResult.winnings !== 0) {
      const pointsText = this.gameResult.winnings > 0 
        ? `+${this.gameResult.winnings} P`
        : `${this.gameResult.winnings} P`
      
      this.ctx.font = 'bold 32px Arial'
      this.ctx.fillText(pointsText, 0, 30)
    }

    // 점수 표시
    this.ctx.font = '24px Arial'
    this.ctx.fillStyle = `rgba(${textColor === '#ffffff' ? '255,255,255' : '0,0,0'}, 0.8)`
    this.ctx.fillText(
      `플레이어: ${this.playerHand.score} | 딜러: ${this.dealerHand.score}`,
      0,
      70
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
    // #RRGGBB 형식의 색상을 어둡게 만들기
    const num = parseInt(color.replace('#', ''), 16)
    const r = Math.max(0, ((num >> 16) & 0xff) * (1 - amount))
    const g = Math.max(0, ((num >> 8) & 0xff) * (1 - amount))
    const b = Math.max(0, (num & 0xff) * (1 - amount))
    return `#${Math.floor(r).toString(16).padStart(2, '0')}${Math.floor(g).toString(16).padStart(2, '0')}${Math.floor(b).toString(16).padStart(2, '0')}`
  }

  private renderSidebar() {
      // 모바일에서는 사이드바 숨김
      if (this.sidebarWidth === 0) return;
      
      const sx = this.gameAreaWidth;
      const w = this.sidebarWidth;
      
      // 배경
      this.ctx.fillStyle = '#1e293b';
      this.ctx.fillRect(sx, 0, w, this.canvasHeight);
      
      // 구분선
      this.ctx.strokeStyle = '#334155';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(sx, 0);
      this.ctx.lineTo(sx, this.canvasHeight);
      this.ctx.stroke();
      
      // 헤더
      this.ctx.fillStyle = '#94a3b8';
      this.ctx.font = 'bold 20px sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.fillText('HISTORY', sx + 20, 40);
      
      // 유저 정보
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '16px sans-serif';
      this.ctx.fillText(`Points: ${this.playerPoints.toLocaleString()}`, sx + 20, 80);
      
      // 로그 목록 (스크롤 적용)
      const logStartY = 130;
      const logEndY = this.canvasHeight - 20;
      const logHeight = logEndY - logStartY;
      let y = logStartY - this.logScrollOffset;
      
      this.logs.forEach(log => {
          // 화면 밖이면 스킵
          if (y + 30 < logStartY || y > logEndY) {
              y += 30;
              return;
          }
          
          if (log.type === 'win' || log.type === 'blackjack') this.ctx.fillStyle = '#4ade80';
          else if (log.type === 'lose') this.ctx.fillStyle = '#f87171';
          else if (log.type === 'draw') this.ctx.fillStyle = '#fbbf24';
          else this.ctx.fillStyle = '#94a3b8'; // info/bet
          
          this.ctx.font = '14px sans-serif';
          
          // 메시지와 포인트 정보 표시
          let logText = `[${log.time}] ${log.message}`;
          if (log.pointsChange !== undefined && log.balance !== undefined) {
              const changeText = log.pointsChange >= 0 ? `+${log.pointsChange.toLocaleString()}` : log.pointsChange.toLocaleString();
              logText += ` (${changeText} P, 잔액: ${log.balance.toLocaleString()} P)`;
          }
          
          this.ctx.fillText(logText, sx + 20, y);
          y += 30;
      });
  }

  private updateAnimations() {
      const now = Date.now();
      for (let i = this.animations.length - 1; i >= 0; i--) {
          const anim = this.animations[i];
          const elapsed = now - anim.startTime;
          const progress = Math.min(elapsed / anim.duration, 1);
          
          // Easing: easeOutCubic
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
              
              // 위치 이동
              s.x = anim.startX + (anim.targetX - anim.startX) * ease;
              s.y = anim.startY + (anim.targetY - anim.startY) * ease;
              
              // 회전 (딜링 시 휙 돌아가는 효과)
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
              // 버리는 애니메이션
              const sprite = this.cardSprites.get(anim.card);
              if (sprite) {
                  sprite.x = anim.startX + (anim.targetX - anim.startX) * ease;
                  sprite.y = anim.startY + (anim.targetY - anim.startY) * ease;
                  
                  if (anim.rotationStart !== undefined && anim.rotationTarget !== undefined) {
                      sprite.rotation = anim.rotationStart + (anim.rotationTarget - anim.rotationStart) * ease;
                  }
              }

              if (progress >= 1) {
                  // 애니메이션 완료 시 카드 스프라이트에서 제거
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