'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function OrbitalDefensePage() {
    const [myBestScore, setMyBestScore] = useState(0);
    const gameRef = useRef<HTMLDivElement>(null);
    const scoreAbortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        const savedScore = localStorage.getItem('orbital_defense_best');
        if (savedScore) {
            setMyBestScore(parseInt(savedScore));
        }
    }, []);

    useEffect(() => {
        let game: Phaser.Game | null = null;

        const initPhaser = async () => {
            const Phaser = (await import('phaser')).default;

            // 점수 저장 함수 (기존과 동일)
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
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ gameType: 'orbital-defense', score: score }),
                            signal: scoreAbortControllerRef.current.signal
                        });
                    } catch (error: any) {
                        if (error.name !== 'AbortError') console.error('Score save failed', error);
                    } finally {
                        scoreAbortControllerRef.current = null;
                    }
                }
            };

            // 🔊 SF 사운드 신디사이저 (기존과 동일 + 추가 사운드)
            class SpaceSynth {
                ctx: AudioContext;
                constructor() {
                    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                }
                playTone(freq: number, type: OscillatorType, duration: number, vol: number = 0.1): void {
                    try {
                        const osc = this.ctx.createOscillator();
                        const gain = this.ctx.createGain();
                        osc.type = type;
                        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
                        if (type === 'sawtooth') {
                            osc.frequency.exponentialRampToValueAtTime(freq / 4, this.ctx.currentTime + duration);
                        }
                        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
                        osc.connect(gain);
                        gain.connect(this.ctx.destination);
                        osc.start();
                        osc.stop(this.ctx.currentTime + duration);
                    } catch (e) { }
                }
                playLaser() { this.playTone(800, 'square', 0.15, 0.05); }
                playTorpedo() { this.playTone(200, 'sawtooth', 0.4, 0.05); }
                playExplosion() { this.playTone(100, 'sawtooth', 0.2, 0.1); }
                playPowerUp() { this.playTone(1200, 'sine', 0.3, 0.1); }
                playRailgun() { this.playTone(1500, 'sawtooth', 0.3, 0.05); } // ⚡ 레일건 소리
                playLightning() { this.playTone(2000, 'square', 0.1, 0.03); } // ⚡ 전기 소리
                playGravity() { this.playTone(50, 'sine', 1.0, 0.1); } // ⚡ 중력 소리 (낮고 길게)
                playLevelUp() {
                    this.playTone(440, 'triangle', 0.1);
                    setTimeout(() => this.playTone(554, 'triangle', 0.1), 100);
                    setTimeout(() => this.playTone(659, 'triangle', 0.4), 200);
                }
            }

            class MainScene extends Phaser.Scene {
                private gameWidth!: number;
                private gameHeight!: number;
                private synth!: SpaceSynth;
                private killCount!: number;
                private timeElapsed!: number;
                private playerStats!: { speed: number; maxHp: number; hp: number; level: number; exp: number; nextExp: number; };

                // --- ⚔️ 무기 데이터 확장 ---
                private weapons!: {
                    laser: { name: string; level: number; damage: number; cooldown: number; lastFired: number; color: number };
                    shield: { name: string; level: number; damage: number; radius: number; tick: number; lastTick: number; color: number };
                    torpedo: { name: string; level: number; damage: number; cooldown: number; lastFired: number; color: number };
                    railgun: { name: string; level: number; damage: number; cooldown: number; lastFired: number; color: number };
                    lightning: { name: string; level: number; damage: number; cooldown: number; lastFired: number; color: number };
                    bits: { name: string; level: number; damage: number; count: number; speed: number; color: number };
                    gravity: { name: string; level: number; damage: number; cooldown: number; lastFired: number; duration: number; color: number };
                };

                private player!: Phaser.GameObjects.Arc;
                private shieldCircle!: Phaser.GameObjects.Arc;
                private enemies!: Phaser.Physics.Arcade.Group;
                private levelUpUIElements: Phaser.GameObjects.GameObject[] = [];

                // 그룹들
                private lasers!: Phaser.Physics.Arcade.Group;
                private torpedoes!: Phaser.Physics.Arcade.Group;
                private expOrbs!: Phaser.Physics.Arcade.Group;
                private bitsGroup!: Phaser.Physics.Arcade.Group; // 위성 비트 그룹
                private gravityWells!: Phaser.Physics.Arcade.Group; // 중력장 그룹

                private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
                private wasd!: { w: Phaser.Input.Keyboard.Key; a: Phaser.Input.Keyboard.Key; s: Phaser.Input.Keyboard.Key; d: Phaser.Input.Keyboard.Key };
                private uiText!: Phaser.GameObjects.Text;
                private expBg!: Phaser.GameObjects.Rectangle;
                private expFill!: Phaser.GameObjects.Rectangle;
                private gameOverFlag: boolean = false;
                private mouseX: number = 0;
                private mouseY: number = 0;
                private isPaused: boolean = false;
                private isMobile: boolean = false;

                constructor() { super('MainScene'); }

                create(): void {
                    this.gameWidth = this.scale.width;
                    this.gameHeight = this.scale.height;
                    this.synth = new SpaceSynth();
                    this.killCount = 0;
                    this.timeElapsed = 0;
                    this.gameOverFlag = false;

                    this.playerStats = { speed: 200, maxHp: 100, hp: 100, level: 1, exp: 0, nextExp: 20 };

                    // --- ⚔️ 무기 초기화 (7종) ---
                    this.weapons = {
                        laser: { name: 'Pulse Laser', level: 1, damage: 15, cooldown: 800, lastFired: 0, color: 0xffff00 },
                        shield: { name: 'Plasma Shield', level: 0, damage: 4, radius: 70, tick: 200, lastTick: 0, color: 0x00ffff },
                        torpedo: { name: 'Quantum Torpedo', level: 0, damage: 50, cooldown: 2000, lastFired: 0, color: 0x00ff00 },
                        railgun: { name: 'Railgun', level: 0, damage: 40, cooldown: 3000, lastFired: 0, color: 0x0000ff }, // 관통
                        lightning: { name: 'Chain Lightning', level: 0, damage: 15, cooldown: 1500, lastFired: 0, color: 0xffff00 }, // 연쇄
                        bits: { name: 'Orbiting Bits', level: 0, damage: 5, count: 0, speed: 0.05, color: 0xcccccc }, // 공전
                        gravity: { name: 'Gravity Well', level: 0, damage: 2, cooldown: 5000, lastFired: 0, duration: 2000, color: 0x800080 } // 광역 제어
                    };

                    // --- 월드 설정 ---
                    const worldSize = Math.max(this.gameWidth, this.gameHeight) * 1.5;
                    const halfWorld = worldSize / 2;
                    this.physics.world.setBounds(-halfWorld, -halfWorld, worldSize, worldSize);
                    this.cameras.main.setBounds(-halfWorld, -halfWorld, worldSize, worldSize);

                    // 배경
                    const borderGraphics = this.add.graphics();
                    borderGraphics.lineStyle(2, 0x00ff00, 0.3);
                    borderGraphics.strokeRect(-halfWorld, -halfWorld, worldSize, worldSize);
                    borderGraphics.setDepth(-98);
                    this.createStarfield(worldSize);

                    // --- 플레이어 ---
                    this.player = this.add.circle(0, 0, 15, 0x00ff00);
                    this.player.setStrokeStyle(2, 0xffffff);
                    this.physics.add.existing(this.player);
                    (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
                    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

                    // 쉴드
                    this.shieldCircle = this.add.circle(0, 0, 0, 0x00ffff, 0.15);
                    this.shieldCircle.setStrokeStyle(2, 0x00ffff);
                    this.physics.add.existing(this.shieldCircle);
                    (this.shieldCircle.body as Phaser.Physics.Arcade.Body).setCircle(1);

                    // --- 그룹 생성 ---
                    this.enemies = this.physics.add.group();
                    this.lasers = this.physics.add.group();
                    this.torpedoes = this.physics.add.group();
                    this.expOrbs = this.physics.add.group();
                    this.bitsGroup = this.physics.add.group(); // 위성 비트
                    this.gravityWells = this.physics.add.group(); // 중력장

                    // --- 입력 및 UI ---
                    this.setupInput();
                    this.setupUI();

                    // --- 타이머 ---
                    this.time.addEvent({ delay: 800, callback: this.spawnEnemy, callbackScope: this, loop: true });
                    this.time.addEvent({ delay: 1000, callback: () => { this.timeElapsed++; this.updateUI(); }, loop: true });

                    // --- 충돌 처리 ---
                    this.physics.add.overlap(this.lasers, this.enemies, this.hitEnemy, undefined, this);
                    this.physics.add.overlap(this.torpedoes, this.enemies, this.hitEnemyTorpedo, undefined, this);
                    this.physics.add.overlap(this.shieldCircle, this.enemies, this.hitEnemyShield, undefined, this);
                    this.physics.add.overlap(this.bitsGroup, this.enemies, this.hitEnemyBits, undefined, this); // 비트 충돌
                    // 중력장, 레일건, 라이트닝은 overlap 대신 별도 로직 또는 Raycast 사용

                    this.physics.add.overlap(this.player, this.expOrbs, this.collectOrb, undefined, this);
                    this.physics.add.overlap(this.player, this.enemies, this.hitPlayer, undefined, this);
                }

                setupInput(): void {
                    this.isMobile = this.sys.game.device.input.touch;
                    if (this.isMobile) {
                        this.cursors = {} as Phaser.Types.Input.Keyboard.CursorKeys;
                        this.wasd = { w: null as any, a: null as any, s: null as any, d: null as any };
                        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
                            if (!this.gameOverFlag && !this.isPaused) { this.mouseX = pointer.worldX; this.mouseY = pointer.worldY; }
                        });
                        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
                            if (!this.gameOverFlag && !this.isPaused) { this.mouseX = pointer.worldX; this.mouseY = pointer.worldY; }
                        });
                    } else {
                        const keyboard = this.input.keyboard;
                        if (keyboard) {
                            this.cursors = keyboard.createCursorKeys();
                            this.wasd = { w: keyboard.addKey('W'), a: keyboard.addKey('A'), s: keyboard.addKey('S'), d: keyboard.addKey('D') };
                        }
                    }
                }

                createStarfield(worldSize: number): void {
                    this.add.rectangle(0, 0, worldSize, worldSize, 0x000000).setDepth(-100);
                    const starCount = 50;
                    const halfSize = worldSize / 2;
                    for (let i = 0; i < starCount; i++) {
                        const x = Phaser.Math.Between(-halfSize, halfSize);
                        const y = Phaser.Math.Between(-halfSize, halfSize);
                        this.add.circle(x, y, 1, 0xffffff, 0.5).setDepth(-99);
                    }
                }

                update(time: number, delta: number): void {
                    if (this.gameOverFlag || this.isPaused) return;

                    // --- 플레이어 이동 (기존 로직 유지) ---
                    const speed = this.playerStats.speed;
                    const body = this.player.body as Phaser.Physics.Arcade.Body;
                    body.setVelocity(0);
                    let velocityX = 0, velocityY = 0;

                    if (this.isMobile) {
                        if (this.mouseX !== 0 || this.mouseY !== 0) {
                            const dx = this.mouseX - this.player.x;
                            const dy = this.mouseY - this.player.y;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            if (dist > 10) {
                                const moveSpeed = Math.min(speed, dist * 0.15);
                                velocityX = (dx / dist) * moveSpeed;
                                velocityY = (dy / dist) * moveSpeed;
                            }
                            this.player.setRotation(Math.atan2(dy, dx) + Math.PI / 2);
                        }
                    } else {
                        if (this.cursors.left?.isDown || this.wasd.a?.isDown) velocityX = -speed;
                        else if (this.cursors.right?.isDown || this.wasd.d?.isDown) velocityX = speed;
                        if (this.cursors.up?.isDown || this.wasd.w?.isDown) velocityY = -speed;
                        else if (this.cursors.down?.isDown || this.wasd.s?.isDown) velocityY = speed;

                        if (velocityX !== 0 || velocityY !== 0) {
                            const angle = Math.atan2(velocityY, velocityX);
                            this.player.setRotation(angle + Math.PI / 2);
                        }
                    }
                    body.setVelocity(velocityX, velocityY);

                    // --- 쉴드 및 비트 위치 동기화 ---
                    this.shieldCircle.setPosition(this.player.x, this.player.y);

                    // 위성 비트 회전
                    if (this.weapons.bits.level > 0) {
                        const bits = this.bitsGroup.getChildren() as Phaser.GameObjects.Arc[];
                        const count = bits.length;
                        const radius = 60 + (this.weapons.bits.level * 10);
                        const speed = time * 0.002;

                        bits.forEach((bit, index) => {
                            const angle = speed + (index * ((Math.PI * 2) / count));
                            bit.setPosition(
                                this.player.x + Math.cos(angle) * radius,
                                this.player.y + Math.sin(angle) * radius
                            );
                        });
                    }

                    // --- 적 및 발사체 관리 (기존 로직) ---
                    this.manageEntities(time, delta);
                    this.handleWeapons(time);
                }

                manageEntities(time: number, delta: number) {
                    const playerX = this.player.x, playerY = this.player.y;
                    const worldSize = Math.max(this.gameWidth, this.gameHeight) * 1.5;
                    const halfWorld = worldSize / 2;
                    const maxDistance = Math.max(this.gameWidth, this.gameHeight) * 1.2;

                    if (time % 200 < delta) {
                        this.enemies.getChildren().forEach((e: any) => {
                            if (!e || !e.active) return;

                            // 적이 생성된 시간 확인 (3초 = 3000ms)
                            const spawnTime = e.spawnTime || time;
                            const elapsedSinceSpawn = time - spawnTime;
                            const followDuration = 3000; // 3초

                            // 3초 동안은 플레이어를 따라다님
                            if (elapsedSinceSpawn < followDuration) {
                                this.physics.moveToObject(e, this.player, e.speed);
                                e.setRotation(Phaser.Math.Angle.Between(e.x, e.y, playerX, playerY) + Math.PI / 2);
                            } else {
                                // 3초 후에는 직선으로 이동
                                // 직선 이동 방향이 설정되지 않았으면 설정
                                if (!e.straightDirection) {
                                    // 플레이어를 향한 방향으로 초기 설정
                                    const angle = Phaser.Math.Angle.Between(e.x, e.y, playerX, playerY);
                                    e.straightDirection = angle;
                                    e.straightSpeed = e.speed;
                                }

                                // 직선으로 이동
                                const velX = Math.cos(e.straightDirection) * e.straightSpeed;
                                const velY = Math.sin(e.straightDirection) * e.straightSpeed;
                                (e.body as Phaser.Physics.Arcade.Body).setVelocity(velX, velY);

                                // 월드 경계 밖으로 나가면 사라짐
                                if (e.x < -halfWorld - 50 || e.x > halfWorld + 50 ||
                                    e.y < -halfWorld - 50 || e.y > halfWorld + 50) {
                                    e.destroy();
                                    return;
                                }
                            }

                            // 화면 밖으로 너무 멀리 나간 적 제거
                            const dist = Phaser.Math.Distance.Between(playerX, playerY, e.x, e.y);
                            if (dist > maxDistance) {
                                e.destroy();
                                return;
                            }
                        });
                    }
                }

                handleWeapons(time: number): void {
                    const enemies = this.enemies.getChildren() as any[];
                    const activeEnemies = enemies.filter((e: any) => e && e.active);

                    // activeEnemies가 비어있으면 무기 발사하지 않음
                    if (activeEnemies.length === 0) return;

                    // 1. 펄스 레이저 (기존)
                    if (this.weapons.laser.level > 0 && time > this.weapons.laser.lastFired + this.weapons.laser.cooldown) {
                        const count = Math.min(this.weapons.laser.level, 5);
                        const sorted = activeEnemies.map(e => ({ e, d: Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y) })).sort((a, b) => a.d - b.d);

                        for (let i = 0; i < count; i++) {
                            let angle;
                            if (i < sorted.length) angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, sorted[i].e.x, sorted[i].e.y);
                            else angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
                            this.fireLaser(angle);
                        }
                        this.weapons.laser.lastFired = time;
                    }

                    // 2. 어뢰 (기존)
                    if (this.weapons.torpedo.level > 0 && time > this.weapons.torpedo.lastFired + this.weapons.torpedo.cooldown) {
                        const torpedo = this.add.circle(this.player.x, this.player.y, 8, this.weapons.torpedo.color);
                        this.physics.add.existing(torpedo);
                        this.torpedoes.add(torpedo);
                        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
                        this.physics.velocityFromRotation(angle, 150, (torpedo.body as Phaser.Physics.Arcade.Body).velocity);
                        this.tweens.add({ targets: torpedo, alpha: 0.5, yoyo: true, duration: 100, repeat: -1 });
                        this.time.delayedCall(3000, () => torpedo.destroy());
                        this.weapons.torpedo.lastFired = time;
                        this.synth.playTorpedo();
                    }

                    // 3. 쉴드 (기존)
                    if (this.weapons.shield.level > 0) {
                        this.shieldCircle.setVisible(true);
                        const radius = 70 + (this.weapons.shield.level * 10);
                        this.shieldCircle.setRadius(radius);
                        (this.shieldCircle.body as Phaser.Physics.Arcade.Body).setCircle(radius);
                        (this.shieldCircle.body as Phaser.Physics.Arcade.Body).offset.set(-radius, -radius);
                        this.shieldCircle.setAlpha(0.5 + Math.sin(time / 100) * 0.2);
                    } else {
                        this.shieldCircle.setVisible(false);
                        (this.shieldCircle.body as Phaser.Physics.Arcade.Body).setCircle(1);
                    }

                    // 4. 레일건 (신규 - 관통)
                    if (this.weapons.railgun.level > 0 && time > this.weapons.railgun.lastFired + this.weapons.railgun.cooldown) {
                        const closest = this.physics.closest(this.player, activeEnemies) as any;
                        const angle = closest ? Phaser.Math.Angle.Between(this.player.x, this.player.y, closest.x, closest.y) : this.player.rotation - Math.PI / 2;

                        // 시각적 효과
                        const beam = this.add.rectangle(this.player.x, this.player.y, 1000, 5 + (this.weapons.railgun.level * 2), this.weapons.railgun.color);
                        beam.setOrigin(0, 0.5);
                        beam.setRotation(angle);
                        this.tweens.add({ targets: beam, alpha: 0, duration: 300, onComplete: () => beam.destroy() });

                        // 판정 (직선상의 모든 적)
                        // 간단한 구현을 위해 Raycasting 대신 Line과 Circle 충돌 체크 시뮬레이션
                        const line = new Phaser.Geom.Line(this.player.x, this.player.y, this.player.x + Math.cos(angle) * 1000, this.player.y + Math.sin(angle) * 1000);
                        activeEnemies.forEach(e => {
                            const circle = new Phaser.Geom.Circle(e.x, e.y, e.body.radius || 15);
                            if (Phaser.Geom.Intersects.LineToCircle(line, circle)) {
                                this.damageEnemy(e, this.weapons.railgun.damage);
                                this.createExplosion(e.x, e.y, 0x0000ff, 3);
                            }
                        });
                        this.weapons.railgun.lastFired = time;
                        this.synth.playRailgun();
                    }

                    // 5. 체인 라이트닝 (신규 - 연쇄)
                    if (this.weapons.lightning.level > 0 && time > this.weapons.lightning.lastFired + this.weapons.lightning.cooldown) {
                        const closest = this.physics.closest(this.player, activeEnemies) as any;
                        if (closest) {
                            let targets = [closest];
                            let current = closest;
                            // 레벨만큼 연쇄
                            for (let i = 0; i < this.weapons.lightning.level + 1; i++) {
                                // 현재 타겟 제외하고 가장 가까운 적 찾기
                                const next = activeEnemies
                                    .filter(e => !targets.includes(e))
                                    .reduce((prev, curr) => {
                                        const d = Phaser.Math.Distance.Between(current.x, current.y, curr.x, curr.y);
                                        return (d < 200 && d < prev.d) ? { e: curr, d } : prev;
                                    }, { e: null, d: Infinity }).e;

                                if (next) { targets.push(next); current = next; }
                                else break;
                            }

                            // 시각적 효과 및 데미지
                            const graphics = this.add.graphics();
                            graphics.lineStyle(2, 0xffff00);
                            graphics.beginPath();
                            graphics.moveTo(this.player.x, this.player.y);
                            targets.forEach(t => {
                                graphics.lineTo(t.x, t.y);
                                this.damageEnemy(t, this.weapons.lightning.damage);
                                this.createExplosion(t.x, t.y, 0xffff00, 2);
                            });
                            graphics.strokePath();
                            this.tweens.add({ targets: graphics, alpha: 0, duration: 200, onComplete: () => graphics.destroy() });

                            this.weapons.lightning.lastFired = time;
                            this.synth.playLightning();
                        }
                    }

                    // 6. 위성 비트 (신규 - 관리)
                    // 생성 로직 (레벨업 시 개수 증가 반영)
                    const targetBits = Math.min(this.weapons.bits.level, 6);
                    if (this.bitsGroup.getLength() < targetBits) {
                        const bit = this.add.circle(0, 0, 8, this.weapons.bits.color);
                        this.physics.add.existing(bit);
                        this.bitsGroup.add(bit);
                    }

                    // 7. 중력장 (신규 - 주기적 생성)
                    if (this.weapons.gravity.level > 0 && time > this.weapons.gravity.lastFired + this.weapons.gravity.cooldown) {
                        // 랜덤 위치
                        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
                        const dist = Phaser.Math.FloatBetween(100, 300);
                        const gx = this.player.x + Math.cos(angle) * dist;
                        const gy = this.player.y + Math.sin(angle) * dist;

                        const well = this.add.circle(gx, gy, 100, this.weapons.gravity.color, 0.3);
                        this.physics.add.existing(well);
                        this.gravityWells.add(well);

                        // 지속시간 후 제거
                        this.tweens.add({
                            targets: well,
                            scale: 0,
                            alpha: 0,
                            delay: this.weapons.gravity.duration,
                            duration: 500,
                            onComplete: () => well.destroy()
                        });

                        // 빨아들이는 로직은 별도 interval이나 update 내에서 처리해야 함
                        // 여기서는 간단히 중력장 생성 시점에 범위 내 적에게 끌어당기는 힘 적용 (한번)
                        activeEnemies.forEach(e => {
                            if (Phaser.Math.Distance.Between(gx, gy, e.x, e.y) < 150) {
                                this.physics.moveTo(e, gx, gy, 100); // 중력장 중심으로 이동
                                this.damageEnemy(e, this.weapons.gravity.damage);
                            }
                        });

                        this.weapons.gravity.lastFired = time;
                        this.synth.playGravity();
                    }
                }

                // --- 충돌 핸들러 ---
                fireLaser(angle: number): void {
                    const laser = this.add.rectangle(this.player.x, this.player.y, 20, 4, this.weapons.laser.color);
                    this.physics.add.existing(laser);
                    this.lasers.add(laser);
                    laser.setRotation(angle);
                    this.physics.velocityFromRotation(angle, 600, (laser.body as Phaser.Physics.Arcade.Body).velocity);
                    this.time.delayedCall(1000, () => { if (laser.active) laser.destroy(); });
                    this.synth.playLaser();
                }

                hitEnemy(laser: any, enemy: any): void { laser.destroy(); this.damageEnemy(enemy, this.weapons.laser.damage); this.createExplosion(enemy.x, enemy.y, 0xffff00, 3); }
                hitEnemyTorpedo(torp: any, enemy: any): void { torp.destroy(); this.damageEnemy(enemy, this.weapons.torpedo.damage); this.createExplosion(enemy.x, enemy.y, 0x00ff00, 10); }
                hitEnemyShield(shield: any, enemy: any): void { this.handleContactDamage(enemy, this.weapons.shield.damage, this.weapons.shield.tick); }
                hitEnemyBits(bit: any, enemy: any): void { this.handleContactDamage(enemy, this.weapons.bits.damage, 500); } // 비트는 0.5초마다 데미지

                handleContactDamage(enemy: any, dmg: number, tick: number) {
                    const time = this.game.getTime();
                    if (!enemy.lastHit || time > enemy.lastHit + tick) {
                        this.damageEnemy(enemy, dmg);
                        enemy.lastHit = time;
                        // 넉백
                        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
                        enemy.body.velocity.x += Math.cos(angle) * 100;
                        enemy.body.velocity.y += Math.sin(angle) * 100;
                    }
                }

                damageEnemy(enemy: any, damage: number): void {
                    enemy.hp -= damage;
                    enemy.setAlpha(0.5);
                    this.time.delayedCall(50, () => { if (enemy.active) enemy.setAlpha(1); });
                    if (enemy.hp <= 0) {
                        this.spawnExpOrb(enemy.x, enemy.y);
                        this.createExplosion(enemy.x, enemy.y, 0xff0000, 10);
                        enemy.destroy();
                        this.killCount++;
                        this.synth.playExplosion();
                    }
                }

                createExplosion(x: number, y: number, color: number, count: number): void {
                    for (let i = 0; i < Math.min(count, 5); i++) {
                        const p = this.add.rectangle(x, y, 3, 3, color);
                        this.physics.add.existing(p);
                        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
                        const speed = Phaser.Math.FloatBetween(50, 100);
                        (p.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
                        this.tweens.add({ targets: p, alpha: 0, scale: 0, duration: 300, onComplete: () => p.destroy() });
                    }
                }

                spawnExpOrb(x: number, y: number): void {
                    const orb = this.add.circle(x, y, 6, 0x00ccff);
                    this.physics.add.existing(orb);
                    this.expOrbs.add(orb);
                    this.tweens.add({ targets: orb, scale: 1.2, duration: 500, yoyo: true, repeat: -1 });
                }

                collectOrb(player: any, orb: any): void {
                    orb.destroy();
                    this.synth.playPowerUp();
                    this.playerStats.exp += 2;
                    if (this.playerStats.exp >= this.playerStats.nextExp) this.levelUp();
                    this.updateUI();
                }

                async hitPlayer(player: any, enemy: any): Promise<void> {
                    if (this.gameOverFlag) return;
                    this.gameOverFlag = true;
                    this.isPaused = true;
                    this.physics.pause();
                    const score = this.killCount * 100 + this.timeElapsed * 10;

                    const cx = this.cameras.main.centerX, cy = this.cameras.main.centerY;
                    this.add.rectangle(cx - this.gameWidth / 2, cy - this.gameHeight / 2, this.gameWidth, this.gameHeight, 0x000000, 0.7).setOrigin(0).setScrollFactor(0).setDepth(300);
                    this.add.text(cx, cy - 30, 'MISSION FAILED', { fontSize: '48px', color: '#ff0000', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(301);
                    this.add.text(cx, cy + 30, `Score: ${score}`, { fontSize: '32px', color: '#ffffff' }).setOrigin(0.5).setScrollFactor(0).setDepth(301);

                    const savedScore = parseInt(localStorage.getItem('orbital_defense_best') || '0');
                    if (score > savedScore) {
                        localStorage.setItem('orbital_defense_best', score.toString());
                        setMyBestScore(score);
                        await saveScore(score);
                    }
                    this.input.once('pointerdown', () => this.scene.restart());
                }

                spawnEnemy(): void {
                    if (this.gameOverFlag || this.isPaused || this.enemies.getLength() >= 40) return;
                    const worldSize = Math.max(this.gameWidth, this.gameHeight) * 1.5;
                    const halfWorld = worldSize / 2;
                    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
                    const dist = Math.min(400, Math.max(this.gameWidth, this.gameHeight) * 0.6);
                    let x = this.player.x + Math.cos(angle) * dist;
                    let y = this.player.y + Math.sin(angle) * dist;
                    x = Phaser.Math.Clamp(x, -halfWorld + 50, halfWorld - 50);
                    y = Phaser.Math.Clamp(y, -halfWorld + 50, halfWorld - 50);

                    const isElite = Math.random() < Math.min(0.5, this.timeElapsed * 0.01);
                    let enemy: any;
                    if (isElite) {
                        enemy = this.add.rectangle(x, y, 25, 25, 0xaa00ff);
                        enemy.hp = 30 + (this.timeElapsed * 2);
                        enemy.speed = 40 + (this.timeElapsed * 0.5);
                    } else {
                        enemy = this.add.circle(x, y, 10, 0xff0044);
                        enemy.hp = 10 + this.timeElapsed;
                        enemy.speed = 80 + this.timeElapsed;
                    }

                    // 몬스터 생성 시간 기록 (3초 동안 플레이어를 따라다니기 위해)
                    enemy.spawnTime = this.game.getTime();
                    enemy.straightDirection = null; // 직선 이동 방향 (3초 후 설정)
                    enemy.straightSpeed = enemy.speed; // 직선 이동 속도

                    this.physics.add.existing(enemy);
                    this.enemies.add(enemy);
                }

                // --- 레벨업 UI 및 랜덤 선택 로직 ---
                levelUp(): void {
                    this.playerStats.level++;
                    this.playerStats.exp = 0;
                    this.playerStats.nextExp = Math.floor(this.playerStats.nextExp * 1.5);
                    this.synth.playLevelUp();
                    this.isPaused = true;
                    this.physics.pause();
                    this.removeLevelUpUI();
                    this.showLevelUpUI();
                }

                showLevelUpUI(): void {
                    this.removeLevelUpUI();
                    const cx = this.cameras.main.centerX, cy = this.cameras.main.centerY;

                    const overlay = this.add.rectangle(cx - this.gameWidth / 2, cy - this.gameHeight / 2, this.gameWidth, this.gameHeight, 0x000000, 0.9).setOrigin(0).setScrollFactor(0).setDepth(200).setInteractive();
                    this.levelUpUIElements.push(overlay);

                    const title = this.add.text(cx, cy - 200, 'SYSTEM UPGRADE', { fontSize: '32px', color: '#00ffff', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
                    this.levelUpUIElements.push(title);

                    // --- 랜덤 3개 선택 로직 ---
                    const allWeapons = Object.keys(this.weapons);
                    const shuffled = Phaser.Utils.Array.Shuffle([...allWeapons]); // 배열 섞기
                    const options = shuffled.slice(0, 3); // 앞에서 3개 선택

                    options.forEach((key, index) => {
                        const weapon = this.weapons[key as keyof typeof this.weapons];
                        const yPos = cy - 50 + (index * 110);

                        const card = this.add.rectangle(cx, yPos, 320, 90, 0x222244).setScrollFactor(0).setDepth(201).setInteractive({ useHandCursor: true });
                        card.setStrokeStyle(2, weapon.color);
                        this.levelUpUIElements.push(card);

                        const status = weapon.level === 0 ? '[ NEW ]' : `[ Lv.${weapon.level} > Lv.${weapon.level + 1} ]`;
                        this.levelUpUIElements.push(this.add.text(cx, yPos - 20, weapon.name, { fontSize: '20px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(202));
                        this.levelUpUIElements.push(this.add.text(cx, yPos + 15, status, { fontSize: '14px', color: '#cccccc' }).setOrigin(0.5).setScrollFactor(0).setDepth(202));

                        card.on('pointerdown', () => {
                            // 업그레이드 적용
                            (weapon as any).level++;
                            // 각 무기별 강화 로직 (데미지 상승량 감소)
                            if (key === 'laser') { this.weapons.laser.damage += 5; this.weapons.laser.cooldown = Math.max(200, this.weapons.laser.cooldown - 50); } // 10 -> 5
                            if (key === 'shield') { this.weapons.shield.radius += 10; this.weapons.shield.damage += 1; } // 2 -> 1
                            if (key === 'torpedo') { this.weapons.torpedo.damage += 15; this.weapons.torpedo.cooldown -= 100; } // 30 -> 15
                            if (key === 'railgun') { this.weapons.railgun.damage += 10; this.weapons.railgun.cooldown -= 200; } // 20 -> 10
                            if (key === 'lightning') { this.weapons.lightning.damage += 5; } // 10 -> 5, 연쇄 횟수는 레벨기반 자동증가
                            if (key === 'bits') { this.weapons.bits.damage += 2; } // 5 -> 2, 개수는 레벨기반 자동증가
                            if (key === 'gravity') { this.weapons.gravity.duration += 500; this.weapons.gravity.cooldown -= 200; }

                            this.removeLevelUpUI();
                            this.isPaused = false;
                            this.physics.resume();
                            this.updateUI();
                        });
                    });
                }

                removeLevelUpUI(): void {
                    this.levelUpUIElements.forEach(el => { if (el && el.active) el.destroy(); });
                    this.levelUpUIElements = [];
                }

                setupUI(): void {
                    this.uiText = this.add.text(20, 20, '', { fontFamily: 'Arial', fontSize: '18px', color: '#00ffff' }).setScrollFactor(0).setDepth(100);
                    this.expBg = this.add.rectangle(this.gameWidth / 2, this.gameHeight - 20, this.gameWidth - 40, 10, 0x333333).setScrollFactor(0).setDepth(100);
                    this.expFill = this.add.rectangle(20, this.gameHeight - 20, 0, 10, 0x00ffff).setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);
                    this.updateUI();
                }

                updateUI(): void {
                    const min = Math.floor(this.timeElapsed / 60);
                    const sec = (this.timeElapsed % 60).toString().padStart(2, '0');
                    this.uiText.setText(`Lv.${this.playerStats.level} | ${min}:${sec} | Kills: ${this.killCount}`);
                    const maxBarWidth = this.gameWidth - 40;
                    const percent = Math.min(1, this.playerStats.exp / this.playerStats.nextExp);
                    this.expFill.width = maxBarWidth * percent;
                }
            }

            const getGameSize = () => {
                if (typeof window === 'undefined') return { width: 800, height: 600 };
                // 브라우저 크기에 맞춰 게임 화면 크기 계산 (상단 컨테이너를 꽉 채움)
                const container = gameRef.current?.parentElement;
                if (container) {
                    const rect = container.getBoundingClientRect();
                    return { width: rect.width, height: rect.height };
                }
                // 폴백: 전체 화면 크기 사용
                return { width: window.innerWidth, height: window.innerHeight };
            };
            const gameSize = getGameSize();
            const config: Phaser.Types.Core.GameConfig = {
                type: Phaser.AUTO, width: gameSize.width, height: gameSize.height,
                parent: gameRef.current, backgroundColor: '#000000',
                physics: { default: 'arcade', arcade: { debug: false, gravity: { x: 0, y: 0 }, fps: 60 } },
                scale: {
                    mode: Phaser.Scale.RESIZE,
                    autoCenter: Phaser.Scale.CENTER_BOTH
                },
                scene: MainScene, fps: { target: 60, forceSetTimeOut: true }
            };

            game = new Phaser.Game(config);

            // 브라우저 크기 변경 시 게임 화면 크기 조정
            const handleResize = () => {
                if (game && gameRef.current?.parentElement) {
                    const container = gameRef.current.parentElement;
                    const rect = container.getBoundingClientRect();
                    game.scale.resize(rect.width, rect.height);
                }
            };

            window.addEventListener('resize', handleResize);

            // 초기 크기 조정을 위한 짧은 지연
            setTimeout(handleResize, 100);
        };

        initPhaser();
        return () => { if (game) game.destroy(true); if (scoreAbortControllerRef.current) scoreAbortControllerRef.current.abort(); };
    }, []);

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-[#09090b] text-white p-4 relative overflow-hidden">
            <div className="absolute inset-0 z-0 pointer-events-none opacity-30">
                <div className="absolute w-[2px] h-[2px] bg-green-400 rounded-full top-10 left-20 animate-pulse"></div>
            </div>
            <div className="absolute top-6 left-6 z-10 flex items-center gap-4">
                <Link href="/game">
                    <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full bg-black/40 border border-white/10 text-white hover:bg-white/10 hover:text-green-400 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
            </div>
            <h1 className="text-2xl md:text-4xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-yellow-600 drop-shadow-[0_2px_10px_rgba(34,197,94,0.5)] z-10 italic tracking-tighter px-4 text-center">
                SPACE <span className="text-xl md:text-2xl not-italic font-light text-white/80">SURVIVOR</span>
            </h1>
            <div className="flex flex-col items-center justify-center z-10 mt-2 md:mt-4 relative w-full px-4 flex-1 min-h-0">
                <div className="relative rounded-xl md:rounded-2xl overflow-hidden border-2 md:border-4 border-green-500/20 shadow-[0_0_50px_rgba(34,197,94,0.1)] w-full h-full bg-[#0a0a0c] mx-auto">
                    <div ref={gameRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />
                </div>
            </div>
            <div className="mt-4 md:mt-6 text-slate-400 z-10 flex flex-col md:flex-row items-center gap-2 md:gap-4 text-xs md:text-sm tracking-widest uppercase pointer-events-none px-4">
                <span className="flex items-center gap-1"><kbd className="bg-white/10 px-2 py-1 rounded border border-white/10 text-[10px] md:text-xs">WASD</kbd> MOVE</span>
                <span className="flex items-center gap-1 text-green-400"><kbd className="bg-green-400/20 px-2 py-1 rounded border border-green-400/30 text-[10px] md:text-xs">AUTO</kbd> FIRE</span>
            </div>
        </div>
    );
}