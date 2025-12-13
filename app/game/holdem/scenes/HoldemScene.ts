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
  position: string | null; // 'dealer', 'small_blind', 'big_blind'
  holeCards?: Card[]; // Only for me or showdown
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
  private myUserId: number | null = null; // To identify 'me'
  
  // State
  private roomData: RoomData | null = null;
  private pollingTimer: Phaser.Time.TimerEvent | null = null;
  private isProcessingUpdate = false;
  private displayedCommunityCards: number = 0; // Number of cards currently shown

  // UI Objects
  private seatContainers: Map<number, Phaser.GameObjects.Container> = new Map();
  private communityCardContainers: Phaser.GameObjects.Container[] = [];
  private potText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private actionContainer!: Phaser.GameObjects.Container;
  private startButton!: Phaser.GameObjects.Container;
  
  // Game Objects
  private deckSprite!: Phaser.GameObjects.Image;
  private dealerButton!: Phaser.GameObjects.Image; // Just a circle with 'D'
  
  // Positions
  private seatPositions = [
    { x: 600, y: 650 }, // Seat 0 (Bottom Center - Usually Me if adjusted)
    { x: 200, y: 600 }, // Seat 1
    { x: 200, y: 200 }, // Seat 2
    { x: 600, y: 100 }, // Seat 3
    { x: 1000, y: 200 }, // Seat 4
    { x: 1000, y: 600 }, // Seat 5
  ];
  
  private communityCardsPos = { x: 400, y: 360, spacing: 90 };
  private deckPos = { x: 100, y: 100 };

  constructor() {
    super({ key: 'HoldemScene' });
  }

  init(data: { roomId: string }) {
    this.roomId = data.roomId;
    // Get my user ID from token
    const token = localStorage.getItem('token');
    if (token) {
        // Simple parse (in real app use a library or the existing payload)
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
    this.createTable();
    this.createUI();
    this.createActionControls();

    // Start Polling
    this.fetchRoomInfo(); // First fetch
    this.pollingTimer = this.time.addEvent({
      delay: 1000,
      callback: this.fetchRoomInfo,
      callbackScope: this,
      loop: true
    });
  }

  createTable() {
    const width = this.scale.width;
    const height = this.scale.height;

    // Green Felt Table
    const table = this.add.ellipse(width / 2, height / 2, width - 100, height - 150, 0x076324);
    table.setStrokeStyle(10, 0x3e2723); // Wood border
    
    // Pot Area
    this.add.text(width / 2, 430, 'POT', { fontSize: '16px', color: '#88ff88' }).setOrigin(0.5);
    this.potText = this.add.text(width / 2, 460, '0', { fontSize: '32px', color: '#ffd700', fontStyle: 'bold' }).setOrigin(0.5);

    // Deck Graphic
    this.deckSprite = this.add.image(this.deckPos.x, this.deckPos.y, 'card-back').setScale(0.8);
    this.deckSprite.setAngle(-15);
  }

  createUI() {
    // Status Text
    this.statusText = this.add.text(600, 400, 'Waiting...', { fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);
    
    // Start Button (initially hidden)
    this.startButton = this.createButton(600, 500, 'GAME START', 0x2e7d32, () => this.handleStartGame());
    this.startButton.setVisible(false);
  }
  
  createSeats() {
    // 6 Seats
    for (let i = 0; i < 6; i++) {
        const pos = this.seatPositions[i];
        const container = this.add.container(pos.x, pos.y);
        
        // Avatar Circle
        const avatar = this.add.circle(0, 0, 40, 0x333333).setStrokeStyle(2, 0xffffff);
        const nameText = this.add.text(0, 50, `Empty`, { fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
        const chipsText = this.add.text(0, 70, '', { fontSize: '14px', color: '#ffd700' }).setOrigin(0.5);
        const actionText = this.add.text(0, -60, '', { fontSize: '18px', color: '#00ffff', fontStyle: 'bold' }).setOrigin(0.5);
        
        // Cards container (relative to seat)
        const cardsContainer = this.add.container(0, -20);
        
        container.add([avatar, nameText, chipsText, actionText, cardsContainer]);
        this.seatContainers.set(i, container);
    }
  }

  createActionControls() {
    // Bottom Action Bar
    this.actionContainer = this.add.container(600, 720);
    
    const actions = [
        { label: 'FOLD', color: 0xb71c1c, callback: () => this.sendAction('fold') },
        { label: 'CHECK', color: 0x1565c0, callback: () => this.sendAction('check') },
        { label: 'CALL', color: 0x1565c0, callback: () => this.sendAction('call') },
        { label: 'RAISE', color: 0xff8f00, callback: () => this.handleRaiseClick() }, // Open Slider?
        { label: 'ALL IN', color: 0xd50000, callback: () => this.sendAction('allin') }
    ];

    let xOffset = -300;
    actions.forEach(action => {
        const btn = this.createButton(xOffset, 0, action.label, action.color, action.callback);
        // Tag buttons to toggle visibility
        btn.setName('btn_' + action.label.toLowerCase().replace(' ', ''));
        this.actionContainer.add(btn);
        xOffset += 150;
    });

    // Slider for Raise (Simple mock for now - Phaser sliders are complex)
    // We will just do a fixed Min Raise or 2x Pot for simplicity in MVP, 
    // or add basic slider later. For now, let's implement Raise as "Min Raise" 
    // or use HTML overlay for complex inputs?
    // Let's stick to buttons: "Raise Min", "Raise Half Pot", "Raise Pot" if needed.
    // For now, Raise button just does a default raise (min raise).
    
    this.actionContainer.setVisible(false);
  }
  
  createButton(x: number, y: number, text: string, color: number, callback: () => void): Phaser.GameObjects.Container {
      const container = this.add.container(x, y);
      const bg = this.add.rectangle(0, 0, 120, 50, color).setInteractive({ useHandCursor: true });
      const txt = this.add.text(0, 0, text, { fontSize: '18px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
      
      bg.on('pointerdown', callback);
      bg.on('pointerover', () => bg.setAlpha(0.8));
      bg.on('pointerout', () => bg.setAlpha(1));
      
      container.add([bg, txt]);
      return container;
  }

  // --- Logic ---

  async fetchRoomInfo() {
    if (this.isProcessingUpdate) return;
    try {
        const res = await fetch(`/api/holdem/room?roomId=${this.roomId}`);
        if (!res.ok) return;
        const data = await res.json();
        
        // Merge room and players structure to match RoomData interface roughly
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

    // 1. Update UI Texts
    this.potText.setText(`${newData.pot.toLocaleString()}`);
    
    // Status Text Logic
    if (newData.status === 'waiting') {
        if (newData.players.length < 2) {
            this.statusText.setText('Waiting for more players...');
        } else {
            // 2명 이상이면 버튼이 보이므로 텍스트는 숨기거나 안내 문구
            this.statusText.setText('Ready to Start!');
        }
    } else if (newData.status === 'finished') {
        // Winner logic handles text, so maybe skip or append
    } else {
        this.statusText.setText('');
    }

    // 2. Start Button Visibility
    // Show if waiting and players >= 2
    if (newData.status === 'waiting' && newData.players.length >= 2) {
        this.startButton.setVisible(true);
    } else {
        this.startButton.setVisible(false);
    }

    // 3. Update Seats (Players)
    this.updateSeats(newData.players, newData.gameState.currentTurnSeat);

    // 4. Community Cards Animation
    if (newData.communityCards.length > this.displayedCommunityCards) {
        this.dealCommunityCards(newData.communityCards, this.displayedCommunityCards);
        this.displayedCommunityCards = newData.communityCards.length;
    }
    
    // 5. My Action Controls
    const myPlayer = newData.players.find(p => p.userId === this.myUserId);
    const isMyTurn = myPlayer && newData.gameState.currentTurnSeat === myPlayer.seatIndex && newData.status === 'playing';
    
    if (isMyTurn) {
        this.actionContainer.setVisible(true);
        this.updateActionButtons(myPlayer!, newData);
    } else {
        this.actionContainer.setVisible(false);
    }
    
    // 6. Check for Showdown / Winners
    if (newData.gameState.winners && (!oldData?.gameState.winners || oldData.gameState.winners.length === 0)) {
        this.handleWinners(newData.gameState.winners);
    }
    
    // 7. Reset if new game started (detect status change finished -> playing or waiting -> playing)
    if (oldData && oldData.status !== 'playing' && newData.status === 'playing') {
        this.resetTableForNewGame();
    }

    this.isProcessingUpdate = false;
  }
  
  updateSeats(players: Player[], currentTurnSeat: number | null) {
      // Clear empty seats
      this.seatContainers.forEach(c => {
          const nameTxt = c.getAt(1) as Phaser.GameObjects.Text;
          nameTxt.setText('Empty');
          (c.getAt(2) as Phaser.GameObjects.Text).setText(''); // Chips
          (c.getAt(3) as Phaser.GameObjects.Text).setText(''); // Action
          (c.getAt(4) as Phaser.GameObjects.Container).removeAll(true); // Cards
          (c.getAt(0) as Phaser.GameObjects.Shape).setStrokeStyle(2, 0xffffff); // Reset Border
      });

      players.forEach(p => {
          const container = this.seatContainers.get(p.seatIndex);
          if (!container) return;

          const avatar = container.getAt(0) as Phaser.GameObjects.Shape;
          const nameTxt = container.getAt(1) as Phaser.GameObjects.Text;
          const chipsTxt = container.getAt(2) as Phaser.GameObjects.Text;
          const actionTxt = container.getAt(3) as Phaser.GameObjects.Text;
          const cardsContainer = container.getAt(4) as Phaser.GameObjects.Container;
          
          nameTxt.setText(p.nickname);
          chipsTxt.setText(`$${p.chips}\nBet: ${p.currentBet}`);
          
          // Highlight active turn
          if (currentTurnSeat === p.seatIndex) {
              avatar.setStrokeStyle(4, 0x00ff00);
          } else {
              avatar.setStrokeStyle(2, 0xffffff);
          }
          
          // Show Fold/AllIn status
          if (!p.isActive) actionTxt.setText('FOLD');
          else if (p.isAllIn) actionTxt.setText('ALL IN');
          else actionTxt.setText('');

          // Draw Cards
          // Logic: Draw back of cards for others, front for me (or everyone if showdown)
          if (cardsContainer.list.length === 0 && p.isActive && this.roomData?.status !== 'waiting') {
               // Only draw if we haven't already (simple check)
               // For me:
               if (p.userId === this.myUserId && p.holeCards) {
                   this.drawHoleCards(cardsContainer, p.holeCards);
               } else {
                   // For others: Back
                   this.drawBackCards(cardsContainer);
               }
          }
          
          // Reveal cards at showdown
          if (this.roomData?.currentRound === 'showdown' && p.isActive && p.holeCards) {
              cardsContainer.removeAll(true);
              this.drawHoleCards(cardsContainer, p.holeCards);
          }
      });
  }
  
  drawHoleCards(container: Phaser.GameObjects.Container, cards: Card[]) {
      cards.forEach((card, idx) => {
          const key = `card-${card.suit}-${card.rank}`;
          // Correct key format check: LoadingScene used 'card-hearts-A'
          // API returns rank: 'A', suit: 'hearts'
          const img = this.scene.scene.add.image(idx * 30 - 15, 0, key).setDisplaySize(60, 90);
          container.add(img);
      });
  }
  
  drawBackCards(container: Phaser.GameObjects.Container) {
      // 2 cards back
      const c1 = this.scene.scene.add.image(-15, 0, 'card-back').setDisplaySize(60, 90);
      const c2 = this.scene.scene.add.image(15, 0, 'card-back').setDisplaySize(60, 90);
      container.add([c1, c2]);
  }
  
  dealCommunityCards(cards: Card[], startIndex: number) {
      // Animate dealing cards from deck to center
      for (let i = startIndex; i < cards.length; i++) {
          const card = cards[i];
          const targetX = this.communityCardsPos.x + i * this.communityCardsPos.spacing;
          const targetY = this.communityCardsPos.y;
          
          // Create card back at deck pos
          const cardObj = this.add.image(this.deckPos.x, this.deckPos.y, 'card-back').setDisplaySize(80, 120);
          this.communityCardContainers.push(cardObj as any); // Track them
          
          this.tweens.add({
              targets: cardObj,
              x: targetX,
              y: targetY,
              angle: 360,
              duration: 500,
              ease: 'Power2',
              onComplete: () => {
                  // Flip
                  this.tweens.add({
                      targets: cardObj,
                      scaleX: 0,
                      duration: 150,
                      onComplete: () => {
                          cardObj.setTexture(`card-${card.suit}-${card.rank}`);
                          this.tweens.add({
                              targets: cardObj,
                              scaleX: 0.8, // Original scale setDisplaySize logic might need adjustment if using scale
                              // Re-apply display size or scale
                              onStart: () => cardObj.setDisplaySize(80, 120),
                              duration: 150
                          });
                      }
                  });
              }
          });
      }
  }
  
  updateActionButtons(me: Player, room: RoomData) {
      // Determine valid actions
      // Check vs Call
      const highestBet = Math.max(...room.players.map(p => p.currentBet));
      const toCall = highestBet - me.currentBet;
      
      const btnCheck = this.actionContainer.getByName('btn_check') as Phaser.GameObjects.Container;
      const btnCall = this.actionContainer.getByName('btn_call') as Phaser.GameObjects.Container;
      const btnRaise = this.actionContainer.getByName('btn_raise') as Phaser.GameObjects.Container;
      
      if (toCall === 0) {
          btnCheck.setVisible(true);
          btnCall.setVisible(false);
      } else {
          btnCheck.setVisible(false);
          btnCall.setVisible(true);
          // Update Call Text to "Call $X"
          const callTxt = btnCall.getAt(1) as Phaser.GameObjects.Text;
          callTxt.setText(`CALL $${toCall}`);
      }
      
      // Raise Logic (Simple)
      const minRaise = room.gameState.minBet > 0 ? room.gameState.minBet : room.players[0]?.currentBet || 0; // rough logic
      // Ideally get minRaise from server or calc properly
  }

  async sendAction(action: string, amount: number = 0) {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      this.actionContainer.setVisible(false); // Hide immediately to prevent double click
      
      try {
          await fetch('/api/holdem/action', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                  roomId: this.roomId,
                  action,
                  amount
              })
          });
          // State will update via polling
      } catch (e) {
          console.error(e);
          this.actionContainer.setVisible(true);
      }
  }
  
  handleRaiseClick() {
      // For MVP, just raise minBet or 2x BB. 
      // Let's implement a simple prompt or fixed raise for now.
      // Ideally we need the Slider here.
      // Let's assume user wants to raise Min Raise amount.
      // To implement correctly, we need to know the min raise amount.
      // roomData.gameState.minBet + highestBet
      
      if (!this.roomData) return;
      const highestBet = Math.max(...this.roomData.players.map(p => p.currentBet));
      const minRaise = this.roomData.gameState.minBet || this.roomData.players.find(p => p.position === 'big_blind')?.currentBet || 20; // fallback
      
      const raiseTo = highestBet + minRaise; 
      
      // Send raise amount (Total bet amount? No, backend expects 'amount' as the Raise increment or Total? 
      // Checking game-logic.ts: 
      // if action === 'raise', amount is deducted from chips. currentBet += amount.
      // So 'amount' is the ADDITIONAL chips to put in.
      // Wait, 'raise' logic in game-logic.ts:
      // if (amount < toCall + minBet) ...
      // playerChips -= amount; currentBet += amount;
      // It implies 'amount' is the TOTAL chips I'm putting in THIS TURN (Call + Raise).
      // Let's verify: 
      //  toCall = highest - current.
      //  amount must be >= toCall + minBet.
      
      const toCall = highestBet - (this.roomData.players.find(p => p.userId === this.myUserId)?.currentBet || 0);
      const amountToPutIn = toCall + minRaise;
      
      this.sendAction('raise', amountToPutIn);
  }

  async handleStartGame() {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      try {
          await fetch('/api/holdem/start', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ roomId: this.roomId })
          });
      } catch (e) {
          console.error(e);
      }
  }

  handleWinners(winners: any[]) {
      const winnerText = winners.map(w => {
          const p = this.roomData?.players.find(pl => pl.seatIndex === w.seatIndex);
          return `${p?.nickname} Wins $${w.amount} with ${w.hand.rank}`;
      }).join('\n');
      
      this.statusText.setText(winnerText);
      this.statusText.setColor('#ffff00');
      this.statusText.setFontSize(32);
      
      // Animation: Pot to Winner
      // ...
  }
  
  resetTableForNewGame() {
      this.displayedCommunityCards = 0;
      this.communityCardContainers.forEach(c => c.destroy());
      this.communityCardContainers = [];
      
      // Clear all cards from seats
      this.seatContainers.forEach(c => {
          (c.getAt(4) as Phaser.GameObjects.Container).removeAll(true);
      });
      
      this.statusText.setText('');
  }
}
