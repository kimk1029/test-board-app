// 게임 유틸리티 함수

import { Card, Hand } from './types'

// 카드 값에 따른 점수 계산
export function getCardValue(card: Card): number {
  if (card.value === 'A') return 11
  if (['J', 'Q', 'K'].includes(card.value)) return 10
  return parseInt(card.value) || 0
}

// 핸드 점수 계산 (A는 1 또는 11)
export function calculateHandScore(hand: Hand): number {
  let score = 0
  let aceCount = 0

  hand.cards.forEach((card) => {
    if (card.value === 'A') {
      score += 11
      aceCount++
    } else {
      score += getCardValue(card)
    }
  })

  // 21 초과 시 A를 1로 계산
  while (score > 21 && aceCount > 0) {
    score -= 10
    aceCount--
  }

  return score
}

// 블랙잭 체크 (초기 2장, 합 21)
export function isBlackjack(hand: Hand): boolean {
  return hand.cards.length === 2 && calculateHandScore(hand) === 21
}

// 버스트 체크
export function isBust(hand: Hand): boolean {
  return calculateHandScore(hand) > 21
}

// Soft 핸드 체크 (A가 11로 계산되는 경우)
export function isSoftHand(hand: Hand): boolean {
  let score = 0
  let aceCount = 0

  hand.cards.forEach((card) => {
    if (card.value === 'A') {
      score += 11
      aceCount++
    } else {
      score += getCardValue(card)
    }
  })

  // A가 11로 계산되고 있고, 21을 초과하지 않으면 Soft 핸드
  return aceCount > 0 && score <= 21
}

// Soft 17 체크 (A + 6 = 17인 경우, 딜러는 Hit해야 함)
export function isSoft17(hand: Hand): boolean {
  const score = calculateHandScore(hand)
  if (score !== 17) return false

  // A가 포함되어 있고, A를 11로 계산했을 때 17이면 Soft 17
  return isSoftHand(hand)
}

// Split 가능 여부 체크 (같은 값의 카드 2장)
export function canSplit(hand: Hand): boolean {
  if (hand.cards.length !== 2) return false
  
  const card1 = hand.cards[0]
  const card2 = hand.cards[1]
  
  // 같은 값이면 Split 가능 (A, 2-10, J, Q, K)
  return getCardValue(card1) === getCardValue(card2) || 
         (card1.value === card2.value)
}

// 같은 값인지 체크 (J, Q, K는 모두 10이지만 Split 불가능 - 실제 카지노 규칙에 따라)
export function isSameValue(card1: Card, card2: Card): boolean {
  // 정확히 같은 값이어야 Split 가능 (예: A-A, 2-2, J-J 등)
  return card1.value === card2.value
}

// 52장 단일 덱 생성
export function createSingleDeck(): Card[] {
  const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades']
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
  const deck: Card[] = []

  suits.forEach((suit) => {
    values.forEach((value) => {
      deck.push({
        suit,
        value,
        faceUp: false,
      })
    })
  })

  return deck
}

// 멀티덱 생성 (6덱 또는 8덱) - 실제 카지노 표준
export function createMultiDeck(deckCount: number = 6): Card[] {
  const singleDeck = createSingleDeck()
  const multiDeck: Card[] = []

  // 여러 덱을 합침
  for (let i = 0; i < deckCount; i++) {
    multiDeck.push(...singleDeck.map(card => ({ ...card })))
  }

  return shuffleDeck(multiDeck)
}

// 52장 덱 생성 (하위 호환성 유지)
export function createDeck(): Card[] {
  return createMultiDeck(6) // 기본값 6덱
}

// 덱 셔플 (Fisher-Yates)
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// 카드 이미지 URL 생성 (Deck of Cards API 사용)
export function getCardImageUrl(card: Card): string {
  if (!card.faceUp) {
    return 'https://deckofcardsapi.com/static/img/back.png'
  }

  const suitMap: Record<Card['suit'], string> = {
    hearts: 'H',
    diamonds: 'D',
    clubs: 'C',
    spades: 'S',
  }

  const valueMap: Record<string, string> = {
    A: 'A',
    J: 'J',
    Q: 'Q',
    K: 'K',
    '10': '0', // 10은 0으로 표시
  }

  const suitCode = suitMap[card.suit]
  const valueCode = valueMap[card.value] || card.value

  return `https://deckofcardsapi.com/static/img/${valueCode}${suitCode}.png`
}

// Deck of Cards API를 사용하여 실제 카드 가져오기
export async function fetchDeckFromAPI(): Promise<string> {
  const response = await fetch('https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1')
  const data = await response.json()
  return data.deck_id
}

export async function drawCardFromAPI(deckId: string, count: number = 1): Promise<any[]> {
  const response = await fetch(`https://deckofcardsapi.com/api/deck/${deckId}/draw/?count=${count}`)
  const data = await response.json()
  return data.cards
}

