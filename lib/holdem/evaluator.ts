import { Card, HandRank, HandResult } from './types';

const RANK_VALUES: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

function getCardValue(card: Card): number {
  return RANK_VALUES[card.rank];
}

export function evaluateHand(holeCards: Card[], communityCards: Card[]): HandResult {
  const allCards = [...holeCards, ...communityCards];
  
  // Sort by value descending
  allCards.sort((a, b) => getCardValue(b) - getCardValue(a));

  // Check functions from best to worst
  const flush = checkFlush(allCards);
  const straight = checkStraight(allCards);

  // Straight Flush / Royal Flush
  if (flush && straight) {
    // Need to check if the flush cards form a straight
    // This is a simplified check; technically we should filter by suit first then check straight
    // But for now, let's do it properly
    const flushSuit = flush.winners[0].suit;
    const flushCards = allCards.filter(c => c.suit === flushSuit);
    const straightFlush = checkStraight(flushCards);
    
    if (straightFlush) {
      if (getCardValue(straightFlush.winners[0]) === 14) {
        return { rank: 'Royal Flush', score: 1000, winners: straightFlush.winners };
      }
      return { rank: 'Straight Flush', score: 900 + getCardValue(straightFlush.winners[0]), winners: straightFlush.winners };
    }
  }

  if (checkFourOfAKind(allCards)) return checkFourOfAKind(allCards)!;
  if (checkFullHouse(allCards)) return checkFullHouse(allCards)!;
  if (flush) return flush;
  if (straight) return straight;
  if (checkThreeOfAKind(allCards)) return checkThreeOfAKind(allCards)!;
  if (checkTwoPair(allCards)) return checkTwoPair(allCards)!;
  if (checkOnePair(allCards)) return checkOnePair(allCards)!;

  // High Card
  const best5 = allCards.slice(0, 5);
  return { 
    rank: 'High Card', 
    score: best5.reduce((acc, card, i) => acc + getCardValue(card) * Math.pow(0.01, i), 0),
    winners: best5
  };
}

function checkFlush(cards: Card[]): HandResult | null {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  for (const suit of suits) {
    const suited = cards.filter(c => c.suit === suit);
    if (suited.length >= 5) {
      const winners = suited.slice(0, 5);
      // Score based on card values (highest card carries most weight)
      // Base score 600
      let score = 600;
      winners.forEach((c, i) => score += getCardValue(c) * Math.pow(0.01, i));
      return { rank: 'Flush', score, winners };
    }
  }
  return null;
}

function checkStraight(cards: Card[]): HandResult | null {
  // Remove duplicates for straight check
  const uniqueValues = Array.from(new Set(cards.map(c => getCardValue(c))));
  uniqueValues.sort((a, b) => b - a);

  // Special case for A-5 straight (A, 5, 4, 3, 2)
  if (uniqueValues.includes(14)) uniqueValues.push(1);

  for (let i = 0; i <= uniqueValues.length - 5; i++) {
    const subset = uniqueValues.slice(i, i + 5);
    if (subset[0] - subset[4] === 4) {
      // Found straight, now get the actual cards
      const winners: Card[] = [];
      for (const val of subset) {
        const actualVal = val === 1 ? 14 : val; // Map 1 back to A
        const card = cards.find(c => getCardValue(c) === actualVal);
        if (card) winners.push(card);
      }
      return { 
        rank: 'Straight', 
        score: 500 + (subset[0] === 1 ? 5 : subset[0]), // A-5 straight top is 5
        winners 
      };
    }
  }
  return null;
}

function checkFourOfAKind(cards: Card[]): HandResult | null {
  const counts = getCounts(cards);
  for (const [val, count] of Object.entries(counts)) {
    if (count === 4) {
      const quadVal = parseInt(val);
      const kicker = cards.find(c => getCardValue(c) !== quadVal);
      const winners = cards.filter(c => getCardValue(c) === quadVal).slice(0, 4);
      if (kicker) winners.push(kicker);
      
      return { 
        rank: 'Four of a Kind', 
        score: 800 + quadVal + (kicker ? getCardValue(kicker) * 0.01 : 0), 
        winners 
      };
    }
  }
  return null;
}

function checkFullHouse(cards: Card[]): HandResult | null {
  const counts = getCounts(cards);
  let tripVal = 0;
  let pairVal = 0;

  for (const [val, count] of Object.entries(counts)) {
    const v = parseInt(val);
    if (count >= 3 && v > tripVal) tripVal = v;
  }
  
  if (tripVal > 0) {
    for (const [val, count] of Object.entries(counts)) {
      const v = parseInt(val);
      if (v !== tripVal && count >= 2 && v > pairVal) pairVal = v;
    }
  }

  if (tripVal > 0 && pairVal > 0) {
    const trips = cards.filter(c => getCardValue(c) === tripVal).slice(0, 3);
    const pair = cards.filter(c => getCardValue(c) === pairVal).slice(0, 2);
    return {
      rank: 'Full House',
      score: 700 + tripVal + (pairVal * 0.01),
      winners: [...trips, ...pair]
    };
  }
  return null;
}

function checkThreeOfAKind(cards: Card[]): HandResult | null {
  const counts = getCounts(cards);
  for (const [val, count] of Object.entries(counts)) {
    if (count === 3) {
      const tripVal = parseInt(val);
      const kickers = cards.filter(c => getCardValue(c) !== tripVal).slice(0, 2);
      const trips = cards.filter(c => getCardValue(c) === tripVal).slice(0, 3);
      
      let score = 400 + tripVal;
      kickers.forEach((k, i) => score += getCardValue(k) * Math.pow(0.01, i + 1));
      
      return { rank: 'Three of a Kind', score, winners: [...trips, ...kickers] };
    }
  }
  return null;
}

function checkTwoPair(cards: Card[]): HandResult | null {
  const counts = getCounts(cards);
  const pairs: number[] = [];
  for (const [val, count] of Object.entries(counts)) {
    if (count >= 2) pairs.push(parseInt(val));
  }
  
  if (pairs.length >= 2) {
    pairs.sort((a, b) => b - a);
    const highPair = pairs[0];
    const lowPair = pairs[1];
    
    const pair1 = cards.filter(c => getCardValue(c) === highPair).slice(0, 2);
    const pair2 = cards.filter(c => getCardValue(c) === lowPair).slice(0, 2);
    const kicker = cards.find(c => getCardValue(c) !== highPair && getCardValue(c) !== lowPair);
    
    const winners = [...pair1, ...pair2];
    if (kicker) winners.push(kicker);
    
    return {
      rank: 'Two Pair',
      score: 300 + highPair + (lowPair * 0.01) + (kicker ? getCardValue(kicker) * 0.0001 : 0),
      winners
    };
  }
  return null;
}

function checkOnePair(cards: Card[]): HandResult | null {
  const counts = getCounts(cards);
  for (const [val, count] of Object.entries(counts)) {
    if (count === 2) {
      const pairVal = parseInt(val);
      const kickers = cards.filter(c => getCardValue(c) !== pairVal).slice(0, 3);
      const pair = cards.filter(c => getCardValue(c) === pairVal).slice(0, 2);
      
      let score = 200 + pairVal;
      kickers.forEach((k, i) => score += getCardValue(k) * Math.pow(0.01, i + 1));
      
      return { rank: 'One Pair', score, winners: [...pair, ...kickers] };
    }
  }
  return null;
}

function getCounts(cards: Card[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const card of cards) {
    const val = getCardValue(card);
    counts[val] = (counts[val] || 0) + 1;
  }
  return counts;
}
