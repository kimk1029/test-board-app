/**
 * 블랙잭 서버 측 게임 로직
 * 모든 게임 진행을 서버에서 처리
 */

export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'
  value: string
  faceUp: boolean
}

// 카드 덱 생성 (6덱)
export function createServerDeck(): Card[] {
  const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades']
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
  const deck: Card[] = []
  
  // 6덱 생성
  for (let i = 0; i < 6; i++) {
    suits.forEach((suit) => {
      values.forEach((value) => {
        deck.push({ suit, value, faceUp: false })
      })
    })
  }
  
  // Fisher-Yates 셔플
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  
  return deck
}

// 카드 점수 계산
export function calculateScore(cards: Card[]): number {
  let score = 0
  let aces = 0
  
  for (const card of cards) {
    if (card.value === 'A') {
      score += 11
      aces++
    } else if (['J', 'Q', 'K'].includes(card.value)) {
      score += 10
    } else {
      score += parseInt(card.value) || 0
    }
  }
  
  while (score > 21 && aces > 0) {
    score -= 10
    aces--
  }
  
  return score
}

// 블랙잭 체크
export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && calculateScore(cards) === 21
}

// 버스트 체크
export function isBust(cards: Card[]): boolean {
  return calculateScore(cards) > 21
}

// 초기 카드 분배
export function dealInitialCards(deck: Card[]): {
  playerCards: Card[]
  dealerCards: Card[]
  remainingDeck: Card[]
} {
  const playerCards: Card[] = []
  const dealerCards: Card[] = []
  
  // 플레이어 카드 2장
  const p1 = deck.pop()!
  p1.faceUp = true
  playerCards.push(p1)
  
  const p2 = deck.pop()!
  p2.faceUp = true
  playerCards.push(p2)
  
  // 딜러 카드 2장 (첫 번째는 공개, 두 번째는 숨김)
  const d1 = deck.pop()!
  d1.faceUp = true
  dealerCards.push(d1)
  
  const d2 = deck.pop()!
  d2.faceUp = false
  dealerCards.push(d2)
  
  return { playerCards, dealerCards, remainingDeck: deck }
}

// Hit (카드 한 장 받기)
export function hitCard(deck: Card[]): { card: Card; remainingDeck: Card[] } {
  const card = deck.pop()!
  card.faceUp = true
  return { card, remainingDeck: deck }
}

// 딜러 턴 (17 이상이 될 때까지 카드 받기)
export function dealerTurn(dealerCards: Card[], deck: Card[]): {
  dealerCards: Card[]
  remainingDeck: Card[]
} {
  const newDealerCards = [...dealerCards]
  // 두 번째 카드 공개
  if (newDealerCards[1]) {
    newDealerCards[1].faceUp = true
  }
  
  while (calculateScore(newDealerCards) < 17) {
    const { card, remainingDeck } = hitCard(deck)
    newDealerCards.push(card)
    deck = remainingDeck
  }
  
  return { dealerCards: newDealerCards, remainingDeck: deck }
}

// 최종 결과 계산
export function calculateFinalResult(
  playerCards: Card[],
  dealerCards: Card[],
  betAmount: number
): { result: 'win' | 'lose' | 'draw' | 'blackjack', payout: number } {
  const playerScore = calculateScore(playerCards)
  const dealerScore = calculateScore(dealerCards)
  
  // 플레이어 버스트
  if (playerScore > 21) {
    return { result: 'lose', payout: 0 }
  }
  
  // 딜러 버스트
  if (dealerScore > 21) {
    return { result: 'win', payout: betAmount * 2 }
  }
  
  // 블랙잭 체크
  const playerBJ = isBlackjack(playerCards)
  const dealerBJ = isBlackjack(dealerCards)
  
  if (playerBJ && dealerBJ) {
    return { result: 'draw', payout: betAmount }
  }
  
  if (playerBJ && !dealerBJ) {
    return { result: 'blackjack', payout: Math.floor(betAmount * 2.5) }
  }
  
  if (!playerBJ && dealerBJ) {
    return { result: 'lose', payout: 0 }
  }
  
  // 일반 승부
  if (playerScore > dealerScore) {
    return { result: 'win', payout: betAmount * 2 }
  }
  
  if (playerScore < dealerScore) {
    return { result: 'lose', payout: 0 }
  }
  
  return { result: 'draw', payout: betAmount }
}

