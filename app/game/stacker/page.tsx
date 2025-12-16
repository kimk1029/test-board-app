'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import dynamic from 'next/dynamic';
import StackerLeaderboard from '@/components/game/StackerLeaderboard';

const PhaserGame = dynamic(() => Promise.resolve(GameComponent), { ssr: false });

export default function StackerPage() {
    const [myBestScore, setMyBestScore] = useState(0);

    useEffect(() => {
        const savedScore = localStorage.getItem('stacker_best');
        if (savedScore) {
            setMyBestScore(parseInt(savedScore));
        }
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#09090b] text-white p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-30">
                <div className="absolute w-[2px] h-[2px] bg-cyan-400 rounded-full top-10 left-20 animate-pulse"></div>
                <div className="absolute w-[3px] h-[3px] bg-purple-400 rounded-full top-40 left-80 animate-pulse delay-75"></div>
                <div className="absolute w-[2px] h-[2px] bg-blue-400 rounded-full top-60 right-20 animate-pulse delay-150"></div>
            </div>

            {/* Header Buttons */}
            <div className="absolute top-6 left-6 z-10 flex items-center gap-4">
                <Link href="/game">
                    <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full bg-black/40 border border-white/10 text-white hover:bg-white/10 hover:text-cyan-400 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
            </div>

            <h1 className="text-2xl md:text-4xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600 drop-shadow-[0_2px_10px_rgba(139,92,246,0.5)] z-10 italic tracking-tighter px-4 text-center">
                STACKER <span className="text-xl md:text-2xl not-italic font-light text-white/80">BLOCKS</span>
            </h1>

            <div className="flex flex-col lg:flex-row gap-4 md:gap-8 items-center justify-center z-10 mt-2 md:mt-4 relative w-full px-4">
                {/* Game Container - 정중앙 배치 */}
                <div className="relative rounded-xl md:rounded-2xl overflow-hidden border-2 md:border-4 border-cyan-500/20 shadow-[0_0_50px_rgba(34,211,238,0.1)] w-full max-w-[400px] aspect-[2/3] md:w-[400px] md:h-[600px] bg-[#0a0a0c] mx-auto">
                    <PhaserGame onScoreUpdate={setMyBestScore} />
                </div>
                
                {/* Game Specific Leaderboard - PC에서만 표시 */}
                <StackerLeaderboard />
            </div>

            {/* 모바일 컨트롤 안내 */}
            <div className="mt-4 md:mt-6 text-slate-400 z-10 flex flex-col md:flex-row items-center gap-2 md:gap-4 text-xs md:text-sm tracking-widest uppercase pointer-events-none px-4">
                <span className="flex items-center gap-1"><kbd className="bg-white/10 px-2 py-1 rounded border border-white/10 text-[10px] md:text-xs">TAP</kbd> <span className="hidden md:inline">CLICK</span> PLACE</span>
                <span className="hidden md:flex items-center gap-1"><kbd className="bg-white/10 px-2 py-1 rounded border border-white/10">SPACE</kbd> PLACE</span>
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
    playTone(freq: number, type?: OscillatorType, duration?: number): void;
    playPlace(level: number): void;
    playPerfect(): void;
    playFail(): void;
}

class SoundSynth implements SoundSynth {
    constructor() {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)() as AudioContext;
        this.enabled = true;
    }

    playTone(freq: number, type: OscillatorType = 'sine', duration: number = 0.1): void {
        if (!this.enabled) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            
            gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
            console.error(e);
        }
    }

    playPlace(level: number): void {
        const note = 220 + (level * 20); 
        this.playTone(note, 'sine', 0.15);
    }

    playPerfect(): void {
        this.playTone(880, 'triangle', 0.3);
        setTimeout(() => this.playTone(1100, 'sine', 0.3), 50);
    }

    playFail(): void {
        this.playTone(100, 'sawtooth', 0.5);
        this.playTone(80, 'sawtooth', 0.5);
    }
}

const GameComponent = ({ onScoreUpdate }: GameComponentProps) => {
    const gameRef = useRef<HTMLDivElement>(null);
    const scoreAbortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        let game: Phaser.Game | null = null;

        const initPhaser = async () => {
            const Phaser = (await import('phaser')).default;

            // 점수 저장 함수를 클로저로 전달
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
                                gameType: 'stacker',
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
                private blockHeight!: number;
                private baseWidth!: number;
                private currentWidth!: number;
                private level!: number;
                private moveSpeed!: number;
                private isRunning!: boolean;
                private stack: Phaser.GameObjects.Rectangle[] = [];
                private synth!: SoundSynth;
                private scoreText!: Phaser.GameObjects.Text;
                private highScoreText!: Phaser.GameObjects.Text;
                private soundBtn!: Phaser.GameObjects.Text;
                private movingBlock!: Phaser.GameObjects.Rectangle;
                private moveTween!: Phaser.Tweens.Tween;

                constructor() {
                    super('MainScene');
                }

                create(): void {
                    this.gameWidth = this.scale.width;
                    this.gameHeight = this.scale.height;
                    this.blockHeight = 40;
                    this.baseWidth = 200;
                    this.currentWidth = this.baseWidth;
                    this.level = 0;
                    this.moveSpeed = 487.5; // 30% 더 느리게 (375 * 1.3)
                    this.isRunning = true;
                    this.stack = []; 
                    
                    this.synth = new SoundSynth();

                    // 배경 - 홈페이지 스타일에 맞게 어두운 배경
                    this.add.rectangle(0, 0, this.gameWidth, this.gameHeight, 0x0a0a0c).setOrigin(0);
                    
                    // 점수 텍스트 - 홈페이지 스타일
                    this.scoreText = this.add.text(20, 20, '0', { 
                        fontSize: '64px', 
                        fontFamily: 'Arial', 
                        fontStyle: 'bold',
                        color: '#ffffff'
                    });

                    const savedBest = parseInt(localStorage.getItem('stacker_best') || '0');
                    this.highScoreText = this.add.text(20, 90, `Best: ${savedBest}`, { 
                        fontSize: '16px', 
                        color: '#94a3b8' 
                    });

                    // 사운드 토글 버튼
                    this.soundBtn = this.add.text(this.gameWidth - 50, 30, '🔊', { fontSize: '32px' })
                        .setOrigin(0.5)
                        .setInteractive()
                        .on('pointerdown', () => {
                            this.synth.enabled = !this.synth.enabled;
                            this.soundBtn.setText(this.synth.enabled ? '🔊' : '🔇');
                        });

                    // 첫 바닥 블록 - 그라데이션 색상
                    const baseColor = Phaser.Display.Color.HSVToRGB(0, 0.8, 0.8).color;
                    const baseBlock = this.add.rectangle(
                        this.gameWidth / 2, 
                        this.gameHeight - 100, 
                        this.currentWidth, 
                        this.blockHeight, 
                        baseColor
                    );
                    this.stack.push(baseBlock);

                    this.spawnNextBlock();

                    // 입력
                    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
                        if (this.soundBtn.getBounds().contains(pointer.x, pointer.y)) return;
                        this.placeBlock();
                    });
                    this.input.keyboard?.on('keydown-SPACE', () => this.placeBlock());
                }

                spawnNextBlock(): void {
                    this.level++;
                    this.scoreText.setText((this.level - 1).toString());

                    const prevBlock = this.stack[this.stack.length - 1];
                    const nextY = prevBlock.y - this.blockHeight;

                    // 무지개 효과 색상
                    const hue = (this.level * 0.05) % 1;
                    const color = Phaser.Display.Color.HSVToRGB(hue, 0.7, 0.9).color;

                    // 왼쪽 또는 오른쪽에서 랜덤 생성
                    const startFromLeft = Phaser.Math.Between(0, 1) === 0;
                    const startX = startFromLeft ? 0 : this.gameWidth;
                    const targetX = startFromLeft ? this.gameWidth : 0;

                    const newBlock = this.add.rectangle(
                        startX, 
                        nextY, 
                        this.currentWidth, 
                        this.blockHeight, 
                        color
                    ).setOrigin(0.5);

                    this.movingBlock = newBlock;

                    // 속도: 레벨이 오를수록 빨라짐 (최소 130ms, 30% 느리게)
                    const speed = Math.max(130, this.moveSpeed - (this.level * 13));

                    this.moveTween = this.tweens.add({
                        targets: this.movingBlock,
                        x: targetX,
                        duration: speed,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Linear'
                    });

                    if (this.level > 4) {
                        this.cameras.main.pan(this.gameWidth / 2, nextY - 100, 300, 'Sine.easeInOut');
                    }
                }

                placeBlock(): void {
                    if (!this.isRunning) {
                        this.scene.restart();
                        return;
                    }

                    this.moveTween.stop();
                    
                    const current = this.movingBlock;
                    const prev = this.stack[this.stack.length - 1];

                    const diffX = current.x - prev.x;
                    const absDiff = Math.abs(diffX);

                    if (absDiff >= this.currentWidth) {
                        this.gameOver();
                        return;
                    }

                    let isPerfect = false;

                    if (absDiff < 4) {
                        isPerfect = true;
                        current.x = prev.x;
                        this.currentWidth = prev.width;
                        current.width = this.currentWidth;
                        
                        this.synth.playPerfect();
                        this.showFloatingText(current.x, current.y, 'PERFECT!', 0xffff00);
                        
                        this.tweens.add({
                            targets: current,
                            alpha: 0.5,
                            yoyo: true,
                            duration: 50,
                            repeat: 1
                        });

                    } else {
                        this.synth.playPlace(this.level);
                        
                        const newWidth = this.currentWidth - absDiff;
                        this.currentWidth = newWidth;
                        
                        const newX = prev.x + (diffX / 2);
                        current.width = newWidth;
                        current.x = newX;

                        this.dropDebris(current.y, prev.x, diffX, absDiff, current.fillColor);
                    }
                    
                    this.stack.push(current);
                    this.spawnNextBlock();
                }

                showFloatingText(x: number, y: number, message: string, color: number): void {
                    const text = this.add.text(x, y, message, {
                        fontSize: '24px',
                        fontStyle: 'bold',
                        color: '#fff',
                        stroke: '#000',
                        strokeThickness: 4
                    }).setOrigin(0.5);

                    if (color) text.setTint(color);

                    this.tweens.add({
                        targets: text,
                        y: y - 50,
                        alpha: 0,
                        scale: 1.5,
                        duration: 800,
                        onComplete: () => text.destroy()
                    });
                }

                dropDebris(y: number, prevX: number, diffX: number, debrisWidth: number, color: number): void {
                    const debrisX = diffX > 0 
                        ? prevX + (this.currentWidth / 2) + (debrisWidth / 2) 
                        : prevX - (this.currentWidth / 2) - (debrisWidth / 2);

                    const debris = this.add.rectangle(debrisX, y, debrisWidth, this.blockHeight, color);
                    
                    this.tweens.add({
                        targets: debris,
                        y: y + 800,
                        angle: Phaser.Math.Between(-90, 90),
                        alpha: 0,
                        duration: 1200,
                        onComplete: () => debris.destroy()
                    });
                }

                async gameOver(): Promise<void> {
                    this.isRunning = false;
                    this.synth.playFail();
                    this.movingBlock.fillColor = 0x555555;
                    
                    this.cameras.main.shake(300, 0.02);

                    const currentScore = this.level - 1;
                    const savedScore = parseInt(localStorage.getItem('stacker_best') || '0');
                    if (currentScore > savedScore) {
                        localStorage.setItem('stacker_best', currentScore.toString());
                        this.highScoreText.setText(`Best: ${currentScore}`);
                        if (onScoreUpdate) {
                            onScoreUpdate(currentScore);
                        }

                        // 서버에 점수 저장
                        await saveScore(currentScore);
                    }

                    const gameOverText = this.add.text(this.gameWidth/2, this.gameHeight/2 - 50, 'GAME OVER', {
                        fontSize: '50px',
                        fontStyle: 'bold',
                        color: '#ff0055',
                        stroke: '#fff',
                        strokeThickness: 6
                    }).setOrigin(0.5).setScale(0);

                    const restartText = this.add.text(this.gameWidth/2, this.gameHeight/2 + 20, 'Click to Restart', {
                        fontSize: '20px',
                        color: '#fff'
                    }).setOrigin(0.5).setAlpha(0);

                    this.tweens.add({
                        targets: gameOverText,
                        scale: 1,
                        duration: 500,
                        ease: 'Back.out'
                    });

                    this.tweens.add({
                        targets: restartText,
                        alpha: 1,
                        delay: 500,
                        duration: 500,
                        yoyo: true,
                        repeat: -1
                    });
                }
            }

            // 모바일 대응: 화면 크기에 따라 게임 크기 조정
            const getGameSize = () => {
                if (typeof window === 'undefined') return { width: 400, height: 600 };
                const isMobile = window.innerWidth < 768;
                if (isMobile) {
                    // 모바일: 화면 너비의 90%, 비율 유지 (2:3)
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
                backgroundColor: '#0a0a0c',
                scene: MainScene,
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

