// BustabitGame.ts

interface Button {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  onClick: () => void;
  visible: boolean;
  disabled?: boolean;
}

interface GameLog {
  type: 'bet' | 'win' | 'lose' | 'info';
  message: string;
  time: string;
  pointsChange?: number; 
  balance?: number; 
}

export class BustabitGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
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
  
  // [신규] 반응형 스케일 팩터
  private scaleFactor: number = 1;
  private isMobile: boolean = false;

  private logs: GameLog[] = [];
  private logScrollOffset: number = 0;

  private betButton: Button | null = null;
  private cashOutButton: Button | null = null;
  private betAmountButtons: Button[] = [];
  
  private speedButtons: Button[] = [];

  private gameSpeed: number = 0.085; 
  
  private onMessage?: (message: string) => void;
  private onLoadingProgress?: (progress: number) => void; 

  private isProcessing: boolean = false;

  constructor(canvas: HTMLCanvasElement, betAmount: number = 0, width: number = 1200, height: number = 800) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.betAmount = betAmount;
    
    this.instanceId = Math.random();
    (this.canvas as any).__activeBustabitInstance = this.instanceId;

    // 초기 리사이즈
    this.resize(width, height);

    this.createButtons(); 
    this.setupEventListeners();
    
    // 초기화 및 로딩 시작
    this.initializeGame();
  }

  // [신규] 리사이즈 메서드 추가
  public resize(width: number, height: number) {
      this.canvasWidth = width;
      this.canvasHeight = height;
      this.canvas.width = width;
      this.canvas.height = height;

      this.isMobile = width < 768;

      if (this.isMobile) {
          this.sidebarWidth = 0;
          this.gameAreaWidth = width;
          // 모바일에서는 스케일 조정
          this.scaleFactor = Math.min(width / 400, 1.2);
      } else if (width < 1024) {
          this.sidebarWidth = width * 0.25; // 25%
          this.gameAreaWidth = width - this.sidebarWidth;
          this.scaleFactor = Math.min(width / 1000, 1.0);
      } else {
          this.sidebarWidth = 300;
          this.gameAreaWidth = width - this.sidebarWidth;
          this.scaleFactor = 1.0;
      }

      // UI 요소 위치 재계산
      this.createButtons();
      
      if (!this.isRunning) {
          this.render();
      }
  }

  // ... (나머지 메서드는 동일하되, 위치 계산 시 scaleFactor나 gameAreaWidth를 사용하므로 createButtons 내부 로직 확인 필요)

  private createButtons() {
    // scaleFactor 고려하여 버튼 크기 및 위치 조정
    const centerX = this.gameAreaWidth * 0.5;
    const bottomY = this.canvasHeight * 0.85;

    const betAmounts = [10, 50, 100, 200, 500];
    const buttonWidth = this.gameAreaWidth * 0.15; 
    const buttonHeight = (this.isMobile ? 40 : this.canvasHeight * 0.06);
    const buttonSpacing = this.gameAreaWidth * 0.02;
    
    const amountBtnWidth = buttonWidth * 0.8;
    // 모바일이면 2줄로 배치하거나 크기 조정 필요. 여기선 간단히 스케일링
    const totalAmountWidth = betAmounts.length * amountBtnWidth + (betAmounts.length - 1) * buttonSpacing;
    const startX = centerX - totalAmountWidth / 2;

    this.betAmountButtons = betAmounts.map((amount, index) => ({
      x: startX + index * (amountBtnWidth + buttonSpacing),
      y: bottomY - (this.isMobile ? 60 : this.canvasHeight * 0.12),
      width: amountBtnWidth,
      height: buttonHeight,
      text: `${amount}P`,
      onClick: () => {
        this.selectedBetAmount = amount;
        this.betAmount = amount;
      },
      visible: true, 
    }));

    // 속도 버튼
    const speeds = [
        { label: 'x1', value: 0.085 },
        { label: 'x2', value: 0.17 },
        { label: 'x3', value: 0.255 }
    ];
    const speedBtnW = (this.isMobile ? 40 : 60);
    const speedBtnH = (this.isMobile ? 30 : 40);
    const speedStartX = 20;
    const speedBottomY = bottomY;

    this.speedButtons = speeds.map((speed, i) => ({
        x: speedStartX + i * (speedBtnW + 10),
        y: speedBottomY,
        width: speedBtnW,
        height: speedBtnH,
        text: speed.label,
        onClick: () => {
            this.gameSpeed = speed.value;
        },
        visible: true
    }));

    const actionBtnW = (this.isMobile ? 120 : this.gameAreaWidth * 0.3);
    const actionBtnH = (this.isMobile ? 50 : this.canvasHeight * 0.08);

    this.betButton = {
      x: centerX - actionBtnW / 2,
      y: bottomY - (this.isMobile ? 10 : this.canvasHeight * 0.02),
      width: actionBtnW,
      height: actionBtnH,
      text: 'GAME START',
      onClick: () => this.startBet(),
      visible: false,
    };

    this.cashOutButton = {
      x: centerX - actionBtnW / 2, 
      y: bottomY - (this.isMobile ? 10 : this.canvasHeight * 0.02),
      width: actionBtnW,
      height: actionBtnH,
      text: 'CASH OUT',
      onClick: () => this.cashOut(),
      visible: false,
    };
  }

  // ... (나머지 로직 그대로 유지)
  private async initializeGame() {
      this.updateLoading(10);
      await this.loadUserPoints();
      this.updateLoading(50);
      
      setTimeout(() => {
          this.updateLoading(80);
          this.resetGame(true);
          this.updateLoading(100);
      }, 500);
  }

  private updateLoading(progress: number) {
      if (this.onLoadingProgress) {
          this.onLoadingProgress(progress);
      }
  }

  setMessageCallback(callback: (message: string) => void) {
    this.onMessage = callback;
  }

  setLoadingProgressCallback(callback: (progress: number) => void) {
      this.onLoadingProgress = callback;
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
        console.warn('Failed to fetch points, keeping previous value');
      }
    } catch (error) {
      console.error('Failed to load user points:', error);
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

    this.canvas.addEventListener('wheel', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      
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
    const allButtons = [...this.betAmountButtons, ...this.speedButtons]; 
    if (this.betButton) allButtons.push(this.betButton);
    if (this.cashOutButton) allButtons.push(this.cashOutButton);

    for (const button of allButtons) {
      if (button.visible && !button.disabled) {
        if (x >= button.x && x <= button.x + button.width && y >= button.y && y <= button.y + button.height) {
          return 'pointer';
        }
      }
    }
    return 'default';
  }

  private handleClick(x: number, y: number) {
    let stateChanged = false;

    const allButtons = [...this.betAmountButtons, ...this.speedButtons];
    if (this.betButton) allButtons.push(this.betButton);
    if (this.cashOutButton) allButtons.push(this.cashOutButton);

    for (const button of allButtons) {
        if (button.visible && !button.disabled) {
            if (x >= button.x && x <= button.x + button.width && y >= button.y && y <= button.y + button.height) {
                button.onClick();
                stateChanged = true;
                break;
            }
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
      btn.disabled = this.isProcessing;
    });

    this.speedButtons.forEach(btn => {
        btn.visible = true;
    });

    if (this.betButton) {
      this.betButton.visible = !this.isRunning && this.isGameEnded && this.selectedBetAmount > 0;
      this.betButton.disabled = this.isProcessing;
    }

    if (this.cashOutButton) {
      this.cashOutButton.visible = this.isRunning && !this.hasCashedOut && !this.crashed;
      this.cashOutButton.disabled = this.isProcessing;
    }
  }

  private async startBet() {
    if (this.isRunning || this.isProcessing) return; 

    if (this.selectedBetAmount === 0) {
      this.showMessage('베팅 금액을 선택해주세요!');
      return;
    }
    if (this.playerPoints < this.selectedBetAmount) {
      this.showMessage('포인트가 부족합니다!');
      return;
    }

    this.isProcessing = true;
    this.updateButtonStates(); 
    
    this.betAmount = this.selectedBetAmount;

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
          this.playerPoints = data.points; 
          this.addLog('bet', `베팅: ${this.betAmount.toLocaleString()} P`, -this.betAmount, data.points);
          this.startGame();
        } else {
          const errorData = await response.json();
          this.showMessage(errorData.error || '베팅에 실패했습니다.');
          this.playerPoints = prevPoints; 
        }
      } catch (error) {
        console.error('Bet error:', error);
        this.showMessage('베팅 중 오류가 발생했습니다.');
        this.playerPoints = prevPoints; 
      }
    } else {
      this.showMessage('로그인이 필요합니다.');
      this.playerPoints = prevPoints; 
    }
    
    if (!this.isRunning) {
        this.isProcessing = false;
        this.updateButtonStates();
    }
  }

  private stopAnimation() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private startGame() {
    this.stopAnimation();

    this.isRunning = true;
    this.isProcessing = false; 
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
    if (!this.isRunning || this.hasCashedOut || this.crashed || this.isProcessing) return;

    this.isProcessing = true;
    this.hasCashedOut = true;
    this.cashOutMultiplier = this.multiplier;
    
    const totalWinnings = Math.floor(this.betAmount * this.cashOutMultiplier);
    const profit = totalWinnings - this.betAmount;

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
          this.playerPoints = data.points; 
          this.addLog('win', `승리: ${this.cashOutMultiplier.toFixed(2)}x (+${profit} P)`, profit, data.points);
        } else {
             this.playerPoints -= totalWinnings;
             this.showMessage('서버 통신 오류! 포인트가 지급되지 않았습니다.');
        }
      } catch (error) {
        console.error('Cash out error:', error);
        this.playerPoints -= totalWinnings;
        this.showMessage('네트워크 오류! 포인트가 지급되지 않았습니다.');
      }
    }
    this.isProcessing = false;
  }

  private update() {
    if (this.crashed) {
        this.isRunning = false;
        return;
    }
    if (!this.isRunning) return;

    const currentTime = Date.now();
    const elapsedSeconds = (currentTime - this.startTime) / 1000;
    const nextMultiplier = Math.pow(Math.E, this.gameSpeed * elapsedSeconds);

    if (nextMultiplier >= this.crashPoint) {
      this.handleCrash();
    } else {
      this.multiplier = nextMultiplier;
    }
  }

  private handleCrash() {
    this.crashed = true;
    this.isRunning = false; 
    this.multiplier = this.crashPoint; 

    this.stopAnimation();
    this.updateButtonStates();
    this.processCrashResult();
    this.render();

    setTimeout(() => {
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
            this.playerPoints = data.points; 
            this.addLog('lose', `패배: ${this.crashPoint.toFixed(2)}x (-${this.betAmount} P)`, -this.betAmount, data.points);
          } else {
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
      if ((this.canvas as any).__activeBustabitInstance !== this.instanceId) {
          return;
      }

      if (!this.isRunning) return; 

      this.update();
      this.render(); 

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

    const renderMultiplier = this.crashed ? this.crashPoint : this.multiplier;

    const currentMaxY = Math.max(2.0, renderMultiplier * 1.1);
    const currentRequiredTime = Math.log(currentMaxY) / this.gameSpeed;
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

    const targetMultiplier = this.crashed ? this.crashPoint : this.multiplier;
    const drawTime = Math.log(targetMultiplier) / this.gameSpeed;

    const resolution = 50; 
    for (let i = 1; i <= resolution; i++) {
        const t = (drawTime * i) / resolution;
        const m = Math.pow(Math.E, this.gameSpeed * t);
        
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
    const buttonsToRender = [...this.betAmountButtons, ...this.speedButtons];
    
    buttonsToRender.forEach(button => {
      if (button.visible) {
        let isSelected = false;
        if (this.betAmountButtons.includes(button)) {
            isSelected = this.selectedBetAmount === parseInt(button.text.replace('P', ''));
        } else if (this.speedButtons.includes(button)) {
            if (button.text === 'x1' && this.gameSpeed === 0.085) isSelected = true;
            if (button.text === 'x2' && this.gameSpeed === 0.17) isSelected = true;
            if (button.text === 'x3' && this.gameSpeed === 0.255) isSelected = true;
        }

        const btnColor = button.disabled ? '#475569' : (isSelected ? '#22c55e' : '#334155');
        this.drawButton(button, btnColor, isSelected);
      }
    });

    if (this.betButton && this.betButton.visible) {
      const btnColor = this.betButton.disabled ? '#475569' : '#22c55e';
      this.drawButton(this.betButton, btnColor); 
    }

    if (this.cashOutButton && this.cashOutButton.visible) {
      const btnColor = this.cashOutButton.disabled ? '#475569' : '#fbbf24';
      this.drawButton(this.cashOutButton, btnColor); 
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

    this.ctx.fillStyle = button.disabled ? '#94a3b8' : '#ffffff';
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
