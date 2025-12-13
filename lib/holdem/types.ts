export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type HandRank = 
  | 'High Card'
  | 'One Pair'
  | 'Two Pair'
  | 'Three of a Kind'
  | 'Straight'
  | 'Flush'
  | 'Full House'
  | 'Four of a Kind'
  | 'Straight Flush'
  | 'Royal Flush';

export interface HandResult {
  rank: HandRank;
  score: number; // For comparison (higher is better)
  winners: Card[]; // The cards that make up the winning hand
}

export type GameStatus = 'waiting' | 'playing' | 'finished';
export type Round = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
