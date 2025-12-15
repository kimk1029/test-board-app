import * as Phaser from 'phaser'

// --- Types ---
interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: string;
}

interface Player {
  userId: number;
  nickname: string;
  seatIndex: number;
  chips: number;
  currentBet: number;
  isActive: boolean;
  isAllIn: boolean;
  position: string | null;
  holeCards?: Card[];
}

interface RoomData {
  id: string;
  status: 'waiting' | 'playing' | 'finished';
  currentRound: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  pot: number;
  dealerIndex: number;
  communityCards: Card[];
  gameState: {
    currentTurnSeat: number | null;
    minBet: number;
    lastRaise: number;
    winners?: { seatIndex: number; hand: any; amount: number }[];
  };
  players: Player[];
}

type LayoutMode = 'mobile' | 'tablet' | 'pc';

// --- Scene ---
export class HoldemScene extends Phaser.Scene {
  private roomId!: string;
  private myUserId: number | null = null;
  
  // State
  private roomData: RoomData | null = null;
  // 폴링 제거: pollingTimer 변수 제거
  private isProcessingUpdate = false;
  private displayedCommunityCards: number = 0;
  private layoutMode: LayoutMode = 'pc';

  // Timer
  private turnTimerEvent: Phaser.Time.TimerEvent | null = null;
  private turnTotalTime = 20000;
  private currentTimerSeat: number | null = null;
  private timerCheckInterval: NodeJS.Timeout | null = null; // 서버 타이머 체크용

  // UI Objects
  private tableGraphics!: Phaser.GameObjects.Graphics;
  private timerGraphics!: Phaser.GameObjects.Graphics;
  private seatContainers: Map<number, Phaser.GameObjects.Container> = new Map();
  private sitButtons: Phaser.GameObjects.Container[] = [];
  private communityCardContainers: Phaser.GameObjects.Container[] = [];
  private potText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private actionContainer!: Phaser.GameObjects.Container;
  private startButton!: Phaser.GameObjects.Container;
  private deckSprite!: Phaser.GameObjects.Image;
  
  // Raise UI
  private raiseContainer!: Phaser.GameObjects.Container;
  private raiseSlider!: Phaser.GameObjects.Graphics;
  private raiseHandle!: Phaser.GameObjects.Arc;
  private raiseAmountText!: Phaser.GameObjects.Text;
  private raiseValue: number = 0;
  private isDraggingSlider: boolean = false;

  private deckPos = { x: 100, y: 100 };

  constructor() {
    super({ key: 'HoldemScene' });
  }

  init(data: { roomId: string }) {
    this.roomId = data.roomId;
    if (typeof window !== 'undefined' && window.localStorage) {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const payload = JSON.parse(window.atob(base64));
                this.myUserId = payload.userId;
            } catch (e) {
                console.error('Failed to parse token', e);
            }
        }
    }
  }

  create() {
    this.seatContainers = new Map();
    this.sitButtons = [];
    this.communityCardContainers = [];
    this.displayedCommunityCards = 0;

    this.createTable();
    this.timerGraphics = this.add.graphics().setDepth(15);
    this.createUI();
    this.createSeats();
    this.createActionControls();
    this.createRaiseUI();

    this.scale.on('resize', this.handleResize, this);
    this.handleResize(); // Initial layout

    this.fetchRoomInfo();
    
    // 주기적으로 타이머 체크 및 게임 상태 갱신 (2초마다)
    this.timerCheckInterval = setInterval(() => {
      this.fetchRoomInfo();
    }, 2000);
  }

  shutdown() {
    // 정리 작업
    if (this.timerCheckInterval) {
      clearInterval(this.timerCheckInterval);
      this.timerCheckInterval = null;
    }
    if (this.turnTimerEvent) {
      this.turnTimerEvent.remove();
      this.turnTimerEvent = null;
    }
  }

  update() {
    // Update Timer Graphics
    if (this.turnTimerEvent && this.currentTimerSeat !== null) {
        const container = this.seatContainers.get(this.currentTimerSeat);
        if (container) {
            const progress = this.turnTimerEvent.getProgress(); // 0 to 1
            const remaining = 1 - progress;
            const endAngle = Phaser.Math.DegToRad(360 * remaining - 90);
            
            this.timerGraphics.clear();
            this.timerGraphics.lineStyle(6, 0x00ff00);
            // Draw arc around avatar (radius 46)
            this.timerGraphics.beginPath();
            this.timerGraphics.arc(container.x, container.y, 46, Phaser.Math.DegToRad(-90), endAngle, false);
            this.timerGraphics.strokePath();

            if (remaining <= 0) {
                this.timerGraphics.clear();
            }
        }
    } else {
        this.timerGraphics.clear();
    }
  }

  handleResize() {
    const { width, height } = this.scale;
    
    // Adjusted breakpoints and logic for Tablet height issues
    if (width < 768) {
        this.layoutMode = 'mobile';
    } else if (width < 1200) {
        this.layoutMode = 'tablet';
    } else {
        this.layoutMode = 'pc';
    }
    
    this.updateLayout();
  }

  createTable() {
    if (this.tableGraphics) this.tableGraphics.destroy();
    this.tableGraphics = this.add.graphics();
  }

  createUI() {
    this.potText = this.add.text(0, 0, 'POT: 0', { 
        fontSize: '18px',  // Smaller pot text
        color: '#ffd700', 
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3
    }).setOrigin(0.5).setDepth(10);

    this.statusText = this.add.text(0, 0, '', { 
        fontSize: '24px', 
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
        align: 'center'
    }).setOrigin(0.5).setDepth(20);
    
    this.startButton = this.createButton(0, 0, 'GAME START', 0x2e7d32, () => this.handleStartGame());
    this.startButton.setVisible(false).setDepth(30);

    this.deckSprite = this.add.image(0, 0, 'card-back').setScale(0.6).setDepth(5);
  }
  
  createSeats() {
    for (let i = 0; i < 6; i++) {
        const container = this.add.container(0, 0).setDepth(5);
        
        // Avatar Background
        const avatarBg = this.add.circle(0, 0, 42, 0x222222).setStrokeStyle(3, 0xaaaaaa);
        
        // Avatar Image
        const avatarImg = this.add.image(0, 0, 'avatar-placeholder').setDisplaySize(80, 80);
        const maskShape = this.make.graphics();
        maskShape.fillCircle(0, 0, 40); // Local to mask, needs to be positioned
        
        (avatarImg as any).maskShape = maskShape; 
        const mask = maskShape.createGeometryMask();
        avatarImg.setMask(mask);
        
        // Info Box
        const infoBg = this.add.rectangle(0, 60, 120, 50, 0x000000, 0.7).setStrokeStyle(1, 0x444444);
        const nameText = this.add.text(0, 45, 'Empty', { fontSize: '14px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
        const chipsText = this.add.text(0, 65, '', { fontSize: '12px', color: '#ffd700' }).setOrigin(0.5);
        
        // Action Text
        const actionText = this.add.text(0, -60, '', { 
            fontSize: '18px', color: '#00ffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);
        
        // Cards
        const cardsContainer = this.add.container(0, 0); 
        
        container.add([avatarBg, avatarImg, infoBg, nameText, chipsText, actionText, cardsContainer]);
        this.seatContainers.set(i, container);

        // Sit Button
        const sitContainer = this.add.container(0, 0).setDepth(20).setVisible(false);
        const sitBg = this.add.rectangle(0, 0, 120, 60, 0x2e7d32)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0xffffff);
        const sitTxt = this.add.text(0, 0, 'SIT', { fontSize: '24px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
        
        sitBg.on('pointerdown', () => this.handleSit(i));
        
        sitContainer.add([sitBg, sitTxt]);
        this.add.existing(sitContainer);
        this.sitButtons[i] = sitContainer;
    }
  }

  createActionControls() {
    this.actionContainer = this.add.container(0, 0).setDepth(50).setVisible(false);
    const actions = [
        { label: 'FOLD', color: 0xb71c1c, callback: () => this.sendAction('fold') },
        { label: 'CHECK', color: 0x1565c0, callback: () => this.sendAction('check') },
        { label: 'CALL', color: 0x1565c0, callback: () => this.sendAction('call') },
        { label: 'RAISE', color: 0xff8f00, callback: () => this.toggleRaiseUI() },
        { label: 'ALL IN', color: 0xd50000, callback: () => this.sendAction('allin') }
    ];

    // Buttons created here, but positioning will be updated in updateLayout
    const btnWidth = 100;
    const spacing = 10;
    
    actions.forEach((action, index) => {
        const btn = this.createButton(0, 0, action.label, action.color, action.callback, btnWidth, 50);
        btn.setName('btn_' + action.label.toLowerCase().replace(' ', ''));
        this.actionContainer.add(btn);
    });
  }

  createRaiseUI() {
      this.raiseContainer = this.add.container(0, 0).setDepth(60).setVisible(false);
      
      const bg = this.add.rectangle(0, -100, 300, 150, 0x000000, 0.9).setStrokeStyle(2, 0xff8f00);
      const sliderLine = this.add.rectangle(0, -100, 200, 4, 0x888888);
      
      this.raiseHandle = this.add.circle(-100, -100, 20, 0xff8f00)
          .setInteractive({ useHandCursor: true, draggable: true });
          
      this.raiseAmountText = this.add.text(0, -150, 'Raise: 0', { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);
      
      const confirmBtn = this.createButton(0, -50, 'CONFIRM', 0xff8f00, () => this.confirmRaise(), 120, 40);
      
      const closeBtn = this.add.text(130, -165, 'X', { fontSize: '20px', color: '#ff0000', fontStyle: 'bold' })
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => this.raiseContainer.setVisible(false));

      this.raiseContainer.add([bg, sliderLine, this.raiseHandle, this.raiseAmountText, confirmBtn, closeBtn]);
      
      this.input.setDraggable(this.raiseHandle);
      this.input.on('drag', (pointer: any, gameObject: any, dragX: number, dragY: number) => {
          if (gameObject === this.raiseHandle) {
              const x = Phaser.Math.Clamp(dragX, -100, 100);
              gameObject.x = x;
              this.updateRaiseAmount(x);
          }
      });
  }

  createButton(x: number, y: number, text: string, color: number, callback: () => void, w: number = 140, h: number = 50): Phaser.GameObjects.Container {
      const container = this.add.container(x, y);
      const bg = this.add.rectangle(0, 0, w, h, color, 1)
          .setInteractive({ useHandCursor: true })
          .setStrokeStyle(2, 0xffffff);
      
      const gloss = this.add.rectangle(0, -h/4, w, h/2, 0xffffff, 0.2);
      const txt = this.add.text(0, 0, text, { fontSize: '18px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
      
      bg.on('pointerdown', callback);
      container.add([bg, gloss, txt]);
      return container;
  }

  // --- Layout Logic ---

  updateLayout() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.tableGraphics.clear();
    
    // Layout Config
    let rx, ry; 
    let cardYOffset = 0;
    
    // Ensure table fits within height, leaving space for UI
    const maxRy = (height * 0.4) - 40; 
    
    if (this.layoutMode === 'mobile') {
        rx = width * 0.32; // Tighter width for mobile
        ry = Math.min(height * 0.35, maxRy);
        this.deckSprite.setPosition(cx, cy - 80);
        cardYOffset = 50;
    } else if (this.layoutMode === 'tablet') {
        rx = width * 0.4;
        ry = Math.min(height * 0.30, maxRy);
        this.deckSprite.setPosition(cx - 100, cy);
    } else {
        rx = width * 0.35;
        ry = Math.min(height * 0.35, maxRy);
        this.deckSprite.setPosition(cx - 160, cy);
    }

    // Draw Table
    this.tableGraphics.fillStyle(0x4e342e); 
    this.tableGraphics.fillEllipse(cx, cy, rx * 2 + 30, ry * 2 + 30);
    this.tableGraphics.fillStyle(0x35654d); 
    this.tableGraphics.fillEllipse(cx, cy, rx * 2, ry * 2);

    // Positions
    const potY = cy + 50 + cardYOffset; 
    this.potText.setPosition(cx, potY);
    
    this.statusText.setPosition(cx, cy + 120 + cardYOffset); 
    this.startButton.setPosition(cx, cy + 150 + cardYOffset);

    // Calculate Seat Positions
    const seatOffset = this.layoutMode === 'mobile' ? 35 : 60; // Tighter offset for mobile
    const seatPositions = this.calculateSeatPositions(cx, cy, rx, ry, seatOffset);
    
    this.seatContainers.forEach((container, i) => {
        container.setPosition(seatPositions[i].x, seatPositions[i].y);
        
        // Scale down seat container in mobile if needed to fit
        if (this.layoutMode === 'mobile') {
            container.setScale(0.85); // Scale down avatars/info slightly
        } else {
            container.setScale(1);
        }

        this.sitButtons[i].setPosition(seatPositions[i].x, seatPositions[i].y);
        
        // Update mask position
        const avatarImg = container.getAt(1) as Phaser.GameObjects.Image;
        const maskShape = (avatarImg as any).maskShape as Phaser.GameObjects.Graphics;
        if (maskShape) {
            maskShape.clear();
            maskShape.fillCircle(seatPositions[i].x, seatPositions[i].y, 40);
        }
    });

    // Action Container Positioning
    this.actionContainer.setPosition(cx, height - 50); 
    this.raiseContainer.setPosition(cx, cy);

    // Reposition Action Buttons dynamically
    const buttons = this.actionContainer.list as Phaser.GameObjects.Container[];
    const btnWidth = this.layoutMode === 'mobile' ? 80 : 100; // Smaller buttons on mobile
    const btnHeight = 50;
    const spacing = 10;
    
    if (this.layoutMode === 'mobile') {
        // Two rows for mobile: 3 top, 2 bottom
        // Top: Fold, Check, Call
        // Bottom: Raise, All In
        const topRowY = -30;
        const botRowY = 30;
        
        // Helper to position
        const setBtnPos = (name: string, rowX: number, rowY: number) => {
            const btn = this.actionContainer.getByName(name) as Phaser.GameObjects.Container;
            if (btn) {
                btn.setPosition(rowX, rowY);
                // Adjust button background width
                const bg = btn.getAt(0) as Phaser.GameObjects.Rectangle;
                const gloss = btn.getAt(1) as Phaser.GameObjects.Rectangle;
                bg.setSize(btnWidth, btnHeight);
                gloss.setSize(btnWidth, btnHeight/2);
            }
        };

        setBtnPos('btn_fold', -(btnWidth + spacing), topRowY);
        setBtnPos('btn_check', 0, topRowY);
        setBtnPos('btn_call', (btnWidth + spacing), topRowY);
        
        setBtnPos('btn_raise', -btnWidth/2 - spacing/2, botRowY);
        setBtnPos('btn_allin', btnWidth/2 + spacing/2, botRowY);

        this.actionContainer.setPosition(cx, height - 80); // Move up a bit for 2 rows

    } else {
        // Single row for Tablet/PC
        let currentX = -(buttons.length * (btnWidth + spacing)) / 2 + btnWidth/2;
        buttons.forEach(btn => {
             btn.setPosition(currentX, 0);
             const bg = btn.getAt(0) as Phaser.GameObjects.Rectangle;
             const gloss = btn.getAt(1) as Phaser.GameObjects.Rectangle;
             bg.setSize(btnWidth, btnHeight);
             gloss.setSize(btnWidth, btnHeight/2);
             currentX += btnWidth + spacing;
        });
    }


    // Community Cards (Smaller)
    const cardSpacing = 55; 
    const cardsY = cy + cardYOffset;
    const cardsX = cx - (cardSpacing * 2); 
    
    this.communityCardContainers.forEach((container, i) => {
        container.setPosition(cardsX + i * cardSpacing, cardsY);
    });
  }

  calculateSeatPositions(cx: number, cy: number, rx: number, ry: number, offset: number) {
      const angles = [
          Math.PI / 2,         // 0: Bottom
          Math.PI * 0.85,      // 1: Bottom Left
          Math.PI * 1.15,      // 2: Top Left
          -Math.PI / 2,        // 3: Top
          -Math.PI * 0.15,     // 4: Top Right
          Math.PI * 0.15       // 5: Bottom Right
      ];
      
      return angles.map(angle => ({
          x: cx + (rx + offset) * Math.cos(angle),
          y: cy + (ry + offset) * Math.sin(angle)
      }));
  }

  // --- Game Logic ---
  
  async fetchRoomInfo() {
    if (this.isProcessingUpdate) return;
    try {
        // 타이머 체크 API 호출 (자동 fold 및 자동 시작 처리)
        try {
            await fetch('/api/holdem/timer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId: this.roomId })
            });
        } catch (e) {
            // 타이머 체크 실패는 무시 (게임 정보는 계속 가져옴)
        }

        const res = await fetch(`/api/holdem/room?roomId=${this.roomId}&t=${Date.now()}`);
        if (!res.ok) return;
        const data = await res.json();
        
        const parsedData: RoomData = {
            id: data.room.id,
            status: data.room.status,
            currentRound: data.room.currentRound,
            pot: data.room.pot,
            dealerIndex: data.room.dealerIndex,
            communityCards: data.room.communityCards,
            gameState: data.room.gameState,
            players: data.players
        };
        
        this.updateGameState(parsedData);
    } catch (e) {
        console.error(e);
    }
  }

  updateGameState(newData: RoomData) {
    this.isProcessingUpdate = true;
    const oldData = this.roomData;
    this.roomData = newData;

    this.potText.setText(`POT: ${newData.pot.toLocaleString()}`);
    
    const amISeated = newData.players.some(p => p.userId === this.myUserId);
    const playerCount = newData.players.length;

    // Timer Logic
    if (newData.status === 'playing' && newData.gameState.currentTurnSeat !== null) {
        if (this.currentTimerSeat !== newData.gameState.currentTurnSeat) {
            this.currentTimerSeat = newData.gameState.currentTurnSeat;
            if (this.turnTimerEvent) this.turnTimerEvent.remove();
            this.turnTimerEvent = this.time.addEvent({
                delay: this.turnTotalTime,
                callback: () => { 
                    if (this.currentTimerSeat !== null && 
                        this.roomData?.players.find(p => p.userId === this.myUserId)?.seatIndex === this.currentTimerSeat) {
                        this.sendAction('fold');
                    }
                }
            });
        }
    } else {
        if (this.turnTimerEvent) this.turnTimerEvent.remove();
        this.turnTimerEvent = null;
        this.currentTimerSeat = null;
    }

    if (newData.status === 'waiting') {
        if (playerCount < 2) {
            this.statusText.setText(amISeated 
                ? `Waiting for more players... (${playerCount}/2)` 
                : 'Click a "SIT" button to join');
        } else {
            this.statusText.setText('Ready to Start!');
        }
    } else {
        this.statusText.setText('');
    }

    if (newData.status === 'waiting' && playerCount >= 2 && amISeated) {
        this.startButton.setVisible(true);
    } else {
        this.startButton.setVisible(false);
    }

    this.updateSeats(newData.players, newData.gameState.currentTurnSeat);
    if (!amISeated) {
        this.enableSeatInteraction(newData.players);
    } else {
        this.disableSeatInteraction();
    }

    if (newData.communityCards.length > this.displayedCommunityCards) {
        this.dealCommunityCards(newData.communityCards, this.displayedCommunityCards);
        this.displayedCommunityCards = newData.communityCards.length;
    }
    
    const myPlayer = newData.players.find(p => p.userId === this.myUserId);
    const isMyTurn = myPlayer && newData.gameState.currentTurnSeat === myPlayer.seatIndex && newData.status === 'playing';
    
    if (isMyTurn) {
        this.actionContainer.setVisible(true);
        this.updateActionButtons(myPlayer!, newData);
    } else {
        this.actionContainer.setVisible(false);
        this.raiseContainer.setVisible(false);
    }
    
    if (newData.gameState.winners && (!oldData?.gameState.winners || oldData.gameState.winners.length === 0)) {
        this.handleWinners(newData.gameState.winners);
    }
    
    if (oldData && oldData.status !== 'playing' && newData.status === 'playing') {
        this.resetTableForNewGame();
    }

    this.isProcessingUpdate = false;
  }
  
  updateSeats(players: Player[], currentTurnSeat: number | null) {
      this.seatContainers.forEach(c => {
          (c.getAt(3) as Phaser.GameObjects.Text).setText('Empty');
          (c.getAt(4) as Phaser.GameObjects.Text).setText('');
          (c.getAt(5) as Phaser.GameObjects.Text).setText('');
          // Don't remove cards immediately if round active, handled below
          (c.getAt(0) as Phaser.GameObjects.Shape).setStrokeStyle(3, 0xaaaaaa);
      });

      players.forEach(p => {
          const container = this.seatContainers.get(p.seatIndex);
          if (!container) return;

          const avatarBg = container.getAt(0) as Phaser.GameObjects.Shape;
          const nameTxt = container.getAt(3) as Phaser.GameObjects.Text;
          const chipsTxt = container.getAt(4) as Phaser.GameObjects.Text;
          const actionTxt = container.getAt(5) as Phaser.GameObjects.Text;
          const cardsContainer = container.getAt(6) as Phaser.GameObjects.Container;
          
          nameTxt.setText(p.nickname);
          chipsTxt.setText(`$${p.chips}\nBet: ${p.currentBet}`);
          
          if (currentTurnSeat === p.seatIndex) {
              avatarBg.setStrokeStyle(4, 0x00ff00);
          } else {
              avatarBg.setStrokeStyle(3, 0xaaaaaa);
          }
          
          if (!p.isActive) actionTxt.setText('FOLD').setColor('#aaaaaa');
          else if (p.isAllIn) actionTxt.setText('ALL IN').setColor('#ff0000');
          else actionTxt.setText('');

          // Dealing Logic
          if (this.roomData?.status === 'playing' && p.isActive) {
              // If container empty, deal
              if (cardsContainer.list.length === 0) {
                  if (p.userId === this.myUserId && p.holeCards) {
                      this.animateDealHoleCards(cardsContainer, p.holeCards, true, container);
                  } else {
                      this.animateDealHoleCards(cardsContainer, [], false, container);
                  }
              }
          } else if (this.roomData?.status === 'waiting') {
               cardsContainer.removeAll(true);
          }
          
          // Showdown reveal
          if (this.roomData?.currentRound === 'showdown' && p.isActive && p.holeCards) {
              // Only redraw if not already showing faces (check first child texture key)
              const firstChild = cardsContainer.list[0] as Phaser.GameObjects.Image;
              if (firstChild && firstChild.texture.key === 'card-back') {
                  cardsContainer.removeAll(true);
                  this.drawHoleCards(cardsContainer, p.holeCards, false); // No animation needed for reveal, or simple flip
              }
          }
      });
  }

  enableSeatInteraction(players: Player[]) {
      const occupiedSeats = players.map(p => p.seatIndex);
      this.sitButtons.forEach((btn, index) => {
          if (!occupiedSeats.includes(index)) {
              btn.setVisible(true);
              this.seatContainers.get(index)?.setAlpha(0.3);
          } else {
              btn.setVisible(false);
              this.seatContainers.get(index)?.setAlpha(1);
          }
      });
  }

  disableSeatInteraction() {
      this.sitButtons.forEach(btn => btn.setVisible(false));
      this.seatContainers.forEach(c => c.setAlpha(1));
  }

  async handleSit(seatIndex: number) {
      const token = localStorage.getItem('token');
      if (!token) {
          alert('Please login to play');
          return;
      }
      try {
          const res = await fetch('/api/holdem/room', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ roomId: this.roomId, seatIndex, buyIn: 1000 })
          });
          if (res.ok) {
              // 앉기 성공 후 즉시 방 정보 갱신하여 UI 업데이트
              await this.fetchRoomInfo();
          } else {
              const err = await res.json();
              alert(err.error || 'Failed to join');
          }
      } catch (e) { 
          console.error(e);
          alert('앉기에 실패했습니다.');
      }
  }
  
  // ... Raise UI Logic ...
  toggleRaiseUI() {
      if (!this.roomData) return;
      const me = this.roomData.players.find(p => p.userId === this.myUserId);
      if (!me) return;
      const highestBet = Math.max(...this.roomData.players.map(p => p.currentBet));
      const minRaise = this.roomData.gameState.minBet || 20; 
      const minTotal = highestBet + minRaise;
      const maxTotal = me.chips + me.currentBet; 
      if (minTotal > maxTotal) {
          this.sendAction('allin');
          return;
      }
      this.raiseContainer.setVisible(true);
      this.raiseHandle.x = -100;
      this.updateRaiseAmount(-100);
  }

  updateRaiseAmount(sliderX: number) {
      if (!this.roomData) return;
      const me = this.roomData.players.find(p => p.userId === this.myUserId)!;
      const highestBet = Math.max(...this.roomData.players.map(p => p.currentBet));
      const minRaise = this.roomData.gameState.minBet || 20;
      const minVal = highestBet + minRaise;
      const maxVal = me.chips + me.currentBet;
      const ratio = (sliderX + 100) / 200;
      const val = Math.floor(minVal + ratio * (maxVal - minVal));
      this.raiseValue = val;
      const additional = val - me.currentBet;
      this.raiseAmountText.setText(`Total Bet: $${val}\n(Add: $${additional})`);
  }

  confirmRaise() {
      if (!this.roomData) return;
      const me = this.roomData.players.find(p => p.userId === this.myUserId)!;
      const additional = this.raiseValue - me.currentBet;
      this.sendAction('raise', additional);
      this.raiseContainer.setVisible(false);
  }

  // --- Cards ---
  
  // Animation for dealing hole cards
  animateDealHoleCards(container: Phaser.GameObjects.Container, cards: Card[], isMe: boolean, seatContainer: Phaser.GameObjects.Container) {
      const startX = this.deckSprite.x - seatContainer.x;
      const startY = this.deckSprite.y - seatContainer.y;
      
      const scale = isMe ? 0.5 : 0.3; // Bigger for me
      const spacing = isMe ? 40 : 20;
      const offset = isMe ? -20 : -10;
      const yPos = isMe ? -50 : -40;

      const cardCount = isMe ? cards.length : 2;
      
      for(let i=0; i<cardCount; i++) {
          const targetX = i * spacing + offset;
          const targetY = yPos;
          
          const cardObj = this.add.image(startX, startY, 'card-back').setScale(scale);
          container.add(cardObj);
          
          this.tweens.add({
              targets: cardObj,
              x: targetX,
              y: targetY,
              duration: 500,
              ease: 'Power2',
              delay: i * 100, // Stagger deal
              onComplete: () => {
                  if (isMe && cards[i]) {
                      // Flip animation for my cards
                      this.tweens.add({
                          targets: cardObj,
                          scaleX: 0,
                          duration: 150,
                          onComplete: () => {
                              cardObj.setTexture(`card-${cards[i].suit}-${cards[i].rank}`);
                              this.tweens.add({
                                  targets: cardObj,
                                  scaleX: scale,
                                  duration: 150
                              });
                          }
                      });
                  }
              }
          });
      }
  }

  drawHoleCards(container: Phaser.GameObjects.Container, cards: Card[], isMe: boolean) {
      const scale = isMe ? 0.5 : 0.3;
      const spacing = isMe ? 40 : 20;
      const offset = isMe ? -20 : -10;
      const yPos = isMe ? -50 : -40;
      
      cards.forEach((card, idx) => {
          const key = `card-${card.suit}-${card.rank}`;
          const img = this.scene.scene.add.image(idx * spacing + offset, yPos, key).setScale(scale); 
          container.add(img);
      });
  }
  
  drawBackCards(container: Phaser.GameObjects.Container) {
      const scale = 0.3;
      const spacing = 20;
      const offset = -10;
      const yPos = -40;
      
      const c1 = this.scene.scene.add.image(offset, yPos, 'card-back').setScale(scale);
      const c2 = this.scene.scene.add.image(offset + spacing, yPos, 'card-back').setScale(scale);
      container.add([c1, c2]);
  }
  
  dealCommunityCards(cards: Card[], startIndex: number) {
      const spacing = 55;
      const { width, height } = this.scale;
      const cx = width / 2;
      const cy = height / 2;
      const cardYOffset = this.layoutMode === 'mobile' ? 50 : 0;
      const cardsY = cy + cardYOffset;
      const startX = cx - (spacing * 2);

      for (let i = startIndex; i < cards.length; i++) {
          const card = cards[i];
          const targetX = startX + i * spacing;
          const targetY = cardsY;
          
          const deckX = this.deckSprite.x;
          const deckY = this.deckSprite.y;
          
          // Community Cards smaller (0.25)
          const cardObj = this.add.image(deckX, deckY, 'card-back').setScale(0.25);
          this.communityCardContainers.push(cardObj as any);
          
          this.tweens.add({
              targets: cardObj,
              x: targetX,
              y: targetY,
              duration: 400,
              ease: 'Power2',
              onComplete: () => {
                  this.tweens.add({
                      targets: cardObj,
                      scaleX: 0,
                      duration: 150,
                      onComplete: () => {
                          cardObj.setTexture(`card-${card.suit}-${card.rank}`);
                          this.tweens.add({
                              targets: cardObj,
                              scaleX: 0.25, 
                              duration: 150
                          });
                      }
                  });
              }
          });
      }
  }
  
  updateActionButtons(me: Player, room: RoomData) {
      const highestBet = Math.max(...room.players.map(p => p.currentBet));
      const toCall = highestBet - me.currentBet;
      const btnCheck = this.actionContainer.getByName('btn_check') as Phaser.GameObjects.Container;
      const btnCall = this.actionContainer.getByName('btn_call') as Phaser.GameObjects.Container;
      
      if (toCall === 0) {
          btnCheck.setVisible(true);
          btnCall.setVisible(false);
      } else {
          btnCheck.setVisible(false);
          btnCall.setVisible(true);
          (btnCall.getAt(2) as Phaser.GameObjects.Text).setText(`CALL $${toCall}`);
      }
  }

  async sendAction(action: string, amount: number = 0) {
      const token = localStorage.getItem('token');
      if (!token) return;
      this.actionContainer.setVisible(false);
      this.raiseContainer.setVisible(false);
      if (this.turnTimerEvent) {
          this.turnTimerEvent.remove(); // Stop timer on action
          this.turnTimerEvent = null;
          this.currentTimerSeat = null;
          this.timerGraphics.clear();
      }
      try {
          await fetch('/api/holdem/action', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ roomId: this.roomId, action, amount })
          });
      } catch (e) { console.error(e); this.actionContainer.setVisible(true); }
  }
  
  async handleStartGame() {
      const token = localStorage.getItem('token');
      if (!token) {
          alert('로그인이 필요합니다.');
          return;
      }
      
      try {
          const res = await fetch('/api/holdem/start', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ roomId: this.roomId })
          });
          
          if (res.ok) {
              // 게임 시작 성공 후 즉시 방 정보 갱신하여 UI 업데이트
              await this.fetchRoomInfo();
          } else {
              const err = await res.json();
              alert(err.error || '게임 시작에 실패했습니다.');
          }
      } catch (e) {
          console.error('게임 시작 오류:', e);
          alert('게임 시작 중 오류가 발생했습니다.');
      }
  }

  handleWinners(winners: any[]) {
      const winnerText = winners.map(w => {
          const p = this.roomData?.players.find(pl => pl.seatIndex === w.seatIndex);
          return `${p?.nickname} Wins $${w.amount} (${w.hand.rank})`;
      }).join('\n');
      this.statusText.setText(winnerText);
      this.statusText.setColor('#ffff00');
      this.statusText.setStroke('#000000', 6);
      this.statusText.setFontSize(36);
  }
  
  resetTableForNewGame() {
      this.displayedCommunityCards = 0;
      this.communityCardContainers.forEach(c => c.destroy());
      this.communityCardContainers = [];
      this.statusText.setText('');
      this.seatContainers.forEach(c => {
          (c.getAt(6) as Phaser.GameObjects.Container).removeAll(true);
      });
      this.currentTimerSeat = null;
      if (this.turnTimerEvent) this.turnTimerEvent.remove();
      this.turnTimerEvent = null;
      this.timerGraphics.clear();
  }
}
