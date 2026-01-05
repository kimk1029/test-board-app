export interface User {
  id: string
  userId?: number
  username?: string
  socketId: string
  joinedAt: number
}

export interface Room {
  id: string
  type: 'tetris' | 'holdem'
  hostId: string
  players: User[]
  createdAt: number
  status: 'waiting' | 'playing' | 'finished'
  gameData?: any
}

export interface TetrisRoom extends Room {
  type: 'tetris'
  gameData?: {
    players: Array<{
      userId: number
      grid: (number | null)[][]
      score: number
      level: number
    }>
  }
}

export interface HoldemRoom extends Room {
  type: 'holdem'
  gameData?: {
    roomId: string
    currentState: any
  }
}

export interface WSMessage {
  type: string
  payload: any
}

export interface OnlineUsersMessage extends WSMessage {
  type: 'online_users' | 'user_joined' | 'user_left'
  payload: {
    users: User[]
    count: number
  }
}

export interface RoomMessage extends WSMessage {
  type: 'room_created' | 'room_joined' | 'room_left' | 'room_list' | 'room_update'
  payload: {
    room?: Room
    rooms?: Room[]
  }
}

export interface GameMessage extends WSMessage {
  type: 'game_start' | 'game_move' | 'game_update' | 'game_end'
  payload: any
}