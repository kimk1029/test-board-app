'use client'

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import HeaderNavigator from '@/components/HeaderNavigator';

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

// --- Data (가상의 쿠지 세트) ---
const PRIZE_LIST: Prize[] = [
    { rank: 'A', name: '초특대 피규어 (1/7)', image: '🧸', color: '#ff4757', totalQty: 2 },
    { rank: 'B', name: '일러스트 보드', image: '🎨', color: '#ffa502', totalQty: 3 },
    { rank: 'C', name: '캐릭터 인형', image: '🐰', color: '#2ed573', totalQty: 5 },
    { rank: 'D', name: '유리컵 세트', image: '🥃', color: '#1e90ff', totalQty: 10 },
    { rank: 'E', name: '핸드 타올', image: '🧣', color: '#5352ed', totalQty: 15 },
    { rank: 'F', name: '아크릴 참', image: '✨', color: '#3742fa', totalQty: 20 },
    { rank: 'G', name: '클리어 파일', image: '📁', color: '#7bed9f', totalQty: 25 },
];

const LAST_ONE_PRIZE: Prize = {
    rank: 'LAST_ONE', name: '라스트원 스페셜 Ver.', image: '👑', color: '#000000', totalQty: 1
};

// --- Utils ---
const generateBox = (): Ticket[] => {
    let tickets: Ticket[] = [];
    let idCounter = 0;

    PRIZE_LIST.forEach(prize => {
        for (let i = 0; i < prize.totalQty; i++) {
            tickets.push({
                id: idCounter++,
                rank: prize.rank,
                isRevealed: false,
                isSelected: false,
                isTaken: false,
            });
        }
    });

    // 셔플 (Fisher-Yates)
    for (let i = tickets.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tickets[i], tickets[j]] = [tickets[j], tickets[i]];
    }

    // ID는 셔플 후 재정렬하여 그리드 위치 고정 (실제 쿠지처럼 뜯는 위치는 고정)
    return tickets.map((t, idx) => ({ ...t, id: idx }));
};

// --- Components ---

export default function IchibanKujiGame() {
    const router = useRouter();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [boxId, setBoxId] = useState<number | null>(null);
    const [purchaseCount, setPurchaseCount] = useState<number>(1);
    const [gameState, setGameState] = useState<'IDLE' | 'SELECTING' | 'PEELING' | 'RESULT'>('IDLE');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [currentPeelIndex, setCurrentPeelIndex] = useState<number>(0);
    const [wonPrizes, setWonPrizes] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [userPoints, setUserPoints] = useState<number>(0);
    const [purchaseLoading, setPurchaseLoading] = useState(false);

    // 초기화 - 서버에서 티켓 상태 가져오기
    useEffect(() => {
        loadBoxState();
        loadUserPoints();
    }, []);

    // 사용자 포인트 로드
    const loadUserPoints = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setUserPoints(0);
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

    // 서버에서 박스 상태 로드
    const loadBoxState = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/kuji/box');

            if (response.ok) {
                const data = await response.json();
                setBoxId(data.boxId);

                // 서버에서 받은 티켓 데이터를 클라이언트 형식으로 변환
                const convertedTickets: Ticket[] = data.tickets.map((t: any) => ({
                    id: t.id,
                    rank: t.rank as Rank,
                    isRevealed: t.isTaken,
                    isSelected: false,
                    isTaken: t.isTaken,
                }));

                setTickets(convertedTickets);
            } else {
                console.error('Failed to load box state');
                alert('박스 상태를 불러오는데 실패했습니다.');
            }
        } catch (error) {
            console.error('Error loading box state:', error);
            alert('박스 상태를 불러오는데 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 남은 수량 계산
    const getRemainingCount = (rank: Rank) => {
        return tickets.filter(t => t.rank === rank && !t.isTaken).length;
    };

    const totalRemaining = tickets.filter(t => !t.isTaken).length;

    // 구매 처리
    const handlePurchase = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('로그인이 필요합니다.');
            return;
        }

        const totalCost = purchaseCount * 10;

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
                    game: 'kuji',
                    amount: totalCost,
                    result: 'bet'
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setUserPoints(data.points);
                // 티켓 선택 모드로 전환
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
    const confirmSelection = () => {
        if (selectedIds.length !== purchaseCount) return;
        setGameState('PEELING');
        setCurrentPeelIndex(0);
        setWonPrizes([]);
    };

    // 뜯기 완료 처리 (하나 뜯을 때마다 호출)
    const handlePeelComplete = async () => {
        const currentTicketId = selectedIds[currentPeelIndex];

        // 서버에 티켓 뽑기 업데이트
        const token = localStorage.getItem('token');
        if (token && boxId !== null) {
            try {
                const response = await fetch('/api/kuji/tickets', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        boxId,
                        ticketIds: [currentTicketId],
                    }),
                });

                if (response.ok) {
                    // 티켓 상태 업데이트 (Taken 처리)
                    setTickets(prev => prev.map(t =>
                        t.id === currentTicketId ? { ...t, isTaken: true, isRevealed: true } : t
                    ));
                } else {
                    const errorData = await response.json();
                    alert(errorData.error || '티켓 업데이트에 실패했습니다.');
                    return;
                }
            } catch (error) {
                console.error('Error updating ticket:', error);
                alert('티켓 업데이트 중 오류가 발생했습니다.');
                return;
            }
        }

        const currentTicket = tickets.find(t => t.id === currentTicketId)!;
        setWonPrizes(prev => [...prev, currentTicket]);

        // 다음 티켓으로 넘어가거나 결과창으로
        setTimeout(() => {
            if (currentPeelIndex < selectedIds.length - 1) {
                setCurrentPeelIndex(prev => prev + 1);
            } else {
                // 모든 티켓 오픈 완료
                // 라스트원 체크 (방금 뽑은게 마지막이었나?)
                const remainingAfterThis = totalRemaining - selectedIds.length;
                if (remainingAfterThis === 0) {
                    // 라스트원 상 추가 로직은 결과창에서 처리
                }
                setGameState('RESULT');
            }
        }, 1500); // 결과 보여주는 시간
    };

    // 리셋
    const resetGame = async () => {
        setGameState('IDLE');
        setSelectedIds([]);
        setPurchaseCount(1);
        setWonPrizes([]);
        setCurrentPeelIndex(0);

        // 모든 티켓이 소진되었는지 확인 (서버에서 최신 상태 가져오기)
        await loadBoxState();
        await loadUserPoints();

        const remaining = tickets.filter(t => !t.isTaken).length;
        if (remaining === 0) {
            alert("박스가 매진되었습니다! 새 박스가 자동으로 생성됩니다.");
            // loadBoxState에서 자동으로 새 박스를 생성함
        }
    };

    return (
        <div>
            <HeaderNavigator />
            <div className="min-h-screen bg-gradient-to-br from-pink-50 via-yellow-50 to-orange-50 text-gray-900 font-sans p-2 sm:p-4 md:p-8 pt-20 sm:pt-24">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 mt-10">

                    {/* --- Header --- */}
                    <div className="lg:col-span-12 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-pink-300 pb-3 sm:pb-4 mb-3 sm:mb-4 mt-2 sm:mt-4 gap-2 sm:gap-0">
                        <div>
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-pink-500 via-red-500 to-orange-500 text-transparent bg-clip-text">
                                一番くじ (Ichiban Kuji)
                            </h1>
                            <p className="text-gray-600 text-xs sm:text-sm">HTML5 Lottery Simulator</p>
                        </div>
                        <div className="text-left sm:text-right">
                            <div className="text-xl sm:text-2xl font-bold text-pink-600">{totalRemaining} / 80</div>
                            <div className="text-xs text-gray-600">남은 수량</div>
                        </div>
                    </div>

                    {/* --- Left: Status Board --- */}
                    <div className="lg:col-span-3 bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 h-fit shadow-lg border border-pink-200 order-2 lg:order-1">
                        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 border-b border-pink-300 pb-2 text-gray-800">📦 경품 현황판</h2>
                        <div className="space-y-3">
                            {PRIZE_LIST.map((prize) => {
                                const remaining = getRemainingCount(prize.rank);
                                const isSoldOut = remaining === 0;
                                return (
                                    <div key={prize.rank} className={`flex items-center justify-between p-2 rounded ${isSoldOut ? 'opacity-40 grayscale' : 'bg-pink-50 border border-pink-200'}`}>
                                        <div className="flex items-center gap-3">
                                            <span
                                                className="flex items-center justify-center w-8 h-8 rounded-full font-bold text-white shadow-sm"
                                                style={{ backgroundColor: prize.color }}
                                            >
                                                {prize.rank}
                                            </span>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-gray-800">{prize.name}</span>
                                                <span className="text-xs text-gray-600">{isSoldOut ? 'SOLD OUT' : 'Available'}</span>
                                            </div>
                                        </div>
                                        <div className="text-lg font-bold text-gray-800">
                                            {remaining}<span className="text-xs text-gray-600">/{prize.totalQty}</span>
                                        </div>
                                    </div>
                                );
                            })}
                            {/* Last One */}
                            <div className="mt-4 pt-4 border-t border-pink-300">
                                <div className="flex items-center justify-between p-2 rounded bg-gradient-to-r from-yellow-100 to-orange-100 border border-yellow-400/50">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">👑</span>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-orange-600">LAST ONE</span>
                                            <span className="text-xs text-gray-700">마지막 티켓 구매자 증정</span>
                                        </div>
                                    </div>
                                    <div className={`text-sm font-bold ${totalRemaining > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                                        {totalRemaining > 0 ? '대기중' : '지급완료'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- Center: Game Area --- */}
                    <div className="lg:col-span-9 bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 lg:p-6 shadow-lg border border-pink-200 min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] relative overflow-hidden order-1 lg:order-2">

                        {/* 1. IDLE: 구매 수량 선택 및 구매 */}
                        {gameState === 'IDLE' && (
                            <div className="h-full flex flex-col items-center justify-center space-y-8 animate-fade-in">
                                <div className="text-center">
                                    <h3 className="text-2xl font-bold mb-2 text-gray-800">몇 장을 구매하시겠습니까?</h3>
                                    <p className="text-gray-600">1장당 10 포인트, 한 번에 최대 10장까지 가능합니다.</p>
                                </div>

                                {/* 포인트 표시 */}
                                <div className="text-center p-4 bg-gradient-to-r from-pink-100 to-orange-100 rounded-lg border border-pink-300">
                                    <div className="text-sm text-gray-600 mb-1">보유 포인트</div>
                                    <div className="text-3xl font-bold text-pink-600">
                                        {userPoints.toLocaleString()} P
                                    </div>
                                </div>

                                {/* 구매 개수 선택 */}
                                <div className="flex items-center gap-6 bg-gradient-to-r from-pink-100 to-orange-100 p-4 rounded-full border border-pink-300 shadow-md">
                                    <button
                                        onClick={() => setPurchaseCount(Math.max(1, purchaseCount - 1))}
                                        className="w-12 h-12 rounded-full bg-pink-500 hover:bg-pink-600 text-white flex items-center justify-center text-xl font-bold transition shadow-md"
                                    >-</button>
                                    <span className="text-4xl font-mono font-bold w-16 text-center text-pink-600">{purchaseCount}</span>
                                    <button
                                        onClick={() => setPurchaseCount(Math.min(10, Math.min(totalRemaining, purchaseCount + 1)))}
                                        className="w-12 h-12 rounded-full bg-pink-500 hover:bg-pink-600 text-white flex items-center justify-center text-xl font-bold transition shadow-md"
                                    >+</button>
                                </div>

                                {/* 총 비용 표시 */}
                                <div className="text-center p-4 bg-white rounded-lg border border-pink-300">
                                    <div className="text-sm text-gray-600 mb-1">총 비용</div>
                                    <div className={`text-2xl font-bold ${userPoints >= purchaseCount * 10 ? 'text-pink-600' : 'text-red-500'}`}>
                                        {(purchaseCount * 10).toLocaleString()} P
                                    </div>
                                    {userPoints < purchaseCount * 10 && (
                                        <div className="text-sm text-red-500 mt-2">
                                            포인트가 부족합니다!
                                        </div>
                                    )}
                                </div>

                                {/* 구매 버튼 */}
                                <button
                                    onClick={handlePurchase}
                                    disabled={purchaseLoading || userPoints < purchaseCount * 10 || purchaseCount < 1 || purchaseCount > totalRemaining}
                                    className="px-12 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed rounded-xl text-xl font-bold shadow-lg transform hover:scale-105 transition duration-200"
                                >
                                    {purchaseLoading ? '처리 중...' : `${purchaseCount}장 구매하기 (${(purchaseCount * 10).toLocaleString()} P)`}
                                </button>
                            </div>
                        )}

                        {/* 2. SELECTING: 그리드에서 선택 */}
                        {gameState === 'SELECTING' && (
                            <div className="h-full flex flex-col">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-4 gap-2 sm:gap-0">
                                    <h3 className="text-base sm:text-lg lg:text-xl font-bold">
                                        원하는 위치의 복권을 선택하세요
                                        <span className="ml-2 text-yellow-400">({selectedIds.length}/{purchaseCount})</span>
                                    </h3>
                                    {selectedIds.length === purchaseCount && (
                                        <button
                                            onClick={confirmSelection}
                                            className="px-4 sm:px-6 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm sm:text-base font-bold animate-pulse shadow-green-500/50 shadow-lg"
                                        >
                                            결제 및 뜯기 ({purchaseCount}장)
                                        </button>
                                    )}
                                </div>

                                <div className="flex-1 overflow-y-auto pr-1 sm:pr-2">
                                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1 sm:gap-2">
                                        {tickets.map((ticket) => (
                                            <button
                                                key={ticket.id}
                                                disabled={ticket.isTaken}
                                                onClick={() => handleTicketClick(ticket.id)}
                                                className={`
                        aspect-[3/4] rounded-md flex flex-col items-center justify-center text-xs font-bold transition-all duration-200 relative
                        ${ticket.isTaken
                                                        ? 'bg-gray-900 border border-gray-800 opacity-50 cursor-not-allowed'
                                                        : selectedIds.includes(ticket.id)
                                                            ? 'bg-yellow-500 text-black border-2 border-white transform scale-105 shadow-lg shadow-yellow-500/30'
                                                            : 'bg-white text-gray-800 hover:bg-gray-100 border border-gray-400'
                                                    }
                      `}
                                            >
                                                {ticket.isTaken ? (
                                                    <div className="flex flex-col items-center justify-center">
                                                        <span
                                                            className="text-lg sm:text-xl lg:text-2xl font-bold"
                                                            style={{ color: PRIZE_LIST.find(p => p.rank === ticket.rank)?.color || ticket.rank === 'LAST_ONE' ? '#000000' : '#000000' }}
                                                        >
                                                            {ticket.rank === 'LAST_ONE' ? '👑' : ticket.rank}
                                                        </span>
                                                        {ticket.rank === 'LAST_ONE' && (
                                                            <span className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">LAST</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="text-[8px] sm:text-[10px] text-gray-600 absolute top-0.5 sm:top-1 left-0.5 sm:left-1">No.</span>
                                                        <span className="text-sm sm:text-base lg:text-lg">{ticket.id + 1}</span>
                                                        <div className="absolute bottom-0 w-full h-1/4 bg-pink-100 border-t border-dashed border-pink-300"></div>
                                                    </>
                                                )}

                                                {/* 선택 뱃지 */}
                                                {selectedIds.includes(ticket.id) && (
                                                    <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
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
                                    className="absolute inset-0 bg-pink-900/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4"
                                >
                                    <div className="text-center mb-8">
                                        <h2 className="text-2xl font-bold text-white mb-2">복권을 뜯어주세요!</h2>
                                        <p className="text-pink-100">{currentPeelIndex + 1} / {purchaseCount} 번째 장</p>
                                    </div>

                                    <PeelingTicket
                                        key={selectedIds[currentPeelIndex]} // Key 변경으로 컴포넌트 리셋
                                        ticketId={selectedIds[currentPeelIndex]}
                                        realRank={tickets.find(t => t.id === selectedIds[currentPeelIndex])?.rank || 'G'}
                                        onPeelComplete={handlePeelComplete}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* 4. RESULT: 최종 결과 화면 */}
                        {gameState === 'RESULT' && (
                            <div className="h-full flex flex-col items-center justify-center text-center animate-fade-in-up">
                                <h2 className="text-4xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-red-500">
                                    🎉 당첨 결과 🎉
                                </h2>

                                <div className="flex flex-wrap justify-center gap-4 mb-10 max-w-full overflow-y-auto max-h-[400px]">
                                    {wonPrizes.map((ticket, idx) => {
                                        const prizeInfo = PRIZE_LIST.find(p => p.rank === ticket.rank);
                                        return (
                                            <motion.div
                                                key={idx}
                                                initial={{ scale: 0, rotate: -10 }}
                                                animate={{ scale: 1, rotate: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                                className="bg-white text-black w-32 h-44 rounded-lg shadow-xl flex flex-col items-center justify-between p-2 border-4"
                                                style={{ borderColor: prizeInfo?.color }}
                                            >
                                                <div className="text-4xl mt-4">{prizeInfo?.image}</div>
                                                <div className="text-center">
                                                    <div className="text-2xl font-black" style={{ color: prizeInfo?.color }}>{ticket.rank}상</div>
                                                    <div className="text-xs font-bold text-gray-600 line-clamp-2">{prizeInfo?.name}</div>
                                                </div>
                                            </motion.div>
                                        )
                                    })}

                                    {/* 라스트원 상 표시 */}
                                    {totalRemaining === 0 && (
                                        <motion.div
                                            initial={{ scale: 0 }} animate={{ scale: 1.1 }}
                                            className="bg-black text-yellow-400 w-32 h-44 rounded-lg shadow-xl flex flex-col items-center justify-between p-2 border-4 border-yellow-400"
                                        >
                                            <div className="text-4xl mt-4">👑</div>
                                            <div className="text-center">
                                                <div className="text-sm font-black">LAST ONE</div>
                                                <div className="text-xs font-bold text-white line-clamp-2">{LAST_ONE_PRIZE.name}</div>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>

                                <button
                                    onClick={resetGame}
                                    className="px-8 py-3 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white rounded-lg font-bold transition shadow-lg"
                                >
                                    처음으로 돌아가기
                                </button>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Sub Component: Peeling Ticket (뜯는 애니메이션) ---
function PeelingTicket({ ticketId, realRank, onPeelComplete }: { ticketId: number, realRank: Rank, onPeelComplete: () => void }) {
    const [isPeeling, setIsPeeling] = useState(false);
    const [isRevealed, setIsRevealed] = useState(false);
    const prizeInfo = PRIZE_LIST.find(p => p.rank === realRank);

    const handleDragEnd = (event: any, info: any) => {
        // 아래로 충분히 드래그했으면 뜯김 처리
        if (info.offset.y > 100) {
            setIsPeeling(true);
            setTimeout(() => {
                setIsRevealed(true);
                // 결과 보여주고 부모에게 알림
                setTimeout(() => {
                    onPeelComplete();
                }, 1000);
            }, 300);
        }
    };

    return (
        <div className="relative w-64 h-80 perspective-1000">

            {/* 1. Inside (Result) - 뜯겨진 뒤 보이는 내용 */}
            <div className={`absolute inset-0 bg-white rounded-lg shadow-2xl flex flex-col items-center justify-center p-4 border-4 transition-all duration-500 ${isRevealed ? 'opacity-100' : 'opacity-0'}`}
                style={{ borderColor: prizeInfo?.color }}
            >
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={isRevealed ? { scale: 1.2, opacity: 1 } : {}}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="text-center"
                >
                    <div className="text-8xl mb-4">{prizeInfo?.rank}</div>
                    <div className="text-2xl font-bold text-gray-800">{prizeInfo?.name}</div>
                </motion.div>
            </div>

            {/* 2. Outside (Cover) - 뜯기 전 커버 */}
            {!isRevealed && (
                <div className="absolute inset-0 bg-white rounded-lg shadow-xl overflow-hidden flex flex-col">
                    {/* 상단 (고정부) */}
                    <div className="h-1/5 bg-pink-100 border-b-2 border-dashed border-pink-300 flex items-center justify-center relative z-10">
                        <span className="text-gray-700 font-mono text-xs">ICHIBAN KUJI NO.{ticketId + 1}</span>
                        {/* 뜯는 구멍 표현 */}
                        <div className="absolute -bottom-1.5 left-2 w-3 h-3 bg-pink-400 rounded-full"></div>
                        <div className="absolute -bottom-1.5 right-2 w-3 h-3 bg-pink-400 rounded-full"></div>
                    </div>

                    {/* 하단 (뜯는 부분) */}
                    <motion.div
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 200 }}
                        dragElastic={0.1}
                        onDragEnd={handleDragEnd}
                        animate={isPeeling ? { y: 1000, rotate: 20, opacity: 0 } : { y: 0 }}
                        className="h-4/5 bg-gradient-to-br from-pink-100 to-orange-100 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing relative"
                    >
                        <div className="text-4xl font-black text-pink-200 tracking-widest opacity-40 select-none">KUJI</div>
                        <div className="text-4xl font-black text-pink-200 tracking-widest opacity-40 select-none mt-2">OPEN</div>

                        {/* 화살표 애니메이션 */}
                        <div className="absolute bottom-10 flex flex-col items-center animate-bounce opacity-50">
                            <span className="text-xs text-pink-300 mb-1">PULL DOWN</span>
                            <svg className="w-6 h-6 text-pink-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                        </div>

                        {/* 종이 질감 효과 */}
                        <div className="absolute inset-0 bg-noise opacity-10 pointer-events-none"></div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}