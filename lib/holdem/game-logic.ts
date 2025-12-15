import { HoldemRoom, HoldemPlayer } from '@prisma/client';
import { Card, Round, HandResult } from './types';
import { createDeck, drawCards } from './deck';
import { evaluateHand } from './evaluator';

interface GameState {
  deck: Card[];
  currentTurnSeat: number | null;
  lastRaise: number;
  minBet: number;
  winners: { seatIndex: number, hand: HandResult, amount: number }[] | null;
  actedPlayers: number[];
}

export type RoomWithPlayers = HoldemRoom & { 
  players: HoldemPlayer[];
  turnStartTime?: Date | null;
  showdownEndTime?: Date | null;
};

// 자동 fold 처리 (타이머 초과)
export function handleAutoFold(room: RoomWithPlayers): { roomUpdates: any, playerUpdates: any[] } | null {
  const gameState = room.gameState as unknown as GameState;
  
  if (!gameState.currentTurnSeat || !room.turnStartTime) {
    return null;
  }

  const TURN_TIMEOUT_MS = 20000; // 20초
  const elapsed = Date.now() - new Date(room.turnStartTime).getTime();
  
  if (elapsed < TURN_TIMEOUT_MS) {
    return null; // 아직 시간이 남음
  }

  // 현재 턴 플레이어 찾기
  const currentPlayer = room.players.find(p => p.seatIndex === gameState.currentTurnSeat);
  
  if (!currentPlayer || !currentPlayer.isActive || currentPlayer.isAllIn) {
    return null; // 이미 폴드했거나 올인 상태
  }

  // 자동 fold 처리
  return handlePlayerAction(room, currentPlayer.userId, 'fold', 0);
}

// showdown 후 자동으로 다음 게임 시작
export function handleAutoStartNextGame(room: RoomWithPlayers): { roomUpdates: any, playerUpdates: any[] } | null {
  if (room.status !== 'finished' || room.currentRound !== 'showdown' || !room.showdownEndTime) {
    return null;
  }

  const elapsed = Date.now() - new Date(room.showdownEndTime).getTime();
  
  if (elapsed < 0) {
    return null; // 아직 시간이 안 됨
  }

  // 최소 2명의 플레이어가 칩을 가지고 있는지 확인
  const activePlayers = room.players.filter(p => p.chips > 0);
  
  if (activePlayers.length < 2) {
    // 플레이어가 부족하면 대기 상태로
    return {
      roomUpdates: {
        status: 'waiting',
        currentRound: null,
        pot: 0,
        communityCards: null,
        showdownEndTime: null,
        turnStartTime: null,
        gameState: {
          deck: [],
          currentTurnSeat: null,
          lastRaise: 0,
          minBet: 0,
          winners: null,
          actedPlayers: []
        }
      },
      playerUpdates: room.players.map(p => ({
        userId: p.userId,
        data: {
          currentBet: 0,
          isActive: true,
          isAllIn: false,
          holeCards: null,
          position: null
        }
      }))
    };
  }

  // 다음 게임 시작
  return startGame(room);
}

export function startGame(room: RoomWithPlayers): { roomUpdates: any, playerUpdates: any[] } {
  // 1. Reset Game State
  const deck = createDeck();
  const activePlayers = room.players.sort((a, b) => a.seatIndex - b.seatIndex);
  
  if (activePlayers.length < 2) {
    throw new Error('Not enough players');
  }

  // 2. Deal Hole Cards
  const playerUpdates: any[] = [];
  let currentDeck = deck;

  for (const player of activePlayers) {
    const { drawn, remaining } = drawCards(currentDeck, 2);
    currentDeck = remaining;
    playerUpdates.push({
      userId: player.userId,
      data: {
        holeCards: drawn,
        isActive: true,
        isAllIn: false,
        currentBet: 0,
        // Remove handRank: null
      }
    });
  }

  // 3. Set Blinds
  // Move Dealer Button
  const nextDealerIndex = (room.dealerIndex + 1) % room.maxPlayers;
  // Find actual players for SB and BB
  const seatIndices = activePlayers.map(p => p.seatIndex);
  
  // Find dealer's seat (or closest next)
  let dealerSeat = room.dealerIndex; 
  
  const dealerPlayerIdx = activePlayers.findIndex(p => p.seatIndex >= dealerSeat);
  const actualDealerIdx = dealerPlayerIdx === -1 ? 0 : dealerPlayerIdx;
  const dealerPlayer = activePlayers[actualDealerIdx];
  const sbPlayer = activePlayers[(actualDealerIdx + 1) % activePlayers.length];
  const bbPlayer = activePlayers[(actualDealerIdx + 2) % activePlayers.length];
  const utgPlayer = activePlayers[(actualDealerIdx + 3) % activePlayers.length]; // First to act preflop

  // Apply Blinds
  const sbAmount = Math.min(sbPlayer.chips, room.smallBlind);
  const bbAmount = Math.min(bbPlayer.chips, room.bigBlind);

  // Update SB/BB players in the playerUpdates array
  const sbUpdate = playerUpdates.find(u => u.userId === sbPlayer.userId);
  if (sbUpdate) {
    sbUpdate.data.chips = sbPlayer.chips - sbAmount;
    sbUpdate.data.currentBet = sbAmount;
    sbUpdate.data.position = 'small_blind';
    if (sbAmount < room.smallBlind) sbUpdate.data.isAllIn = true;
  }

  const bbUpdate = playerUpdates.find(u => u.userId === bbPlayer.userId);
  if (bbUpdate) {
    bbUpdate.data.chips = bbPlayer.chips - bbAmount;
    bbUpdate.data.currentBet = bbAmount;
    bbUpdate.data.position = 'big_blind';
    if (bbAmount < room.bigBlind) bbUpdate.data.isAllIn = true;
  }
  
  // Set Dealer position
  const dealerUpdate = playerUpdates.find(u => u.userId === dealerPlayer.userId);
  if (dealerUpdate) dealerUpdate.data.position = 'dealer';

  // 4. Initial Game State
  const gameState: GameState = {
    deck: currentDeck,
    currentTurnSeat: utgPlayer.seatIndex,
    lastRaise: room.bigBlind, // Initial raise is the BB amount
    minBet: room.bigBlind,
    winners: null,
    actedPlayers: []
  };

  // 첫 턴 시작 시간 설정
  const turnStartTime = new Date();

  return {
    roomUpdates: {
      status: 'playing',
      currentRound: 'preflop',
      pot: sbAmount + bbAmount,
      dealerIndex: dealerPlayer.seatIndex,
      communityCards: [],
      turnStartTime,
      showdownEndTime: null, // 이전 showdown 시간 초기화
      gameState: gameState as any
    },
    playerUpdates
  };
}

export function nextRound(room: RoomWithPlayers): { roomUpdates: any, playerUpdates: any[] } | null {
  const gameState = room.gameState as unknown as GameState;
  const currentRound = room.currentRound as Round;
  let deck = gameState.deck;
  let communityCards = (room.communityCards as unknown as Card[]) || [];
  
  let nextRoundName: Round;
  let cardsToDraw = 0;

  if (currentRound === 'preflop') {
    nextRoundName = 'flop';
    cardsToDraw = 3;
  } else if (currentRound === 'flop') {
    nextRoundName = 'turn';
    cardsToDraw = 1;
  } else if (currentRound === 'turn') {
    nextRoundName = 'river';
    cardsToDraw = 1;
  } else if (currentRound === 'river') {
    nextRoundName = 'showdown';
    return handleShowdown(room);
  } else {
    return null; // Already over
  }

  // Draw community cards
  const { drawn, remaining } = drawCards(deck, cardsToDraw);
  const newCommunityCards = [...communityCards, ...drawn];
  
  // Find starting player for post-flop
  // 홀덤 룰: Flop/Turn/River에서는 Small Blind 다음 활성 플레이어부터 시작
  const activePlayers = room.players.filter(p => p.isActive).sort((a, b) => a.seatIndex - b.seatIndex);
  
  if (activePlayers.length === 0) {
    return null; // 활성 플레이어가 없음
  }
  
  // Small Blind 위치 찾기 (position이 'small_blind'인 플레이어)
  const sbPlayer = activePlayers.find(p => p.position === 'small_blind');
  const dealerSeat = room.dealerIndex;
  
  let nextPlayer: typeof activePlayers[0];
  
  if (sbPlayer) {
    // Small Blind 다음 활성 플레이어 찾기
    const sbIndex = activePlayers.findIndex(p => p.seatIndex === sbPlayer.seatIndex);
    nextPlayer = activePlayers[(sbIndex + 1) % activePlayers.length];
  } else {
    // Small Blind를 찾을 수 없으면 Dealer 다음 활성 플레이어
    nextPlayer = activePlayers.find(p => p.seatIndex > dealerSeat) || activePlayers[0];
  }

  // Reset current bets for new round
  const playerUpdates = activePlayers.map(p => ({
    userId: p.userId,
    data: { currentBet: 0 }
  }));

  // 다음 라운드 시작 시 턴 시작 시간 설정
  const turnStartTime = new Date();

  return {
    roomUpdates: {
      currentRound: nextRoundName,
      communityCards: newCommunityCards,
      turnStartTime,
      gameState: {
        ...gameState,
        deck: remaining,
        currentTurnSeat: nextPlayer.seatIndex,
        minBet: 0,
        lastRaise: 0,
        actedPlayers: []
      }
    },
    playerUpdates
  };
}

function handleShowdown(room: RoomWithPlayers): { roomUpdates: any, playerUpdates: any[] } {
  const activePlayers = room.players.filter(p => p.isActive);
  const communityCards = room.communityCards as unknown as Card[];
  
  // Evaluate all hands
  const results = activePlayers.map(player => {
    const holeCards = player.holeCards as unknown as Card[];
    const handResult = evaluateHand(holeCards, communityCards);
    return {
      seatIndex: player.seatIndex,
      userId: player.userId,
      hand: handResult,
      player
    };
  });

  // Sort by hand score (descending)
  results.sort((a, b) => b.hand.score - a.hand.score);

  // Determine winners (could be split pot)
  const bestScore = results[0].hand.score;
  const winners = results.filter(r => r.hand.score === bestScore);
  
  const winAmount = Math.floor(room.pot / winners.length);
  
  const playerUpdates = winners.map(w => ({
    userId: w.userId,
    data: {
      chips: w.player.chips + winAmount
    }
  }));

  const gameState = room.gameState as unknown as GameState;

  // showdown 종료 시간 설정 (3초 후 자동 시작)
  const showdownEndTime = new Date(Date.now() + 3000);

  return {
    roomUpdates: {
      status: 'finished', // Round finished (자동 시작 대기)
      currentRound: 'showdown',
      pot: 0,
      showdownEndTime,
      gameState: {
        ...gameState,
        winners: winners.map(w => ({ seatIndex: w.seatIndex, hand: w.hand, amount: winAmount })),
        currentTurnSeat: null,
        actedPlayers: []
      }
    },
    playerUpdates
  };
}

export type ActionType = 'fold' | 'check' | 'call' | 'raise' | 'allin';

export function handlePlayerAction(
  room: RoomWithPlayers,
  userId: number,
  action: ActionType,
  amount: number = 0
): { roomUpdates: any, playerUpdates: any[] } {
  const gameState = room.gameState as unknown as GameState;
  const player = room.players.find(p => p.userId === userId);

  if (!player) throw new Error('Player not found');
  if (gameState.currentTurnSeat !== player.seatIndex) throw new Error('Not your turn');

  let pot = room.pot;
  let playerChips = player.chips;
  let currentBet = player.currentBet;
  let isActive = player.isActive;
  let isAllIn = player.isAllIn;
  
  // Calculate current highest bet in the round
  const highestBet = Math.max(...room.players.map(p => p.currentBet));
  const toCall = highestBet - currentBet;

  // Process Action
  if (action === 'fold') {
    isActive = false;
  } else if (action === 'check') {
    if (toCall > 0) throw new Error('Cannot check, must call or fold');
  } else if (action === 'call') {
    if (playerChips <= toCall) {
      // Treat as All-in
      amount = playerChips;
      action = 'allin'; 
    } else {
      amount = toCall;
      playerChips -= amount;
      currentBet += amount;
      pot += amount;
    }
  } else if (action === 'raise') {
    if (amount < toCall + gameState.minBet && amount < playerChips) {
       // Allow simpler logic for now
    }
    if (playerChips < amount) throw new Error('Not enough chips');
    
    playerChips -= amount;
    currentBet += amount;
    pot += amount;
    
    // Update last raise/min bet
    const raiseAmount = currentBet - highestBet;
    gameState.lastRaise = raiseAmount;
    gameState.minBet = raiseAmount;
  }
  
  if (action === 'allin') {
    amount = playerChips; 
    playerChips -= amount;
    currentBet += amount;
    pot += amount;
    isAllIn = true;
    
    if (currentBet > highestBet) {
      const raiseAmt = currentBet - highestBet;
      if (raiseAmt > gameState.lastRaise) {
         gameState.lastRaise = raiseAmt;
         gameState.minBet = raiseAmt;
      }
    }
  }

  // Update Player
  const playerUpdate = {
    userId: player.userId,
    data: {
      chips: playerChips,
      currentBet: currentBet,
      isActive: isActive,
      isAllIn: isAllIn
    }
  };

  // --- Logic Update for actedPlayers ---
  let newActedPlayers = [...(gameState.actedPlayers || [])];
  
  const isRaise = action === 'raise' || (action === 'allin' && currentBet > highestBet);
  
  if (isRaise) {
      newActedPlayers = [player.seatIndex];
  } else {
      if (!newActedPlayers.includes(player.seatIndex)) {
          newActedPlayers.push(player.seatIndex);
      }
  }
  
  // Check for Round End or Game End
  
  // 1. Fold한 플레이어는 더 이상 턴이 돌아오지 않음
  // 활성 플레이어만 고려하여 다음 턴 찾기
  const activePlayers = room.players.filter(p => 
    (p.userId === userId ? isActive : p.isActive)
  );
  
  // 활성 플레이어가 1명만 남으면 즉시 승리 처리 (pot 획득)
  if (activePlayers.length === 1) {
    const winner = activePlayers[0];
    return {
      roomUpdates: {
        status: 'finished',
        gameState: {
          ...gameState,
          currentTurnSeat: null,
          winners: [{ seatIndex: winner.seatIndex, hand: { rank: 'High Card', score: 0, winners: [] }, amount: pot }]
        },
        pot: 0
      },
      playerUpdates: [
        playerUpdate,
        {
          userId: winner.userId,
          data: { chips: winner.chips + pot }
        }
      ]
    };
  }

  // 다음 턴 플레이어 찾기 (활성 플레이어 중에서만)
  let nextSeat: number | null = null;
  const sortedActivePlayers = activePlayers.sort((a, b) => a.seatIndex - b.seatIndex);
  const currentSeatIndex = sortedActivePlayers.findIndex(p => p.seatIndex === gameState.currentTurnSeat);
  
  // 현재 플레이어 다음부터 순환하며 찾기
  for (let i = 1; i <= sortedActivePlayers.length; i++) {
    const nextIndex = (currentSeatIndex + i) % sortedActivePlayers.length;
    const nextPlayer = sortedActivePlayers[nextIndex];
    
    // All-in이 아닌 활성 플레이어만 선택
    if (nextPlayer.userId === userId ? !isAllIn : !nextPlayer.isAllIn) {
      nextSeat = nextPlayer.seatIndex;
      break;
    }
  }
  
  // 다음 플레이어를 찾을 수 없으면 (모두 All-in) 라운드 종료
  if (nextSeat === null) {
    // 모두 All-in이면 라운드 종료
    const nextRoundResult = nextRound({ 
      ...room, 
      pot,
      players: room.players.map(p => p.userId === userId ? { ...p, ...playerUpdate.data } : p),
      gameState: { ...gameState, lastRaise: 0, minBet: 0, actedPlayers: [] } as unknown as any
    } as RoomWithPlayers);
    
    if (nextRoundResult) {
      const turnStartTime = new Date();
      return {
        roomUpdates: {
          ...nextRoundResult.roomUpdates,
          pot: pot,
          turnStartTime
        },
        playerUpdates: [playerUpdate, ...nextRoundResult.playerUpdates]
      };
    }
  }

  // 3. 라운드 종료 조건 체크
  const newHighestBet = Math.max(highestBet, currentBet);
  const playersInHand = activePlayers; // 이미 필터링된 활성 플레이어 사용
  const activeNonAllIn = playersInHand.filter(p => (p.userId === userId ? !isAllIn : !p.isAllIn));
  
  // 모든 플레이어의 베팅이 맞춰졌는지 확인
  const allMatched = playersInHand.every(p => {
    const pBet = p.userId === userId ? currentBet : p.currentBet;
    const pAllIn = p.userId === userId ? isAllIn : p.isAllIn;
    return pBet === newHighestBet || pAllIn;
  });

  // All-in이 아닌 모든 활성 플레이어가 액션을 했는지 확인
  const allActed = activeNonAllIn.length === 0 || activeNonAllIn.every(p => newActedPlayers.includes(p.seatIndex));

  let roundOver = false;
  
  // 라운드 종료 조건:
  // 1. 모든 플레이어의 베팅이 맞춰졌고, 모든 활성 플레이어가 액션을 완료
  // 2. 또는 모두 All-in이고 베팅이 맞춰짐
  if (allMatched && allActed) {
      roundOver = true;
  }
  
  if (activeNonAllIn.length === 0 && allMatched) {
      roundOver = true;
  }

  if (roundOver) {
      const nextRoundResult = nextRound({ 
          ...room, 
          pot,
          players: room.players.map(p => p.userId === userId ? { ...p, ...playerUpdate.data } : p),
          gameState: { ...gameState, lastRaise: 0, minBet: 0, actedPlayers: [] } as unknown as any
      } as RoomWithPlayers);
      
      if (nextRoundResult) {
          // 다음 라운드 시작 시 턴 시작 시간 설정
          const turnStartTime = new Date();
          return {
              roomUpdates: {
                  ...nextRoundResult.roomUpdates,
                  pot: pot,
                  turnStartTime
              },
              playerUpdates: [playerUpdate, ...nextRoundResult.playerUpdates]
          };
      }
  }
  
  // 다음 턴이 없으면 (모두 fold 또는 all-in) 라운드 종료
  if (nextSeat === null) {
      const nextRoundResult = nextRound({ 
          ...room, 
          pot,
          players: room.players.map(p => p.userId === userId ? { ...p, ...playerUpdate.data } : p),
          gameState: { ...gameState, lastRaise: 0, minBet: 0, actedPlayers: [] } as unknown as any
      } as RoomWithPlayers);
      
      if (nextRoundResult) {
          const turnStartTime = new Date();
          return {
              roomUpdates: {
                  ...nextRoundResult.roomUpdates,
                  pot: pot,
                  turnStartTime
              },
              playerUpdates: [playerUpdate, ...nextRoundResult.playerUpdates]
          };
      }
  }
  
  // 턴 시작 시간 업데이트
  const turnStartTime = new Date();

  return {
    roomUpdates: {
      pot,
      turnStartTime,
      gameState: {
        ...gameState,
        currentTurnSeat: nextSeat,
        minBet: gameState.minBet,
        lastRaise: gameState.lastRaise,
        actedPlayers: newActedPlayers
      }
    },
    playerUpdates: [playerUpdate]
  };
}
