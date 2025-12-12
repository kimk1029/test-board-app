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
  private autoCashout: number = 0; // 0 means disabled

  // 캔버스 크기 및 레이아웃
  private canvasWidth: number = 1200;
  private canvasHeight: number = 800;
  private sidebarWidth: number = 300; 
  private gameAreaWidth: number = 900; 
  
  // [신규] 반응형 스케일 팩터
  private scaleFactor: number = 1;
  private isMobile: boolean = false;
  private isTablet: boolean = false; // New tablet flag

  private logs: GameLog[] = [];
  private logScrollOffset: number = 0;

  private betButton: Button | null = null;
  private cashOutButton: Button | null = null;
  private settingsButton: Button | null = null; // New Settings Button
  private backButton: Button | null = null; // 뒤로가기 버튼
  private betAmountButtons: Button[] = [];
  
  private speedButtons: Button[] = [];

  private isSettingsOpen: boolean = false; // Settings toggle

  private gameSpeed: number = 0.085;
  private isDraggingSlider: boolean = false;
  
  private crashHistory: number[] = []; // 크래시 히스토리 저장 
  
  private onMessage?: (message: string) => void;
  private onLoadingProgress?: (progress: number) => void; 
  
  // [신규] 메시지 콜백 설정 메서드 추가
  public setMessageCallback(callback: (msg: string) => void) {
      this.onMessage = callback;
  }

  // [신규] 로딩 프로그레스 콜백 설정 메서드 추가
  public setLoadingProgressCallback(callback: (progress: number) => void) {
      this.onLoadingProgress = callback;
  }

  // [최적화] 정적 배경 캐싱
  private staticCanvas: HTMLCanvasElement | null = null;
  private staticCtx: CanvasRenderingContext2D | null = null;

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
    this.resetGame(true);
  }

  private async loadUserPoints() {
    // 로딩 프로그레스 시작
    if (this.onLoadingProgress) {
        this.onLoadingProgress(30);
    }
    
    const token = localStorage.getItem('token');
    if (token) {
        try {
            if (this.onLoadingProgress) this.onLoadingProgress(50);
            
            const res = await fetch('/api/user/me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (data.points !== undefined) {
                this.playerPoints = data.points;
            }
            
            if (this.onLoadingProgress) this.onLoadingProgress(100);
        } catch (error) {
            console.error(error);
            if (this.onLoadingProgress) this.onLoadingProgress(100);
        }
    } else {
        // 로그인 안 된 경우에도 로딩 완료
        if (this.onLoadingProgress) this.onLoadingProgress(100);
    }
  }

  // [신규] 메시지 표시 메서드 추가
  private showMessage(msg: string) {
      if (this.onMessage) {
          this.onMessage(msg);
      } else {
          // console.log(msg);
      }
  }

  // [신규] 로그 추가 메서드
  private addLog(type: 'bet' | 'win' | 'lose' | 'info', message: string, pointsChange: number = 0, balance: number = 0) {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      
      this.logs.unshift({
          type,
          message,
          time: timeStr,
          pointsChange,
          balance
      });
      
      if (this.logs.length > 50) {
          this.logs.pop();
      }
      this.render();
  }

  // [최적화] 정적 배경 캐싱
  private cacheStaticLayer() {
      this.staticCanvas = document.createElement('canvas');
      this.staticCanvas.width = this.canvasWidth;
      this.staticCanvas.height = this.canvasHeight;
      this.staticCtx = this.staticCanvas.getContext('2d');
      
      if (!this.staticCtx) return;
      
      const ctx = this.staticCtx;
      
      // 1. 전체 배경
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
      
      // 2. 사이드바 배경
      if (this.sidebarWidth > 0) {
          const sx = this.gameAreaWidth;
          const w = this.sidebarWidth;
          
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(sx, 0, w, this.canvasHeight);
          
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(sx, 0);
          ctx.lineTo(sx, this.canvasHeight);
          ctx.stroke();
          
          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('HISTORY LOG', sx + 20, 40);
      }
      
      // 3. 그래프 그리드 (최대값이 바뀔 때마다 다시 그려야 하지만, 여기선 초기값 기준)
      // Bustabit은 시간에 따라 축이 변하므로 그리드를 매번 그려야 할 수도 있음.
      // 하지만 축이 고정된 게임이라면 캐싱이 유리.
      // Bustabit은 줌아웃되므로 그리드도 동적임. -> 그리드는 캐싱에서 제외하거나, 배경만 캐싱.
      // 여기서는 '배경색'과 '사이드바 배경'만 캐싱.
  }

  // [신규] 리사이즈 메서드 추가
  public resize(width: number, height: number) {
      this.canvasWidth = width;
      this.canvasHeight = height;
      this.canvas.width = width;
      this.canvas.height = height;

      this.isMobile = width < 768;
      this.isTablet = width >= 768 && width < 1280;

      if (this.isMobile) {
          this.sidebarWidth = 0;
          this.gameAreaWidth = width;
          this.scaleFactor = Math.min(width / 400, 1.2);
      } else if (this.isTablet) {
          this.sidebarWidth = width * 0.25; 
          this.gameAreaWidth = width - this.sidebarWidth;
          this.scaleFactor = Math.min(width / 800, 0.9);
      } else {
          this.sidebarWidth = 300;
          this.gameAreaWidth = width - this.sidebarWidth;
          this.scaleFactor = 1.0;
      }

      // UI 요소 위치 재계산
      this.createButtons();
      
      // [최적화] 리사이즈 시 배경 다시 캐싱
      this.cacheStaticLayer();
      
      if (!this.isRunning) {
          this.render();
      }
  }

  private setupEventListeners() {
    const handleInput = (clientX: number, clientY: number) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      this.handleClick(x, y);
    }

    this.canvas.addEventListener('click', (e) => handleInput(e.clientX, e.clientY));
    
    // Touch support
    this.canvas.addEventListener('touchstart', (e) => {
        if(e.touches.length > 0) {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const x = e.touches[0].clientX - rect.left;
            const y = e.touches[0].clientY - rect.top;
            this.handleMouseDown(x, y);
            handleInput(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
        if(e.touches.length > 0 && this.isDraggingSlider) {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const x = e.touches[0].clientX - rect.left;
            const y = e.touches[0].clientY - rect.top;
            this.handleMouseMove(x, y);
        }
    }, { passive: false });

    this.canvas.addEventListener('touchend', () => {
      this.handleMouseUp();
    });

    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.handleMouseDown(x, y);
    });

    this.canvas.addEventListener('mouseup', () => {
      this.handleMouseUp();
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.handleMouseMove(x, y);
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
    if (this.isSettingsOpen) return 'default'; 

    const allButtons = [...this.betAmountButtons, ...this.speedButtons]; 
    if (this.betButton) allButtons.push(this.betButton);
    if (this.cashOutButton) allButtons.push(this.cashOutButton);
    if (this.settingsButton) allButtons.push(this.settingsButton);
    if (this.backButton) allButtons.push(this.backButton);

    for (const button of allButtons) {
      if (button.visible && !button.disabled) {
        if (x >= button.x && x <= button.x + button.width && y >= button.y && y <= button.y + button.height) {
          return 'pointer';
        }
      }
    }
    return 'default';
  }

  private handleMouseDown(x: number, y: number) {
    if (this.isSettingsOpen) {
        const w = 500; const h = 450;
        const sx = (this.canvasWidth - w)/2;
        const sy = (this.canvasHeight - h)/2;
        
        const sliderY = sy + 140;
        const sliderX = sx + 50;
        const sliderW = 400;
        
        if (x >= sliderX && x <= sliderX + sliderW && y >= sliderY - 10 && y <= sliderY + 30) {
            this.isDraggingSlider = true;
            this.updateSliderValue(x, sliderX, sliderW);
        }
    }
  }

  private handleMouseUp() {
    this.isDraggingSlider = false;
  }

  private handleMouseMove(x: number, y: number) {
    if (this.isDraggingSlider && this.isSettingsOpen) {
        const w = 500;
        const sx = (this.canvasWidth - w)/2;
        const sliderX = sx + 50;
        const sliderW = 400;
        
        this.updateSliderValue(x, sliderX, sliderW);
    }
  }

  private updateSliderValue(x: number, sliderX: number, sliderW: number) {
    const ratio = Math.max(0, Math.min(1, (x - sliderX) / sliderW));
    let val = 1.0 + ratio * 9.0;
    if (val < 1.15) val = 0;
    this.autoCashout = val;
    this.render();
  }

  private handleClick(x: number, y: number) {
    if (this.isSettingsOpen) {
        const w = 500; const h = 450;
        const sx = (this.canvasWidth - w)/2;
        const sy = (this.canvasHeight - h)/2;
        
        // Close Button (원형)
        const closeBtnX = sx + w - 30;
        const closeBtnY = sy + 30;
        const closeBtnRadius = 20;
        const dist = Math.sqrt((x - closeBtnX) ** 2 + (y - closeBtnY) ** 2);
        if (dist <= closeBtnRadius) {
            this.isSettingsOpen = false;
            this.render();
            return;
        }

        // Auto Cashout 프리셋 버튼
        const presets = [
            { label: 'OFF', value: 0 },
            { label: '1.5x', value: 1.5 },
            { label: '2x', value: 2.0 },
            { label: '3x', value: 3.0 },
            { label: '5x', value: 5.0 }
        ];
        const presetBtnW = 70;
        const presetBtnH = 40;
        const presetGap = 10;
        const presetStartX = sx + 50;
        const presetStartY = sy + 190;

        presets.forEach((preset, i) => {
            const btnX = presetStartX + i * (presetBtnW + presetGap);
            if (x >= btnX && x <= btnX + presetBtnW && y >= presetStartY && y <= presetStartY + presetBtnH) {
                this.autoCashout = preset.value;
                this.render();
            }
        });

        // 속도 버튼 클릭
        const speeds = [
            { label: 'x1', value: 0.085 },
            { label: 'x2', value: 0.17 },
            { label: 'x3', value: 0.255 }
        ];
        const speedBtnW = 100;
        const speedBtnH = 45;
        const speedGap = 30;
        const speedStartX = sx + 100;
        const speedStartY = sy + 340;

        speeds.forEach((speed, i) => {
            const btnX = speedStartX + i * (speedBtnW + speedGap);
            if (x >= btnX && x <= btnX + speedBtnW && y >= speedStartY && y <= speedStartY + speedBtnH) {
                this.gameSpeed = speed.value;
                this.render();
            }
        });

        return;
    }

    let stateChanged = false;

    const allButtons = [...this.betAmountButtons, ...this.speedButtons];
    if (this.betButton) allButtons.push(this.betButton);
    if (this.cashOutButton) allButtons.push(this.cashOutButton);
    if (this.settingsButton) allButtons.push(this.settingsButton);
    if (this.backButton) allButtons.push(this.backButton);

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

  private createButtons() {
    const centerX = this.gameAreaWidth * 0.5;
    const bottomY = this.canvasHeight * 0.85;

    const betAmounts = [10, 50, 100, 200, 500];
    const buttonWidth = this.gameAreaWidth * 0.15; 
    const buttonHeight = (this.isMobile ? 40 : this.canvasHeight * 0.06);
    const buttonSpacing = this.gameAreaWidth * 0.02;
    
    const amountBtnWidth = buttonWidth * 0.8;
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

    this.settingsButton = {
        x: this.gameAreaWidth - 60,
        y: 20,
        width: 40,
        height: 40,
        text: '⚙️',
        onClick: () => {
            this.isSettingsOpen = !this.isSettingsOpen;
            this.render();
        },
        visible: true
    };

    this.backButton = {
        x: 20,
        y: 20,
        width: 50,
        height: 50,
        text: '⬅',
        onClick: () => {
            window.history.back();
        },
        visible: true
    };

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

  private updateButtonStates() {
    this.betAmountButtons.forEach(btn => {
      btn.visible = !this.isRunning && this.isGameEnded;
      btn.disabled = this.isProcessing;
    });

    this.speedButtons.forEach(btn => {
        btn.visible = false; // 속도 버튼은 설정 메뉴에서만 표시
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
            gameType: 'bustabit',
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

    if (this.autoCashout > 1.05 && !this.crashed && !this.hasCashedOut && nextMultiplier >= this.autoCashout && this.isRunning) {
        this.cashOut();
    }

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
    
    // 크래시 히스토리에 추가 (최대 20개 유지)
    this.crashHistory.unshift(this.crashPoint);
    if (this.crashHistory.length > 20) {
      this.crashHistory.pop();
    } 

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
              gameType: 'bustabit',
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

  public async start() {
    // 로딩 시작
    if (this.onLoadingProgress) {
        this.onLoadingProgress(10);
    }
    
    // 포인트 로딩
    await this.loadUserPoints();
    
    // 렌더링 시작
    this.render();
  }

  private render() {
    if ((this.canvas as any).__activeBustabitInstance !== this.instanceId) return;

    // [최적화] 캐싱된 배경 사용
    if (this.staticCanvas) {
        this.ctx.drawImage(this.staticCanvas, 0, 0);
    } else {
        this.ctx.fillStyle = '#0f172a'; 
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    }

    this.renderGameArea();
    this.renderSidebarContent();
    
    if (this.isSettingsOpen) {
        this.renderSettingsPanel();
    }
  }
  private renderSettingsPanel() {
      const w = 500; const h = 450;
      const x = (this.canvasWidth - w) / 2;
      const y = (this.canvasHeight - h) / 2;

      // 반투명 배경 오버레이
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

      // 설정 패널 배경 (그라데이션 효과)
      const gradient = this.ctx.createLinearGradient(x, y, x, y + h);
      gradient.addColorStop(0, '#1e293b');
      gradient.addColorStop(1, '#0f172a');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(x, y, w, h);

      // 테두리
      this.ctx.strokeStyle = '#3b82f6';
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(x, y, w, h);

      // 타이틀
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 28px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('⚙️ SETTINGS', x + w/2, y + 50);

      // --- AUTO CASHOUT 섹션 ---
      this.ctx.fillStyle = '#64748b';
      this.ctx.fillRect(x + 30, y + 80, w - 60, 150);
      
      this.ctx.fillStyle = '#fbbf24';
      this.ctx.font = 'bold 20px sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.fillText('🎯 Auto Cashout', x + 50, y + 110);

      const sliderY = y + 140;
      const sliderX = x + 50;
      const sliderW = 400;
      
      // 슬라이더 트랙
      this.ctx.fillStyle = '#334155';
      this.ctx.fillRect(sliderX, sliderY + 5, sliderW, 10);
      
      // 활성 영역 (진행바)
      const ratio = this.autoCashout <= 1.0 ? 0 : (this.autoCashout - 1.0) / 9.0;
      const handleX = sliderX + ratio * sliderW;
      
      if (ratio > 0) {
        const activeGradient = this.ctx.createLinearGradient(sliderX, sliderY, handleX, sliderY);
        activeGradient.addColorStop(0, '#3b82f6');
        activeGradient.addColorStop(1, '#8b5cf6');
        this.ctx.fillStyle = activeGradient;
        this.ctx.fillRect(sliderX, sliderY + 5, handleX - sliderX, 10);
      }

      // 슬라이더 핸들 (원형)
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(handleX, sliderY + 10, 14, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.strokeStyle = this.autoCashout > 1.0 ? '#3b82f6' : '#94a3b8';
      this.ctx.lineWidth = 3;
      this.ctx.stroke();

      // 현재 값 표시
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 22px sans-serif';
      this.ctx.textAlign = 'center';
      const valText = this.autoCashout <= 1.05 ? 'OFF' : `${this.autoCashout.toFixed(2)}x`;
      this.ctx.fillText(valText, x + w/2, y + 175);

      // 프리셋 버튼들
      const presets = [
          { label: 'OFF', value: 0 },
          { label: '1.5x', value: 1.5 },
          { label: '2x', value: 2.0 },
          { label: '3x', value: 3.0 },
          { label: '5x', value: 5.0 }
      ];
      const presetBtnW = 70;
      const presetBtnH = 40;
      const presetGap = 10;
      const presetStartX = x + 50;
      const presetStartY = y + 190;

      presets.forEach((preset, i) => {
          const btnX = presetStartX + i * (presetBtnW + presetGap);
          const isActive = Math.abs(this.autoCashout - preset.value) < 0.01;
          
          // 버튼 배경
          this.ctx.fillStyle = isActive ? '#3b82f6' : '#475569';
          this.ctx.fillRect(btnX, presetStartY, presetBtnW, presetBtnH);
          
          // 활성 버튼 테두리
          if (isActive) {
              this.ctx.strokeStyle = '#60a5fa';
              this.ctx.lineWidth = 2;
              this.ctx.strokeRect(btnX, presetStartY, presetBtnW, presetBtnH);
          }
          
          // 버튼 텍스트
          this.ctx.fillStyle = isActive ? '#ffffff' : '#cbd5e1';
          this.ctx.font = 'bold 14px sans-serif';
          this.ctx.textAlign = 'center';
          this.ctx.fillText(preset.label, btnX + presetBtnW/2, presetStartY + presetBtnH/2 + 5);
      });

      // --- GAME SPEED 섹션 ---
      this.ctx.fillStyle = '#64748b';
      this.ctx.fillRect(x + 30, y + 260, w - 60, 130);
      
      this.ctx.fillStyle = '#10b981';
      this.ctx.font = 'bold 20px sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.fillText('⚡ Game Speed', x + 50, y + 290);

      const speeds = [
          { label: 'x1', value: 0.085 },
          { label: 'x2', value: 0.17 },
          { label: 'x3', value: 0.255 }
      ];
      const speedBtnW = 100;
      const speedBtnH = 45;
      const speedGap = 30;
      const speedStartX = x + 100;
      const speedStartY = y + 340;

      speeds.forEach((speed, i) => {
          const btnX = speedStartX + i * (speedBtnW + speedGap);
          const isSelected = Math.abs(this.gameSpeed - speed.value) < 0.01;
          
          // 버튼 배경
          this.ctx.fillStyle = isSelected ? '#10b981' : '#475569';
          this.ctx.fillRect(btnX, speedStartY, speedBtnW, speedBtnH);
          
          // 선택된 버튼 테두리
          if (isSelected) {
              this.ctx.strokeStyle = '#34d399';
              this.ctx.lineWidth = 3;
              this.ctx.strokeRect(btnX, speedStartY, speedBtnW, speedBtnH);
          }
          
          // 버튼 텍스트
          this.ctx.fillStyle = isSelected ? '#ffffff' : '#cbd5e1';
          this.ctx.font = 'bold 20px sans-serif';
          this.ctx.textAlign = 'center';
          this.ctx.fillText(speed.label, btnX + speedBtnW/2, speedStartY + speedBtnH/2 + 7);
      });

      // Close 버튼 (원형)
      const closeBtnX = x + w - 30;
      const closeBtnY = y + 30;
      const closeBtnRadius = 20;
      
      this.ctx.fillStyle = '#ef4444';
      this.ctx.beginPath();
      this.ctx.arc(closeBtnX, closeBtnY, closeBtnRadius, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.strokeStyle = '#dc2626';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 18px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('✕', closeBtnX, closeBtnY);
      this.ctx.textBaseline = 'alphabetic';
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
    this.renderCrashHistory();
  }
  
  private renderCrashHistory() {
    if (this.crashHistory.length === 0) return;
    
    const startX = 80;
    const startY = this.canvasHeight - 45;
    const boxWidth = 55;
    const boxHeight = 32;
    const gap = 3;
    const arrowWidth = 8;
    
    this.ctx.font = 'bold 11px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // 최대 15개까지만 표시
    const displayHistory = this.crashHistory.slice(0, 15);
    
    displayHistory.forEach((crash, i) => {
      const x = startX + i * (boxWidth + gap);
      
      // 배경 색상 (크래시 배율에 따라)
      let bgColor = '#475569';
      if (crash >= 10) bgColor = '#8b5cf6'; // 보라색
      else if (crash >= 5) bgColor = '#3b82f6'; // 파란색
      else if (crash >= 2) bgColor = '#10b981'; // 초록색
      else if (crash < 1.5) bgColor = '#ef4444'; // 빨간색
      
      // 육각형 모양 (< < 형태 - 양쪽 다 왼쪽 향함) 그리기
      this.ctx.fillStyle = bgColor;
      this.ctx.beginPath();
      // 왼쪽 화살촉 (<)
      this.ctx.moveTo(x, startY + boxHeight/2);
      this.ctx.lineTo(x + arrowWidth, startY);
      // 상단
      this.ctx.lineTo(x + boxWidth, startY);
      // 오른쪽 화살촉 (< 모양 - 안쪽으로)
      this.ctx.lineTo(x + boxWidth - arrowWidth, startY + boxHeight/2);
      this.ctx.lineTo(x + boxWidth, startY + boxHeight);
      // 하단
      this.ctx.lineTo(x + arrowWidth, startY + boxHeight);
      this.ctx.closePath();
      this.ctx.fill();
      
      // 테두리
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
      
      // 텍스트
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillText(`${crash.toFixed(2)}x`, x + boxWidth/2, startY + boxHeight/2);
    });
  }

  private renderSidebarContent() {
    if (this.sidebarWidth === 0) return;
    
    const startX = this.gameAreaWidth;
    
    // 배경은 staticCanvas에 이미 그려져 있음
    // 로그와 스크롤 등 동적 요소만 렌더링

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
    this.ctx.font = '18px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Points: ${this.playerPoints.toLocaleString()}`, 85, 35);
    
    if (this.selectedBetAmount > 0 && !this.crashed) {
       this.ctx.fillStyle = '#fbbf24';
       this.ctx.fillText(`Bet: ${this.selectedBetAmount.toLocaleString()}`, 85, 60);
    }
  }

  private renderButtons() {
    const buttonsToRender = [...this.betAmountButtons, ...this.speedButtons];
    
    // 톱니바퀴 버튼 렌더링 (항상 표시)
    if (this.settingsButton) {
      this.ctx.fillStyle = '#475569';
      this.ctx.fillRect(this.settingsButton.x, this.settingsButton.y, this.settingsButton.width, this.settingsButton.height);
      this.ctx.strokeStyle = '#64748b';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(this.settingsButton.x, this.settingsButton.y, this.settingsButton.width, this.settingsButton.height);
      this.ctx.font = '24px sans-serif';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(this.settingsButton.text, this.settingsButton.x + this.settingsButton.width/2, this.settingsButton.y + this.settingsButton.height/2);
    }
    
    // 뒤로가기 버튼 렌더링 (원형 디자인)
    if (this.backButton) {
      const centerX = this.backButton.x + this.backButton.width/2;
      const centerY = this.backButton.y + this.backButton.height/2;
      const radius = 25;
      
      // 원형 배경
      this.ctx.fillStyle = '#333333';
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      this.ctx.fill();
      
      // 테두리
      this.ctx.strokeStyle = '#888888';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      
      // 화살표 아이콘
      this.ctx.font = '24px sans-serif';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(this.backButton.text, centerX, centerY);
    }
    
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
    
    this.ctx.shadowColor = 'transparent'; // 최적화: 그림자 제거
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetY = 0;

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
