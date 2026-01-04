import { Card, Hand } from './types'

// 카드 값에 따른 점수 계산 (A=11, J/Q/K=10)
export function getCardValue(card: Card): number {
  if (!card || !card.value) {
    console.error('[getCardValue] 잘못된 카드:', card)
    return 0
  }

  const v = String(card.value).trim().toUpperCase()

  if (v === 'A') return 11
  if (['J', 'Q', 'K', '10', '0'].includes(v)) return 10

  const numValue = parseInt(v, 10)
  if (isNaN(numValue)) {
    console.error('[getCardValue] 숫자 변환 실패:', card.value, '->', v)
    return 0
  }
  return numValue
}

// 핸드 점수 계산 (에이스 유동적 적용)
export function calculateHandScore(hand: Hand | { cards: Card[] }): number {
  if (!hand || !hand.cards || hand.cards.length === 0) return 0

  let score = 0
  let aceCount = 0

  hand.cards.forEach((card, index) => {
    if (!card) {
      console.error(`[calculateHandScore] 카드 ${index + 1}가 null입니다`)
      return
    }
    const value = getCardValue(card)
    if (value === 11) aceCount++
    score += value
  })

  // 21 초과 시 에이스를 1로 계산 (11 -> 1)
  while (score > 21 && aceCount > 0) {
    score -= 10
    aceCount--
  }

  return score
}

export function isBlackjack(hand: Hand): boolean {
  return hand.cards.length === 2 && calculateHandScore(hand) === 21
}

export function isBust(hand: Hand): boolean {
  return calculateHandScore(hand) > 21
}

// 52장 덱 생성
export function createDeck(): Card[] {
  const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades']
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
  const deck: Card[] = []
  suits.forEach((suit) => {
    values.forEach((value) => {
      deck.push({ suit, value, faceUp: false })
    })
  })
  return deck
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// 카드 이미지 URL
export function getCardImageUrl(card: Card): string {
  if (!card.faceUp) return 'https://deckofcardsapi.com/static/img/back.png'
  const suitMap: Record<string, string> = { hearts: 'H', diamonds: 'D', clubs: 'C', spades: 'S' }
  const valueMap: Record<string, string> = { A: 'A', J: 'J', Q: 'Q', K: 'K', '10': '0' }
  const s = suitMap[card.suit]
  const v = valueMap[String(card.value).toUpperCase()] || String(card.value)
  return `https://deckofcardsapi.com/static/img/${v}${s}.png`
}

// Split 가능 여부 체크용
export function isSameValue(card1: Card, card2: Card): boolean {
  return card1.value === card2.value
}
