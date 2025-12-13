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
  private isDealing: boolean = false;

  // UI Objects
  private tableShape!: Phaser.GameObjects.Ellipse;
  private seatContainers: Map<number, Phaser.GameObjects.Container> = new Map();
  private sitButtons: Phaser.GameObjects.Container[] = [];
  private communityCardContainers: Phaser.GameObjects.Container[] = [];
  private potText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  
  // Action Controls
  private actionContainer!: Phaser.GameObjects.Container;
  private raisePopup!: Phaser.GameObjects.Container;
  private raiseSliderBar!: Phaser.GameObjects.Rectangle;
  private raiseSliderHandle!: Phaser.GameObjects.Arc;
  private raiseAmountText!: Phaser.GameObjects.Text;
  private startButton!: Phaser.GameObjects.Container;
  
  // Game Objects
  private deckSprite!: Phaser.GameObjects.Image;
  
  // Layout State
  private isPortrait: boolean = false;
  private selectedRaiseAmount: number = 0;

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
    this.seatContainers = new Map();
    this.sitButtons = [];
    this.communityCardContainers = [];
    this.isDealing = false;

    // Setup Resizing
    this.scale.on('resize', this.handleResize, this);
    this.isPortrait = this.scale.height > this.scale.width;

    this.createTable();
    this.createUI();
    this.createSeats();
    this.createActionControls();
    this.createRaisePopup();

    // Initial Layout
    this.handleResize({ width: this.scale.width, height: this.scale.height });

    this.fetchRoomInfo();
    this.pollingTimer = this.time.addEvent({
      delay: 1000,
      callback: this.fetchRoomInfo,
      callbackScope: this,
      loop: true
    });
  }

  handleResize(gameSize: { width: number, height: number }) {
    const width = gameSize.width;
    const height = gameSize.height;
    this.isPortrait = height > width;

    // 1. Table
    this.tableShape.setPosition(width / 2, height / 2);
    if (this.isPortrait) {
        this.tableShape.setSize(width * 0.9, height * 0.6);
        this.tableShape.setAngle(90);
    } else {
        this.tableShape.setSize(width * 0.8, height * 0.7);
        this.tableShape.setAngle(0);
    }

    // 2. Center UI
    const centerY = height / 2;
    const centerX = width / 2;
    
    this.statusText.setPosition(centerX, centerY - (this.isPortrait ? 150 : 120));
    this.potText.setPosition(centerX, centerY + (this.isPortrait ? 80 : 100));
    
    // Community Cards Area
    const cardSpacing = 70;
    const startX = centerX - (cardSpacing * 2);
    const cardY = centerY;
    
    this.communityCardContainers.forEach((card, index) => {
        card.setPosition(startX + index * cardSpacing, cardY);
    });

    this.deckSprite.setPosition(centerX - 200, centerY);

    // 3. Seats Layout
    const seatRadiusX = this.isPortrait ? width * 0.4 : width * 0.35;
    const seatRadiusY = this.isPortrait ? height * 0.35 : height * 0.3;
    const anglePerSeat = (Math.PI * 2) / 6;
    
    for (let i = 0; i < 6; i++) {
        let angle = i * anglePerSeat + (Math.PI / 2);
        
        const seatX = centerX + Math.cos(angle) * seatRadiusX;
        const seatY = centerY + Math.sin(angle) * seatRadiusY;
        
        const container = this.seatContainers.get(i);
        if (container) {
            container.setPosition(seatX, seatY);
        }
        
        if (this.sitButtons[i]) {
            this.sitButtons[i].setPosition(seatX, seatY);
        }
    }

    // 4. Controls
    this.actionContainer.setPosition(centerX, height - 80);
    this.raisePopup.setPosition(centerX, height - 200);
    this.startButton.setPosition(centerX, centerY + 150);
  }

  createTable() {
    this.tableShape = this.add.ellipse(0, 0, 100, 100, 0x0a3d1d);
    this.tableShape.setStrokeStyle(15, 0x3e2723);
    
    this.add.text(0, 0, 'POT', { fontSize: '14px', color: '#8fbc8f' }).setOrigin(0.5).setName('potLabel');
    this.potText = this.add.text(0, 0, '0', { fontSize: '32px', color: '#ffd700', fontStyle: 'bold' }).setOrigin(0.5).setShadow(2, 2, '#000', 2, true, true);

    this.deckSprite = this.add.image(0, 0, 'card-back').setScale(0.6).setAngle(-15);
  }

  createUI() {
    this.statusText = this.add.text(0, 0, '', { 
        fontSize: '28px', 
        color: '#ffffff', 
        fontStyle: 'bold',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 4
    }).setOrigin(0.5);
    
    this.startButton = this.add.container(0, 0);
    const bg = this.add.rectangle(0, 0, 200, 60, 0x2e7d32)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(2, 0xffffff);
    const txt = this.add.text(0, 0, 'GAME START', { fontSize: '24px', fontStyle: 'bold' }).setOrigin(0.5);
    this.startButton.add([bg, txt]);
    this.startButton.setVisible(false);
    
    bg.on('pointerdown', () => this.handleStartGame());
    bg.on('pointerover', () => bg.setFillStyle(0x388e3c));
    bg.on('pointerout', () => bg.setFillStyle(0x2e7d32));
  }
  
  createSeats() {
    for (let i = 0; i < 6; i++) {
        const container = this.add.container(0, 0);
        
        const seatBg = this.add.circle(0, 0, 50, 0x222222).setStrokeStyle(3, 0x555555);
        const avatarCircle = this.add.circle(0, 0, 46, 0x444444);
        const avatarText = this.add.text(0, 0, '?', { fontSize: '24px', color: '#aaa' }).setOrigin(0.5);
        
        const infoBg = this.add.rectangle(0, 65, 120, 50, 0x000000, 0.7).setStrokeStyle(1, 0x444444);
        const nameText = this.add.text(0, 55, 'Empty', { fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);
        const chipsText = this.add.text(0, 75, '', { fontSize: '12px', color: '#ffd700' }).setOrigin(0.5);
        
        const actionText = this.add.text(0, -65, '', { 
            fontSize: '18px', 
            color: '#00ffff', 
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5);
        
        const cardsContainer = this.add.container(0, -20);
        
        container.add([seatBg, avatarCircle, avatarText, infoBg, nameText, chipsText, actionText, cardsContainer]);
        this.seatContainers.set(i, container);

        const sitContainer = this.add.container(0, 0);
        const sitBg = this.add.circle(0, 0, 40, 0x2e7d32)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0xffffff);
        const sitTxt = this.add.text(0, 0, 'SIT', { fontSize: '20px', fontStyle: 'bold' }).setOrigin(0.5);
        
        this.tweens.add({
            targets: sitBg,
            scale: 1.1,
            duration: 800,
            yoyo: true,
            repeat: -1
        });

        sitContainer.add([sitBg, sitTxt]);
        sitContainer.setVisible(false);
        this.sitButtons[i] = sitContainer;

        sitBg.on('pointerdown', () => this.handleSit(i));
    }
  }

  createActionControls() {
    this.actionContainer = this.add.container(0, 0);
    
    const barBg = this.add.rectangle(0, 0, 500, 70, 0x000000, 0.8).setStrokeStyle(1, 0x666666);
    this.actionContainer.add(barBg);

    const actions = [
        { label: 'FOLD', color: 0xb71c1c, callback: () => this.sendAction('fold') },
        { label: 'CHECK', color: 0x1565c0, callback: () => this.sendAction('check') },
        { label: 'CALL', color: 0x1565c0, callback: () => this.sendAction('call') },
        { label: 'RAISE', color: 0xff8f00, callback: () => this.showRaisePopup() },
        { label: 'ALL IN', color: 0xd50000, callback: () => this.sendAction('allin') }
    ];

    const btnWidth = 90;
    const spacing = 10;
    const startX = -((actions.length * btnWidth) + ((actions.length - 1) * spacing)) / 2 + (btnWidth / 2);

    actions.forEach((action, idx) => {
        const x = startX + idx * (btnWidth + spacing);
        const btn = this.createButton(x, 0, action.label, action.color, action.callback, btnWidth, 40);
        btn.setName('btn_' + action.label.toLowerCase().replace(' ', ''));
        this.actionContainer.add(btn);
    });

    this.actionContainer.setVisible(false);
  }

  createRaisePopup() {
      this.raisePopup = this.add.container(0, 0);
      const bg = this.add.rectangle(0, 0, 300, 150, 0x111111, 0.95).setStrokeStyle(2, 0xff8f00);
      
      this.raiseAmountText = this.add.text(0, -40, 'Raise: $0', { fontSize: '24px', color: '#ffd700' }).setOrigin(0.5);
      
      const trackWidth = 240;
      const track = this.add.rectangle(0, 10, trackWidth, 6, 0x555555);
      
      this.raiseSliderHandle = this.add.circle(-trackWidth/2, 10, 15, 0xff8f00)
          .setInteractive({ draggable: true, useHandCursor: true });
          
      const confirmBtn = this.createButton(0, 50, 'CONFIRM', 0xff8f00, () => this.confirmRaise(), 120, 35);
      
      this.raisePopup.add([bg, this.raiseAmountText, track, this.raiseSliderHandle, confirmBtn]);
      this.raisePopup.setVisible(false);

      this.input.setDraggable(this.raiseSliderHandle);
      this.input.on('drag', (pointer: any, gameObject: any, dragX: number, dragY: number) => {
          if (gameObject === this.raiseSliderHandle) {
              const minX = -trackWidth / 2;
              const maxX = trackWidth / 2;
              const newX = Phaser.Math.Clamp(dragX, minX, maxX);
              gameObject.x = newX;
              const percent = (newX - minX) / trackWidth;
              this.updateRaiseValue(percent);
          }
      });
  }

  updateRaiseValue(percent: number) {
      if (!this.roomData || !this.myUserId) return;
      const me = this.roomData.players.find(p => p.userId === this.myUserId);
      if (!me) return;

      const highestBet = Math.max(...this.roomData.players.map(p => p.currentBet));
      const minRaise = this.roomData.gameState.minBet || 20;
      const toCall = highestBet - me.currentBet;
      const minTotal = toCall + minRaise; 
      const maxTotal = me.chips;
      
      if (maxTotal <= minTotal) {
          this.selectedRaiseAmount = maxTotal;
      } else {
          this.selectedRaiseAmount = Math.floor(minTotal + percent * (maxTotal - minTotal));
      }
      
      this.raiseAmountText.setText(`Raise: $${this.selectedRaiseAmount}`);
  }

  showRaisePopup() {
      if (!this.roomData) return;
      this.raisePopup.setVisible(true);
      this.children.bringToTop(this.raisePopup);
      this.raiseSliderHandle.x = -120;
      this.updateRaiseValue(0);
  }

  confirmRaise() {
      if (this.selectedRaiseAmount > 0) {
          this.sendAction('raise', this.selectedRaiseAmount);
          this.raisePopup.setVisible(false);
      }
  }
  
  createButton(x: number, y: number, text: string, color: number, callback: () => void, w: number = 120, h: number = 50): Phaser.GameObjects.Container {
      const container = this.add.container(x, y);
      const bg = this.add.rectangle(0, 0, w, h, color)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(1, 0xffffff, 0.5);
      
      const gloss = this.add.rectangle(0, -h/4, w, h/2, 0xffffff, 0.1);
      const txt = this.add.text(0, 0, text, { fontSize: '16px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
      
      bg.on('pointerdown', callback);
      bg.on('pointerover', () => bg.setAlpha(0.8));
      bg.on('pointerout', () => bg.setAlpha(1));
      
      container.add([bg, gloss, txt]);
      return container;
  }

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

    // Deal Animation Logic
    if ((!oldData && newData.status === 'playing' && newData.currentRound === 'preflop') ||
        (oldData && oldData.status !== 'playing' && newData.status === 'playing')) {
        if (!oldData || oldData.status !== 'playing') {
             this.resetTableForNewGame();
             if (newData.currentRound === 'preflop') {
                 this.playDealAnimation(newData.players);
             }
        }
    }

    this.potText.setText(`POT: $${newData.pot.toLocaleString()}`);
    
    const amISeated = newData.players.some(p => p.userId === this.myUserId);
    const playerCount = newData.players.length;

    if (newData.status === 'waiting') {
        if (playerCount < 2) {
            this.statusText.setText(amISeated ? `Waiting for players... (${playerCount}/6)` : 'Sit to Play!');
        } else {
            this.statusText.setText('Ready to Start!');
        }
    } else {
        this.statusText.setText('');
    }

    if (newData.status === 'waiting' && playerCount >= 2 && amISeated) {
        this.startButton.setVisible(true);
        this.children.bringToTop(this.startButton);
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
        this.children.bringToTop(this.actionContainer);
    } else {
        this.actionContainer.setVisible(false);
        this.raisePopup.setVisible(false);
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
          (c.getAt(4) as Phaser.GameObjects.Text).setText('Empty');
          (c.getAt(5) as Phaser.GameObjects.Text).setText('');
          (c.getAt(6) as Phaser.GameObjects.Text).setText('');
          (c.getAt(7) as Phaser.GameObjects.Container).removeAll(true);
          (c.getAt(0) as Phaser.GameObjects.Shape).setStrokeStyle(3, 0x555555);
          (c.getAt(2) as Phaser.GameObjects.Text).setText('?');
      });

      players.forEach(p => {
          const container = this.seatContainers.get(p.seatIndex);
          if (!container) return;

          const seatBg = container.getAt(0) as Phaser.GameObjects.Shape;
          const avatarText = container.getAt(2) as Phaser.GameObjects.Text;
          const nameTxt = container.getAt(4) as Phaser.GameObjects.Text;
          const chipsTxt = container.getAt(5) as Phaser.GameObjects.Text;
          const actionTxt = container.getAt(6) as Phaser.GameObjects.Text;
          const cardsContainer = container.getAt(7) as Phaser.GameObjects.Container;
          
          nameTxt.setText(p.nickname);
          avatarText.setText(p.nickname.substring(0, 1).toUpperCase());
          chipsTxt.setText(`$${p.chips}`);
          
          if (currentTurnSeat === p.seatIndex) {
              seatBg.setStrokeStyle(4, 0x00ff00);
          } else {
              seatBg.setStrokeStyle(3, 0x555555);
          }
          
          if (!p.isActive) actionTxt.setText('FOLD');
          else if (p.isAllIn) actionTxt.setText('ALL IN');
          else if (p.currentBet > 0) actionTxt.setText(`$${p.currentBet}`);
          else actionTxt.setText('');

          // Only draw if not dealing
          if (cardsContainer.list.length === 0 && p.isActive && this.roomData?.status !== 'waiting' && !this.isDealing) {
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
      
      this.seatContainers.forEach((container, index) => {
          const sitBtnContainer = this.sitButtons[index];
          const avatarGroup = [
              container.getAt(0), // bg
              container.getAt(1), // circle
              container.getAt(2), // text
              container.getAt(3), // info bg
              container.getAt(4), // name
              container.getAt(5)  // chips
          ];
          
          if (!occupiedSeats.includes(index)) {
              if (sitBtnContainer) {
                  sitBtnContainer.setVisible(true);
                  sitBtnContainer.setPosition(container.x, container.y);
                  
                  avatarGroup.forEach((obj: any) => obj.setVisible(false));
              }
          } else {
              if (sitBtnContainer) sitBtnContainer.setVisible(false);
              avatarGroup.forEach((obj: any) => obj.setVisible(true));
          }
      });
  }

  disableSeatInteraction() {
      this.sitButtons.forEach(btn => btn.setVisible(false));
      this.seatContainers.forEach(container => {
          for(let i=0; i<=6; i++) {
              const obj = container.getAt(i) as any;
              if(obj) obj.setVisible(true);
          }
      });
  }

  async playDealAnimation(players: Player[]) {
      if (this.isDealing) return;
      this.isDealing = true;

      const dealerIdx = this.roomData?.dealerIndex || 0;
      const dealOrder: Player[] = [];
      for(let i=1; i<=6; i++) {
          const seatIdx = (dealerIdx + i) % 6;
          const p = players.find(pl => pl.seatIndex === seatIdx);
          if (p && p.isActive) dealOrder.push(p);
      }

      for (let round = 0; round < 2; round++) {
          for (const p of dealOrder) {
              await this.dealOneCardToPlayer(p);
          }
      }

      this.isDealing = false;
  }

  dealOneCardToPlayer(p: Player): Promise<void> {
      return new Promise(resolve => {
          const container = this.seatContainers.get(p.seatIndex);
          if (!container) { resolve(); return; }
          
          const cardsContainer = container.getAt(7) as Phaser.GameObjects.Container;
          
          const tempCard = this.add.image(this.deckSprite.x, this.deckSprite.y, 'card-back')
              .setDisplaySize(50, 70)
              .setAngle(this.deckSprite.angle);
              
          const cardIndex = cardsContainer.list.length;
          const targetLocalX = cardIndex * 40 - 20;
          const targetLocalY = 0;
          
          const targetWorldX = container.x + targetLocalX;
          const targetWorldY = container.y - 20 + targetLocalY;
          
          this.children.bringToTop(tempCard);

          this.tweens.add({
              targets: tempCard,
              x: targetWorldX,
              y: targetWorldY,
              angle: 360,
              duration: 150,
              onComplete: () => {
                  tempCard.destroy();
                  if (p.userId === this.myUserId && p.holeCards && p.holeCards[cardIndex]) {
                      const card = p.holeCards[cardIndex];
                      const key = `card-${card.suit}-${card.rank}`;
                      const img = this.add.image(targetLocalX, targetLocalY, key).setDisplaySize(50, 70);
                      cardsContainer.add(img);
                  } else {
                      const img = this.add.image(targetLocalX, targetLocalY, 'card-back').setDisplaySize(50, 70);
                      cardsContainer.add(img);
                  }
                  resolve();
              }
          });
      });
  }

  async handleSit(seatIndex: number) {
      const token = localStorage.getItem('token');
      if (!token) {
          alert('Please login to play');
          return;
      }
      const amount = 1000;
      try {
          const res = await fetch('/api/holdem/room', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                  roomId: this.roomId,
                  seatIndex: seatIndex,
                  buyIn: amount
              })
          });
          
          if (res.ok) {
              this.disableSeatInteraction();
          } else {
              const err = await res.json();
              alert(err.error || 'Failed to join');
          }
      } catch (e) {
          console.error(e);
      }
  }
  
  drawHoleCards(container: Phaser.GameObjects.Container, cards: Card[]) {
      cards.forEach((card, idx) => {
          const key = `card-${card.suit}-${card.rank}`;
          const img = this.add.image(idx * 40 - 20, 0, key).setDisplaySize(50, 70); 
          container.add(img);
      });
  }
  
  drawBackCards(container: Phaser.GameObjects.Container) {
      const c1 = this.add.image(-20, 0, 'card-back').setDisplaySize(50, 70);
      const c2 = this.add.image(20, 0, 'card-back').setDisplaySize(50, 70);
      container.add([c1, c2]);
  }
  
  dealCommunityCards(cards: Card[], startIndex: number) {
      const centerX = this.scale.width / 2;
      const centerY = this.scale.height / 2;
      const cardSpacing = 70;
      const startX = centerX - (cardSpacing * 2);
      
      for (let i = startIndex; i < cards.length; i++) {
          const card = cards[i];
          const targetX = startX + i * cardSpacing;
          const targetY = centerY;
          
          const cardObj = this.add.image(centerX, centerY - 200, 'card-back').setDisplaySize(60, 84);
          this.communityCardContainers.push(cardObj as any);
          
          this.tweens.add({
              targets: cardObj,
              x: targetX,
              y: targetY,
              angle: 360,
              duration: 500,
              ease: 'Power2',
              onComplete: () => {
                  this.tweens.add({
                      targets: cardObj,
                      scaleX: 0,
                      duration: 150,
                      onComplete: () => {
                          cardObj.setTexture(`card-${card.suit}-${card.rank}`);
                          cardObj.setDisplaySize(60, 84); 
                          this.tweens.add({
                              targets: cardObj,
                              scaleX: 1,
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
      
      if (btnCheck && btnCall) {
          if (toCall === 0) {
              btnCheck.setVisible(true);
              btnCall.setVisible(false);
          } else {
              btnCheck.setVisible(false);
              btnCall.setVisible(true);
              const callTxt = btnCall.getAt(2) as Phaser.GameObjects.Text;
              callTxt.setText(`CALL $${toCall}`);
          }
      }
  }

  async sendAction(action: string, amount: number = 0) {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      this.actionContainer.setVisible(false);
      
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
      } catch (e) {
          console.error(e);
          this.actionContainer.setVisible(true);
      }
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
      } catch (e) { console.error(e); }
  }

  handleWinners(winners: any[]) {
      const winnerText = winners.map(w => {
          const p = this.roomData?.players.find(pl => pl.seatIndex === w.seatIndex);
          return `${p?.nickname} Wins $${w.amount} with ${w.hand.rank}`;
      }).join('\n');
      
      this.statusText.setText(winnerText);
      this.statusText.setColor('#ffff00');
      this.children.bringToTop(this.statusText);
  }
  
  resetTableForNewGame() {
      this.displayedCommunityCards = 0;
      this.communityCardContainers.forEach(c => c.destroy());
      this.communityCardContainers = [];
      this.seatContainers.forEach(c => {
          (c.getAt(7) as Phaser.GameObjects.Container).removeAll(true);
      });
      this.statusText.setText('');
  }
}
