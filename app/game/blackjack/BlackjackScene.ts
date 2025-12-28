import Phaser from 'phaser'
import { GameState, Card, Hand } from '../types'
import { createDeck, shuffleDeck, calculateHandScore, isBlackjack, isBust } from '../utils'

export class BlackjackScene extends Phaser.Scene {
  private gameState: GameState = GameState.IDLE
  private deck: Card[] = []
  private playerHand: Hand = { cards: [], score: 0, isBlackjack: false, isBust: false }
  private dealerHand: Hand = { cards: [], score: 0, isBlackjack: false, isBust: false }
  private currentBet: number = 0
  private playerPoints: number = 0

  // UI 요소 및 사운드
  private chipButtons: Phaser.GameObjects.Container[] = []
  private dealButton: Phaser.GameObjects.Container | null = null
  private actionButtons: Phaser.GameObjects.Container[] = []
  private betChips: Phaser.GameObjects.Container[] = []
  private pointsText!: Phaser.GameObjects.Text
  private betText!: Phaser.GameObjects.Text
  private messageText!: Phaser.GameObjects.Text
  private playerScoreText!: Phaser.GameObjects.Text
  private dealerScoreText!: Phaser.GameObjects.Text
  
  // 사운드 설정 및 메뉴
  private isMuted: boolean = false;
  private soundMenu!: Phaser.GameObjects.Container;

  // 위치 설정
  private deckPosition = { x: 100, y: 400 }
  private playerPosition = { x: 600, y: 600 }
  private dealerPosition = { x: 600, y: 200 }
  private bettingArea = { x: 600, y: 400 }

  // 스프라이트 관리
  private cardSprites: Map<Card, Phaser.GameObjects.Container> = new Map()

  constructor() { super({ key: 'BlackjackScene' }) }

  preload() {
    // 사운드 파일 로드 (준비된 mp3 경로 입력)
    this.load.audio('sfx_chip', 'assets/sounds/chip_drop.mp3');
    this.load.audio('sfx_card', 'assets/sounds/card_deal.mp3');
  }

  create() {
    this.setupUI();
    this.createSoundMenu(); // 사운드 메뉴 추가
    this.createChipButtons();
    this.changeState(GameState.SHUFFLE);
  }

  // --- 사운드 제어 메뉴 ---
  private createSoundMenu() {
    this.soundMenu = this.add.container(1150, 30);
    const bg = this.add.circle(0, 0, 20, 0x000000, 0.5).setInteractive({ useHandCursor: true });
    const icon = this.add.text(0, 0, '🔊', { fontSize: '20px' }).setOrigin(0.5);
    
    bg.on('pointerdown', () => {
      this.isMuted = !this.isMuted;
      this.sound.mute = this.isMuted;
      icon.setText(this.isMuted ? '🔇' : '🔊');
    });
    this.soundMenu.add([bg, icon]);
  }

  private playSFX(key: string) {
    if (!this.isMuted) this.sound.play(key);
  }

  setupUI() {
    this.add.rectangle(600, 400, 1200, 800, 0x0d5f2e); // 배경
    this.pointsText = this.add.text(50, 50, `포인트: ${this.playerPoints}`, { fontSize: '24px', color: '#fff' });
    this.betText = this.add.text(50, 100, `베팅: ${this.currentBet}`, { fontSize: '24px', color: '#ffd700' });
    this.messageText = this.add.text(600, 50, '', { fontSize: '32px', color: '#fff' }).setOrigin(0.5);
    this.playerScoreText = this.add.text(600, 730, '점수: 0', { fontSize: '24px', color: '#ffd700' }).setOrigin(0.5);
    this.dealerScoreText = this.add.text(600, 70, '점수: 0', { fontSize: '24px', color: '#ffd700' }).setOrigin(0.5);
    this.add.circle(this.bettingArea.x, this.bettingArea.y, 80, 0xffffff, 0.3); // 베팅 영역
  }

  // --- 베팅 및 칩 로직 ---
  createChipButtons() {
    const betAmounts = [10, 50, 100, 500];
    betAmounts.forEach((amt, i) => {
      const btn = this.createChip(amt, 200 + i * 150, 720, true);
      this.chipButtons.push(btn);
    });
  }

  createChip(amount: number, x: number, y: number, isButton: boolean): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const circle = this.add.circle(0, 0, 35, 0xcc0000).setStrokeStyle(3, 0xffffff).setInteractive({ useHandCursor: true });
    const txt = this.add.text(0, 0, amount.toString(), { fontSize: '18px', fontStyle: 'bold' }).setOrigin(0.5);
    
    if (isButton) {
      circle.on('pointerdown', () => {
        this.playSFX('sfx_chip');
        this.addChipToTable(amount);
      });
    }
    container.add([circle, txt]);
    return container;
  }

  addChipToTable(amount: number) {
    if (this.playerPoints < amount) return;
    this.currentBet += amount;
    this.playerPoints -= amount;
    this.updatePointsDisplay();

    const chip = this.createChip(amount, this.bettingArea.x + (Math.random()*40-20), this.bettingArea.y + (this.betChips.length*-2), false);
    this.betChips.push(chip);
    if (!this.dealButton) this.createDealButton();
  }

  createDealButton() {
    const btn = this.add.container(600, 500);
    const bg = this.add.rectangle(0, 0, 150, 60, 0x4caf50).setInteractive({ useHandCursor: true });
    const txt = this.add.text(0, 0, 'DEAL', { fontSize: '24px', fontStyle: 'bold', color: '#fff' }).setOrigin(0.5);
    bg.on('pointerdown', () => {
      if (this.currentBet > 0) {
        this.handleDealStart();
      }
    });
    btn.add([bg, txt]);
    this.dealButton = btn;
  }

  // --- 카드 배분 로직 (매칭 오류 수정) ---
  async handleDealStart() {
    this.hideChipButtons();
    if (this.dealButton) this.dealButton.destroy();
    this.dealButton = null;

    this.playerHand = { cards: [], score: 0, isBlackjack: false, isBust: false };
    this.dealerHand = { cards: [], score: 0, isBlackjack: false, isBust: false };

    // 순차적 배분 (플레이어 -> 딜러 -> 플레이어 -> 딜러)
    await this.dealCard('player', true, 0);
    await this.dealCard('dealer', true, 0);
    await this.dealCard('player', true, 1);
    await this.dealCard('dealer', false, 1); // 딜러 두번째는 뒷면

    this.changeState(GameState.CHECK_BLACKJACK);
  }

  async dealCard(target: 'player' | 'dealer', faceUp: boolean, index: number) {
    const card = this.deck.pop()!;
    card.faceUp = faceUp;
    const targetHand = target === 'player' ? this.playerHand : this.dealerHand;
    targetHand.cards.push(card);

    const container = this.add.container(this.deckPosition.x, this.deckPosition.y);
    const back = this.add.image(0, 0, 'card-back').setDisplaySize(80, 120);
    container.add(back);
    this.cardSprites.set(card, container);

    const targetX = target === 'player' ? this.playerPosition.x + (index*30) - 30 : this.dealerPosition.x + (index*30) - 30;
    const targetY = target === 'player' ? this.playerPosition.y : this.dealerPosition.y;

    this.playSFX('sfx_card');

    return new Promise<void>(resolve => {
      this.tweens.add({
        targets: container,
        x: targetX, y: targetY,
        duration: 400,
        onComplete: () => {
          if (faceUp) this.flipCard(container, card, resolve);
          else resolve();
          this.updateScores();
        }
      });
    });
  }

  flipCard(container: Phaser.GameObjects.Container, card: Card, resolve: () => void) {
    this.tweens.add({
      targets: container,
      scaleX: 0,
      duration: 150,
      onComplete: () => {
        container.removeAll(true);
        // 미리 로드된 이미지 키 사용 (예: card-hearts-A)
        const front = this.add.image(0, 0, `card-${card.suit}-${card.value}`).setDisplaySize(80, 120);
        container.add(front);
        this.tweens.add({ targets: container, scaleX: 1, duration: 150, onComplete: () => resolve() });
      }
    });
  }

  // --- 상태 및 점수 관리 ---
  updateScores() {
    this.playerHand.score = calculateHandScore(this.playerHand);
    this.playerScoreText.setText(`점수: ${this.playerHand.score}`);

    // 딜러 점수 가리기 로직
    const isDealerTurn = [GameState.DEALER_TURN, GameState.SETTLEMENT].includes(this.gameState);
    if (!isDealerTurn) {
      const visibleCards = this.dealerHand.cards.filter(c => c.faceUp);
      const visibleScore = calculateHandScore({ cards: visibleCards } as Hand);
      this.dealerScoreText.setText(`점수: ${visibleScore} + ?`);
    } else {
      this.dealerHand.score = calculateHandScore(this.dealerHand);
      this.dealerScoreText.setText(`점수: ${this.dealerHand.score}`);
    }
  }

  handlePlayerTurn() {
    this.createActionButtons();
    this.messageText.setText('행동을 선택하세요');
  }

  createActionButtons() {
    const actions = [
      { text: 'HIT', cb: () => this.playerHit() },
      { text: 'STAND', cb: () => this.playerStand() }
    ];
    actions.forEach((a, i) => {
      const btn = this.add.container(500 + i * 200, 500);
      const bg = this.add.rectangle(0, 0, 120, 50, 0x2196f3).setInteractive({ useHandCursor: true });
      const txt = this.add.text(0, 0, a.text, { fontSize: '20px', color: '#fff' }).setOrigin(0.5);
      bg.on('pointerdown', a.cb);
      btn.add([bg, txt]);
      this.actionButtons.push(btn);
    });
  }

  async playerHit() {
    this.hideActionButtons();
    await this.dealCard('player', true, this.playerHand.cards.length);
    if (isBust(this.playerHand)) this.changeState(GameState.SETTLEMENT);
    else this.handlePlayerTurn();
  }

  playerStand() {
    this.hideActionButtons();
    this.changeState(GameState.DEALER_TURN);
  }

  async handleDealerTurn() {
    // 딜러 홀 카드 공개
    const hidden = this.dealerHand.cards.find(c => !c.faceUp);
    if (hidden) {
      hidden.faceUp = true;
      await new Promise<void>(r => this.flipCard(this.cardSprites.get(hidden)!, hidden, r));
    }
    
    this.updateScores();
    while (calculateHandScore(this.dealerHand) < 17) {
      await this.delay(500);
      await this.dealCard('dealer', true, this.dealerHand.cards.length);
    }
    this.changeState(GameState.SETTLEMENT);
  }

  // --- 마무리 로직 ---
  handleSettlement() {
    const p = calculateHandScore(this.playerHand);
    const d = calculateHandScore(this.dealerHand);
    let result = '';
    if (p > 21) result = '버스트 패배';
    else if (d > 21 || p > d) result = '승리!';
    else if (p < d) result = '패배';
    else result = '무승부';

    this.messageText.setText(result);
    this.time.delayedCall(2000, () => this.changeState(GameState.ROUND_END));
  }

  // 나머지 헬퍼 (기존 기능과 동일)
  private hideActionButtons() { this.actionButtons.forEach(b => b.destroy()); this.actionButtons = []; }
  private hideChipButtons() { this.chipButtons.forEach(b => b.destroy()); this.chipButtons = []; }
  private updatePointsDisplay() { 
    this.pointsText.setText(`포인트: ${this.playerPoints}`); 
    this.betText.setText(`베팅: ${this.currentBet}`); 
  }
  private delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
  private changeState(s: GameState) { this.gameState = s; this.handleState(s); }
  private handleState(s: GameState) { /* 기존 스위치 문 로직 실행 */ }
}