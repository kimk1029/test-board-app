'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import SkyRoadsLeaderboard from '@/components/game/SkyRoadsLeaderboard';

const PhaserGame = dynamic(() => Promise.resolve(GameComponent), { ssr: false });

export default function SkyRoadsPage() {
    const [myBestScore, setMyBestScore] = useState(0);
    const [isDemo, setIsDemo] = useState(false);
    const scoreAbortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        setIsDemo(!token);

        const savedScore = localStorage.getItem('skyroads_highscore');
        if (savedScore) {
            setMyBestScore(parseInt(savedScore));
        }

        return () => {
            // 컴포넌트 언마운트 시 진행 중인 요청 취소
            if (scoreAbortControllerRef.current) {
                scoreAbortControllerRef.current.abort();
            }
        };
    }, []);

    const handleGameOver = async (score: number) => {
        const finalScore = Math.floor(score);

        // 로컬 최고 기록 업데이트
        if (finalScore > myBestScore) {
            setMyBestScore(finalScore);
            localStorage.setItem('skyroads_highscore', finalScore.toString());
        }

        // 서버에 점수 저장 (로그인한 사용자만)
        const token = localStorage.getItem('token');
        if (token) {
            // 이전 요청 취소
            if (scoreAbortControllerRef.current) {
                scoreAbortControllerRef.current.abort();
            }

            // 새로운 AbortController 생성
            scoreAbortControllerRef.current = new AbortController();

            try {
                await fetch('/api/game/score', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        gameType: 'skyroads',
                        score: finalScore
                    }),
                    signal: scoreAbortControllerRef.current.signal
                })
            } catch (error: any) {
                // AbortError는 무시 (의도적인 취소)
                if (error.name !== 'AbortError') {
                    console.error('Score save failed', error)
                }
            } finally {
                scoreAbortControllerRef.current = null;
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-50">
                <div className="absolute w-[2px] h-[2px] bg-white rounded-full top-10 left-20 animate-pulse"></div>
                <div className="absolute w-[3px] h-[3px] bg-purple-400 rounded-full top-40 left-80 animate-pulse delay-75"></div>
            </div>

            {/* Header Buttons */}
            <div className="absolute top-6 left-6 z-10 flex items-center gap-4">
                <Link href="/game">
                    <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full bg-black/40 border border-white/10 text-white hover:bg-white/10 hover:text-cyan-400 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
            </div>

            <h1 className="text-4xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-[0_2px_10px_rgba(0,255,255,0.5)] z-10 italic tracking-tighter">
                SKYROADS <span className="text-2xl not-italic font-light text-white/80">3D</span>
            </h1>

            <div className="flex flex-col lg:flex-row gap-8 items-start z-10 mt-4">
                {/* Game Container */}
                <div className="relative rounded-2xl overflow-hidden border-4 border-cyan-500/20 shadow-[0_0_50px_rgba(34,211,238,0.1)] w-[800px] h-[600px] bg-[#020617] order-1 lg:order-2">
                    <PhaserGame onGameOver={handleGameOver} />
                </div>
            </div>

            {/* Game Specific Leaderboard - 무한계단 스타일 */}
            <SkyRoadsLeaderboard />

            <div className="mt-6 text-slate-400 z-10 flex items-center gap-4 text-sm tracking-widest uppercase pointer-events-none">
                <span className="flex items-center gap-1"><kbd className="bg-white/10 px-2 py-1 rounded border border-white/10">←</kbd> LEFT</span>
                <span className="flex items-center gap-1"><kbd className="bg-white/10 px-2 py-1 rounded border border-white/10">→</kbd> RIGHT</span>
                <span className="flex items-center gap-1"><kbd className="bg-white/10 px-2 py-1 rounded border border-white/10">SPACE</kbd> JUMP</span>
            </div>
        </div>
    );
}

interface GameComponentProps {
    onGameOver?: (score: number) => void;
}

const GameComponent = ({ onGameOver }: GameComponentProps) => {
    const gameContainer = useRef<HTMLDivElement>(null);
    const gameInstance = useRef<Phaser.Game | null>(null);

    const [hudState, setHudState] = useState({ distance: 0, fuel: 100, gameOver: false, score: 0 });
    const hudStateRef = useRef(hudState);
    hudStateRef.current = hudState;

    const onGameOverRef = useRef(onGameOver);
    useEffect(() => { onGameOverRef.current = onGameOver; }, [onGameOver]);

    useEffect(() => {
        if (!gameContainer.current || typeof window === 'undefined') return;

        const container = gameContainer.current;

        import('phaser').then((PhaserModule) => {
            const Phaser = PhaserModule.default || PhaserModule;

            class MainScene extends Phaser.Scene {
                player!: Phaser.GameObjects.Container;
                playerShip!: Phaser.GameObjects.Graphics;
                cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
                spaceKey!: Phaser.Input.Keyboard.Key;

                roadTiles!: Phaser.GameObjects.Group;
                obstacles!: Phaser.GameObjects.Group;
                fuels!: Phaser.GameObjects.Group;

                stars: Phaser.GameObjects.Arc[] = [];

                gameSpeed: number = 300;
                distance: number = 0;
                fuel: number = 100;
                score: number = 0;
                isGameOver: boolean = false;

                playerY: number = 0;
                verticalVelocity: number = 0;
                isJumping: boolean = false;
                isFalling: boolean = false;

                readonly GRAVITY: number = -20;
                readonly JUMP_FORCE: number = 525;

                rowCount: number = 0;

                engineEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

                readonly HORIZON_Y = 200;
                readonly BOTTOM_Y = 500;
                readonly LANE_WIDTH = 1.6;
                readonly TILE_LENGTH = 300;
                readonly SPAWN_DISTANCE = 3000;

                constructor() {
                    super('MainScene');
                }

                create() {
                    this.gameSpeed = 480;
                    this.distance = 0;
                    this.fuel = 100;
                    this.score = 0;
                    this.isGameOver = false;
                    this.playerY = 0;
                    this.verticalVelocity = 0;
                    this.isJumping = false;
                    this.isFalling = false;
                    this.rowCount = 0;

                    setHudState({ distance: 0, fuel: 100, gameOver: false, score: 0 });

                    this.createBackground();

                    const graphics = this.make.graphics({ x: 0, y: 0 });
                    graphics.fillStyle(0x00ffff, 1);
                    graphics.fillCircle(4, 4, 4);
                    graphics.generateTexture('flare', 8, 8);

                    this.roadTiles = this.add.group();
                    this.obstacles = this.add.group();
                    this.fuels = this.add.group();

                    this.createPlayer();

                    for (let z = 0; z <= this.SPAWN_DISTANCE; z += this.TILE_LENGTH) {
                        this.createRow(z, true);
                    }

                    if (this.input.keyboard) {
                        this.cursors = this.input.keyboard.createCursorKeys();
                        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

                        this.input.keyboard.on('keydown-R', () => {
                            if (this.isGameOver) this.scene.restart();
                        });
                    }
                }

                createBackground() {
                    this.cameras.main.setBackgroundColor('#020205');

                    // 1. 행성 추가 (배경에 은은하게)
                    const planet = this.add.circle(650, 80, 50, 0x9966ff, 0.15); // 보라색 행성
                    planet.setDepth(-100000);

                    const ring = this.add.ellipse(650, 80, 140, 30, 0xaa88ff, 0.1); // 행성 고리
                    ring.setRotation(-0.2);
                    ring.setDepth(-100000);

                    // 2. 지평선
                    const horizon = this.add.graphics();
                    horizon.setDepth(-100000);
                    horizon.fillGradientStyle(0x000000, 0x000000, 0x1a237e, 0x1a237e, 1);
                    horizon.fillRect(0, this.HORIZON_Y, 800, 600 - this.HORIZON_Y);

                    // 3. 별
                    for (let i = 0; i < 300; i++) {
                        const x = Phaser.Math.Between(0, 800);
                        const y = this.HORIZON_Y * Math.pow(Math.random(), 0.4);
                        const size = Phaser.Math.FloatBetween(0.5, 2);
                        const alpha = Phaser.Math.FloatBetween(0.2, 0.8);
                        const star = this.add.circle(x, y, size, 0xffffff, alpha);
                        star.setDepth(-100000);
                        this.stars.push(star);
                    }
                }

                createPlayer() {
                    this.player = this.add.container(400, 500);
                    this.player.setDepth(100000);

                    this.playerShip = this.add.graphics();
                    this.drawSpaceship(0);
                    this.player.add(this.playerShip);

                    this.engineEmitter = this.add.particles(0, 0, 'flare', {
                        speed: 100,
                        scale: { start: 0.6, end: 0 },
                        blendMode: 'ADD',
                        lifespan: 200,
                        frequency: 10,
                        angle: { min: 85, max: 95 },
                        follow: this.player,
                        followOffset: { x: 0, y: 25 },
                        tint: 0x00ffff
                    });
                }

                drawSpaceship(tilt: number) {
                    this.playerShip.clear();
                    const shadowScale = Math.max(0.2, 1 - this.playerY / 200);
                    this.playerShip.fillStyle(0x000000, 0.3 * shadowScale);
                    this.playerShip.fillEllipse(0, 40 + this.playerY * 0.5, 60 * shadowScale, 20 * shadowScale);

                    this.playerShip.fillStyle(0xe0e0e0, 1);

                    const wingWidth = 25 - Math.abs(tilt) * 5;
                    const bodyWidth = 10;

                    this.playerShip.beginPath();
                    this.playerShip.moveTo(0, -35);
                    this.playerShip.lineTo(wingWidth, 20 + tilt);
                    this.playerShip.lineTo(bodyWidth, 25);
                    this.playerShip.lineTo(-bodyWidth, 25);
                    this.playerShip.lineTo(-wingWidth, 20 - tilt);
                    this.playerShip.closePath();
                    this.playerShip.fill();

                    this.playerShip.fillStyle(0x00ccff, 0.9);
                    this.playerShip.beginPath();
                    this.playerShip.moveTo(0, -15);
                    this.playerShip.lineTo(5, 5);
                    this.playerShip.lineTo(0, 10);
                    this.playerShip.lineTo(-5, 5);
                    this.playerShip.closePath();
                    this.playerShip.fill();

                    this.playerShip.lineStyle(2, 0x2196f3, 1);
                    this.playerShip.strokePath();

                    this.playerShip.fillStyle(0xffaa00, 1);
                    this.playerShip.fillCircle(-8, 25, 3);
                    this.playerShip.fillCircle(8, 25, 3);
                }

                update(time: number, delta: number) {
                    if (this.isGameOver) return;

                    const dt = delta / 1000;

                    this.distance += this.gameSpeed * dt;
                    this.score += Math.floor(this.gameSpeed * dt * 0.1);
                    this.fuel -= dt * 3;
                    this.gameSpeed = Math.min(2000, this.gameSpeed + dt * 10);

                    if (time % 100 < delta) {
                        hudStateRef.current = {
                            distance: Math.floor(this.distance),
                            fuel: Math.max(0, Math.floor(this.fuel)),
                            gameOver: false,
                            score: this.score
                        };
                        setHudState(hudStateRef.current);
                    }

                    if (this.fuel <= 0) this.gameOver('OUT OF FUEL');

                    const speed = 400 * dt;
                    let tilt = 0;

                    if (this.cursors.left.isDown) {
                        this.player.x -= speed;
                        tilt = -10;
                    } else if (this.cursors.right.isDown) {
                        this.player.x += speed;
                        tilt = 10;
                    }

                    this.player.x = Phaser.Math.Clamp(this.player.x, 50, 750);

                    if (this.spaceKey.isDown && !this.isJumping && !this.isFalling) {
                        this.verticalVelocity = this.JUMP_FORCE;
                        this.isJumping = true;
                    }

                    if (this.isJumping || this.isFalling) {
                        this.playerY += this.verticalVelocity * dt;
                        this.verticalVelocity += this.GRAVITY;

                        if (!this.isFalling && this.playerY <= 0) {
                            this.playerY = 0;
                            this.isJumping = false;
                            this.verticalVelocity = 0;
                        }
                    }

                    if (this.isFalling && this.playerY < -800) {
                        this.gameOver('FALL DOWN!');
                    }

                    this.player.y = 500 - this.playerY;
                    this.drawSpaceship(tilt);

                    const moveZ = this.gameSpeed * dt * 2.4;

                    this.updateRoad(moveZ);

                    let maxZ = -Infinity;
                    this.roadTiles.getChildren().forEach((tile: any) => {
                        if (tile.zPos > maxZ) maxZ = tile.zPos;
                    });

                    if (maxZ < this.SPAWN_DISTANCE) {
                        const nextZ = (maxZ === -Infinity) ? this.SPAWN_DISTANCE : maxZ + this.TILE_LENGTH;
                        this.createRow(nextZ, false);
                    }

                    if (!this.isJumping && !this.isFalling) {
                        this.checkFall();
                    }
                }

                project3D(x: number, y: number, z: number) {
                    if (z < -50) return null;

                    const scale = this.HORIZON_Y / (this.HORIZON_Y + z);
                    const screenX = 400 + (x * scale * 200);
                    const screenY = this.HORIZON_Y + scale * (this.BOTTOM_Y - this.HORIZON_Y) - (y * scale);
                    return { x: screenX, y: screenY, scale: scale };
                }

                createRow(z: number, isSafe: boolean) {
                    this.rowCount++;
                    const isRowDark = this.rowCount % 2 === 0;

                    const lanes = [-1, 0, 1];
                    const difficulty = Math.min(1, Math.max(0, (this.distance - 50) / 100));

                    const obstacleStartDist = 1000;
                    const obstacleDifficulty = Math.min(1, Math.max(0, (this.distance - obstacleStartDist) / 5000));

                    const tileChance = isSafe ? 1.0 : Math.max(0.4, 0.95 - (difficulty * 0.5));
                    const obstacleChance = isSafe ? 0 : (this.distance < obstacleStartDist ? 0 : Math.min(0.4, 0.1 + (obstacleDifficulty * 0.3)));
                    const tunnelChance = isSafe ? 0 : Math.min(0.1, 0.02 + (difficulty * 0.05));

                    lanes.forEach(lane => {
                        if (Math.random() < tileChance) {
                            this.createTile(lane, z, isRowDark);

                            if (!isSafe) {
                                const rnd = Math.random();
                                if (rnd < obstacleChance) {
                                    this.createObstacle(lane, z);
                                } else if (rnd < obstacleChance + 0.1) {
                                    this.createFuel(lane, z);
                                }
                            }
                        }
                    });

                    if (!isSafe && Math.random() < tunnelChance) {
                        this.createTunnel(z);
                    }
                }

                createTile(lane: number, z: number, isDark: boolean) {
                    const tile = this.add.container(0, 0) as any;
                    tile.zPos = z;
                    tile.lane = lane;
                    tile.type = 'tile';
                    tile.isDark = isDark;

                    const g = this.add.graphics();
                    tile.add(g);
                    tile.graphics = g;

                    this.roadTiles.add(tile);
                    tile.setDepth(-z);
                }

                createObstacle(lane: number, z: number) {
                    const obs = this.add.container(0, 0) as any;
                    obs.zPos = z;
                    obs.lane = lane;
                    obs.type = 'obstacle';

                    const g = this.add.graphics();
                    obs.add(g);
                    obs.graphics = g;
                    this.obstacles.add(obs);
                }

                createTunnel(z: number) {
                    [-2, 2].forEach(lane => {
                        const wall = this.add.container(0, 0) as any;
                        wall.zPos = z;
                        wall.lane = lane;
                        wall.type = 'wall';

                        const g = this.add.graphics();
                        wall.add(g);
                        wall.graphics = g;
                        this.obstacles.add(wall);
                    });
                }

                createFuel(lane: number, z: number) {
                    const fuel = this.add.container(0, 0) as any;
                    fuel.zPos = z;
                    fuel.lane = lane;
                    fuel.type = 'fuel';

                    const g = this.add.graphics();
                    fuel.add(g);
                    fuel.graphics = g;
                    this.fuels.add(fuel);
                }

                updateRoad(moveZ: number) {
                    this.roadTiles.getChildren().forEach((tile: any) => {
                        tile.zPos -= moveZ;

                        if (tile.zPos < -450) {
                            tile.destroy();
                        } else {
                            const g = tile.graphics as Phaser.GameObjects.Graphics;
                            g.clear();

                            const x = tile.lane * this.LANE_WIDTH;
                            const halfWidth = 0.75;
                            const length = this.TILE_LENGTH;

                            const nearZ = Math.max(tile.zPos, -40);
                            const farZ = tile.zPos + length;

                            if (farZ > -40) {
                                const p1 = this.project3D(x - halfWidth, 0, nearZ);
                                const p2 = this.project3D(x + halfWidth, 0, nearZ);
                                const p3 = this.project3D(x + halfWidth, 0, farZ);
                                const p4 = this.project3D(x - halfWidth, 0, farZ);

                                if (p1 && p2 && p3 && p4) {
                                    const alpha = 1.0;
                                    const color = tile.isDark ? 0x1e293b : 0x334155;

                                    g.fillStyle(color, alpha);
                                    g.beginPath();
                                    g.moveTo(p1.x, p1.y);
                                    g.lineTo(p2.x, p2.y);
                                    g.lineTo(p3.x, p3.y);
                                    g.lineTo(p4.x, p4.y);
                                    g.closePath();
                                    g.fill();

                                    tile.setDepth(-tile.zPos);
                                }
                            }
                        }
                    });

                    [this.obstacles, this.fuels].forEach(group => {
                        group.getChildren().forEach((obj: any) => {
                            obj.zPos -= moveZ;

                            if (obj.zPos < -450) {
                                obj.destroy();
                            } else {
                                const p = this.project3D(obj.lane * this.LANE_WIDTH, 0, obj.zPos);

                                if (p) {
                                    obj.setPosition(p.x, p.y);
                                    obj.setScale(p.scale);
                                    obj.setDepth(-obj.zPos + 1000);

                                    const alpha = Math.min(1, Math.max(0.8, 1 - (obj.zPos / 5000)));
                                    obj.setAlpha(alpha);
                                    obj.setVisible(true);

                                    if (obj.type === 'obstacle') {
                                        this.drawCube(obj.graphics, 0xff0055);
                                    } else if (obj.type === 'wall') {
                                        this.drawWall(obj.graphics);
                                    } else {
                                        this.drawCrystal(obj.graphics, 0xffff00);
                                    }
                                } else {
                                    obj.setVisible(false);
                                }

                                // 충돌 판정 개선
                                if (obj.zPos < 60 && obj.zPos > -60) {
                                    const laneX = 400 + obj.lane * this.LANE_WIDTH * 200;
                                    const dist = Math.abs(this.player.x - laneX);

                                    if (dist < 45) {
                                        if (obj.type === 'fuel') {
                                            this.collectFuel(obj);
                                        } else if (!this.isJumping || obj.type === 'wall') {
                                            if (obj.type === 'obstacle') {
                                                if (this.playerY < 30) {
                                                    this.gameOver('CRASHED!');
                                                }
                                            } else {
                                                this.gameOver('HIT WALL!');
                                            }
                                        }
                                    }
                                }
                            }
                        });
                    });
                }

                checkFall() {
                    let onGround = false;
                    let currentLane = -999;
                    if (this.player.x < 300) currentLane = -1;
                    else if (this.player.x > 500) currentLane = 1;
                    else currentLane = 0;

                    const tiles = this.roadTiles.getChildren();
                    for (const tile of tiles as any[]) {
                        if (tile.zPos <= 20 && tile.zPos >= -300 && tile.lane === currentLane) {
                            onGround = true;
                            break;
                        }
                    }

                    if (!onGround) {
                        this.isFalling = true;
                        this.verticalVelocity = -300;
                    }
                }

                drawCube(g: Phaser.GameObjects.Graphics, color: number) {
                    g.clear();
                    const s = 60;
                    const h = 50;
                    g.fillStyle(Phaser.Display.Color.GetColor(255, 100, 100), 1);
                    g.fillRect(-s / 2, -h, s, s / 2);
                    g.fillStyle(color, 1);
                    g.fillRect(-s / 2, -h / 2, s, h / 2);
                    g.fillStyle(0xaa0033, 1);
                    g.beginPath();
                    g.moveTo(s / 2, -h);
                    g.lineTo(s / 2 + 15, -h - 10);
                    g.lineTo(s / 2 + 15, -h / 2 - 10);
                    g.lineTo(s / 2, -h / 2);
                    g.closePath();
                    g.fill();
                }

                drawWall(g: Phaser.GameObjects.Graphics) {
                    g.clear();
                    const s = 20;
                    const h = 200;
                    g.fillStyle(0x444444, 1);
                    g.fillRect(-s / 2, -h, s, h);
                    g.lineStyle(2, 0xff0000);
                    g.strokeRect(-s / 2, -h, s, h);
                }

                drawCrystal(g: Phaser.GameObjects.Graphics, color: number) {
                    g.clear();
                    const s = 30;
                    g.fillStyle(color, 0.8);
                    g.beginPath();
                    g.moveTo(0, -s);
                    g.lineTo(s, 0);
                    g.lineTo(0, s);
                    g.lineTo(-s, 0);
                    g.closePath();
                    g.fill();
                    g.lineStyle(2, 0xffffff, 1);
                    g.strokePath();
                }

                collectFuel(fuelObj: any) {
                    fuelObj.destroy();
                    this.fuel = Math.min(100, this.fuel + 15);
                    this.score += 500;
                    this.cameras.main.flash(50, 255, 255, 0);
                }

                gameOver(reason: string) {
                    if (this.isGameOver) return;
                    this.isGameOver = true;
                    this.engineEmitter.stop();
                    this.playerShip.setAlpha(0.5);
                    setHudState({ ...hudStateRef.current, gameOver: true });

                    if (onGameOverRef.current) {
                        onGameOverRef.current(this.score);
                    }
                }
            }

            const config: Phaser.Types.Core.GameConfig = {
                type: Phaser.AUTO,
                width: 800,
                height: 600,
                parent: container,
                transparent: true,
                physics: {
                    default: 'arcade',
                    arcade: { debug: false },
                },
                scene: MainScene,
            };

            if (!gameInstance.current) {
                gameInstance.current = new Phaser.Game(config);
            }
        });

        return () => {
            gameInstance.current?.destroy(true);
            gameInstance.current = null;
        };
    }, []);

    return (
        <div className="w-full h-full relative group">
            <div
                ref={gameContainer}
                className="w-full h-full"
            />

            {/* In-Game HUD (Overlay) */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-20">
                <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg p-3 w-40">
                    <div className="text-cyan-400 text-[10px] font-bold mb-1">DISTANCE</div>
                    <div className="text-xl font-mono text-white">{hudState.distance} <span className="text-xs text-gray-400">KM</span></div>
                    <div className="text-yellow-400 text-[10px] font-bold mt-2 mb-1">SCORE</div>
                    <div className="text-xl font-mono text-white">{hudState.score.toLocaleString()}</div>
                </div>

                <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg p-3 w-48">
                    <div className="flex justify-between text-[10px] font-bold mb-1">
                        <span className="text-white">FUEL</span>
                        <span className={`${hudState.fuel < 30 ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>
                            {hudState.fuel}%
                        </span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden relative">
                        <div
                            className={`h-full transition-all duration-200 ${hudState.fuel < 30 ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-gradient-to-r from-green-400 to-cyan-500'
                                }`}
                            style={{ width: `${hudState.fuel}%` }}
                        />
                    </div>
                </div>
            </div>

            {hudState.gameOver && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white z-50">
                    <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-red-500 to-pink-600 mb-2 drop-shadow-[0_0_15px_rgba(255,0,0,0.5)]">
                        CRASHED
                    </h2>
                    <div className="text-xl text-gray-300 font-light mb-6">
                        FINAL SCORE: <span className="text-white font-bold">{hudState.score.toLocaleString()}</span>
                    </div>

                    <button
                        className="group relative px-6 py-2 bg-cyan-600 hover:bg-cyan-500 transition-all rounded-full font-bold text-base overflow-hidden"
                        onClick={() => {
                            const scene = gameInstance.current?.scene.getScene('MainScene');
                            scene?.scene.restart();
                        }}
                    >
                        <span className="relative z-10 pointer-events-none">RETRY</span>
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    </button>
                </div>
            )}
        </div>
    );
};
