'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import dynamic from 'next/dynamic';

const PhaserGame = dynamic(() => Promise.resolve(GameComponent), { ssr: false });

export default function OrbitalDefensePage() {
    const [myBestScore, setMyBestScore] = useState(0);

    useEffect(() => {
        const savedScore = localStorage.getItem('orbital_defense_best');
        if (savedScore) {
            setMyBestScore(parseInt(savedScore));
        }
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#09090b] text-white p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-30">
                <div className="absolute w-[2px] h-[2px] bg-green-400 rounded-full top-10 left-20 animate-pulse"></div>
                <div className="absolute w-[3px] h-[3px] bg-yellow-400 rounded-full top-40 left-80 animate-pulse delay-75"></div>
                <div className="absolute w-[2px] h-[2px] bg-red-400 rounded-full top-60 right-20 animate-pulse delay-150"></div>
            </div>

            {/* Header Buttons */}
            <div className="absolute top-6 left-6 z-10 flex items-center gap-4">
                <Link href="/game">
                    <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full bg-black/40 border border-white/10 text-white hover:bg-white/10 hover:text-green-400 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
            </div>

            <h1 className="text-2xl md:text-4xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-yellow-600 drop-shadow-[0_2px_10px_rgba(34,197,94,0.5)] z-10 italic tracking-tighter px-4 text-center">
                ORBITAL <span className="text-xl md:text-2xl not-italic font-light text-white/80">DEFENSE</span>
            </h1>

            <div className="flex flex-col items-center justify-center z-10 mt-2 md:mt-4 relative w-full px-4">
                {/* Game Container - 정중앙 배치 */}
                <div className="relative rounded-xl md:rounded-2xl overflow-hidden border-2 md:border-4 border-green-500/20 shadow-[0_0_50px_rgba(34,197,94,0.1)] w-full max-w-[400px] aspect-[2/3] md:w-[400px] md:h-[600px] bg-[#0a0a0c] mx-auto">
                    <PhaserGame onScoreUpdate={setMyBestScore} />
                </div>
            </div>

            {/* 컨트롤 안내 */}
            <div className="mt-4 md:mt-6 text-slate-400 z-10 flex flex-col md:flex-row items-center gap-2 md:gap-4 text-xs md:text-sm tracking-widest uppercase pointer-events-none px-4">
                <span className="flex items-center gap-1"><kbd className="bg-white/10 px-2 py-1 rounded border border-white/10 text-[10px] md:text-xs">MOUSE</kbd> AIM</span>
                <span className="flex items-center gap-1"><kbd className="bg-white/10 px-2 py-1 rounded border border-white/10 text-[10px] md:text-xs">CLICK</kbd> FIRE</span>
            </div>
        </div>
    );
}

interface GameComponentProps {
    onScoreUpdate?: (score: number) => void;
}

interface SoundSynth {
    ctx: AudioContext;
    enabled: boolean;
    playTone(freq: number, type?: OscillatorType, duration?: number, vol?: number): void;
    playShoot(): void;
    playExplosion(): void;
    playUpgrade(): void;
}

class SoundSynth implements SoundSynth {
    constructor() {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)() as AudioContext;
        this.enabled = true;
    }

    playTone(freq: number, type: OscillatorType = 'sine', duration: number = 0.1, vol: number = 0.1): void {
        if (!this.enabled) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(vol, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
            // Ignore errors
        }
    }

    playShoot(): void {
        // 슉! 하는 소리
        this.playTone(400, 'square', 0.1, 0.05);
    }

    playExplosion(): void {
        // 쾅! 하는 낮은 소리
        this.playTone(100, 'sawtooth', 0.2, 0.1);
        setTimeout(() => this.playTone(50, 'square', 0.2, 0.1), 50);
    }

    playUpgrade(): void {
        // 띠리링! 업그레이드 소리
        this.playTone(600, 'sine', 0.1, 0.1);
        setTimeout(() => this.playTone(800, 'sine', 0.1, 0.1), 100);
    }
}

const GameComponent = ({ onScoreUpdate }: GameComponentProps) => {
    const gameRef = useRef<HTMLDivElement>(null);
    const scoreAbortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        let game: Phaser.Game | null = null;

        const initPhaser = async () => {
            const Phaser = (await import('phaser')).default;

            // 점수 저장 함수
            const saveScore = async (score: number) => {
                const token = localStorage.getItem('token');
                if (token) {
                    if (scoreAbortControllerRef.current) {
                        scoreAbortControllerRef.current.abort();
                    }

                    scoreAbortControllerRef.current = new AbortController();

                    try {
                        await fetch('/api/game/score', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                gameType: 'orbital-defense',
                                score: score
                            }),
                            signal: scoreAbortControllerRef.current.signal
                        });
                    } catch (error: any) {
                        if (error.name !== 'AbortError') {
                            console.error('Score save failed', error);
                        }
                    } finally {
                        scoreAbortControllerRef.current = null;
                    }
                }
            };

            class MainScene extends Phaser.Scene {
                private gameWidth!: number;
                private gameHeight!: number;
                private gold!: number;
                private score!: number;
                private isRunning!: boolean;
                private gameOverFlag!: boolean;
                private stats!: {
                    fireRate: number;
                    fireRateLevel: number;
                    fireRateCost: number;
                    bulletSpeed: number;
                    bulletLevel: number;
                    bulletCost: number;
                };
                private lastFired!: number;
                private synth!: SoundSynth;
                private player!: Phaser.GameObjects.Triangle;
                private bullets!: Phaser.Physics.Arcade.Group;
                private enemies!: Phaser.Physics.Arcade.Group;
                private isFiring!: boolean;
                private spawnTimer!: Phaser.Time.TimerEvent;
                private scoreText!: Phaser.GameObjects.Text;
                private goldText!: Phaser.GameObjects.Text;
                private btnFireRate!: { container: Phaser.GameObjects.Container; costText: Phaser.GameObjects.Text; bg: Phaser.GameObjects.Rectangle };
                private btnPower!: { container: Phaser.GameObjects.Container; costText: Phaser.GameObjects.Text; bg: Phaser.GameObjects.Rectangle };

                constructor() {
                    super('MainScene');
                }

                create(): void {
                    this.gameWidth = this.scale.width;
                    this.gameHeight = this.scale.height;
                    
                    // 게임 상태 변수
                    this.gold = 0;
                    this.score = 0;
                    this.isRunning = true;
                    this.gameOverFlag = false;
                    
                    // 업그레이드 스탯
                    this.stats = {
                        fireRate: 500, // 발사 간격 (ms) - 낮을수록 빠름
                        fireRateLevel: 1,
                        fireRateCost: 50,
                        
                        bulletSpeed: 400, // 총알 속도
                        bulletLevel: 1,
                        bulletCost: 50
                    };
                    
                    this.lastFired = 0;
                    this.synth = new SoundSynth();

                    // 배경
                    this.add.rectangle(0, 0, this.gameWidth, this.gameHeight, 0x000000).setOrigin(0);
                    
                    // 격자 무늬 배경 효과
                    this.add.grid(this.gameWidth/2, this.gameHeight/2, this.gameWidth, this.gameHeight, 50, 50, 0x000000, 0, 0x004400, 0.2);

                    // 플레이어 (중앙 포탑)
                    this.player = this.add.triangle(this.gameWidth/2, this.gameHeight/2, 0, 20, 20, 20, 10, 0, 0x00ff00);
                    this.player.setOrigin(0.5, 0.5);
                    this.physics.add.existing(this.player);
                    (this.player.body as Phaser.Physics.Arcade.Body).setCircle(15);
                    (this.player.body as Phaser.Physics.Arcade.Body).setImmovable(true);

                    // 그룹 설정
                    this.bullets = this.physics.add.group();
                    this.enemies = this.physics.add.group();
                    
                    // UI 설정
                    this.setupUI();

                    // 입력 설정
                    // 마우스 움직임에 따라 회전
                    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
                        if (!this.isRunning) return;
                        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.x, pointer.y);
                        this.player.setRotation(angle + Math.PI / 2);
                    });

                    // 클릭하고 있으면 발사 (플래그 처리)
                    this.isFiring = false;
                    this.input.on('pointerdown', () => this.isFiring = true);
                    this.input.on('pointerup', () => this.isFiring = false);

                    // 적 생성 타이머
                    this.spawnTimer = this.time.addEvent({
                        delay: 1000,
                        callback: this.spawnEnemy,
                        callbackScope: this,
                        loop: true
                    });

                    // 충돌 처리
                    this.physics.add.overlap(this.bullets, this.enemies, (bullet, enemy) => {
                        this.hitEnemy(bullet, enemy);
                    }, undefined, this);
                    this.physics.add.collider(this.player, this.enemies, () => {
                        this.gameOver();
                    }, undefined, this);
                }

                setupUI(): void {
                    // 상단 정보
                    this.scoreText = this.add.text(20, 20, 'Score: 0', { fontSize: '24px', color: '#fff' });
                    this.goldText = this.add.text(20, 50, 'Gold: 0', { fontSize: '24px', color: '#ffff00' });

                    // 하단 업그레이드 버튼 컨테이너
                    const bottomY = this.gameHeight - 60;
                    
                    // 1. 공격 속도 업그레이드 버튼
                    this.btnFireRate = this.createUpgradeButton(10, bottomY, 'Rapid Fire', 'fireRate');
                    // 2. 파워/속도 업그레이드 버튼
                    this.btnPower = this.createUpgradeButton(210, bottomY, 'Bullet Spd', 'bulletSpeed');
                }

                createUpgradeButton(x: number, y: number, label: string, type: string): { container: Phaser.GameObjects.Container; costText: Phaser.GameObjects.Text; bg: Phaser.GameObjects.Rectangle } {
                    const bg = this.add.rectangle(0, 0, 190, 50, 0x333333).setOrigin(0);
                    const title = this.add.text(10, 5, label, { fontSize: '14px', color: '#aaa' });
                    const costText = this.add.text(10, 25, '$50 (Lv.1)', { fontSize: '16px', color: '#ffff00', fontStyle: 'bold' });
                    
                    const container = this.add.container(x, y, [bg, title, costText]);
                    container.setSize(190, 50);
                    container.setInteractive({ useHandCursor: true });

                    container.on('pointerdown', () => {
                        this.tryUpgrade(type, costText);
                    });

                    return { container, costText, bg };
                }

                tryUpgrade(type: string, textObj: Phaser.GameObjects.Text): void {
                    if (!this.isRunning) return;

                    let cost = 0;
                    if (type === 'fireRate') cost = this.stats.fireRateCost;
                    if (type === 'bulletSpeed') cost = this.stats.bulletCost;

                    if (this.gold >= cost) {
                        // 구매 성공
                        this.gold -= cost;
                        this.synth.playUpgrade();
                        
                        if (type === 'fireRate') {
                            this.stats.fireRate = Math.max(50, this.stats.fireRate * 0.9);
                            this.stats.fireRateLevel++;
                            this.stats.fireRateCost = Math.floor(this.stats.fireRateCost * 1.5);
                            textObj.setText(`$${this.stats.fireRateCost} (Lv.${this.stats.fireRateLevel})`);
                        } else {
                            this.stats.bulletSpeed += 100;
                            this.stats.bulletLevel++;
                            this.stats.bulletCost = Math.floor(this.stats.bulletCost * 1.5);
                            textObj.setText(`$${this.stats.bulletCost} (Lv.${this.stats.bulletLevel})`);
                        }
                        
                        this.updateUI();
                    } else {
                        // 돈 부족 피드백 (빨간색 깜빡임)
                        this.tweens.add({
                            targets: textObj,
                            scale: 1.2,
                            duration: 100,
                            yoyo: true,
                            onStart: () => textObj.setColor('#ff0000'),
                            onComplete: () => textObj.setColor('#ffff00')
                        });
                    }
                }

                update(time: number, delta: number): void {
                    if (!this.isRunning) return;

                    // 총알 발사 로직
                    if (this.isFiring && time > this.lastFired) {
                        this.fireBullet();
                        this.lastFired = time + this.stats.fireRate;
                    }

                    // 화면 밖으로 나간 총알 제거 (메모리 관리)
                    this.bullets.children.entries.forEach((b: any) => {
                        if (b.active && (b.x < 0 || b.x > this.gameWidth || b.y < 0 || b.y > this.gameHeight)) {
                            b.destroy();
                        }
                    });
                }

                fireBullet(): void {
                    const bullet = this.add.circle(this.player.x, this.player.y, 4, 0xffff00);
                    this.physics.add.existing(bullet);
                    this.bullets.add(bullet);

                    // 플레이어가 바라보는 방향 계산
                    const angle = this.player.rotation - Math.PI/2;
                    
                    this.physics.velocityFromRotation(angle, this.stats.bulletSpeed, (bullet.body as Phaser.Physics.Arcade.Body).velocity);
                    this.synth.playShoot();
                }

                spawnEnemy(): void {
                    if (!this.isRunning) return;

                    // 화면 밖 랜덤 위치 생성
                    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
                    const radius = Math.max(this.gameWidth, this.gameHeight) / 2 + 50;
                    const x = this.gameWidth/2 + Math.cos(angle) * radius;
                    const y = this.gameHeight/2 + Math.sin(angle) * radius;

                    const enemy = this.add.circle(x, y, 10, 0xff0055);
                    this.physics.add.existing(enemy);
                    this.enemies.add(enemy);

                    // 중앙 플레이어를 향해 이동
                    this.physics.moveToObject(enemy, this.player, 100 + (this.stats.bulletLevel * 5));
                }

                hitEnemy(bullet: any, enemy: any): void {
                    const b = bullet as Phaser.GameObjects.Arc;
                    const e = enemy as Phaser.GameObjects.Arc;
                    
                    if (!b.active || !e.active) return;

                    b.destroy();
                    e.destroy();

                    // 파티클 이펙트
                    this.createExplosion(e.x, e.y);
                    this.synth.playExplosion();

                    // 보상
                    this.gold += 10;
                    this.score += 100;
                    
                    // 텍스트 플로팅
                    this.showFloatingText(e.x, e.y, '+$10', 0xffff00);

                    this.updateUI();
                }

                createExplosion(x: number, y: number): void {
                    // 간단한 파티클 대체 (도형 흩뿌리기)
                    for(let i=0; i<5; i++) {
                        const p = this.add.rectangle(x, y, 4, 4, 0xffaa00);
                        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
                        const speed = Phaser.Math.FloatBetween(50, 150);
                        
                        this.physics.add.existing(p);
                        (p.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

                        this.tweens.add({
                            targets: p,
                            alpha: 0,
                            scale: 0,
                            duration: 500,
                            onComplete: () => p.destroy()
                        });
                    }
                }

                showFloatingText(x: number, y: number, msg: string, color: number): void {
                    const txt = this.add.text(x, y, msg, { fontSize: '14px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
                    if (color) txt.setColor(`#${color.toString(16).padStart(6, '0')}`);
                    
                    this.tweens.add({
                        targets: txt,
                        y: y - 30,
                        alpha: 0,
                        duration: 800,
                        onComplete: () => txt.destroy()
                    });
                }

                updateUI(): void {
                    this.scoreText.setText(`Score: ${this.score}`);
                    this.goldText.setText(`Gold: ${this.gold}`);
                    
                    // 버튼 상태 업데이트 (돈 있으면 활성화 색상, 없으면 어둡게)
                    const updateBtnColor = (btnObj: { bg: Phaser.GameObjects.Rectangle }, cost: number) => {
                        if (this.gold >= cost) btnObj.bg.setFillStyle(0x444444);
                        else btnObj.bg.setFillStyle(0x222222);
                    };
                    
                    updateBtnColor(this.btnFireRate, this.stats.fireRateCost);
                    updateBtnColor(this.btnPower, this.stats.bulletCost);
                }

                async gameOver(): Promise<void> {
                    if (this.gameOverFlag) return;
                    this.gameOverFlag = true;
                    this.isRunning = false;
                    
                    this.physics.pause();
                    this.player.setFillStyle(0x555555);
                    
                    this.cameras.main.shake(500, 0.05);
                    this.synth.playExplosion();

                    const box = this.add.rectangle(this.gameWidth/2, this.gameHeight/2, 300, 200, 0x000000, 0.8);
                    const txt = this.add.text(this.gameWidth/2, this.gameHeight/2 - 20, 'GAME OVER', { fontSize: '40px', color: '#ff0000', fontStyle: 'bold' }).setOrigin(0.5);
                    const scoreTxt = this.add.text(this.gameWidth/2, this.gameHeight/2 + 30, `Score: ${this.score}`, { fontSize: '24px', color: '#fff' }).setOrigin(0.5);
                    const restartTxt = this.add.text(this.gameWidth/2, this.gameHeight/2 + 80, 'Click to Restart', { fontSize: '18px', color: '#aaa' }).setOrigin(0.5);
                    
                    const savedScore = parseInt(localStorage.getItem('orbital_defense_best') || '0');
                    if (this.score > savedScore) {
                        localStorage.setItem('orbital_defense_best', this.score.toString());
                        if (onScoreUpdate) {
                            onScoreUpdate(this.score);
                        }
                        await saveScore(this.score);
                    }
                    
                    this.input.on('pointerdown', () => {
                        this.scene.restart();
                    });
                }
            }

            // 모바일 대응: 화면 크기에 따라 게임 크기 조정
            const getGameSize = () => {
                if (typeof window === 'undefined') return { width: 400, height: 600 };
                const isMobile = window.innerWidth < 768;
                if (isMobile) {
                    const maxWidth = Math.min(window.innerWidth * 0.9, 400);
                    return { width: maxWidth, height: maxWidth * 1.5 };
                }
                return { width: 400, height: 600 };
            };

            const gameSize = getGameSize();

            const config: Phaser.Types.Core.GameConfig = {
                type: Phaser.AUTO,
                width: gameSize.width,
                height: gameSize.height,
                parent: gameRef.current || undefined,
                backgroundColor: '#111',
                scene: MainScene,
                physics: {
                    default: 'arcade',
                    arcade: { debug: false }
                },
                scale: {
                    mode: Phaser.Scale.FIT,
                    autoCenter: Phaser.Scale.CENTER_BOTH,
                    width: gameSize.width,
                    height: gameSize.height
                }
            };

            game = new Phaser.Game(config);
        };

        initPhaser();

        return () => {
            if (game) {
                game.destroy(true);
            }
            if (scoreAbortControllerRef.current) {
                scoreAbortControllerRef.current.abort();
            }
        };
    }, [onScoreUpdate]);

    return (
        <div 
            ref={gameRef}
            style={{ 
                width: '100%',
                height: '100%',
            }}
        />
    );
};

