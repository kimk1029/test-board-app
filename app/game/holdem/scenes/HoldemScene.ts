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

// --- Scene ---
export class HoldemScene extends Phaser.Scene {
  private roomId!: string;
  private myUserId: number | null = null;
  
  // State
  private roomData: RoomData | null = null;
  private pollingTimer: Phaser.Time.TimerEvent | null = null;
  private isProcessingUpdate = false;
  private displayedCommunityCards: number = 0;
  private isPortrait: boolean = false;

  // UI Objects
  private tableGraphics!: Phaser.GameObjects.Graphics;
  private seatContainers: Map<number, Phaser.GameObjects.Container> = new Map();
  private sitButtons: Phaser.GameObjects.Container[] = []; // Changed to Container for better hit area
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

  create() {
    // Reset state
    this.seatContainers = new Map();
    this.sitButtons = [];
    this.communityCardContainers = [];
    this.displayedCommunityCards = 0;

    // Initial Layout Check
    this.checkOrientation();

    // Create Layers
    this.createTable();
    this.createUI();
    this.createSeats();
    this.createActionControls();
    this.createRaiseUI();

    // Resize Handler
    this.scale.on('resize', this.handleResize, this);

    // Initial positioning
    this.updateLayout();

    // Start Polling
    this.fetchRoomInfo();
    this.pollingTimer = this.time.addEvent({
      delay: 1000,
      callback: this.fetchRoomInfo,
      callbackScope: this,
      loop: true
    });
  }

  checkOrientation() {
    const { width, height } = this.scale;
    this.isPortrait = height > width;
  }

  handleResize(gameSize: Phaser.Structs.Size) {
    this.checkOrientation();
    this.createTable(); // Re-draw table
    this.updateLayout(); // Re-position elements
  }

  createTable() {
    if (this.tableGraphics) this.tableGraphics.destroy();
    this.tableGraphics = this.add.graphics();
    // Drawn in updateLayout based on size
  }

  createUI() {
    // Pot Text
    this.potText = this.add.text(0, 0, 'POT: 0', { 
        fontSize: '28px', 
        color: '#ffd700', 
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4
    }).setOrigin(0.5).setDepth(10);

    // Status Text
    this.statusText = this.add.text(0, 0, '', { 
        fontSize: '24px', 
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
        align: 'center'
    }).setOrigin(0.5).setDepth(20);
    
    // Start Button
    this.startButton = this.createButton(0, 0, 'GAME START', 0x2e7d32, () => this.handleStartGame());
    this.startButton.setVisible(false).setDepth(30);

    // Deck Graphic
    this.deckSprite = this.add.image(0, 0, 'card-back').setScale(0.6).setDepth(5);
  }
  
  createSeats() {
    for (let i = 0; i < 6; i++) {
        const container = this.add.container(0, 0).setDepth(5);
        
        // Avatar Background (Circle)
        const avatarBg = this.add.circle(0, 0, 42, 0x222222).setStrokeStyle(3, 0xaaaaaa);
        
        // Avatar Image (Masked)
        const avatarImg = this.add.image(0, 0, 'avatar-placeholder').setDisplaySize(80, 80);
        const maskShape = this.make.graphics();
        maskShape.fillCircle(0, 0, 40);
        const mask = maskShape.createGeometryMask();
        avatarImg.setMask(mask);
        
        // Info Box (Rectangle below)
        const infoBg = this.add.rectangle(0, 60, 120, 50, 0x000000, 0.7).setStrokeStyle(1, 0x444444);
        const nameText = this.add.text(0, 45, 'Empty', { fontSize: '14px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
        const chipsText = this.add.text(0, 65, '', { fontSize: '12px', color: '#ffd700' }).setOrigin(0.5);
        
        // Action Text (on top of avatar)
        const actionText = this.add.text(0, -60, '', { 
            fontSize: '18px', 
            color: '#00ffff', 
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        
        // Hole Cards Container
        const cardsContainer = this.add.container(0, 0); // Positioned relative to seat later
        
        container.add([avatarBg, avatarImg, infoBg, nameText, chipsText, actionText, cardsContainer]);
        this.seatContainers.set(i, container);

        // Sit Button (Green Box)
        const sitContainer = this.add.container(0, 0).setDepth(6).setVisible(false);
        const sitBg = this.add.rectangle(0, 0, 100, 40, 0x2e7d32)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0xffffff);
        const sitTxt = this.add.text(0, 0, 'SIT', { fontSize: '20px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
        
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

    const btnWidth = 100;
    const spacing = 10;
    const totalWidth = actions.length * btnWidth + (actions.length - 1) * spacing;
    let currentX = -totalWidth / 2 + btnWidth / 2;

    actions.forEach(action => {
        const btn = this.createButton(currentX, 0, action.label, action.color, action.callback, btnWidth, 50);
        btn.setName('btn_' + action.label.toLowerCase().replace(' ', ''));
        this.actionContainer.add(btn);
        currentX += btnWidth + spacing;
    });
  }

  createRaiseUI() {
      this.raiseContainer = this.add.container(0, 0).setDepth(60).setVisible(false);
      
      // Background
      const bg = this.add.rectangle(0, -100, 300, 150, 0x000000, 0.9).setStrokeStyle(2, 0xff8f00);
      
      // Slider Line
      const sliderLine = this.add.rectangle(0, -100, 200, 4, 0x888888);
      
      // Slider Handle
      this.raiseHandle = this.add.circle(-100, -100, 12, 0xff8f00)
          .setInteractive({ useHandCursor: true, draggable: true });
          
      // Text
      this.raiseAmountText = this.add.text(0, -150, 'Raise: 0', { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);
      
      // Confirm Button
      const confirmBtn = this.createButton(0, -50, 'CONFIRM', 0xff8f00, () => this.confirmRaise(), 120, 40);
      
      // Cancel Button (X)
      const closeBtn = this.add.text(130, -165, 'X', { fontSize: '20px', color: '#ff0000', fontStyle: 'bold' })
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => this.raiseContainer.setVisible(false));

      this.raiseContainer.add([bg, sliderLine, this.raiseHandle, this.raiseAmountText, confirmBtn, closeBtn]);
      
      // Drag Logic
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
          .setStrokeStyle(2, 0xffffff); // White border
      
      // Gradient effect (simple alpha overlay)
      const gloss = this.add.rectangle(0, -h/4, w, h/2, 0xffffff, 0.2);

      const txt = this.add.text(0, 0, text, { 
          fontSize: '18px', 
          color: '#fff', 
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 2
      }).setOrigin(0.5);
      
      bg.on('pointerdown', callback);
      bg.on('pointerover', () => bg.setAlpha(0.8));
      bg.on('pointerout', () => bg.setAlpha(1));
      
      container.add([bg, gloss, txt]);
      return container;
  }

  // --- Layout Logic ---

  updateLayout() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    // Draw Table (Darker Green Felt + Wood Border)
    this.tableGraphics.clear();
    
    // Wood Border
    this.tableGraphics.fillStyle(0x4e342e); // Dark Wood
    const borderThickness = 15;
    if (this.isPortrait) {
        this.tableGraphics.fillEllipse(cx, cy, width * 0.9, height * 0.65);
    } else {
        this.tableGraphics.fillEllipse(cx, cy, width * 0.85, height * 0.7);
    }

    // Green Felt
    this.tableGraphics.fillStyle(0x35654d); // Classic Poker Green
    if (this.isPortrait) {
        this.tableGraphics.fillEllipse(cx, cy, width * 0.9 - borderThickness, height * 0.65 - borderThickness);
    } else {
        this.tableGraphics.fillEllipse(cx, cy, width * 0.85 - borderThickness, height * 0.7 - borderThickness);
    }

    // UI Positions
    this.potText.setPosition(cx, cy - 40); // Slightly above center
    this.deckSprite.setPosition(cx - 150, cy); // Left of center
    
    // Status text (Moved up to avoid card overlap)
    this.statusText.setPosition(cx, cy + 100); 
    this.startButton.setPosition(cx, cy + 150);

    // Seat Positions (Dynamic)
    const seats = this.getSeatPositions(width, height, this.isPortrait);
    this.seatContainers.forEach((container, i) => {
        container.setPosition(seats[i].x, seats[i].y);
        this.sitButtons[i].setPosition(seats[i].x, seats[i].y);
    });

    // Action Bar (Bottom Center)
    this.actionContainer.setPosition(cx, height - 60);
    
    // Raise UI (Center)
    this.raiseContainer.setPosition(cx, cy);

    // Community Cards Position (Center)
    // this.communityCardsPos = { x: cx - 140, y: cy, spacing: 70 }; // Adjusted spacing and center
    const communityCardsPos = { x: cx - 140, y: cy, spacing: 70 };
    
    // Re-position existing cards if any
    this.communityCardContainers.forEach((container, i) => {
        container.setPosition(communityCardsPos.x + i * communityCardsPos.spacing, communityCardsPos.y);
    });
  }

  getSeatPositions(w: number, h: number, isPortrait: boolean) {
      const cx = w / 2;
      const cy = h / 2;
      
      if (isPortrait) {
          // Vertical Layout (6 seats)
          // 0: Bottom Center (Me), 1: Bottom Right, 2: Top Right, 3: Top Center, 4: Top Left, 5: Bottom Left
          const radiusX = w * 0.4;
          const radiusY = h * 0.3;
          return [
              { x: cx, y: cy + radiusY + 50 },       // Seat 0 (Me)
              { x: cx + radiusX, y: cy + radiusY/2 },// Seat 1
              { x: cx + radiusX, y: cy - radiusY/2 },// Seat 2
              { x: cx, y: cy - radiusY - 50 },       // Seat 3
              { x: cx - radiusX, y: cy - radiusY/2 },// Seat 4
              { x: cx - radiusX, y: cy + radiusY/2 },// Seat 5
          ];
      } else {
          // Landscape Layout
          const radiusX = w * 0.38;
          const radiusY = h * 0.32;
          return [
              { x: cx, y: cy + radiusY + 40 },        // Seat 0 (Me)
              { x: cx - radiusX * 0.6, y: cy + radiusY + 20 }, // Seat 1 (Left of me) -- adjusting order visually
              // Re-mapping for standard clockwise order starting from bottom center
              // Let's stick to standard 0-5 indices. visual positions:
              // 0: Bottom Center
              // 1: Bottom Left (or Right?) -> Left usually acts first after BB?
              // Let's do standard circle clockwise
              // 0: Bottom
              // 1: Bottom Left
              // 2: Top Left
              // 3: Top
              // 4: Top Right
              // 5: Bottom Right
              
              // Correct logic:
              // Seat 0 (Me): Bottom Center
              // Seat 1: Bottom Left
              // Seat 2: Top Left
              // Seat 3: Top Center
              // Seat 4: Top Right
              // Seat 5: Bottom Right
              
              { x: cx, y: cy + radiusY + 60 },        // 0
              { x: cx - radiusX, y: cy + 50 },        // 1
              { x: cx - radiusX, y: cy - 100 },       // 2
              { x: cx, y: cy - radiusY - 60 },        // 3
              { x: cx + radiusX, y: cy - 100 },       // 4
              { x: cx + radiusX, y: cy + 50 },        // 5
          ];
      }
  }

  // --- Game Logic ---

  async fetchRoomInfo() {
    if (this.isProcessingUpdate) return;
    try {
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

    // UI Text
    this.potText.setText(`POT: ${newData.pot.toLocaleString()}`);
    
    const amISeated = newData.players.some(p => p.userId === this.myUserId);
    const playerCount = newData.players.length;

    // Status Message
    if (newData.status === 'waiting') {
        if (playerCount < 2) {
            this.statusText.setText(amISeated 
                ? `Waiting for more players... (${playerCount}/2)` 
                : 'Click a "SIT" button to join');
        } else {
            this.statusText.setText('Ready to Start!');
        }
    } else if (newData.status === 'finished') {
        // Handled by handleWinners
    } else {
        this.statusText.setText('');
    }

    // Start Button
    if (newData.status === 'waiting' && playerCount >= 2 && amISeated) {
        this.startButton.setVisible(true);
    } else {
        this.startButton.setVisible(false);
    }

    // Seats & Buttons
    this.updateSeats(newData.players, newData.gameState.currentTurnSeat);
    if (!amISeated) {
        this.enableSeatInteraction(newData.players);
    } else {
        this.disableSeatInteraction();
    }

    // Community Cards
    if (newData.communityCards.length > this.displayedCommunityCards) {
        this.dealCommunityCards(newData.communityCards, this.displayedCommunityCards);
        this.displayedCommunityCards = newData.communityCards.length;
    }
    
    // My Action
    const myPlayer = newData.players.find(p => p.userId === this.myUserId);
    const isMyTurn = myPlayer && newData.gameState.currentTurnSeat === myPlayer.seatIndex && newData.status === 'playing';
    
    if (isMyTurn) {
        this.actionContainer.setVisible(true);
        this.updateActionButtons(myPlayer!, newData);
    } else {
        this.actionContainer.setVisible(false);
        this.raiseContainer.setVisible(false); // Hide raise UI if not my turn
    }
    
    // Winners
    if (newData.gameState.winners && (!oldData?.gameState.winners || oldData.gameState.winners.length === 0)) {
        this.handleWinners(newData.gameState.winners);
    }
    
    // Reset
    if (oldData && oldData.status !== 'playing' && newData.status === 'playing') {
        this.resetTableForNewGame();
    }

    this.isProcessingUpdate = false;
  }
  
  updateSeats(players: Player[], currentTurnSeat: number | null) {
      // Clear empty
      this.seatContainers.forEach(c => {
          // Reset Text
          (c.getAt(3) as Phaser.GameObjects.Text).setText('Empty');
          (c.getAt(4) as Phaser.GameObjects.Text).setText('');
          (c.getAt(5) as Phaser.GameObjects.Text).setText('');
          (c.getAt(6) as Phaser.GameObjects.Container).removeAll(true);
          // Reset Border
          (c.getAt(0) as Phaser.GameObjects.Shape).setStrokeStyle(3, 0xaaaaaa);
      });

      players.forEach(p => {
          const container = this.seatContainers.get(p.seatIndex);
          if (!container) return;

          // Indexes based on createSeats order: 
          // 0:AvatarBg, 1:AvatarImg, 2:InfoBg, 3:Name, 4:Chips, 5:Action, 6:Cards
          const avatarBg = container.getAt(0) as Phaser.GameObjects.Shape;
          const nameTxt = container.getAt(3) as Phaser.GameObjects.Text;
          const chipsTxt = container.getAt(4) as Phaser.GameObjects.Text;
          const actionTxt = container.getAt(5) as Phaser.GameObjects.Text;
          const cardsContainer = container.getAt(6) as Phaser.GameObjects.Container;
          
          nameTxt.setText(p.nickname);
          chipsTxt.setText(`$${p.chips}\nBet: ${p.currentBet}`);
          
          // Turn Highlight
          if (currentTurnSeat === p.seatIndex) {
              avatarBg.setStrokeStyle(4, 0x00ff00);
          } else {
              avatarBg.setStrokeStyle(3, 0xaaaaaa);
          }
          
          // Status
          if (!p.isActive) actionTxt.setText('FOLD').setColor('#aaaaaa');
          else if (p.isAllIn) actionTxt.setText('ALL IN').setColor('#ff0000');
          else actionTxt.setText('');

          // Cards
          if (cardsContainer.list.length === 0 && p.isActive && this.roomData?.status !== 'waiting') {
               if (p.userId === this.myUserId && p.holeCards) {
                   this.drawHoleCards(cardsContainer, p.holeCards);
               } else {
                   this.drawBackCards(cardsContainer);
               }
          }
          
          if (this.roomData?.currentRound === 'showdown' && p.isActive && p.holeCards) {
              cardsContainer.removeAll(true);
              this.drawHoleCards(cardsContainer, p.holeCards);
          }
      });
  }

  enableSeatInteraction(players: Player[]) {
      const occupiedSeats = players.map(p => p.seatIndex);
      this.sitButtons.forEach((btn, index) => {
          if (!occupiedSeats.includes(index)) {
              btn.setVisible(true);
              // Hide Avatar/Info for cleaner look
              const container = this.seatContainers.get(index);
              if (container) {
                  // container.setVisible(false); // Can't hide whole container, sitBtn is separate? No, separate array but visually separate?
                  // In createSeats I didn't add sitBtn to seatContainer? 
                  // I added: this.add.existing(sitContainer); this.sitButtons[i] = sitContainer;
                  // They are independent.
                  // I should hide the seatContainer content or dim it.
                  container?.setAlpha(0.3);
              }
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
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ roomId: this.roomId, seatIndex, buyIn: 1000 })
          });
          
          if (res.ok) {
              this.disableSeatInteraction();
          } else {
              const err = await res.json();
              alert(err.error || 'Failed to join');
          }
      } catch (e) { console.error(e); }
  }
  
  // --- Raise UI Logic ---
  toggleRaiseUI() {
      if (!this.roomData) return;
      const me = this.roomData.players.find(p => p.userId === this.myUserId);
      if (!me) return;

      const highestBet = Math.max(...this.roomData.players.map(p => p.currentBet));
      const minRaise = this.roomData.gameState.minBet || 20; 
      
      // Min raise amount (total bet)
      const minTotal = highestBet + minRaise;
      const maxTotal = me.chips + me.currentBet; // All I have

      if (minTotal > maxTotal) {
          // Can only all-in?
          // alert('Not enough chips to raise');
          this.sendAction('allin');
          return;
      }

      this.raiseContainer.setVisible(true);
      // Reset Slider
      this.raiseHandle.x = -100;
      this.updateRaiseAmount(-100);
  }

  updateRaiseAmount(sliderX: number) {
      // Map x from -100...100 to min...max
      if (!this.roomData) return;
      const me = this.roomData.players.find(p => p.userId === this.myUserId)!;
      const highestBet = Math.max(...this.roomData.players.map(p => p.currentBet));
      const minRaise = this.roomData.gameState.minBet || 20;
      
      const minVal = highestBet + minRaise;
      const maxVal = me.chips + me.currentBet;

      // Normalize x: 0 to 1
      const ratio = (sliderX + 100) / 200;
      const val = Math.floor(minVal + ratio * (maxVal - minVal));
      
      this.raiseValue = val;
      
      // Calculate "Additional" amount to put in
      const additional = val - me.currentBet;
      this.raiseAmountText.setText(`Total Bet: $${val}\n(Add: $${additional})`);
  }

  confirmRaise() {
      // Send raise action
      // Backend expects 'amount' as the amount to DEDUCT from chips?
      // game-logic.ts:
      // if action === 'raise'
      // playerChips -= amount; currentBet += amount;
      // So 'amount' is the ADDITIONAL chips to put in.
      
      if (!this.roomData) return;
      const me = this.roomData.players.find(p => p.userId === this.myUserId)!;
      const additional = this.raiseValue - me.currentBet;
      
      this.sendAction('raise', additional);
      this.raiseContainer.setVisible(false);
  }

  // --- Cards ---

  drawHoleCards(container: Phaser.GameObjects.Container, cards: Card[]) {
      // Small Cards relative to seat
      cards.forEach((card, idx) => {
          const key = `card-${card.suit}-${card.rank}`;
          // Size: ~40x56
          const img = this.scene.scene.add.image(idx * 25 - 12, -40, key).setScale(0.2); 
          container.add(img);
      });
  }
  
  drawBackCards(container: Phaser.GameObjects.Container) {
      const c1 = this.scene.scene.add.image(-12, -40, 'card-back').setScale(0.2);
      const c2 = this.scene.scene.add.image(12, -40, 'card-back').setScale(0.2);
      container.add([c1, c2]);
  }
  
  dealCommunityCards(cards: Card[], startIndex: number) {
      for (let i = startIndex; i < cards.length; i++) {
          const card = cards[i];
          const targetX = (this.scale.width / 2 - 140) + i * 70;
          const targetY = this.scale.height / 2;
          
          const cardObj = this.add.image(this.deckPos.x, this.deckPos.y, 'card-back').setScale(0.3); // ~67x94
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
                              scaleX: 0.3, // Restore scale
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
      if (!token) return;
      await fetch('/api/holdem/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ roomId: this.roomId })
      });
  }

  handleWinners(winners: any[]) {
      const winnerText = winners.map(w => {
          const p = this.roomData?.players.find(pl => pl.seatIndex === w.seatIndex);
          return `${p?.nickname} Wins $${w.amount} (${w.hand.rank})`;
      }).join('\n');
      
      // Display slightly below pot text
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
  }
}
