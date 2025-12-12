import Phaser from 'phaser'
import { GameState, Card, Hand } from '../types'
import {
  createDeck,
  shuffleDeck,
  calculateHandScore,
  isBlackjack,
  isBust,
  getCardImageUrl,
} from '../utils'

export class BlackjackScene extends Phaser.Scene {
  private gameState: GameState = GameState.IDLE
  private deck: Card[] = []
  private playerHand: Hand = { cards: [], score: 0, isBlackjack: false, isBust: false }
  private dealerHand: Hand = { cards: [], score: 0, isBlackjack: false, isBust: false }
  private currentBet: number = 0
  private playerPoints: number = 0
  private initialBet: number = 0

  // UI 요소
  private chipButtons: Phaser.GameObjects.Container[] = [] // 칩 버튼들
  private dealButton: Phaser.GameObjects.Container | null = null
  private actionButtons: Phaser.GameObjects.Container[] = []
  private betChips: Phaser.GameObjects.Container[] = [] // 테이블에 있는 칩들
  private pointsText: Phaser.GameObjects.Text | null = null
  private betText: Phaser.GameObjects.Text | null = null
  private messageText: Phaser.GameObjects.Text | null = null
  private playerScoreText: Phaser.GameObjects.Text | null = null
  private dealerScoreText: Phaser.GameObjects.Text | null = null

  // 위치 정의
  private deckPosition = { x: 100, y: 400 }
  private playerPosition = { x: 600, y: 600 }
  private dealerPosition = { x: 600, y: 200 }
  private bettingArea = { x: 600, y: 400 }
  private chipArea = { x: 1000, y: 600 }

  // 카드 스프라이트
  private cardSprites: Map<Card, Phaser.GameObjects.Container> = new Map()
  private chipSprites: Phaser.GameObjects.Image[] = []

  // 애니메이션 관련
  private dealingQueue: Array<() => Promise<void>> = []
  private isAnimating: boolean = false

  constructor() {
    super({ key: 'BlackjackScene' })
  }

  create() {
    this.loadUserPoints()
    this.setupUI()
    this.changeState(GameState.SHUFFLE)
  }

  setInitialBet(bet: number) {
    this.initialBet = bet
    this.currentBet = bet
  }

  async loadUserPoints() {
    const token = localStorage.getItem('token')
    if (!token) {
      alert('로그인이 필요합니다.')
      window.close()
      return
    }

    try {
      const response = await fetch('/api/user/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const userData = await response.json()
        this.playerPoints = userData.points || 0
        this.updatePointsDisplay()
      }
    } catch (error) {
      console.error('Failed to load user points:', error)
    }
  }

  setupUI() {
    // 배경 테이블
    this.add.rectangle(600, 400, 1200, 800, 0x0d5f2e)

    // 포인트 표시
    this.pointsText = this.add.text(50, 50, `포인트: ${this.playerPoints}`, {
      fontSize: '24px',
      color: '#ffffff',
    })

    this.betText = this.add.text(50, 100, `베팅: ${this.currentBet}`, {
      fontSize: '24px',
      color: '#ffd700',
    })

    this.messageText = this.add.text(600, 50, '', {
      fontSize: '32px',
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5)

    // 베팅 영역 표시
    this.add.circle(this.bettingArea.x, this.bettingArea.y, 80, 0xffffff, 0.3)

    // 덱 위치 표시
    this.add.rectangle(this.deckPosition.x, this.deckPosition.y, 80, 120, 0x1a1a1a)
    this.add.text(this.deckPosition.x, this.deckPosition.y - 80, 'DECK', {
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5)

    // 플레이어/딜러 영역 표시
    this.add.text(this.playerPosition.x, this.playerPosition.y + 100, 'PLAYER', {
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5)

    this.add.text(this.dealerPosition.x, this.dealerPosition.y - 100, 'DEALER', {
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5)

    // 점수 표시 텍스트
    this.playerScoreText = this.add.text(this.playerPosition.x, this.playerPosition.y + 130, '점수: 0', {
      fontSize: '24px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    this.dealerScoreText = this.add.text(this.dealerPosition.x, this.dealerPosition.y - 130, '점수: 0', {
      fontSize: '24px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5)
  }

  changeState(newState: GameState) {
    // console.log(`State change: ${this.gameState} -> ${newState}`)
    this.gameState = newState

    switch (newState) {
      case GameState.SHUFFLE:
        this.handleShuffle()
        break
      case GameState.BETTING:
        this.handleBetting()
        break
      case GameState.DEAL_START:
        this.handleDealStart()
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

  async handleShuffle() {
    this.showMessage('덱을 섞는 중...')
    
    // 셔플 애니메이션 (덱 흔들기)
    const deckSprite = this.add.rectangle(this.deckPosition.x, this.deckPosition.y, 80, 120, 0x1a1a1a)
    
    this.tweens.add({
      targets: deckSprite,
      x: { from: this.deckPosition.x - 10, to: this.deckPosition.x + 10 },
      duration: 100,
      repeat: 10,
      yoyo: true,
      onComplete: () => {
        deckSprite.destroy()
        this.deck = createDeck()
        this.showMessage('')
        this.changeState(GameState.BETTING)
      },
    })
  }

  handleBetting() {
    if (this.initialBet > 0) {
      // 이미 베팅이 설정되어 있으면 바로 딜 시작
      this.currentBet = this.initialBet
      this.createBetChipOnTable(this.initialBet)
      this.updatePointsDisplay()
      this.createDealButton()
    } else {
      this.createChipButtons()
      this.createDealButton()
    }
  }

  createDealButton() {
    if (this.dealButton) {
      this.dealButton.destroy()
    }

    this.dealButton = this.add.container(600, 550)
    const dealBg = this.add.rectangle(0, 0, 180, 60, 0x4caf50)
    const dealText = this.add.text(0, 0, '게임 시작', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    // 배경에 직접 interactive 설정 (Container 내부 좌표계)
    dealBg.setInteractive(
      new Phaser.Geom.Rectangle(-90, -30, 180, 60),
      Phaser.Geom.Rectangle.Contains
    )
    dealBg.input!.cursor = 'pointer'

    dealBg.on('pointerdown', () => {
      if (this.currentBet > 0) {
        // 베팅 확정
        this.confirmBet()
        this.changeState(GameState.DEAL_START)
      } else {
        this.showMessage('베팅을 먼저 해주세요!')
      }
    })

    this.dealButton.add([dealBg, dealText])
    this.dealButton.setVisible(this.currentBet > 0) // 베팅이 있으면 표시
  }

  createChipButtons() {
    const betAmounts = [1, 5, 10, 20, 30, 50, 100]
    const startX = 150
    const startY = 720
    const spacing = 140

    betAmounts.forEach((amount, index) => {
      const chipButton = this.createChip(amount, startX + index * spacing, startY, true)
      this.chipButtons.push(chipButton)
    })
  }

  createChip(amount: number, x: number, y: number, isButton: boolean = false): Phaser.GameObjects.Container {
    const container = this.add.container(x, y)
    
    // 칩 그래픽 생성 (3D 효과)
    const chipGraphics = this.add.graphics()
    const chipColor = this.getChipColor(amount)
    const chipRadius = 35
    
    // 칩 외곽선
    chipGraphics.fillStyle(chipColor)
    chipGraphics.fillCircle(0, 0, chipRadius)
    
    // 칩 테두리
    chipGraphics.lineStyle(3, 0xffffff, 1)
    chipGraphics.strokeCircle(0, 0, chipRadius)
    
    // 칩 내부 원
    chipGraphics.fillStyle(0x000000, 0.3)
    chipGraphics.fillCircle(0, 0, chipRadius * 0.7)
    
    // 칩 중앙 원
    chipGraphics.fillStyle(0xffffff, 0.5)
    chipGraphics.fillCircle(0, 0, chipRadius * 0.4)
    
    // 칩 그림자 효과
    const shadow = this.add.graphics()
    shadow.fillStyle(0x000000, 0.3)
    shadow.fillEllipse(0, 40, 60, 12)
    
    // 금액 텍스트
    const text = this.add.text(0, 0, amount.toString(), {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5)

    container.add([shadow, chipGraphics, text])

    // Graphics 객체에 직접 interactive 설정 (Container 내부 좌표계 사용)
    chipGraphics.setInteractive(
      new Phaser.Geom.Circle(0, 0, chipRadius),
      Phaser.Geom.Circle.Contains
    )
    chipGraphics.input!.cursor = 'pointer'

    if (isButton) {
      // 버튼으로 사용할 때
      chipGraphics.on('pointerdown', () => {
        this.addChipToTable(amount)
      })
    } else {
      // 테이블의 칩은 클릭해서 제거 가능
      chipGraphics.on('pointerdown', () => {
        this.removeChipFromTable(container, amount)
      })
    }

    return container
  }

  addChipToTable(amount: number) {
    // 포인트 확인
    if (this.playerPoints < amount) {
      this.showMessage('포인트가 부족합니다!')
      return
    }

    // 테이블에 칩 추가
    const chipCount = this.betChips.length
    const offsetX = (chipCount % 3) * 50 - 50
    const offsetY = Math.floor(chipCount / 3) * 50 - 50
    
    const chip = this.createChip(amount, this.bettingArea.x + offsetX, this.bettingArea.y + offsetY, false)
    chip.setScale(0) // 처음에는 작게 시작
    
    // 칩 애니메이션 (칩 버튼 위치에서 테이블로 이동)
    const chipButton = this.chipButtons.find(btn => {
      const text = btn.getAt(2) as Phaser.GameObjects.Text
      return text && text.text === amount.toString()
    })
    
    if (chipButton) {
      chip.setPosition(chipButton.x, chipButton.y)
      this.tweens.add({
        targets: chip,
        x: this.bettingArea.x + offsetX,
        y: this.bettingArea.y + offsetY,
        scaleX: 1,
        scaleY: 1,
        duration: 300,
        ease: 'Back.easeOut',
      })
    }

    this.betChips.push(chip)
    this.currentBet += amount
    this.updatePointsDisplay()
    
    // 게임 시작 버튼 표시
    if (this.dealButton) {
      this.dealButton.setVisible(true)
    }
  }

  removeChipFromTable(chip: Phaser.GameObjects.Container, amount: number) {
    // 칩 제거 애니메이션
    this.tweens.add({
      targets: chip,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        chip.destroy()
        const index = this.betChips.indexOf(chip)
        if (index > -1) {
          this.betChips.splice(index, 1)
        }
        this.currentBet -= amount
        this.updatePointsDisplay()
        
        // 베팅이 없으면 게임 시작 버튼 숨김
        if (this.currentBet === 0 && this.dealButton) {
          this.dealButton.setVisible(false)
        }
      },
    })
  }

  async confirmBet() {
    // 베팅 확정 및 포인트 차감
    const token = localStorage.getItem('token')
    if (!token) return

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

      const data = await response.json()

      if (response.ok) {
        this.playerPoints = data.points
        this.updatePointsDisplay()
      } else {
        this.showMessage(data.error || '베팅에 실패했습니다.')
      }
    } catch (error) {
      console.error('Betting error:', error)
      this.showMessage('베팅 중 오류가 발생했습니다.')
    }
  }

  createBetChipOnTable(amount: number) {
    // 초기 베팅이 있을 때 사용
    const chip = this.createChip(amount, this.bettingArea.x, this.bettingArea.y, false)
    this.betChips.push(chip)
  }

  getChipColor(amount: number): number {
    const colors: Record<number, number> = {
      1: 0xffffff, // 흰색
      5: 0xff0000, // 빨간색
      10: 0x0000ff, // 파란색
      20: 0x00ff00, // 초록색
      30: 0xffff00, // 노란색
      50: 0xff00ff, // 마젠타
      100: 0x000000, // 검은색
    }
    return colors[amount] || 0x888888
  }

  hideChipButtons() {
    this.chipButtons.forEach((btn) => btn.destroy())
    this.chipButtons = []
  }

  async handleDealStart() {
    // 칩 버튼과 게임 시작 버튼 숨김
    this.hideChipButtons()
    if (this.dealButton) {
      this.dealButton.setVisible(false)
    }
    
    // 테이블의 칩들 비활성화 (클릭 불가능하게)
    this.betChips.forEach((chip) => {
      const graphics = chip.getAt(1) as Phaser.GameObjects.Graphics
      if (graphics && graphics.input) {
        graphics.disableInteractive()
      }
    })
    
    this.showMessage('카드를 딜하는 중...')
    
    // 초기 핸드 초기화
    this.playerHand = { cards: [], score: 0, isBlackjack: false, isBust: false }
    this.dealerHand = { cards: [], score: 0, isBlackjack: false, isBust: false }

    // 딜 순서: 플레이어 1장, 딜러 1장, 플레이어 1장, 딜러 1장(뒷면)
    await this.dealCard('player', true, 0)
    this.updateScores()
    await this.delay(300)
    await this.dealCard('dealer', true, 0)
    this.updateScores()
    await this.delay(300)
    await this.dealCard('player', true, 1)
    this.updateScores()
    await this.delay(300)
    await this.dealCard('dealer', false, 1) // 홀카드
    this.updateScores()

    this.changeState(GameState.CHECK_BLACKJACK)
  }

  async dealCard(target: 'player' | 'dealer', faceUp: boolean, index: number): Promise<void> {
    if (this.deck.length === 0) {
      this.deck = createDeck()
    }

    const card = this.deck.pop()!
    card.faceUp = faceUp

    const targetHand = target === 'player' ? this.playerHand : this.dealerHand
    targetHand.cards.push(card)

    // 카드 컨테이너 생성
    const cardContainer = this.add.container(this.deckPosition.x, this.deckPosition.y)
    this.cardSprites.set(card, cardContainer)

    // 카드 뒷면 그리기
    const cardBack = this.createCardBack()
    cardContainer.add(cardBack)

    // 목표 위치 계산
    const targetX = target === 'player' 
      ? this.playerPosition.x + (index - (targetHand.cards.length - 1) / 2) * 100
      : this.dealerPosition.x + (index - (targetHand.cards.length - 1) / 2) * 100
    const targetY = target === 'player' ? this.playerPosition.y : this.dealerPosition.y

    // 카드 이동 애니메이션
    await new Promise<void>((resolve) => {
      this.tweens.add({
        targets: cardContainer,
        x: targetX,
        y: targetY,
        duration: 400,
        ease: 'Power2',
        onComplete: async () => {
          if (faceUp) {
            // 모든 이미지는 LoadingScene에서 미리 로드되었으므로 바로 플립
            this.flipCard(cardContainer, card, resolve)
          } else {
            resolve()
          }
        },
      })
    })
  }

  createCardBack(): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0)
    const cardWidth = 80
    const cardHeight = 120

    // 카드 뒷면 이미지 사용
    const cardBackImage = this.add.image(0, 0, 'card-back')
    cardBackImage.setDisplaySize(cardWidth, cardHeight)

    container.add(cardBackImage)
    return container
  }

  flipCard(cardContainer: Phaser.GameObjects.Container, card: Card, resolve: () => void) {
    // 카드 플립 애니메이션
    this.tweens.add({
      targets: cardContainer,
      scaleX: 0,
      duration: 150,
      onComplete: () => {
        // 뒷면 제거하고 앞면 이미지 추가
        cardContainer.removeAll(true)
        const cardFront = this.createCardFront(card)
        cardContainer.add(cardFront)
        
        this.tweens.add({
          targets: cardContainer,
          scaleX: 1,
          duration: 150,
          onComplete: () => resolve(),
        })
      },
    })
  }

  createCardFront(card: Card): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0)
    const cardWidth = 80
    const cardHeight = 120

    // 카드 앞면 이미지 키
    const cardKey = `card-${card.suit}-${card.value}`

    // 카드 이미지 생성
    const cardImage = this.add.image(0, 0, cardKey)
    cardImage.setDisplaySize(cardWidth, cardHeight)

    container.add(cardImage)
    return container
  }

  handleCheckBlackjack() {
    this.updateScores()

    const playerBJ = isBlackjack(this.playerHand)
    const dealerBJ = isBlackjack(this.dealerHand)

    if (playerBJ) {
      // 딜러 홀카드 공개
      this.revealDealerCard()
      
      if (dealerBJ) {
        this.showMessage('둘 다 블랙잭! 무승부')
        this.settleGame('draw')
      } else {
        this.showMessage('블랙잭! 승리!')
        this.settleGame('blackjack')
      }
    } else if (dealerBJ) {
      this.revealDealerCard()
      this.showMessage('딜러 블랙잭! 패배')
      this.settleGame('lose')
    } else {
      this.changeState(GameState.PLAYER_TURN)
    }
  }

  revealDealerCard() {
    const hiddenCard = this.dealerHand.cards.find((c) => !c.faceUp)
    if (hiddenCard) {
      hiddenCard.faceUp = true
      const cardContainer = this.cardSprites.get(hiddenCard)
      if (cardContainer) {
        // 모든 이미지는 이미 로드되어 있으므로 바로 플립
        this.flipCard(cardContainer, hiddenCard, () => {
          this.updateScores()
        })
      } else {
        this.updateScores()
      }
    } else {
      this.updateScores()
    }
  }

  handlePlayerTurn() {
    this.createActionButtons()
    this.showMessage('행동을 선택하세요')
  }

  createActionButtons() {
    const buttons = [
      { text: 'HIT', action: () => this.playerHit(), x: 400 },
      { text: 'STAND', action: () => this.playerStand(), x: 600 },
      { text: 'DOUBLE', action: () => this.playerDouble(), x: 800 },
    ]

    buttons.forEach((btn) => {
      const container = this.add.container(btn.x, 550)
      const bg = this.add.rectangle(0, 0, 120, 50, 0x2196f3)
      const text = this.add.text(0, 0, btn.text, {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5)

      // 배경에 직접 interactive 설정 (Container 내부 좌표계)
      bg.setInteractive(
        new Phaser.Geom.Rectangle(-60, -25, 120, 50),
        Phaser.Geom.Rectangle.Contains
      )
      bg.input!.cursor = 'pointer'

      bg.on('pointerdown', () => {
        // 게임 상태 확인 - 플레이어 턴이고 버스트가 아닐 때만 실행
        this.updateScores()
        if (this.gameState === GameState.PLAYER_TURN && !this.playerHand.isBust && this.playerHand.score <= 21) {
          btn.action()
        }
      })

      container.add([bg, text])
      this.actionButtons.push(container)
    })
  }

  async playerHit() {
    // 게임이 이미 종료되었거나 버스트 상태면 실행하지 않음
    if (this.gameState !== GameState.PLAYER_TURN) {
      return
    }

    // 이미 버스트 상태면 실행하지 않음
    this.updateScores()
    if (this.playerHand.isBust || this.playerHand.score > 21) {
      this.hideActionButtons()
      this.gameState = GameState.SETTLEMENT
      this.revealDealerCard()
      await this.delay(500)
      this.showMessage('버스트! 패배')
      await this.settleGame('lose')
      return
    }

    const newIndex = this.playerHand.cards.length
    await this.dealCard('player', true, newIndex)
    this.updateScores()

    // 버스트 체크 (점수가 21 초과인지 확인)
    if (this.playerHand.score > 21 || this.playerHand.isBust) {
      // 즉시 버튼 비활성화 및 게임 종료
      this.hideActionButtons()
      this.gameState = GameState.SETTLEMENT // 상태 변경으로 추가 클릭 방지
      this.revealDealerCard()
      await this.delay(500) // 딜러 카드 공개 애니메이션 대기
      this.showMessage('버스트! 패배')
      await this.settleGame('lose')
      return
    }
  }

  async playerStand() {
    // 게임이 이미 종료되었거나 버스트 상태면 실행하지 않음
    if (this.gameState !== GameState.PLAYER_TURN || this.playerHand.isBust) {
      return
    }

    this.hideActionButtons()
    this.changeState(GameState.DEALER_TURN)
  }

  async playerDouble() {
    // 게임이 이미 종료되었거나 버스트 상태면 실행하지 않음
    if (this.gameState !== GameState.PLAYER_TURN || this.playerHand.isBust) {
      return
    }

    if (this.playerPoints < this.currentBet * 2) {
      this.showMessage('포인트가 부족합니다!')
      return
    }

    // Double은 현재 베팅의 2배이므로 추가 베팅 처리
    const additionalBet = this.currentBet
    if (this.playerPoints < additionalBet) {
      this.showMessage('포인트가 부족합니다!')
      return
    }
    
    // 추가 베팅 확정
    await this.confirmBet()
    
    // 카드 1장만 받고 자동 스탠드
    await this.playerHit()
    
    // playerHit에서 버스트 처리되면 자동으로 게임 종료됨
    if (this.gameState === GameState.PLAYER_TURN && !this.playerHand.isBust) {
      await this.playerStand()
    }
  }

  async handleDealerTurn() {
    // 플레이어가 이미 버스트인지 확인
    this.updateScores()
    if (this.playerHand.isBust || this.playerHand.score > 21) {
      // 플레이어가 버스트면 이미 패배 처리됨
      return
    }

    this.revealDealerCard()
    await this.delay(500)

    // 딜러는 17 이상이 될 때까지 히트
    while (this.dealerHand.score < 17 && !this.dealerHand.isBust) {
      await this.delay(500)
      const newIndex = this.dealerHand.cards.length
      await this.dealCard('dealer', true, newIndex)
      this.updateScores()

      // 버스트 체크 (점수가 21 초과인지 확인)
      if (this.dealerHand.score > 21 || this.dealerHand.isBust) {
        // 플레이어가 버스트가 아닐 때만 승리
        if (!this.playerHand.isBust && this.playerHand.score <= 21) {
          this.gameState = GameState.SETTLEMENT
          this.showMessage('딜러 버스트! 승리!')
          await this.settleGame('win')
          return
        }
      }
    }

    // 딜러 턴 종료 후 최종 점수 업데이트
    this.updateScores()
    this.changeState(GameState.SETTLEMENT)
  }

  handleSettlement() {
    // 최종 점수 업데이트
    this.updateScores()
    
    const playerScore = this.playerHand.score
    const dealerScore = this.dealerHand.score

    // 플레이어가 버스트면 무조건 패배
    if (this.playerHand.isBust || playerScore > 21) {
      this.showMessage('버스트! 패배')
      this.settleGame('lose')
      return
    }

    // 딜러가 버스트면 플레이어 승리
    if (this.dealerHand.isBust || dealerScore > 21) {
      this.showMessage('딜러 버스트! 승리!')
      this.settleGame('win')
      return
    }

    // 둘 다 버스트가 아니면 점수 비교
    let result: 'win' | 'lose' | 'draw' = 'draw'
    let message = '무승부'

    if (playerScore > dealerScore) {
      result = 'win'
      message = '승리!'
    } else if (playerScore < dealerScore) {
      result = 'lose'
      message = '패배'
    }

    this.showMessage(message)
    this.settleGame(result)
  }

  async settleGame(result: 'win' | 'lose' | 'draw' | 'blackjack') {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const response = await fetch('/api/game/bet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'settle',
          amount: this.currentBet,
          result,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        this.playerPoints = data.points
        this.updatePointsDisplay()
        
        // 칩 이동 애니메이션
        await this.animateChipSettlement(result)
        
        this.showMessage(
          `${result === 'win' || result === 'blackjack' ? '+' : ''}${data.pointsChange} 포인트 (현재: ${data.points} P)`
        )
      }
    } catch (error) {
      console.error('Settlement error:', error)
    }

    await this.delay(2000)
    this.changeState(GameState.ROUND_END)
  }

  async animateChipSettlement(result: 'win' | 'lose' | 'draw' | 'blackjack') {
    // 테이블의 모든 칩을 이동
    const targetX = result === 'lose' ? this.dealerPosition.x : this.chipArea.x
    const targetY = result === 'lose' ? this.dealerPosition.y : this.chipArea.y

    const promises = this.betChips.map((chip, index) => {
      return new Promise<void>((resolve) => {
        this.tweens.add({
          targets: chip,
          x: targetX + (index % 3) * 20,
          y: targetY + Math.floor(index / 3) * 20,
          duration: 1000,
          ease: 'Power2',
          delay: index * 100,
          onComplete: () => {
            chip.destroy()
            resolve()
          },
        })
      })
    })

    await Promise.all(promises)
    this.betChips = []
  }

  async handleRoundEnd() {
    // 카드 수거 애니메이션
    await this.collectCards()
    
    // 초기화
    this.playerHand = { cards: [], score: 0, isBlackjack: false, isBust: false }
    this.dealerHand = { cards: [], score: 0, isBlackjack: false, isBust: false }
    this.currentBet = 0
    this.initialBet = 0

    // 덱이 부족하면 셔플
    if (this.deck.length < 10) {
      this.changeState(GameState.SHUFFLE)
    } else {
      this.changeState(GameState.BETTING)
    }
  }

  async collectCards() {
    const discardPile = { x: 1100, y: 400 }
    
    // Convert Map entries to array to avoid iteration issues
    const cardEntries = Array.from(this.cardSprites.entries())
    
    for (const [card, container] of cardEntries) {
      await new Promise<void>((resolve) => {
        this.tweens.add({
          targets: container,
          x: discardPile.x,
          y: discardPile.y,
          rotation: Math.PI * 2,
          alpha: 0,
          duration: 500,
          onComplete: () => {
            container.destroy()
            resolve()
          },
        })
      })
    }

    this.cardSprites.clear()
  }

  updateScores() {
    this.playerHand.score = calculateHandScore(this.playerHand)
    this.dealerHand.score = calculateHandScore(this.dealerHand)
    this.playerHand.isBlackjack = isBlackjack(this.playerHand)
    this.playerHand.isBust = isBust(this.playerHand) // 플레이어 버스트 체크 추가
    this.dealerHand.isBust = isBust(this.dealerHand)
    this.dealerHand.isBlackjack = isBlackjack(this.dealerHand)
    
    // 점수 텍스트 업데이트
    if (this.playerScoreText) {
      this.playerScoreText.setText(`점수: ${this.playerHand.score}`)
    }
    
    if (this.dealerScoreText) {
      // 딜러의 홀카드가 공개되지 않았으면 첫 번째 카드만 계산
      const visibleDealerCards = this.dealerHand.cards.filter(c => c.faceUp)
      if (visibleDealerCards.length < this.dealerHand.cards.length) {
        const visibleHand: Hand = {
          cards: visibleDealerCards,
          score: 0,
          isBlackjack: false,
          isBust: false,
        }
        const visibleScore = calculateHandScore(visibleHand)
        this.dealerScoreText.setText(`점수: ${visibleScore} + ?`)
      } else {
        this.dealerScoreText.setText(`점수: ${this.dealerHand.score}`)
      }
    }
  }

  updatePointsDisplay() {
    if (this.pointsText) {
      this.pointsText.setText(`포인트: ${this.playerPoints}`)
    }
    if (this.betText) {
      this.betText.setText(`베팅: ${this.currentBet}`)
    }
  }

  showMessage(text: string) {
    if (this.messageText) {
      this.messageText.setText(text)
    }
  }

  hideActionButtons() {
    this.actionButtons.forEach((btn) => {
      // 버튼 비활성화 (상호작용 제거)
      const bg = btn.getAt(0) as Phaser.GameObjects.Rectangle
      if (bg && bg.input) {
        bg.disableInteractive()
        bg.setFillStyle(0x95a5a6) // 회색으로 변경하여 비활성화 표시
      }
      btn.destroy()
    })
    this.actionButtons = []
  }

  delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  preload() {
    // 모든 이미지는 LoadingScene에서 미리 로드되므로 여기서는 로드하지 않음
  }
}

