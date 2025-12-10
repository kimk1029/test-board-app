// BustabitGame.ts

interface Button {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  onClick: () => void;
  visible: boolean;
}

interface GameLog {
  type: 'bet' | 'win' | 'lose' | 'info';
  message: string;
  time: string;
  pointsChange?: number; // 포인트 변화량
  balance?: number; // 잔액
}

export class BustabitGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  // [핵심] 인스턴스 고유 ID 및 캔버스 소유권 확인용
  private readonly instanceId: number; 

  // 게임 상태 변수
  private isRunning: boolean = false;
  private isGameEnded: boolean = false;
  private multiplier: number = 1.0;
  private crashed: boolean = false;
  private crashPoint: number = 1.0;
  private hasCashedOut: boolean = false;
  
  private betAmount: number = 0;
  private playerPoints: number = 0;
  private animationFrameId: number | null = null;
  private startTime: number = 0;
  private cashOutMultiplier: number = 1.0;
  private selectedBetAmount: number = 0;

  // 캔버스 크기 및 레이아웃
  private canvasWidth: number = 1200;
  private canvasHeight: number = 800;
  private sidebarWidth: number = 300; 
  private gameAreaWidth: number = 900; 

  private logs: GameLog[] = [];
  private logScrollOffset: number = 0; // 로그 스크롤 오프셋

  private betButton: Button | null = null;
  private cashOutButton: Button | null = null;
  private betAmountButtons: Button[] = [];

  private readonly GAME_SPEED = 0.085; 
  private onMessage?: (message: string) => void;

  constructor(canvas: HTMLCanvasElement, betAmount: number = 0, width: number = 1200, height: number = 800) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.betAmount = betAmount;
    this.canvasWidth = width;
    this.canvasHeight = height;
    
    // [중요] 캔버스 소유권 등록 (좀비 루프 방지)
    this.instanceId = Math.random();
    (this.canvas as any).__activeBustabitInstance = this.instanceId;

    // 반응형 레이아웃: 모바일/태블릿/PC
    if (width < 768) {
      // 모바일: 사이드바 없음
      this.sidebarWidth = 0;
      this.gameAreaWidth = width;
    } else if (width < 1024) {
      // 태블릿: 사이드바 축소
      this.sidebarWidth = width * 0.2;
      this.gameAreaWidth = width - this.sidebarWidth;
    } else {
      // PC: 고정 레이아웃
      this.sidebarWidth = width * 0.25;
      this.gameAreaWidth = width - this.sidebarWidth;
    }

    this.canvas.width = width;
    this.canvas.height = height;

    this.createButtons(); 
    this.setupEventListeners();
    this.loadUserPoints();
    
    this.resetGame(true); 
  }

  setMessageCallback(callback: (message: string) => void) {
    this.onMessage = callback;
  }

  private showMessage(text: string) {
    if (this.onMessage) {
      this.onMessage(text);
    }
  }

  private addLog(type: 'bet' | 'win' | 'lose' | 'info', message: string, pointsChange?: number, balance?: number) {
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    this.logs.unshift({ 
      type, 
      message, 
      time: timeString,
      pointsChange,
      balance: balance !== undefined ? balance : this.playerPoints
    });
    if (this.logs.length > 50) this.logs.pop();
    // 새 로그 추가 시 스크롤 초기화
    this.logScrollOffset = 0;
  }

  private async loadUserPoints() {
    const token = localStorage.getItem('token');
    if (!token) {
      this.playerPoints = 0;
      this.render();
      return;
    }

    try {
      const response = await fetch('/api/user/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        this.playerPoints = data.points || 0;
      } else {
        this.playerPoints = 0;
      }
    } catch (error) {
      console.error('Failed to load user points:', error);
      this.playerPoints = 0;
    }
    this.render();
  }

  private setupEventListeners() {
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.handleClick(x, y);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.canvas.style.cursor = this.getCursorAt(x, y);
    });

    // 로그 영역 스크롤 (마우스 휠)
    this.canvas.addEventListener('wheel', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      
      // 사이드바 영역에서만 스크롤
      if (x > this.gameAreaWidth) {
        e.preventDefault();
        const scrollAmount = e.deltaY > 0 ? 35 : -35;
        const maxScroll = Math.max(0, (this.logs.length * 35) - (this.canvasHeight - 200));
        this.logScrollOffset = Math.max(0, Math.min(maxScroll, this.logScrollOffset + scrollAmount));
        this.render();
      }
    });
  }

  private getCursorAt(x: number, y: number): string {
    const allButtons = [...this.betAmountButtons];
    if (this.betButton) allButtons.push(this.betButton);
    if (this.cashOutButton) allButtons.push(this.cashOutButton);

    for (const button of allButtons) {
      if (button.visible) {
        if (x >= button.x && x <= button.x + button.width && y >= button.y && y <= button.y + button.height) {
          return 'pointer';
        }
      }
    }
    return 'default';
  }

  private handleClick(x: number, y: number) {
    let stateChanged = false;

    for (const button of this.betAmountButtons) {
      if (button.visible) {
        if (x >= button.x && x <= button.x + button.width && y >= button.y && y <= button.y + button.height) {
          button.onClick();
          stateChanged = true;
          break; 
        }
      }
    }

    if (!stateChanged && this.betButton && this.betButton.visible) {
      if (x >= this.betButton.x && x <= this.betButton.x + this.betButton.width && y >= this.betButton.y && y <= this.betButton.y + this.betButton.height) {
        this.betButton.onClick();
        stateChanged = true;
      }
    }

    if (!stateChanged && this.cashOutButton && this.cashOutButton.visible) {
      if (x >= this.cashOutButton.x && x <= this.cashOutButton.x + this.cashOutButton.width && y >= this.cashOutButton.y && y <= this.cashOutButton.y + this.cashOutButton.height) {
        this.cashOutButton.onClick();
        stateChanged = true;
      }
    }

    if (stateChanged) {
      this.updateButtonStates();
      if (!this.isRunning) this.render();
    }
  }

  private updateButtonStates() {
    this.betAmountButtons.forEach(btn => {
      btn.visible = !this.isRunning && this.isGameEnded;
    });

    if (this.betButton) {
      this.betButton.visible = !this.isRunning && this.isGameEnded && this.selectedBetAmount > 0;
    }

    if (this.cashOutButton) {
      this.cashOutButton.visible = this.isRunning && !this.hasCashedOut && !this.crashed;
    }
  }

  private createButtons() {
    const centerX = this.gameAreaWidth * 0.5;
    const bottomY = this.canvasHeight * 0.85;

    const betAmounts = [10, 50, 100, 200, 500];
    const buttonWidth = this.gameAreaWidth * 0.15; 
    const buttonHeight = this.canvasHeight * 0.06;
    const buttonSpacing = this.gameAreaWidth * 0.02;
    
    const amountBtnWidth = buttonWidth * 0.8;
    const totalAmountWidth = betAmounts.length * amountBtnWidth + (betAmounts.length - 1) * buttonSpacing;
    const startX = centerX - totalAmountWidth / 2;

    this.betAmountButtons = betAmounts.map((amount, index) => ({
      x: startX + index * (amountBtnWidth + buttonSpacing),
      y: bottomY - this.canvasHeight * 0.12,
      width: amountBtnWidth,
      height: buttonHeight,
      text: `${amount}P`,
      onClick: () => {
        this.selectedBetAmount = amount;
        this.betAmount = amount;
      },
      visible: true, 
    }));

    this.betButton = {
      x: centerX - (this.gameAreaWidth * 0.3) / 2,
      y: bottomY - this.canvasHeight * 0.02,
      width: this.gameAreaWidth * 0.3,
      height: this.canvasHeight * 0.08,
      text: 'GAME START',
      onClick: () => this.startBet(),
      visible: false,
    };

    this.cashOutButton = {
      x: centerX - (this.gameAreaWidth * 0.3) / 2, 
      y: bottomY - this.canvasHeight * 0.02,
      width: this.gameAreaWidth * 0.3,
      height: this.canvasHeight * 0.08,
      text: 'CASH OUT',
      onClick: () => this.cashOut(),
      visible: false,
    };
  }

  private isProcessing: boolean = false; // [신규] API 처리 중 플래그

  private async startBet() {
    if (this.isRunning || this.isProcessing) return; // [수정] 중복 방지

    if (this.selectedBetAmount === 0) {
      this.showMessage('베팅 금액을 선택해주세요!');
      return;
    }
    if (this.playerPoints < this.selectedBetAmount) {
      this.showMessage('포인트가 부족합니다!');
      return;
    }

    this.isProcessing = true; // 잠금
    this.betAmount = this.selectedBetAmount;

    // 낙관적 업데이트 (UI 반응성)
    const prevPoints = this.playerPoints;
    this.playerPoints -= this.betAmount; 
    
    const token = localStorage.getItem('token');
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
            betAmount: this.betAmount,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          // 서버 데이터로 정확한 동기화
          this.playerPoints = data.points; 
          this.addLog('bet', `베팅: ${this.betAmount.toLocaleString()} P`, -this.betAmount, data.points);
          this.startGame();
        } else {
          const errorData = await response.json();
          this.showMessage(errorData.error || '베팅에 실패했습니다.');
          this.playerPoints = prevPoints; // 롤백
        }
      } catch (error) {
        console.error('Bet error:', error);
        this.showMessage('베팅 중 오류가 발생했습니다.');
        this.playerPoints = prevPoints; // 롤백
      }
    } else {
      this.showMessage('로그인이 필요합니다.');
      this.playerPoints = prevPoints; // 롤백
    }
    this.isProcessing = false; // 잠금 해제
  }

  // [수정] 애니메이션 프레임을 확실히 취소
  private stopAnimation() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private startGame() {
    this.stopAnimation();

    this.isRunning = true;
    this.isGameEnded = false; 
    this.crashed = false;
    this.hasCashedOut = false;
    this.multiplier = 1.0;
    this.startTime = Date.now();
    this.crashPoint = this.generateCrashPoint();
    
    this.updateButtonStates();
    this.showMessage('게임시작 배당상승중');
    
    this.startLoop();
  }

  private generateCrashPoint(): number {
    const r = Math.random();
    const crashPoint = 0.99 / (1 - r);
    return Math.max(1.0, Math.floor(crashPoint * 100) / 100);
  }

  private async cashOut() {
    if (!this.isRunning || this.hasCashedOut || this.crashed || this.isProcessing) return; // [수정] 중복 방지

    this.isProcessing = true; // 잠금
    this.hasCashedOut = true;
    this.cashOutMultiplier = this.multiplier;
    
    const totalWinnings = Math.floor(this.betAmount * this.cashOutMultiplier);
    const profit = totalWinnings - this.betAmount;

    // 낙관적 업데이트
    this.playerPoints += totalWinnings;

    this.updateButtonStates();
    this.showMessage(`캐시아웃! ${this.cashOutMultiplier.toFixed(2)}x (크래시 대기중...)`);

    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await fetch('/api/game/bet', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: 'settle',
            result: 'win',
            betAmount: this.betAmount,
            multiplier: this.cashOutMultiplier,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          // 서버 데이터로 정확한 동기화
          this.playerPoints = data.points; 
          this.addLog('win', `승리: ${this.cashOutMultiplier.toFixed(2)}x (+${profit} P)`, profit, data.points);
        } else {
             // 실패 시?? (이미 게임은 끝났고 돈은 받았다고 쳤는데...)
             // 사실상 서버 오류면 사용자에게 돈을 못 준 셈.
             // 롤백 필요
             this.playerPoints -= totalWinnings;
             this.showMessage('서버 통신 오류! 포인트가 지급되지 않았습니다.');
        }
      } catch (error) {
        console.error('Cash out error:', error);
        this.playerPoints -= totalWinnings; // 롤백
        this.showMessage('네트워크 오류! 포인트가 지급되지 않았습니다.');
      }
    }
    this.isProcessing = false; // 잠금 해제
  }

  private update() {
    // [철벽 방어] 크래시 상태면 무조건 멈춤
    if (this.crashed) {
        this.isRunning = false; // 다시 한 번 확인 사살
        return;
    }
    if (!this.isRunning) return;

    const currentTime = Date.now();
    const elapsedSeconds = (currentTime - this.startTime) / 1000;
    const nextMultiplier = Math.pow(Math.E, this.GAME_SPEED * elapsedSeconds);

    if (nextMultiplier >= this.crashPoint) {
      // 크래시 발생! 동기적으로 즉시 처리
      this.handleCrash();
    } else {
      this.multiplier = nextMultiplier;
    }
  }

  // [핵심] 완전 동기식 크래시 핸들러
  private handleCrash() {
    // 1. 상태 즉시 동결 (가장 중요)
    this.crashed = true;
    this.isRunning = false; 
    this.multiplier = this.crashPoint; // 배율 강제 고정

    // 2. 애니메이션 프레임 정지
    this.stopAnimation();
    
    // 3. UI 업데이트
    this.updateButtonStates();

    // 4. 결과 처리 (비동기 작업은 분리)
    this.processCrashResult();

    // 5. 강제 렌더링 (멈춘 화면 그리기)
    this.render();

    // 6. 5초 후 리셋
    setTimeout(() => {
        // 리셋 하기 전에도 내가 여전히 이 캔버스의 주인인지 확인
        if ((this.canvas as any).__activeBustabitInstance === this.instanceId) {
            this.resetGame();
        }
    }, 5000);
  }

  private async processCrashResult() {
      if (!this.hasCashedOut) {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await fetch('/api/game/bet', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              action: 'settle',
              result: 'lose',
              betAmount: this.betAmount,
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            // 서버 데이터 동기화
            this.playerPoints = data.points; 
            this.addLog('lose', `패배: ${this.crashPoint.toFixed(2)}x (-${this.betAmount} P)`, -this.betAmount, data.points);
          } else {
            // 실패해도 이미 포인트는 깎였으므로(베팅 시) 그냥 현재 포인트 유지
            this.addLog('lose', `패배: ${this.crashPoint.toFixed(2)}x (-${this.betAmount} P)`, -this.betAmount, this.playerPoints);
          }
        } catch (error) {
          console.error('Settlement error:', error);
          this.addLog('lose', `패배: ${this.crashPoint.toFixed(2)}x (-${this.betAmount} P)`, -this.betAmount, this.playerPoints);
        }
      } else {
        this.addLog('lose', `패배: ${this.crashPoint.toFixed(2)}x (-${this.betAmount} P)`, -this.betAmount, this.playerPoints);
      }
      this.showMessage(`크래시! ${this.crashPoint.toFixed(2)}x`);
    } else {
      this.showMessage(`라운드 종료! ${this.crashPoint.toFixed(2)}x 에서 터졌습니다.`);
    }
  }

  private resetGame(initial: boolean = false) {
    this.stopAnimation();

    this.isRunning = false;
    this.isGameEnded = true; 
    this.crashed = false;
    this.hasCashedOut = false;
    this.multiplier = 1.0;
    
    if (!initial) {
        this.showMessage('베팅하세요');
        this.loadUserPoints();
    } else {
        this.showMessage('베팅 금액을 선택하고 게임을 시작하세요.');
    }

    this.betAmount = 0;
    this.selectedBetAmount = 0;
    this.updateButtonStates(); 
    this.render(); 
  }

  private startLoop() {
    const animate = () => {
      // [초강력 방어] 내가 이 캔버스의 현재 주인이 아니면 즉시 자살 (좀비 루프 방지)
      if ((this.canvas as any).__activeBustabitInstance !== this.instanceId) {
          return;
      }

      // 실행 중이 아니면 렌더링 중단
      if (!this.isRunning) return; 

      this.update();
      this.render(); // update 후 즉시 그리기

      if (this.isRunning) {
        this.animationFrameId = requestAnimationFrame(animate);
      }
    };
    this.animationFrameId = requestAnimationFrame(animate);
  }

  public start() {
    this.render();
  }

  private render() {
    // 렌더링 시에도 주인 확인
    if ((this.canvas as any).__activeBustabitInstance !== this.instanceId) return;

    this.ctx.fillStyle = '#0f172a'; 
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    this.renderGameArea();
    this.renderSidebar();
  }

  private renderGameArea() {
    const padding = 60;
    const graphWidth = this.gameAreaWidth - padding * 2;
    const graphHeight = this.canvasHeight - padding * 2;
    const originX = padding;
    const originY = this.canvasHeight - padding;

    // [핵심] 렌더링 시에도 크래시 상태면 무조건 crashPoint 기준으로 그림
    // multiplier가 혹시라도 증가했더라도 무시함
    const renderMultiplier = this.crashed ? this.crashPoint : this.multiplier;

    const currentMaxY = Math.max(2.0, renderMultiplier * 1.1);
    const currentRequiredTime = Math.log(currentMaxY) / this.GAME_SPEED;
    const timeMaxX = Math.max(6.0, currentRequiredTime); 

    this.drawGrid(originX, originY, graphWidth, graphHeight, currentMaxY, timeMaxX);

    if (this.isRunning || this.crashed || this.hasCashedOut || (this.isGameEnded && this.multiplier > 1.0)) {
        this.drawGraphCurve(originX, originY, graphWidth, graphHeight, currentMaxY, timeMaxX);
    }

    this.drawStatusText(graphWidth, graphHeight);
    this.renderUI();
    this.renderButtons();
  }

  private renderSidebar() {
    // 모바일에서는 사이드바 숨김
    if (this.sidebarWidth === 0) return;
    
    const startX = this.gameAreaWidth;
    
    this.ctx.fillStyle = '#1e293b'; 
    this.ctx.fillRect(startX, 0, this.sidebarWidth, this.canvasHeight);
    this.ctx.strokeStyle = '#334155';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(startX, 0);
    this.ctx.lineTo(startX, this.canvasHeight);
    this.ctx.stroke();

    this.ctx.fillStyle = '#94a3b8';
    this.ctx.font = 'bold 16px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('HISTORY LOG', startX + 20, 40);

    const logStartY = 80;
    const logEndY = this.canvasHeight - 20;
    let currentY = logStartY - this.logScrollOffset;
    const rowHeight = 35;

    this.logs.forEach((log) => {
      // 화면 밖이면 스킵
      if (currentY + rowHeight < logStartY || currentY > logEndY) {
        currentY += rowHeight;
        return;
      }

      if (log.type === 'bet') this.ctx.fillStyle = '#facc15'; 
      else if (log.type === 'win') this.ctx.fillStyle = '#4ade80'; 
      else if (log.type === 'lose') this.ctx.fillStyle = '#f87171'; 
      else this.ctx.fillStyle = '#94a3b8';

      this.ctx.font = '14px sans-serif';
      this.ctx.textAlign = 'left';
      
      this.ctx.globalAlpha = 0.5;
      this.ctx.fillText(`[${log.time}]`, startX + 20, currentY);
      this.ctx.globalAlpha = 1.0;

      // 메시지와 포인트 정보 표시
      let logText = log.message;
      if (log.pointsChange !== undefined && log.balance !== undefined) {
        const changeText = log.pointsChange >= 0 ? `+${log.pointsChange.toLocaleString()}` : log.pointsChange.toLocaleString();
        logText += ` (${changeText} P, 잔액: ${log.balance.toLocaleString()} P)`;
      }

      this.ctx.fillText(logText, startX + 90, currentY);
      currentY += rowHeight;
    });
  }

  private drawGrid(ox: number, oy: number, w: number, h: number, maxY: number, maxX: number) {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 1;
    this.ctx.font = '12px Arial';
    this.ctx.fillStyle = '#64748b';
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'middle';

    const steps = 5;
    for (let i = 0; i <= steps; i++) {
        const ratio = i / steps;
        const val = 1 + (maxY - 1) * ratio;
        const y = oy - h * ratio;
        this.ctx.beginPath();
        this.ctx.moveTo(ox, y);
        this.ctx.lineTo(ox + w, y);
        this.ctx.stroke();
        this.ctx.fillText(`${val.toFixed(2)}x`, ox - 10, y);
    }
    this.ctx.beginPath();
    this.ctx.moveTo(ox, oy);
    this.ctx.lineTo(ox, oy - h);
    this.ctx.moveTo(ox, oy);
    this.ctx.lineTo(ox + w, oy);
    this.ctx.stroke();
  }

  private drawGraphCurve(ox: number, oy: number, w: number, h: number, maxY: number, maxX: number) {
    this.ctx.lineWidth = 5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    if (this.crashed) this.ctx.strokeStyle = '#ef4444'; 
    else if (this.hasCashedOut) this.ctx.strokeStyle = '#22c55e'; 
    else this.ctx.strokeStyle = '#eab308'; 

    this.ctx.beginPath();
    this.ctx.moveTo(ox, oy); 

    // [중요] 그릴 때 사용할 배율 결정 (크래시 났으면 무조건 crashPoint 고정)
    const targetMultiplier = this.crashed ? this.crashPoint : this.multiplier;
    const drawTime = Math.log(targetMultiplier) / this.GAME_SPEED;

    const resolution = 50; 
    for (let i = 1; i <= resolution; i++) {
        const t = (drawTime * i) / resolution;
        const m = Math.pow(Math.E, this.GAME_SPEED * t);
        
        // 좌표 변환
        const x = ox + (t / maxX) * w;
        const y = oy - ((m - 1) / (maxY - 1)) * h;
        this.ctx.lineTo(x, y);
    }
    this.ctx.stroke();

    const lastM = targetMultiplier;
    const lastX = ox + (drawTime / maxX) * w;
    const lastY = oy - ((lastM - 1) / (maxY - 1)) * h;

    this.ctx.fillStyle = this.ctx.strokeStyle;
    this.ctx.beginPath();
    this.ctx.arc(lastX, lastY, 8, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawStatusText(w: number, h: number) {
    if (this.isGameEnded && !this.crashed && !this.isRunning) return; 

    const centerX = this.gameAreaWidth / 2;
    const centerY = this.canvasHeight / 2 - 50;

    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.font = 'bold 80px sans-serif';

    const displayMult = this.crashed ? this.crashPoint : this.multiplier;
    
    if (this.crashed) {
        this.ctx.fillStyle = '#ef4444';
        this.ctx.fillText(`${displayMult.toFixed(2)}x`, centerX, centerY);
        this.ctx.font = 'bold 40px sans-serif';
        this.ctx.fillText('CRASHED', centerX, centerY + 60);
    } else if (this.hasCashedOut) {
        this.ctx.fillStyle = '#22c55e';
        this.ctx.fillText(`${this.multiplier.toFixed(2)}x`, centerX, centerY);
        this.ctx.font = 'bold 30px sans-serif';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(`Cashed Out @ ${this.cashOutMultiplier.toFixed(2)}x`, centerX, centerY + 60);
    } else if (this.isRunning) {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(`${displayMult.toFixed(2)}x`, centerX, centerY);
    }
  }

  private renderUI() {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '20px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Points: ${this.playerPoints.toLocaleString()}`, 20, 30);
    
    if (this.selectedBetAmount > 0 && !this.crashed) {
       this.ctx.fillStyle = '#fbbf24';
       this.ctx.fillText(`Bet: ${this.selectedBetAmount.toLocaleString()}`, 20, 60);
    }
  }

  private renderButtons() {
    this.betAmountButtons.forEach(button => {
      if (button.visible) {
        const isSelected = this.selectedBetAmount === parseInt(button.text.replace('P', ''));
        this.drawButton(button, isSelected ? '#22c55e' : '#334155', isSelected);
      }
    });

    if (this.betButton && this.betButton.visible) {
      this.drawButton(this.betButton, '#22c55e'); 
    }

    if (this.cashOutButton && this.cashOutButton.visible) {
      this.drawButton(this.cashOutButton, '#fbbf24'); 
    }
  }

  private drawButton(button: Button, color: string, isSelected: boolean = false) {
    const r = 8; 
    
    this.ctx.shadowColor = 'rgba(0,0,0,0.3)';
    this.ctx.shadowBlur = 5;
    this.ctx.shadowOffsetY = 3;

    this.ctx.fillStyle = color;
    if (isSelected) {
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
    }
    
    this.roundRect(button.x, button.y, button.width, button.height, r);
    this.ctx.fill();
    if (isSelected) this.ctx.stroke();

    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetY = 0;

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `bold ${button.height * 0.4}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(button.text, button.x + button.width / 2, button.y + button.height / 2);
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.arcTo(x + w, y, x + w, y + h, r);
    this.ctx.arcTo(x + w, y + h, x, y + h, r);
    this.ctx.arcTo(x, y + h, x, y, r);
    this.ctx.arcTo(x, y, x + w, y, r);
    this.ctx.closePath();
  }

  destroy() {
    this.stopAnimation();
  }
}