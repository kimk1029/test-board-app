"use client";

import { useEffect, useRef, useState } from 'react';

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

const TETROMINOS = {
  I: { shape: [[1, 1, 1, 1]], color: 0x00f0f0 },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: 0x0000f0 },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: 0xf0a000 },
  O: { shape: [[1, 1], [1, 1]], color: 0xf0f000 },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: 0x00f000 },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: 0xa000f0 },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: 0xf00000 },
};

function createTetrisScene(Phaser: any): any {
  return class TetrisScene extends Phaser.Scene {
    private grid: (number | null)[][] = [];
    private activePiece: any = null;
    private nextPiece: any = null;
    private holdPiece: any = null; // 홀드 블록
    private canHold: boolean = true; // 홀드 가능 여부 (한 블록을 내려놓을 때까지 한 번만)
    private timer: any = null;
    private ghostGrid: any = null;
    private stars: Phaser.GameObjects.Graphics[] = [];
    private particles: any = null;
    private score: number = 0;
    private level: number = 1;
    private gameOver: boolean = false;
    private combo: number = 0;
    private comboText: Phaser.GameObjects.Text | null = null;
    private starPositions: { x: number; y: number; size: number; opacity: number }[][] = [];
    private gameStartTime: number = 0;

    // 멀티플레이어 관련
    private roomId?: string;
    private mode: 'single' | 'multiplayer' = 'single';
    private playerIndex?: number;
    private userId?: number;
    private ws: WebSocket | null = null;
    private wsConnected: boolean = false;
    private opponentGrid: (number | null)[][] = [];
    private lastSyncTime: number = 0;
    private gameStarted: boolean = false;
    private waitingForOpponent: boolean = false;
    private waitingUIElements: any[] = [];
    private opponentGraphics: any = null;
    private roomPlayers: any[] = [];

    // UI
    private scoreText: any = null;
    private nextPieceGraphics: any = null;
    private holdPieceGraphics: any = null; // 홀드 블록 그래픽
    private leaderboardTexts: any[] = [];
    private leaderboardData: any[] = [];
    private gameOverUIElements: any[] = []; // 게임 오버 UI 요소 추적용

    constructor() { super('TetrisScene'); }

    init(data?: any) {
      const registry = this.game.registry;
      this.roomId = data?.roomId || registry.get('roomId');
      this.mode = data?.mode || registry.get('mode') || 'single';
      this.playerIndex = data?.playerIndex ?? registry.get('playerIndex');
    }

    create() {
      // 게임 상태 초기화
      this.gameOver = false;
      this.score = 0;
      this.level = 1;
      this.combo = 0;
      this.gameStartTime = Date.now();
      this.activePiece = null;
      this.nextPiece = null;
      this.holdPiece = null;
      this.canHold = true;
      this.gameOverUIElements = [];
      this.starPositions = [];

      // 기존 별 제거
      this.stars.forEach((star: any) => {
        if (star && star.destroy) {
          star.destroy();
        }
      });
      this.stars = [];

      // 1. 배경 및 별무리
      this.cameras.main.setBackgroundColor('#050510');
      this.createStarfield();

      // 2. 파티클 (ADD 모드로 빛나게 설정)
      const rect = this.add.graphics().fillStyle(0xffffff).fillRect(0, 0, 4, 4);
      rect.generateTexture('pixel', 4, 4);
      this.particles = this.add.particles(0, 0, 'pixel', {
        speed: { min: 100, max: 500 },
        scale: { start: 2, end: 0 },
        blendMode: 'ADD',
        lifespan: 800,
        emitting: false
      });

      // 3. 그리드 초기화
      for (let y = 0; y < ROWS; y++) this.grid[y] = Array(COLS).fill(null);
      if (this.mode === 'multiplayer') {
        for (let y = 0; y < ROWS; y++) this.opponentGrid[y] = Array(COLS).fill(null);
        this.setupWebSocket();
      }

      this.setupUI();

      // 멀티플레이어 모드인 경우 대기 상태로 시작
      if (this.mode === 'multiplayer') {
        this.waitingForOpponent = true;
        this.gameStarted = false;
        this.showWaitingScreen();
      } else {
        // 싱글플레이 모드
        this.gameStarted = true;
        // 4. 입력 설정
        this.input.keyboard?.on('keydown-LEFT', () => this.movePiece(-1, 0));
        this.input.keyboard?.on('keydown-RIGHT', () => this.movePiece(1, 0));
        this.input.keyboard?.on('keydown-DOWN', () => this.movePiece(0, 1));
        this.input.keyboard?.on('keydown-UP', () => this.rotatePiece());
        this.input.keyboard?.on('keydown-SPACE', () => this.hardDrop());
        this.input.keyboard?.on('keydown-C', () => this.holdCurrentPiece());

        this.spawnPiece();
        this.updateDropTimer();
      }
    }

    createStarfield() {
      for (let i = 0; i < 3; i++) {
        const graphics = this.add.graphics();
        const layerPositions: { x: number; y: number; size: number; opacity: number }[] = [];
        const opacity = i === 0 ? 0.9 : 0.4;

        for (let j = 0; j < 80; j++) {
          const x = Phaser.Math.Between(0, 800);
          const y = Phaser.Math.Between(0, 800);
          const size = Phaser.Math.Between(1, 2);
          layerPositions.push({ x, y, size, opacity });
          graphics.fillStyle(0xffffff, opacity);
          graphics.fillCircle(x, y, size);
        }

        this.starPositions.push(layerPositions);
        this.stars.push(graphics);
      }
    }

    update() {
      // 게임이 시작되지 않았으면 업데이트하지 않음
      if (!this.gameStarted) return;

      this.stars.forEach((layer, index) => {
        layer.y += (index + 1) * 0.3;
        if (layer.y > 0) layer.y = -800;
      });
    }

    setupUI() {
      const { width, height } = this.game.config as any;
      const gameAreaWidth = Math.floor(width * 0.7);
      const centerX = gameAreaWidth + (width - gameAreaWidth) / 2;
      const startY = (height - (ROWS * BLOCK_SIZE)) / 2;

      // 사이드바 패널
      const panel = this.add.graphics().fillStyle(0x000000, 0.5);
      panel.fillRoundedRect(gameAreaWidth + 10, startY, width - gameAreaWidth - 20, ROWS * BLOCK_SIZE, 15);
      panel.lineStyle(2, 0x00ffff, 0.2).strokeRoundedRect(gameAreaWidth + 10, startY, width - gameAreaWidth - 20, ROWS * BLOCK_SIZE, 15);

      this.scoreText = this.add.text(centerX, startY + 50, 'SCORE\n0', { fontSize: '20px', color: '#00ffff', align: 'center', fontWeight: 'bold' }).setOrigin(0.5);

      // 홀드 영역
      this.add.text(centerX, startY + 130, 'HOLD', { fontSize: '16px', color: '#00ffff', fontWeight: 'bold' }).setOrigin(0.5);
      this.holdPieceGraphics = this.add.graphics();

      // 다음 블록 영역
      this.add.text(centerX, startY + 220, 'NEXT', { fontSize: '16px', color: '#00ffff', fontWeight: 'bold' }).setOrigin(0.5);
      this.nextPieceGraphics = this.add.graphics();

      // 멀티플레이어 모드인 경우 상대방 그리드 영역 추가
      if (this.mode === 'multiplayer') {
        this.setupOpponentGrid();
      } else {
        // 싱글플레이 모드인 경우 리더보드 로드
        this.loadLeaderboard(centerX, startY + 380);
      }
    }

    setupMultiplayerUI() {
      // 상대방 그리드는 별도 컨테이너에서 렌더링하므로 여기서는 설정만
      // 채팅 UI는 DOM으로 처리
      this.setupChatUI();
    }

    setupOpponentGrid() {
      // 별도 컨테이너에 상대방 그리드를 그리는 함수
      // 이 함수는 실제로는 호출되지 않지만, 기존 코드 호환성을 위해 유지
    }

    setupChatUI() {
      // 채팅 메시지 수신 이벤트 리스너
      window.addEventListener('sendChat', ((e: CustomEvent) => {
        if (this.wsConnected && this.roomId) {
          const message = e.detail;
          this.ws?.send(JSON.stringify({
            type: 'game_message',
            payload: {
              roomId: this.roomId,
              userId: this.userId,
              action: 'chat',
              message: message
            }
          }));
          // 자신의 메시지도 즉시 표시
          const storedUser = localStorage.getItem('user');
          const username = storedUser ? (JSON.parse(storedUser).nickname || JSON.parse(storedUser).email?.split('@')[0] || 'You') : 'You';
          this.addChatMessage(this.userId || 0, username, message);
        }
      }) as EventListener);
    }

    addChatMessage(userId: number, username: string, message: string) {
      this.chatMessages.push({
        userId,
        username,
        message,
        timestamp: Date.now()
      });
      this.updateChatUI();
    }

    updateChatUI() {
      const chatMessagesEl = document.getElementById('chat-messages');
      if (!chatMessagesEl) return;

      // 최근 50개 메시지만 표시
      const recentMessages = this.chatMessages.slice(-50);
      chatMessagesEl.innerHTML = recentMessages.map((msg: { userId: number; username: string; message: string; timestamp: number }) => {
        const isOwn = msg.userId === this.userId;
        return `
          <div class="flex ${isOwn ? 'justify-end' : 'justify-start'}">
            <div class="max-w-[80%] px-2 py-1 rounded-lg ${isOwn ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white'}">
              ${!isOwn ? `<div class="text-xs text-gray-400">${msg.username}</div>` : ''}
              <div class="text-sm">${this.escapeHtml(msg.message)}</div>
            </div>
          </div>
        `;
      }).join('');
      chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    }

    escapeHtml(text: string): string {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    async loadLeaderboard(x: number, y: number) {
      try {
        const response = await fetch('/api/tetris/leaderboard');
        if (response.ok) {
          const data = await response.json();
          this.leaderboardData = Array.isArray(data) ? data : [];
          // scene이 활성화되어 있고 add 메서드가 사용 가능한지 확인
          // 비동기 작업 후에도 씬이 여전히 활성화되어 있는지 확인
          if (!this.add || !this.scene) {
            return;
          }

          try {
            const isActive = this.scene.isActive && typeof this.scene.isActive === 'function'
              ? this.scene.isActive('TetrisScene')
              : true;
            if (isActive && this.add) {
              // drawLeaderboard 호출 전에 다시 한번 확인
              this.drawLeaderboard(x, y);
            }
          } catch (e) {
            // isActive 호출 실패 시에도 add가 있으면 drawLeaderboard 실행
            if (this.add) {
              this.drawLeaderboard(x, y);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load leaderboard:', error);
        this.leaderboardData = [];
      }
    }

    drawLeaderboard(x: number, y: number) {
      // add 메서드를 로컬 변수에 저장 (씬이 파괴되면 null이 될 수 있음)
      const addMethod = this.add;
      if (!addMethod || !this.scene) {
        return;
      }

      // scene이 활성화되어 있는지 확인 (옵셔널)
      try {
        if (this.scene && this.scene.isActive && typeof this.scene.isActive === 'function') {
          if (!this.scene.isActive('TetrisScene')) {
            return;
          }
        }
      } catch (e) {
        // isActive 체크 실패 시 계속 진행
      }

      // addMethod가 여전히 존재하고 text 함수가 있는지 확인
      if (!addMethod || typeof addMethod.text !== 'function') {
        return;
      }

      // 기존 리더보드 텍스트 제거
      this.leaderboardTexts.forEach(text => {
        if (text && text.scene) {
          text.destroy();
        }
      });
      this.leaderboardTexts = [];

      // 리더보드 타이틀
      let titleText: any = null;
      try {
        // addMethod가 여전히 유효한지 확인
        if (!addMethod || typeof addMethod.text !== 'function') {
          return;
        }
        // 저장된 addMethod 사용
        titleText = addMethod.text(x, y, 'TOP PILOTS', {
          fontSize: '18px',
          color: '#ffcc00',
          fontWeight: 'bold'
        });
        if (titleText) {
          titleText.setOrigin(0.5, 0);
          this.leaderboardTexts.push(titleText);
        }
      } catch (e: any) {
        // 에러가 발생하면 조용히 종료 (씬이 파괴되었을 가능성)
        if (e && e.message && !e.message.includes('null')) {
          console.error('Failed to create leaderboard title:', e);
        }
        return;
      }

      let currentY = y + 25;

      // 상위 5명 표시
      const maxEntries = Math.min(5, this.leaderboardData.length);
      for (let i = 0; i < maxEntries; i++) {
        // 각 반복마다 addMethod가 여전히 유효한지 확인
        if (!addMethod || typeof addMethod.text !== 'function') {
          return;
        }

        const entry = this.leaderboardData[i];
        if (!entry || !entry.nickname) {
          continue;
        }

        const rankColors = [0xffd700, 0xc0c0c0, 0xcd7f32, 0xffffff, 0xffffff]; // 금, 은, 동, 나머지
        const rankSymbols = ['🥇', '🥈', '🥉', '4.', '5.'];
        const color = i < 3 ? `#${rankColors[i].toString(16).padStart(6, '0')}` : '#ffffff';

        // 닉네임이 너무 길면 자르기
        const displayName = entry.nickname.length > 10
          ? entry.nickname.substring(0, 10) + '...'
          : entry.nickname;

        // 순위와 닉네임
        let rankText: any = null;
        let scoreText: any = null;
        try {
          rankText = addMethod.text(
            x - 70,
            currentY,
            i < 3 ? `${rankSymbols[i]} ${displayName}` : `${rankSymbols[i]} ${displayName}`,
            {
              fontSize: '13px',
              color: color,
              fontWeight: i < 3 ? 'bold' : 'normal'
            }
          );
          if (rankText) {
            rankText.setOrigin(0, 0.5);
            this.leaderboardTexts.push(rankText);
          }

          // 점수
          scoreText = addMethod.text(
            x + 70,
            currentY,
            entry.score ? entry.score.toLocaleString() : '0',
            {
              fontSize: '11px',
              color: '#aaaaaa'
            }
          );
          if (scoreText) {
            scoreText.setOrigin(1, 0.5);
            this.leaderboardTexts.push(scoreText);
          }
        } catch (e) {
          console.error('Failed to create leaderboard entry:', e);
          // 에러 발생 시 생성된 텍스트만 정리하고 반환
          if (rankText) rankText.destroy();
          if (scoreText) scoreText.destroy();
          return;
        }

        currentY += 30;
      }

      // 데이터가 없을 때
      if (this.leaderboardData.length === 0 && addMethod && typeof addMethod.text === 'function') {
        try {
          const noDataText = addMethod.text(x, currentY, 'No records yet', {
            fontSize: '12px',
            color: '#666666'
          });
          if (noDataText) {
            noDataText.setOrigin(0.5, 0.5);
            this.leaderboardTexts.push(noDataText);
          }
        } catch (e) {
          console.error('Failed to create no data text:', e);
        }
      }
    }

    spawnPiece() {
      if (!this.gameStarted) return;
      this.activePiece = this.nextPiece || this.generateRandomPiece();
      this.nextPiece = this.generateRandomPiece();
      this.canHold = true; // 새 블록이 생성되면 홀드 가능
      this.drawNextPiece();
      this.drawHoldPiece(); // 홀드 블록도 다시 그리기
      if (this.checkCollision(0, 0, this.activePiece.shape)) {
        this.gameOver = true;
        this.showGameOver();
      }
      this.drawGrid();
    }

    generateRandomPiece() {
      const keys = Object.keys(TETROMINOS) as (keyof typeof TETROMINOS)[];
      const type = keys[Phaser.Math.Between(0, keys.length - 1)];
      return { x: 4, y: 0, shape: TETROMINOS[type].shape, color: TETROMINOS[type].color };
    }

    movePiece(dx: number, dy: number) {
      if (this.gameOver || !this.activePiece || !this.gameStarted) return false;
      if (!this.checkCollision(dx, dy, this.activePiece.shape)) {
        this.activePiece.x += dx; this.activePiece.y += dy;
        this.drawGrid(); return true;
      } else if (dy > 0) this.lockPiece();
      return false;
    }

    rotatePiece() {
      if (!this.gameStarted) return;
      const rotated = this.activePiece.shape[0].map((_: any, i: number) => this.activePiece.shape.map((row: any) => row[i]).reverse());
      if (!this.checkCollision(0, 0, rotated)) { this.activePiece.shape = rotated; this.drawGrid(); }
    }

    hardDrop() {
      if (!this.activePiece || !this.gameStarted) return;
      while (this.movePiece(0, 1)) { }
      this.cameras.main.shake(100, 0.005);
    }

    checkCollision(dx: number, dy: number, shape: number[][]) {
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x]) {
            const nx = this.activePiece.x + x + dx, ny = this.activePiece.y + y + dy;
            if (nx < 0 || nx >= COLS || ny >= ROWS || (ny >= 0 && this.grid[ny][nx] !== null)) return true;
          }
        }
      }
      return false;
    }

    lockPiece() {
      this.activePiece.shape.forEach((row: any, y: any) => {
        row.forEach((v: any, x: any) => {
          if (v && this.activePiece.y + y >= 0) this.grid[this.activePiece.y + y][this.activePiece.x + x] = this.activePiece.color;
        });
      });
      this.clearLines();
      this.spawnPiece();
    }

    holdCurrentPiece() {
      if (!this.canHold || !this.activePiece || this.gameOver || !this.gameStarted) return;

      // 현재 블록의 shape를 deep copy하여 저장 (회전 상태 유지)
      const currentPieceShape = this.activePiece.shape.map((row: any) => [...row]);
      const currentPieceType = {
        shape: currentPieceShape,
        color: this.activePiece.color
      };

      if (this.holdPiece) {
        // 홀드에 블록이 있으면 교환
        const tempHold = this.holdPiece;
        this.holdPiece = currentPieceType;

        // 홀드된 블록의 shape를 deep copy하여 현재 블록으로
        const holdShape = tempHold.shape.map((row: any) => [...row]);
        this.activePiece = {
          x: 4,
          y: 0,
          shape: holdShape,
          color: tempHold.color
        };
      } else {
        // 홀드가 비어있으면 현재 블록을 홀드로 이동하고 다음 블록을 현재 블록으로
        this.holdPiece = currentPieceType;
        this.activePiece = this.nextPiece || this.generateRandomPiece();
        this.nextPiece = this.generateRandomPiece();
        this.drawNextPiece();
      }

      this.canHold = false; // 한 번 홀드했으면 다음 블록을 내려놓을 때까지 홀드 불가
      this.drawHoldPiece();
      this.drawGrid();
    }

    clearLines() {
      let lines = 0;
      for (let y = ROWS - 1; y >= 0; y--) {
        if (this.grid[y].every(c => c !== null)) {
          this.triggerExplosion(y);
          this.grid.splice(y, 1);
          this.grid.unshift(Array(COLS).fill(null));
          y++; lines++;
        }
      }
      if (lines > 0) {
        this.combo++;
        this.score += (lines * 100) + (this.combo * 50);
        this.scoreText.setText(`SCORE\n${this.score}`);
        this.showComboEffects(this.combo);
        // 멀티플레이어 모드에서 게임 상태 동기화 및 공격
        if (this.mode === 'multiplayer') {
          this.syncGameState();
          // 공격: 상대방에게 라인 추가
          this.attackOpponent(lines);
        }
      } else {
        this.combo = 0;
      }
    }

    attackOpponent(linesCleared: number) {
      if (!this.wsConnected || !this.roomId) return;

      this.ws?.send(JSON.stringify({
        type: 'game_message',
        payload: {
          roomId: this.roomId,
          userId: this.userId,
          action: 'attack',
          lines: linesCleared
        }
      }));
    }

    addGarbageLines(count: number) {
      // 제일 아래에 공격 라인 추가
      for (let i = 0; i < count; i++) {
        // 한 줄씩 위로 올리고 맨 아래에 가비지 라인 추가
        this.grid.pop();
        const garbageLine = Array(COLS).fill(null);
        // 랜덤하게 하나의 블록을 빈칸으로 만들기 (완전히 막히지 않도록)
        const randomIndex = Math.floor(Math.random() * COLS);
        for (let x = 0; x < COLS; x++) {
          if (x !== randomIndex) {
            garbageLine[x] = 0x888888; // 회색 가비지 블록
          }
        }
        this.grid.unshift(garbageLine);
      }
      this.drawGrid();
    }

    showComboEffects(combo: number) {
      const { width, height } = this.game.config as any;
      // 1. 점진적 카메라 흔들림 (Combo가 높을수록 강렬)
      this.cameras.main.shake(Math.min(600, 200 + combo * 50), Math.min(0.04, 0.005 * combo));

      if (this.comboText) this.comboText.destroy();
      const colors = ['#ffffff', '#00ffff', '#ffff00', '#ffaa00', '#ff0000', '#ff00ff'];

      this.comboText = this.add.text(width / 2, height / 2, `${combo} COMBO!`, {
        fontSize: `${30 + (combo * 15)}px`, fontStyle: 'bold', color: colors[Math.min(combo, 5)],
        stroke: '#000', strokeThickness: 8, fontFamily: 'Arial Black'
      }).setOrigin(0.5).setDepth(2000);

      this.tweens.add({
        targets: this.comboText, y: height / 2 - 150, scale: 1.3, alpha: 0,
        duration: 1000, ease: 'Back.easeOut', onComplete: () => this.comboText?.destroy()
      });

      if (combo >= 3) this.cameras.main.flash(300, 0, 255, 255, 0.2);
      if (combo >= 5) {
        // Graphics 객체에는 setTint()가 없으므로 별을 다시 그려서 보라색으로 변경
        this.stars.forEach((star, index) => {
          star.clear();
          const positions = this.starPositions[index] || [];
          positions.forEach((pos: { x: number; y: number; size: number; opacity: number }) => {
            star.fillStyle(0xff00ff, pos.opacity);
            star.fillCircle(pos.x, pos.y, pos.size);
          });
        });

        this.time.delayedCall(1000, () => {
          // 원래 색상(흰색)으로 복원
          this.stars.forEach((star, index) => {
            star.clear();
            const positions = this.starPositions[index] || [];
            positions.forEach((pos: { x: number; y: number; size: number; opacity: number }) => {
              star.fillStyle(0xffffff, pos.opacity);
              star.fillCircle(pos.x, pos.y, pos.size);
            });
          });
        });
      }
    }

    triggerExplosion(rowY: number) {
      const offsetX = (Math.floor(this.game.config.width as number * 0.7) - 300) / 2;
      const offsetY = (this.game.config.height as number - 600) / 2;
      const worldY = offsetY + rowY * BLOCK_SIZE;

      const flash = this.add.graphics().fillStyle(0xffffff, 1).fillRect(offsetX, worldY, 300, 30);
      this.tweens.add({ targets: flash, alpha: 0, scaleY: 0, duration: 300, onComplete: () => flash.destroy() });

      const pCount = 10 + (this.combo * 5);
      for (let i = 0; i < COLS; i++) {
        this.particles.emitParticleAt(offsetX + i * BLOCK_SIZE + 15, worldY + 15, pCount);
      }
    }

    drawGrid() {
      if (!this.ghostGrid) this.ghostGrid = this.add.graphics();
      this.ghostGrid.clear();
      const offsetX = (Math.floor(this.game.config.width as number * 0.7) - 300) / 2;
      const offsetY = (this.game.config.height as number - 600) / 2;

      this.ghostGrid.lineStyle(1, 0x00ffff, 0.1);
      for (let i = 0; i <= COLS; i++) this.ghostGrid.lineBetween(offsetX + i * 30, offsetY, offsetX + i * 30, offsetY + 600);
      for (let j = 0; j <= ROWS; j++) this.ghostGrid.lineBetween(offsetX, offsetY + j * 30, offsetX + 300, offsetY + j * 30);

      this.grid.forEach((row, y) => row.forEach((col, x) => {
        if (col !== null) this.drawNeonBlock(offsetX + x * 30, offsetY + y * 30, col);
      }));

      if (this.activePiece && !this.gameOver && this.gameStarted) {
        this.activePiece.shape.forEach((row: any, y: any) => row.forEach((v: any, x: any) => {
          if (v) this.drawNeonBlock(offsetX + (this.activePiece.x + x) * 30, offsetY + (this.activePiece.y + y) * 30, this.activePiece.color);
        }));
      }

      // 멀티플레이어 모드인 경우 상대방 그리드는 별도 컨테이너에 렌더링
      // 여기서는 그리지 않음
    }

    drawOpponentGrid() {
      if (!this.opponentGraphics) return;

      const { width, height } = this.game.config as any;
      const gameAreaWidth = Math.floor(width * 0.7);
      const centerX = gameAreaWidth + (width - gameAreaWidth) / 2;
      const startY = (height - (ROWS * BLOCK_SIZE)) / 2;

      const opponentScale = 0.4;
      const blockSize = BLOCK_SIZE * opponentScale;
      const opponentGridWidth = COLS * blockSize;
      const opponentGridHeight = ROWS * blockSize;
      const opponentGridX = centerX - opponentGridWidth / 2;
      const opponentGridY = startY + 380;

      this.opponentGraphics.clear();

      // 상대방 정보 가져오기
      const opponent = this.roomPlayers.find((p: any) => p.userId !== this.userId);
      const opponentName = opponent?.username || opponent?.nickname || '';

      // 상대방 이름 표시/숨김
      if (this.opponentNameText) {
        if (opponentName) {
          this.opponentNameText.setText(opponentName);
          this.opponentNameText.setVisible(true);
        } else {
          this.opponentNameText.setVisible(false);
        }
      }

      // 상대방 그리드 그리기 (쌓인 블록만)
      this.opponentGrid.forEach((row, y) => {
        row.forEach((col, x) => {
          if (col !== null) {
            const blockX = opponentGridX + x * blockSize;
            const blockY = opponentGridY + y * blockSize;

            // 블록 그리기
            this.opponentGraphics.fillStyle(col, 0.9);
            this.opponentGraphics.fillRect(
              blockX + 1,
              blockY + 1,
              blockSize - 2,
              blockSize - 2
            );

            // 블록 테두리 (약간 밝게)
            this.opponentGraphics.lineStyle(1, col, 1.0);
            this.opponentGraphics.strokeRect(
              blockX + 1,
              blockY + 1,
              blockSize - 2,
              blockSize - 2
            );
          }
        });
      });
    }

    drawNeonBlock(x: number, y: number, color: number) {
      this.ghostGrid.fillStyle(color, 0.8).fillRoundedRect(x + 2, y + 2, 26, 26, 6);
      this.ghostGrid.lineStyle(3, color, 0.4).strokeRoundedRect(x, y, 30, 30, 8);
      this.ghostGrid.fillStyle(0xffffff, 0.3).fillRect(x + 6, y + 6, 18, 5);
    }

    drawNextPiece() {
      if (!this.nextPieceGraphics || !this.nextPiece) return;
      this.nextPieceGraphics.clear();
      const centerX = (this.game.config.width as number) * 0.85;
      const startY = (this.game.config.height as number - 600) / 2 + 240;
      this.nextPiece.shape.forEach((row: any, y: any) => row.forEach((v: any, x: any) => {
        if (v) {
          this.nextPieceGraphics.fillStyle(this.nextPiece.color, 0.8).fillRoundedRect(centerX - (this.nextPiece.shape[0].length * 10) + x * 20, startY + y * 20, 18, 18, 4);
        }
      }));
    }

    drawHoldPiece() {
      if (!this.holdPieceGraphics) return;
      this.holdPieceGraphics.clear();

      if (!this.holdPiece) return; // 홀드가 비어있으면 그리지 않음

      const centerX = (this.game.config.width as number) * 0.85;
      const startY = (this.game.config.height as number - 600) / 2 + 150;
      this.holdPiece.shape.forEach((row: any, y: any) => row.forEach((v: any, x: any) => {
        if (v) {
          this.holdPieceGraphics.fillStyle(this.holdPiece.color, 0.8).fillRoundedRect(centerX - (this.holdPiece.shape[0].length * 10) + x * 20, startY + y * 20, 18, 18, 4);
        }
      }));
    }

    showGameOver() {
      const { width, height } = this.game.config as any;
      const centerX = width / 2;
      const centerY = height / 2;

      // 기존 게임 오버 UI 제거
      this.gameOverUIElements.forEach((element: any) => {
        if (element && element.destroy) {
          element.destroy();
        }
      });
      this.gameOverUIElements = [];

      // 싱글플레이 모드인 경우 점수 저장
      if (this.mode === 'single') {
        this.saveScore(this.score);
      }

      // 게임 오버 오버레이
      const overlay = this.add.rectangle(centerX, centerY, width, height, 0x000000, 0.8).setDepth(3000);
      this.gameOverUIElements.push(overlay);

      const gameOverText = this.add.text(centerX, centerY - 80, 'MISSION FAILED', {
        fontSize: '60px',
        color: '#ff0000',
        fontWeight: 'bold'
      }).setOrigin(0.5).setDepth(3001);
      this.gameOverUIElements.push(gameOverText);

      const finalScoreText = this.add.text(centerX, centerY - 20, `Final Score: ${this.score.toLocaleString()}`, {
        fontSize: '32px',
        color: '#ffffff',
        fontWeight: 'bold'
      }).setOrigin(0.5).setDepth(3001);
      this.gameOverUIElements.push(finalScoreText);

      const btn = this.add.rectangle(centerX, centerY + 80, 200, 50, 0x00aaff).setInteractive({ useHandCursor: true }).setDepth(3001);
      this.gameOverUIElements.push(btn);

      const btnText = this.add.text(centerX, centerY + 80, 'RETRY', { fontSize: '24px', color: '#fff' }).setOrigin(0.5).setDepth(3002);
      this.gameOverUIElements.push(btnText);

      // 버튼 호버 효과
      btn.on('pointerover', () => {
        btn.setFillStyle(0x0088dd);
      });
      btn.on('pointerout', () => {
        btn.setFillStyle(0x00aaff);
      });

      // 재시작 버튼 클릭 이벤트
      btn.on('pointerdown', () => {
        this.restartGame();
      });
    }

    async saveMultiplayerScore() {
      if (!this.roomId) return;

      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/tetris/action', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            roomId: this.roomId,
            score: this.score,
            lines: 0, // 필요시 계산
            level: this.level,
            grid: this.grid,
            isGameOver: true
          })
        });

        if (response.ok) {
          console.log('Multiplayer score saved');
        }
      } catch (error) {
        console.error('Failed to save multiplayer score:', error);
      }
    }

    async saveScore(finalScore: number) {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/tetris/action', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            roomId: null,
            finalScore: finalScore,
            lines: 0,
            level: this.level || 1
          })
        });

        if (response.ok) {
          // 점수 저장 후 리더보드 새로고침
          const { width, height } = this.game.config as any;
          const gameAreaWidth = Math.floor(width * 0.7);
          const centerX = gameAreaWidth + (width - gameAreaWidth) / 2;
          const startY = (height - (ROWS * BLOCK_SIZE)) / 2;
          this.loadLeaderboard(centerX, startY + 280);
        }
      } catch (error) {
        console.error('Failed to save score:', error);
      }
    }

    restartGame() {
      // 게임 상태 완전 초기화
      this.gameOver = false;
      this.score = 0;
      this.level = 1;
      this.combo = 0;
      this.activePiece = null;
      this.nextPiece = null;
      this.gameStartTime = Date.now();

      // 그리드 초기화
      for (let y = 0; y < ROWS; y++) {
        this.grid[y] = Array(COLS).fill(null);
      }

      // 게임 오버 UI 제거
      this.gameOverUIElements.forEach((element: any) => {
        if (element && element.destroy) {
          element.destroy();
        }
      });
      this.gameOverUIElements = [];

      // UI 텍스트 업데이트
      if (this.scoreText) {
        this.scoreText.setText('SCORE\n0');
      }

      // 콤보 텍스트 제거
      if (this.comboText) {
        this.comboText.destroy();
        this.comboText = null;
      }

      // 타이머 재설정
      if (this.timer) {
        this.timer.remove();
        this.timer = null;
      }

      // ghostGrid 초기화
      if (this.ghostGrid) {
        this.ghostGrid.clear();
      }

      // nextPieceGraphics 초기화
      if (this.nextPieceGraphics) {
        this.nextPieceGraphics.clear();
      }

      // holdPieceGraphics 초기화
      if (this.holdPieceGraphics) {
        this.holdPieceGraphics.clear();
      }

      // 홀드 관련 초기화
      this.holdPiece = null;
      this.canHold = true;

      // 파티클 시스템 초기화
      if (this.particles) {
        this.particles.stop();
      }

      // 게임 다시 시작
      this.spawnPiece();
      this.updateDropTimer();
      this.drawGrid();

      // 리더보드 다시 로드 (약간의 지연 후)
      const { width, height } = this.game.config as any;
      const gameAreaWidth = Math.floor(width * 0.7);
      const centerX = gameAreaWidth + (width - gameAreaWidth) / 2;
      const startY = (height - (ROWS * BLOCK_SIZE)) / 2;

      // 약간의 지연 후 리더보드 새로고침
      this.time.delayedCall(200, () => {
        const scene = this.scene;
        if (scene && scene.isActive && typeof scene.isActive === 'function') {
          if (scene.isActive('TetrisScene') && this.add) {
            this.loadLeaderboard(centerX, startY + 280);
          }
        }
      });
    }

    updateDropTimer() {
      if (this.timer) this.timer.remove();
      this.timer = this.time.addEvent({ delay: Math.max(100, 800 - (this.level - 1) * 100), callback: () => this.movePiece(0, 1), loop: true });
    }

    shutdown() {
      // 웹소켓 연결 종료
      if (this.ws) {
        if (this.roomId && this.mode === 'multiplayer') {
          try {
            this.ws.send(JSON.stringify({
              type: 'leave_room'
            }));
          } catch (e) {
            console.error('Error sending leave_room:', e);
          }
        }
        this.ws.close();
        this.ws = null;
      }
      this.wsConnected = false;
    }

    setupWebSocket() {
      if (!this.roomId) return;

      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws';
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('Tetris WebSocket connected');
        this.wsConnected = true;

        // 토큰 가져오기
        let token: string | undefined;
        try {
          token = localStorage.getItem('token') || undefined;
        } catch (e) {
          console.error('Failed to get token:', e);
        }

        // 인증 및 방 참가
        this.ws?.send(JSON.stringify({
          type: 'auth',
          payload: { token, userId: this.userId }
        }));

        // 방에 참가
        setTimeout(() => {
          this.ws?.send(JSON.stringify({
            type: 'join_room',
            payload: { roomId: this.roomId }
          }));
          // 방 목록 요청 (방 정보 가져오기용)
          this.ws?.send(JSON.stringify({
            type: 'get_rooms',
            payload: { type: 'tetris' }
          }));
        }, 100);
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('Tetris WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('Tetris WebSocket disconnected');
        this.wsConnected = false;
      };
    }

    handleWebSocketMessage(message: any) {
      switch (message.type) {
        case 'game_message':
          if (message.payload.userId !== this.userId) {
            // 상대방의 게임 상태 업데이트
            if (message.payload.grid) {
              this.opponentGrid = message.payload.grid;
              this.drawOpponentGrid();
            }
            if (message.payload.score !== undefined) {
              // 상대방 점수 업데이트 (필요시 UI에 표시)
            }
            // 공격 받기
            if (message.payload.action === 'attack' && message.payload.lines) {
              this.addGarbageLines(message.payload.lines);
            }
          }
          break;
        case 'room_update':
        case 'room_joined':
          // 방 상태 업데이트
          const room = message.payload?.room || message.payload;
          if (room && room.players) {
            this.roomPlayers = room.players;
            if (this.waitingForOpponent) {
              this.updateWaitingScreen();
            }
            // 상대방 그리드 업데이트 (이름 표시)
            this.drawOpponentGrid();
          }
          break;
        case 'room_list':
          // 방 목록에서 현재 방 찾기
          if (message.payload?.rooms) {
            const currentRoom = message.payload.rooms.find((r: any) => r.id === this.roomId);
            if (currentRoom && currentRoom.players) {
              this.roomPlayers = currentRoom.players;
              if (this.waitingForOpponent) {
                this.updateWaitingScreen();
              }
              // 상대방 그리드 업데이트 (이름 표시)
              this.drawOpponentGrid();
            }
          }
          break;
      }
    }

    showWaitingScreen() {
      const { width, height } = this.game.config as any;
      const centerX = width / 2;
      const centerY = height / 2;

      // 대기 중 오버레이
      const overlay = this.add.rectangle(centerX, centerY, width, height, 0x000000, 0.7).setDepth(2000);
      this.waitingUIElements.push(overlay);

      const waitingText = this.add.text(centerX, centerY - 50, '대기 중...', {
        fontSize: '48px',
        color: '#00ffff',
        fontWeight: 'bold'
      }).setOrigin(0.5).setDepth(2001);
      this.waitingUIElements.push(waitingText);

      const playerCountText = this.add.text(centerX, centerY, '플레이어 1/2', {
        fontSize: '24px',
        color: '#ffffff'
      }).setOrigin(0.5).setDepth(2001);
      this.waitingUIElements.push(playerCountText);
      this.updateWaitingScreen();
    }

    updateWaitingScreen() {
      // 플레이어 수 업데이트
      const playerCountElement = this.waitingUIElements.find((el: any) =>
        el && el.text && el.text.includes('플레이어')
      );
      if (playerCountElement) {
        const playerCount = this.roomPlayers.length || 1;
        playerCountElement.setText(`플레이어 ${playerCount}/2`);
      }

      // 2명이 모이면 자동으로 게임 시작
      if (this.roomPlayers.length === 2 && this.waitingForOpponent) {
        this.startGame();
      }
    }

    startGame() {
      // 대기 화면 제거
      this.waitingUIElements.forEach((element: any) => {
        if (element && element.destroy) {
          element.destroy();
        }
      });
      this.waitingUIElements = [];

      this.waitingForOpponent = false;
      this.gameStarted = true;

      // 입력 설정
      this.input.keyboard?.on('keydown-LEFT', () => this.movePiece(-1, 0));
      this.input.keyboard?.on('keydown-RIGHT', () => this.movePiece(1, 0));
      this.input.keyboard?.on('keydown-DOWN', () => this.movePiece(0, 1));
      this.input.keyboard?.on('keydown-UP', () => this.rotatePiece());
      this.input.keyboard?.on('keydown-SPACE', () => this.hardDrop());
      this.input.keyboard?.on('keydown-C', () => this.holdCurrentPiece());

      this.spawnPiece();
      this.updateDropTimer();
      this.drawGrid();
    }

    syncGameState() {
      if (!this.wsConnected || !this.roomId || this.mode !== 'multiplayer' || !this.gameStarted) return;

      const now = Date.now();
      // 0.5초마다 동기화 (너무 자주 보내지 않도록)
      if (now - this.lastSyncTime < 500) return;
      this.lastSyncTime = now;

      this.ws?.send(JSON.stringify({
        type: 'game_message',
        payload: {
          roomId: this.roomId,
          userId: this.userId,
          grid: this.grid,
          score: this.score,
          level: this.level,
          gameOver: this.gameOver
        }
      }));
    }
  };
}

export default function TetrisGame({ roomId, mode = 'single', playerIndex, userId }: any) {
  const gameRef = useRef<HTMLDivElement>(null);
  const opponentGameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<any>(null);
  const opponentPhaserGameRef = useRef<any>(null);
  const [phaserLoaded, setPhaserLoaded] = useState(false);

  useEffect(() => {
    if (!gameRef.current) return;

    let isMounted = true;

    import('phaser').then((Phaser) => {
      if (!isMounted || !gameRef.current) return;

      try {
        if (phaserGameRef.current) {
          phaserGameRef.current.destroy(true);
          phaserGameRef.current = null;
        }

        const config = {
          type: Phaser.AUTO,
          width: 800,
          height: 700,
          parent: gameRef.current,
          scene: createTetrisScene(Phaser),
        };

        const game = new Phaser.Game(config);
        phaserGameRef.current = game;

        game.events.once('ready', () => {
          if (isMounted && game && phaserGameRef.current === game) {
            try {
              game.registry.set('roomId', roomId);
              game.registry.set('mode', mode);
              game.registry.set('playerIndex', playerIndex);
              game.registry.set('userId', userId);
              setPhaserLoaded(true);
            } catch (error) {
              console.error('Error setting game registry:', error);
            }
          }
        });
      } catch (error) {
        console.error('Failed to initialize Phaser game:', error);
      }
    }).catch((error) => {
      console.error('Failed to load Phaser:', error);
    });

    return () => {
      isMounted = false;
      if (phaserGameRef.current) {
        try {
          phaserGameRef.current.destroy(true);
          phaserGameRef.current = null;
        } catch (error) {
          console.error('Error destroying Phaser game:', error);
        }
      }
    };
  }, [roomId, mode, playerIndex, userId]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-black overflow-hidden p-4">
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        <div ref={gameRef} className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl" />
      </div>
      <p className="mt-4 text-gray-500 text-xs tracking-widest uppercase">Navigation: Arrows | Hyper-Drop: Space</p>
    </div>
  );
}