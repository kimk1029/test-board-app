// 게임 상태 타입 정의

export enum GameState {
  IDLE = 'idle', // 대기 상태
  SHUFFLE = 'shuffle', // 셔플 상태
  BETTING = 'betting', // 베팅 상태
  DEAL_START = 'deal_start', // 딜 시작
  DEALING = 'dealing', // 딜 중
  INSURANCE = 'insurance', // Insurance 옵션 (딜러 Up-card가 Ace일 때)
  CHECK_BLACKJACK = 'check_blackjack', // 초기 블랙잭 체크
  PLAYER_TURN = 'player_turn', // 플레이어 턴
  DEALER_TURN = 'dealer_turn', // 딜러 턴
  SETTLEMENT = 'settlement', // 정산
  ROUND_END = 'round_end', // 라운드 종료
}

export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'
  value: string // 'A', '2', '3', ..., '10', 'J', 'Q', 'K'
  image?: string
  faceUp: boolean
}

export interface Hand {
  cards: Card[]
  score: number
  isBlackjack: boolean
  isBust: boolean
  bet?: number // Split된 핸드의 베팅 금액
  isSplit?: boolean // Split된 핸드인지 여부
}

export interface GameData {
  state: GameState
  deck: Card[]
  playerHand: Hand
  dealerHand: Hand
  currentBet: number
  playerPoints: number
  deckPosition: { x: number; y: number }
  playerPosition: { x: number; y: number }
  dealerPosition: { x: number; y: number }
  bettingArea: { x: number; y: number }
}

