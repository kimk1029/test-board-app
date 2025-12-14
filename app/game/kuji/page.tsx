'use client'

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import HeaderNavigator from '@/components/HeaderNavigator';
import { Sparkles, Gift } from 'lucide-react';
import confetti from 'canvas-confetti';
import { refreshUserPoints } from '@/components/HeaderNavigator';

// --- Types ---
type Rank = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'LAST_ONE';

interface Prize {
    rank: Rank;
    name: string;
    image: string; // 이모지나 URL
    color: string;
    totalQty: number;
}

interface Ticket {
    id: number;
    rank: Rank;
    isRevealed: boolean; // 결과가 공개되었는가 (뜯었는가)
    isSelected: boolean; // 사용자가 선택했는가
    isTaken: boolean;    // 누군가(혹은 내가) 가져갔는가
}

// 초기 데이터 (서버 로드 전)
const INITIAL_PRIZE_LIST: Prize[] = [
    { rank: 'A', name: '초특대 피규어 (1/7)', image: '🧸', color: '#ff4757', totalQty: 2 },
    { rank: 'B', name: '일러스트 보드', image: '🎨', color: '#ffa502', totalQty: 3 },
    { rank: 'C', name: '캐릭터 인형', image: '🐰', color: '#2ed573', totalQty: 5 },
    { rank: 'D', name: '유리컵 세트', image: '🥃', color: '#1e90ff', totalQty: 10 },
    { rank: 'E', name: '핸드 타올', image: '🧣', color: '#5352ed', totalQty: 15 },
    { rank: 'F', name: '아크릴 참', image: '✨', color: '#3742fa', totalQty: 20 },
    { rank: 'G', name: '클리어 파일', image: '📁', color: '#7bed9f', totalQty: 25 },
];

const INITIAL_LAST_ONE_PRIZE: Prize = {
    rank: 'LAST_ONE', name: '라스트원 스페셜 Ver.', image: '👑', color: '#000000', totalQty: 1
};

export default function IchibanKujiGame() {
    const router = useRouter();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [boxId, setBoxId] = useState<number | null>(null);
    const [purchaseCount, setPurchaseCount] = useState<number>(1);
    const [gameState, setGameState] = useState<'IDLE' | 'LOADING_STATE' | 'SELECTING' | 'PEELING' | 'RESULT'>('IDLE');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [currentPeelIndex, setCurrentPeelIndex] = useState<number>(0);
    const [wonPrizes, setWonPrizes] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [userPoints, setUserPoints] = useState<number>(0);
    const [purchaseLoading, setPurchaseLoading] = useState(false);
    const [isDemo, setIsDemo] = useState(false);

    // State로 변환된 상품 목록
    const [prizeList, setPrizeList] = useState<Prize[]>(INITIAL_PRIZE_LIST);
    const [lastOnePrize, setLastOnePrize] = useState<Prize>(INITIAL_LAST_ONE_PRIZE);

    // 초기화 - 서버에서 티켓 상태 가져오기
    useEffect(() => {
        // 페이지 진입 시 항상 서버 상태로 강제 동기화
        const initialize = async () => {
            await loadBoxState(true); // forceUpdate=true로 서버 상태 강제 반영
            loadUserPoints();
        };
        initialize();
    }, []);

    // 사용자 포인트 로드
    const loadUserPoints = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setUserPoints(10000); // 데모 포인트
            setIsDemo(true);
            return;
        }

        try {
            const response = await fetch('/api/user/me', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const userData = await response.json();
                setUserPoints(userData.points || 0);
            }
        } catch (error) {
            console.error('Failed to load user points:', error);
        }
    };

    // 서버에서 박스 상태 로드 (항상 최신 DB 정보 가져오기)
    const loadBoxState = async (forceUpdate: boolean = false) => {
        try {
            // 캐싱 방지를 위해 타임스탬프 추가
            const response = await fetch(`/api/kuji/box?t=${Date.now()}`);

            if (response.ok) {
                const data = await response.json();
                setBoxId(data.boxId);

                // [NEW] 서버에서 상품 정보(prizeInfo)가 오면 PRIZE_LIST 업데이트
                if (data.prizeInfo && Array.isArray(data.prizeInfo)) {
                    const serverPrizes = data.prizeInfo;

                    // 1. 일반 등급 업데이트
                    const newPrizeList = serverPrizes
                        .filter((p: any) => p.rank !== 'LAST_ONE')
                        .map((p: any) => ({
                            rank: p.rank as Rank,
                            name: p.name,
                            image: INITIAL_PRIZE_LIST.find(def => def.rank === p.rank)?.image || '🎁',
                            color: p.color || '#888',
                            totalQty: p.qty
                        }));

                    if (newPrizeList.length > 0) {
                        setPrizeList(newPrizeList);
                    }

                    // 2. 라스트원 업데이트
                    const lastOne = serverPrizes.find((p: any) => p.rank === 'LAST_ONE');
                    if (lastOne) {
                        setLastOnePrize({
                            rank: 'LAST_ONE',
                            name: lastOne.name,
                            image: '👑',
                            color: lastOne.color || '#000',
                            totalQty: 1
                        });
                    }
                }

                // 서버에서 받은 티켓 데이터를 클라이언트 형식으로 변환
                // 중요: 서버에서 받은 rank 정보를 항상 사용 (뽑힌 티켓만 rank 포함, 안뽑힌 티켓은 null)
                // 보안: 안뽑힌 티켓의 rank는 null이므로 네트워크 탭에서 확인 불가
                const convertedTickets: Ticket[] = data.tickets.map((t: any) => ({
                    id: t.id,
                    rank: (t.rank || 'G') as Rank, // null인 경우 임시값 'G' (실제 rank는 서버에만 존재)
                    isRevealed: t.isTaken,
                    isSelected: false,
                    isTaken: t.isTaken,
                }));

                // forceUpdate가 true이면 항상 서버 상태로 동기화
                // forceUpdate가 false일 때는 현재 gameState를 확인하여 조건부 업데이트
                // PEELING이나 RESULT 상태일 때는 로컬 상태 유지 (뽑기 중 상태 변경 방지)
                if (forceUpdate) {
                    // 강제 업데이트: 페이지 재진입, 구매 후, 결과 후 등
                    setTickets(convertedTickets);
                } else {
                    // 조건부 업데이트: IDLE, LOADING_STATE, SELECTING 상태일 때만
                    const currentState = gameState;
                    if (currentState === 'IDLE' || currentState === 'LOADING_STATE' || currentState === 'SELECTING') {
                        setTickets(convertedTickets);
                    }
                }

            } else {
                console.error('Failed to load box state');
            }
        } catch (error) {
            console.error('Error loading box state:', error);
        } finally {
            setLoading(false);
        }
    };

    // 남은 수량 계산 (tickets 상태 기반)
    const getRemainingCount = (rank: Rank) => {
        return tickets.filter(t => t.rank === rank && !t.isTaken).length;
    };

    const totalRemaining = tickets.filter(t => !t.isTaken).length;

    // 구매 처리
    const handlePurchase = async () => {
        const totalCost = purchaseCount * 100;

        if (userPoints < totalCost) {
            alert('포인트가 부족합니다.');
            return;
        }

        if (purchaseCount < 1 || purchaseCount > 10) {
            alert('1개 이상 10개 이하로 구매할 수 있습니다.');
            return;
        }

        if (purchaseCount > totalRemaining) {
            alert("남은 수량보다 많이 구매할 수 없습니다!");
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            // 데모 구매 처리 (로컬)
            setUserPoints(prev => prev - totalCost);
            setGameState('SELECTING');
            setSelectedIds([]);
            return;
        }

        setPurchaseLoading(true);

        try {
            // 포인트 차감
            const response = await fetch('/api/game/bet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    action: 'bet',
                    game: 'kuji',
                    amount: totalCost,
                    result: 'bet'
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setUserPoints(data.points);
                // 헤더 포인트 갱신
                refreshUserPoints();

                // 1. 먼저 서버에서 최신 상태를 가져와서 보여줌 (마지막 상태)
                setGameState('LOADING_STATE');
                await loadBoxState(true); // forceUpdate=true로 최신 상태 강제 반영

                // 2. 상태 로드 완료 후 티켓 선택 모드로 전환
                setGameState('SELECTING');
                setSelectedIds([]);
            } else {
                const errorData = await response.json();
                alert(errorData.error || '구매에 실패했습니다.');
            }
        } catch (error) {
            console.error('Purchase error:', error);
            alert('구매 중 오류가 발생했습니다.');
        } finally {
            setPurchaseLoading(false);
        }
    };

    // 티켓 선택 핸들러
    const handleTicketClick = (id: number) => {
        if (gameState !== 'SELECTING') return;

        const target = tickets.find(t => t.id === id);
        if (!target || target.isTaken) return;

        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(tid => tid !== id));
        } else {
            if (selectedIds.length < purchaseCount) {
                setSelectedIds(prev => [...prev, id]);
            }
        }
    };

    // 선택 완료 -> 뜯기 모드로
    const confirmSelection = async () => {
        if (selectedIds.length !== purchaseCount) return;

        // 선택한 모든 티켓을 서버에 한 번에 업데이트
        const token = localStorage.getItem('token');
        if (token && boxId !== null) {
            try {
                console.log(`[Kuji Client] Sending update request: boxId=${boxId}, ticketIds=${JSON.stringify(selectedIds)}`);

                const response = await fetch('/api/kuji/tickets', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        boxId,
                        ticketIds: selectedIds, // 선택한 모든 티켓 ID 전송 (ticketId 값)
                    }),
                });

                if (response.ok) {
                    const responseData = await response.json();
                    console.log(`[Kuji Client] Update response:`, responseData);

                    // DB 업데이트 후 즉시 최신 정보 가져오기 (재고, 티켓 상태 등)
                    await loadBoxState(true); // forceUpdate=true로 최신 DB 상태 강제 반영

                    // 서버에서 반환된 티켓 정보로 로컬 상태 업데이트 (뜯기 애니메이션용)
                    if (responseData.tickets && responseData.tickets.length > 0) {
                        // 서버 응답으로 티켓 상태 업데이트 (rank 정보 포함)
                        setTickets(prev => {
                            const updated = prev.map(t => {
                                const serverTicket = responseData.tickets.find((st: any) => st.id === t.id);
                                if (serverTicket) {
                                    return {
                                        ...t,
                                        isTaken: true, // 항상 true (뽑힌 티켓만 응답에 포함)
                                        rank: serverTicket.rank as Rank, // 서버에서 받은 rank 사용
                                    };
                                }
                                return t;
                            });
                            return updated;
                        });
                    } else {
                        console.error('[Kuji Client] No tickets in response:', responseData);
                    }

                    // 뜯기 모드로 전환
                    setGameState('PEELING');
                    setCurrentPeelIndex(0);
                    setWonPrizes([]);
                } else {
                    const errorData = await response.json();
                    console.error('[Kuji Client] Update failed:', errorData);
                    alert(errorData.error || '티켓 업데이트에 실패했습니다.');
                }
            } catch (error) {
                console.error('[Kuji Client] Error updating tickets:', error);
                alert('티켓 업데이트 중 오류가 발생했습니다.');
            }
        } else {
            // 데모 모드일 경우 바로 뜯기 모드로
            setGameState('PEELING');
            setCurrentPeelIndex(0);
            setWonPrizes([]);
        }
    };

    // 뜯기 완료 처리 (하나 뜯을 때마다 호출)
    // 주의: confirmSelection에서 이미 모든 티켓이 서버에 업데이트되었으므로,
    // 여기서는 로컬 상태만 업데이트 (UI 애니메이션용)
    const handlePeelComplete = async () => {
        const currentTicketId = selectedIds[currentPeelIndex];

        // 로컬 상태만 업데이트 (서버 업데이트는 confirmSelection에서 이미 완료됨)
        setTickets(prev => {
            const updated = prev.map(t => {
                if (t.id === currentTicketId) {
                    // 이미 서버에서 업데이트된 rank 정보 사용
                    return { ...t, isRevealed: true };
                }
                return t;
            });

            // wonPrizes에 추가
            const currentTicket = updated.find(t => t.id === currentTicketId);
            if (currentTicket && currentTicket.rank) {
                setWonPrizes(prevPrizes => {
                    // 중복 추가 방지
                    if (!prevPrizes.find(p => p.id === currentTicket.id)) {
                        return [...prevPrizes, currentTicket];
                    }
                    return prevPrizes;
                });
            }

            return updated;
        });

        // 폭죽 효과 (Confetti) - 상태 업데이트 후 최신 티켓 정보 사용
        // tickets 상태가 비동기로 업데이트되므로, setTimeout으로 약간의 지연 후 확인
        setTimeout(() => {
            setTickets(currentTickets => {
                const currentTicket = currentTickets.find(t => t.id === currentTicketId);
                if (currentTicket && currentTicket.rank) {
                    const prizeInfo = prizeList.find(p => p.rank === currentTicket.rank);
                    const color = prizeInfo?.color || '#ffffff';
                    confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: [color, '#ffd700', '#ffffff'],
                        shapes: ['circle', 'square', 'star']
                    });
                }
                return currentTickets;
            });
        }, 100);

        // 다음 티켓으로 넘어가거나 결과창으로
        setTimeout(() => {
            if (currentPeelIndex < selectedIds.length - 1) {
                setCurrentPeelIndex(prev => prev + 1);
            } else {
                // 모든 티켓 오픈 완료
                setGameState('RESULT');
            }
        }, 3000); // 결과 보여주는 시간
    };

    // 뽑기 완료 후 최종 상태 동기화
    useEffect(() => {
        if (gameState === 'RESULT') {
            // 결과 화면으로 전환된 후 서버에서 최종 상태 동기화
            const syncFinalState = async () => {
                await loadBoxState(true); // forceUpdate=true로 최종 상태 강제 반영
            };
            // 약간의 지연 후 동기화 (결과 화면을 먼저 보여줌)
            setTimeout(() => {
                syncFinalState();
            }, 1000);
        }
    }, [gameState]);

    // 리셋
    const resetGame = async () => {
        setGameState('IDLE');
        setSelectedIds([]);
        setPurchaseCount(1);
        setWonPrizes([]);
        setCurrentPeelIndex(0);

        // 사용자 포인트 갱신 및 박스 상태 동기화
        await loadUserPoints();
        await loadBoxState(true); // forceUpdate=true로 서버 상태 강제 반영
    };

    return (
        <div className="min-h-screen bg-black text-slate-100 font-sans overflow-x-hidden selection:bg-indigo-500/30">
            <HeaderNavigator />

            {/* Background Effects */}
            <div className="fixed inset-0 bg-[#09090b] -z-20" />
            <div className="fixed inset-0 bg-gradient-to-br from-indigo-900/20 via-purple-900/20 to-black -z-10" />
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-30">
                <div className="absolute top-10 left-10 w-72 h-72 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
                <div className="absolute top-10 right-10 w-72 h-72 bg-yellow-600 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative">

                {/* 데모 모드 배지 */}
                {isDemo && (
                    <div className="absolute top-28 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
                        <div className="bg-yellow-500/90 text-black px-4 py-1 rounded-full font-bold text-sm shadow-[0_0_20px_rgba(234,179,8,0.6)] animate-pulse border border-yellow-300 tracking-wider uppercase">
                            Demo Mode
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* --- Header --- */}
                    <div className="lg:col-span-12 mb-4">
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col md:flex-row justify-between items-end border-b border-white/10 pb-6 gap-4"
                        >
                            <div>
                                <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">
                                    ICHIBAN KUJI
                                </h1>
                                <p className="text-slate-400 mt-2 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-yellow-400" />
                                    최고의 행운을 시험해보세요!
                                </p>
                            </div>
                            <div className="text-right bg-white/5 px-6 py-3 rounded-2xl border border-white/10 backdrop-blur-md">
                                <div className="text-3xl font-black text-yellow-400 drop-shadow-md">{totalRemaining} <span className="text-xl text-slate-500">/ {tickets.length}</span></div>
                                <div className="text-xs text-slate-400 uppercase tracking-widest font-bold">Remaining Tickets</div>
                            </div>
                        </motion.div>
                    </div>

                    {/* --- Left: Status Board --- */}
                    <div className="lg:col-span-3 order-2 lg:order-1">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-[#18181b]/80 backdrop-blur-md rounded-3xl p-5 border border-white/10 sticky top-24 shadow-2xl"
                        >
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
                                <Gift className="w-5 h-5 text-pink-500" />
                                PRIZE LIST
                            </h2>
                            <div className="space-y-3">
                                {prizeList.map((prize) => {
                                    const remaining = getRemainingCount(prize.rank);
                                    const isSoldOut = remaining === 0;
                                    return (
                                        <div key={prize.rank} className={`group relative overflow-hidden rounded-xl transition-all duration-300 ${isSoldOut ? 'opacity-40 grayscale' : 'bg-white/5 hover:bg-white/10 border border-white/5'}`}>
                                            {/* Progress Bar Background */}
                                            <div
                                                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-all duration-500"
                                                style={{ width: `${(remaining / prize.totalQty) * 100}%`, backgroundColor: prize.color }}
                                            />

                                            <div className="flex items-center justify-between p-3">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg shadow-lg transform group-hover:scale-110 transition-transform"
                                                        style={{ backgroundColor: prize.color, color: 'white' }}
                                                    >
                                                        {prize.rank}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-200 line-clamp-1">{prize.name}</span>
                                                        <span className="text-[10px] text-slate-500">{isSoldOut ? 'SOLD OUT' : 'Available'}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-lg font-bold text-white leading-none">
                                                        {remaining}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500">
                                                        / {prize.totalQty}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Last One */}
                                <div className="mt-4 pt-4 border-t border-white/10">
                                    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-yellow-900/40 to-amber-900/40 border border-yellow-500/30 p-3 group hover:border-yellow-500/60 transition-colors">
                                        <div className="absolute inset-0 bg-yellow-500/5 animate-pulse" />
                                        <div className="flex items-center justify-between relative z-10">
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl group-hover:rotate-12 transition-transform">👑</span>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-yellow-500 tracking-widest">LAST ONE</span>
                                                    <span className="text-[10px] text-slate-400">마지막 티켓 구매자 보너스</span>
                                                </div>
                                            </div>
                                            <div className={`text-xs font-bold px-2 py-1 rounded ${totalRemaining > 0 ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                                                {totalRemaining > 0 ? 'WAITING' : 'TAKEN'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* --- Center: Game Area --- */}
                    <div className="lg:col-span-9 order-1 lg:order-2">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-[#18181b]/90 backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-8 lg:p-10 shadow-2xl border border-white/10 min-h-[600px] relative overflow-hidden flex flex-col"
                        >
                            {/* Decorative Elements */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-b from-white/5 to-transparent rounded-bl-full pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-t from-white/5 to-transparent rounded-tr-full pointer-events-none" />

                            {/* 0. LOADING_STATE: 구매 후 최신 상태 로딩 */}
                            {gameState === 'LOADING_STATE' && (
                                <div className="h-full flex flex-col items-center justify-center space-y-6 animate-fade-in py-10">
                                    <div className="text-center space-y-4">
                                        <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                        <h3 className="text-2xl font-black text-white">최신 상태 불러오는 중...</h3>
                                        <p className="text-slate-400">뽑힌 티켓 정보를 확인하고 있습니다</p>
                                    </div>
                                </div>
                            )}

                            {/* 1. IDLE: 구매 수량 선택 및 구매 */}
                            {gameState === 'IDLE' && (
                                <div className="h-full flex flex-col items-center justify-center space-y-10 animate-fade-in py-10">
                                    <div className="text-center space-y-2">
                                        <h3 className="text-3xl md:text-4xl font-black text-white">TICKET PURCHASE</h3>
                                        <p className="text-slate-400 text-lg">1장당 100 포인트, 최대 10장까지 구매 가능</p>
                                    </div>

                                    <div className="flex flex-col md:flex-row gap-6 w-full max-w-2xl justify-center items-stretch">
                                        {/* Points Card */}
                                        <div className="flex-1 bg-black/40 rounded-2xl p-6 border border-white/10 text-center flex flex-col justify-center">
                                            <div className="text-sm text-slate-500 uppercase tracking-wider font-bold mb-2">My Points</div>
                                            <div className="text-3xl font-black text-indigo-400 truncate">
                                                {userPoints.toLocaleString()} P
                                            </div>
                                        </div>

                                        {/* Cost Card */}
                                        <div className="flex-1 bg-black/40 rounded-2xl p-6 border border-white/10 text-center flex flex-col justify-center relative overflow-hidden">
                                            <div className="text-sm text-slate-500 uppercase tracking-wider font-bold mb-2">Total Cost</div>
                                            <div className={`text-3xl font-black ${userPoints >= purchaseCount * 100 ? 'text-white' : 'text-red-500'}`}>
                                                {(purchaseCount * 100).toLocaleString()} P
                                            </div>
                                            {userPoints < purchaseCount * 100 && (
                                                <div className="text-xs text-red-500 font-bold mt-1 bg-red-950/50 px-2 py-1 rounded inline-block mx-auto">
                                                    포인트 부족
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Counter */}
                                    <div className="flex items-center gap-8 bg-white/5 p-4 rounded-full border border-white/10 shadow-inner">
                                        <button
                                            onClick={() => setPurchaseCount(Math.max(1, purchaseCount - 1))}
                                            className="w-14 h-14 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center text-2xl font-bold transition shadow-lg border border-white/10"
                                        >−</button>
                                        <span className="text-5xl font-mono font-black w-24 text-center text-white">{purchaseCount}</span>
                                        <button
                                            onClick={() => setPurchaseCount(Math.min(10, Math.min(totalRemaining, purchaseCount + 1)))}
                                            className="w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center text-2xl font-bold transition shadow-lg border border-white/10 shadow-indigo-500/20"
                                        >+</button>
                                    </div>

                                    {/* Buy Button */}
                                    <button
                                        onClick={handlePurchase}
                                        disabled={purchaseLoading || userPoints < purchaseCount * 100 || purchaseCount < 1 || purchaseCount > totalRemaining}
                                        className="w-full max-w-md py-5 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 disabled:from-slate-700 disabled:to-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl text-xl font-black text-black shadow-xl shadow-orange-500/20 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                                    >
                                        {purchaseLoading ? '처리 중...' : `PURCHASE (${(purchaseCount * 100).toLocaleString()} P)`}
                                    </button>
                                </div>
                            )}

                            {/* 2. SELECTING: 그리드에서 선택 */}
                            {gameState === 'SELECTING' && (
                                <div className="h-full flex flex-col animate-fade-in">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                                        <div>
                                            <h3 className="text-2xl font-bold text-white">SELECT TICKETS</h3>
                                            <p className="text-slate-400">원하는 위치의 복권을 선택하세요 <span className="text-yellow-400 font-bold ml-1">({selectedIds.length}/{purchaseCount})</span></p>
                                        </div>
                                        {selectedIds.length === purchaseCount && (
                                            <button
                                                onClick={confirmSelection}
                                                className="px-8 py-3 bg-green-500 hover:bg-green-400 text-black rounded-xl text-lg font-black animate-pulse shadow-lg shadow-green-500/30 transition-colors"
                                            >
                                                OPEN NOW!
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                                            {tickets.map((ticket) => (
                                                <button
                                                    key={ticket.id}
                                                    disabled={ticket.isTaken}
                                                    onClick={() => handleTicketClick(ticket.id)}
                                                    className={`
                                                        aspect-[3/4] rounded-lg flex flex-col items-center justify-center transition-all duration-300 relative group overflow-hidden
                        ${ticket.isTaken
                                                            ? 'bg-slate-900/50 border border-slate-800 opacity-40 cursor-not-allowed'
                                                            : selectedIds.includes(ticket.id)
                                                                ? 'bg-yellow-500 border-2 border-white transform scale-105 shadow-[0_0_15px_rgba(234,179,8,0.5)] z-10'
                                                                : 'bg-[#27272a] hover:bg-[#3f3f46] border border-white/10 hover:border-white/30'
                                                        }
                      `}
                                                >
                                                    {ticket.isTaken ? (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20">
                                                            <div className="text-3xl font-black rotate-12 drop-shadow-lg" style={{ color: prizeList.find(p => p.rank === ticket.rank)?.color || '#555' }}>
                                                                {ticket.rank}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="absolute top-0 left-0 w-full h-1 bg-white/10" />
                                                            <span className={`text-[10px] font-mono absolute top-2 left-2 ${selectedIds.includes(ticket.id) ? 'text-black/50' : 'text-slate-600'}`}>NO.</span>
                                                            <span className={`text-lg font-black ${selectedIds.includes(ticket.id) ? 'text-black' : 'text-white group-hover:text-yellow-400'}`}>{ticket.id + 1}</span>
                                                            <div className="absolute bottom-0 w-full h-8 bg-stripes-white opacity-5" />
                                                        </>
                                                    )}

                                                    {/* 선택 체크마크 */}
                                                    {selectedIds.includes(ticket.id) && (
                                                        <div className="absolute top-2 right-2 bg-black text-yellow-500 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-sm">
                                                            ✓
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 3. PEELING: 하나씩 뜯는 애니메이션 모달 */}
                            <AnimatePresence>
                                {gameState === 'PEELING' && (
                                    <motion.div
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        className="absolute inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/90 backdrop-blur-md rounded-[2.5rem]"
                                    >
                                        <div className="text-center mb-10">
                                            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">OPEN YOUR LUCK</h2>
                                            <p className="text-indigo-300 font-mono">{currentPeelIndex + 1} / {purchaseCount}</p>
                                        </div>

                                        <PeelingTicket
                                            key={selectedIds[currentPeelIndex]} // Key 변경으로 컴포넌트 리셋
                                            ticketId={selectedIds[currentPeelIndex]}
                                            realRank={tickets.find(t => t.id === selectedIds[currentPeelIndex])?.rank || 'G'}
                                            prizeList={prizeList}
                                            onPeelComplete={handlePeelComplete}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* 4. RESULT: 최종 결과 화면 */}
                            {gameState === 'RESULT' && (
                                <div className="h-full flex flex-col items-center justify-center text-center animate-fade-in-up py-10">
                                    <div className="mb-10">
                                        <h2 className="text-5xl md:text-6xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-500 to-red-500 filter drop-shadow-lg">
                                            CONGRATULATIONS!
                                        </h2>
                                        <p className="text-slate-400 text-lg">획득하신 상품을 확인하세요.</p>
                                    </div>

                                    <div className="flex flex-wrap justify-center gap-6 mb-12 w-full overflow-y-auto max-h-[400px] px-4">
                                        {wonPrizes.map((ticket, idx) => {
                                            const prizeInfo = prizeList.find(p => p.rank === ticket.rank);
                                            return (
                                                <motion.div
                                                    key={idx}
                                                    initial={{ scale: 0, rotate: -10 }}
                                                    animate={{ scale: 1, rotate: 0 }}
                                                    transition={{ delay: idx * 0.1, type: "spring" }}
                                                    className="w-40 h-56 rounded-2xl shadow-2xl flex flex-col items-center justify-between p-1 relative overflow-hidden bg-[#202023] border border-white/10 group hover:-translate-y-2 transition-transform duration-300"
                                                >
                                                    {/* Card Glow */}
                                                    <div className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity duration-500" style={{ backgroundColor: prizeInfo?.color }} />

                                                    <div className="w-full h-full bg-[#18181b] rounded-xl flex flex-col items-center justify-center relative z-10 p-4 border border-white/5">
                                                        <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform duration-300">{prizeInfo?.image}</div>
                                                        <div className="text-center w-full">
                                                            <div className="text-3xl font-black mb-1" style={{ color: prizeInfo?.color }}>{ticket.rank}</div>
                                                            <div className="text-xs font-bold text-slate-400 line-clamp-2 leading-tight">{prizeInfo?.name}</div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )
                                        })}

                                        {/* 라스트원 상 표시 */}
                                        {totalRemaining === 0 && (
                                            <motion.div
                                                initial={{ scale: 0 }} animate={{ scale: 1.1 }}
                                                className="w-40 h-56 rounded-2xl shadow-2xl flex flex-col items-center justify-between p-1 relative overflow-hidden bg-black border-2 border-yellow-500 shadow-yellow-500/20"
                                            >
                                                <div className="absolute inset-0 bg-yellow-500/10 animate-pulse" />
                                                <div className="w-full h-full bg-black rounded-xl flex flex-col items-center justify-center relative z-10 p-4">
                                                    <div className="text-5xl mb-4 animate-bounce">👑</div>
                                                    <div className="text-center w-full">
                                                        <div className="text-sm font-black text-yellow-500 mb-1 tracking-widest">LAST ONE</div>
                                                        <div className="text-xs font-bold text-white line-clamp-2 leading-tight">{lastOnePrize.name}</div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>

                                    <button
                                        onClick={resetGame}
                                        className="px-10 py-4 bg-white text-black hover:bg-slate-200 rounded-full text-lg font-black transition shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transform hover:scale-105 active:scale-95"
                                    >
                                        PLAY AGAIN
                                    </button>
                                </div>
                            )}

                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Sub Component: Peeling Ticket (뜯는 애니메이션) ---
function PeelingTicket({ ticketId, realRank, prizeList, onPeelComplete }: { ticketId: number, realRank: Rank, prizeList: Prize[], onPeelComplete: () => void }) {
    const [isPeeling, setIsPeeling] = useState(false);
    const [isRevealed, setIsRevealed] = useState(false);
    const prizeInfo = prizeList.find(p => p.rank === realRank);

    const handleDragEnd = (event: any, info: any) => {
        // 아래로 충분히 드래그했으면 뜯김 처리
        if (info.offset.y > 100) {
            setIsPeeling(true);
            setTimeout(() => {
                setIsRevealed(true);
                // 결과 보여주고 부모에게 알림
                setTimeout(() => {
                    onPeelComplete();
                }, 100); // 즉시 결과 확인 및 폭죽
            }, 300);
        }
    };

    return (
        <div className="relative w-72 h-96 perspective-1000">

            {/* 1. Inside (Result) - 뜯겨진 뒤 보이는 내용 */}
            <div className={`absolute inset-0 bg-[#18181b] rounded-2xl shadow-2xl flex flex-col items-center justify-center p-6 border-4 transition-all duration-700 ${isRevealed ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
                style={{ borderColor: prizeInfo?.color }}
            >
                <div className="absolute inset-0 opacity-10 bg-[url('/noise.png')] opacity-20 mix-blend-overlay pointer-events-none" />

                <motion.div
                    initial={{ scale: 0.5, opacity: 0, y: 20 }}
                    animate={isRevealed ? { scale: 1, opacity: 1, y: 0 } : {}}
                    transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                    className="text-center relative z-10"
                >
                    <div className="text-9xl mb-6 font-black drop-shadow-2xl" style={{ color: prizeInfo?.color }}>{prizeInfo?.rank}</div>
                    <div className="text-2xl font-bold text-white leading-tight">{prizeInfo?.name}</div>
                </motion.div>
            </div>

            {/* 2. Outside (Cover) - 뜯기 전 커버 */}
            {!isRevealed && (
                <div className="absolute inset-0 bg-[#27272a] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-white/10">
                    {/* 상단 (고정부) */}
                    <div className="h-1/4 bg-[#202023] border-b-2 border-dashed border-white/20 flex items-center justify-center relative z-10">
                        <div className="text-center">
                            <div className="text-slate-500 font-mono text-[10px] tracking-[0.2em] mb-1">ICHIBAN KUJI</div>
                            <div className="text-3xl font-black text-white">NO.{ticketId + 1}</div>
                        </div>
                        {/* 뜯는 구멍 표현 */}
                        <div className="absolute -bottom-2 left-4 w-4 h-4 bg-[#09090b] rounded-full border-t border-white/20"></div>
                        <div className="absolute -bottom-2 right-4 w-4 h-4 bg-[#09090b] rounded-full border-t border-white/20"></div>
                    </div>

                    {/* 하단 (뜯는 부분) */}
                    <motion.div
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 250 }}
                        dragElastic={0.1}
                        onDragEnd={handleDragEnd}
                        animate={isPeeling ? { y: 1000, rotate: 10, opacity: 0 } : { y: 0 }}
                        className="h-3/4 bg-gradient-to-br from-indigo-600 to-purple-700 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing relative group"
                    >
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30 mix-blend-overlay" />

                        <div className="relative z-10 text-center">
                            <div className="text-5xl font-black text-white/20 tracking-widest select-none group-hover:text-white/30 transition-colors">PULL</div>
                            <div className="text-5xl font-black text-white/20 tracking-widest select-none mt-2 group-hover:text-white/30 transition-colors">DOWN</div>
                        </div>

                        {/* 화살표 애니메이션 */}
                        <div className="absolute bottom-8 flex flex-col items-center animate-bounce opacity-70">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
