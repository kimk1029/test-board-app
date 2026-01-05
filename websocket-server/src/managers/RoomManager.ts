import { v4 as uuidv4 } from 'uuid'
import { Room, User, TetrisRoom, HoldemRoom } from '../types'

export class RoomManager {
  private rooms: Map<string, Room> = new Map()
  private readonly MAX_PLAYERS_TETRIS = 2
  private readonly MAX_PLAYERS_HOLDEM = 9

  createRoom(type: 'tetris' | 'holdem', host: User): Room {
    const roomId = uuidv4()
    const baseRoom: Omit<Room, 'gameData'> = {
      id: roomId,
      type,
      hostId: host.id,
      players: [host],
      createdAt: Date.now(),
      status: 'waiting'
    }

    let room: Room
    if (type === 'tetris') {
      room = {
        ...baseRoom,
        type: 'tetris',
        gameData: {
          players: [{
            userId: host.userId || 0,
            grid: [],
            score: 0,
            level: 1
          }]
        }
      } as TetrisRoom
    } else {
      room = {
        ...baseRoom,
        type: 'holdem',
        gameData: {
          roomId,
          currentState: null
        }
      } as HoldemRoom
    }

    this.rooms.set(roomId, room)
    console.log(`Room created: ${roomId} (type: ${type}, host: ${host.id})`)
    return room
  }

  joinRoom(roomId: string, user: User): Room | null {
    const room = this.rooms.get(roomId)
    if (!room) {
      return null
    }

    // Check if user is already in room
    if (room.players.some(p => p.id === user.id)) {
      return room
    }

    // Check if room is full
    const maxPlayers = room.type === 'tetris' ? this.MAX_PLAYERS_TETRIS : this.MAX_PLAYERS_HOLDEM
    if (room.players.length >= maxPlayers) {
      return null
    }

    room.players.push(user)

    // Update game data for tetris
    if (room.type === 'tetris' && room.gameData) {
      const tetrisRoom = room as TetrisRoom
      tetrisRoom.gameData!.players.push({
        userId: user.userId || 0,
        grid: [],
        score: 0,
        level: 1
      })
    }

    console.log(`User ${user.id} joined room ${roomId}`)
    return room
  }

  leaveRoom(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room) {
      return false
    }

    const playerIndex = room.players.findIndex(p => p.id === userId)
    if (playerIndex === -1) {
      return false
    }

    room.players.splice(playerIndex, 1)

    // Update game data for tetris
    if (room.type === 'tetris' && room.gameData) {
      const tetrisRoom = room as TetrisRoom
      if (tetrisRoom.gameData!.players) {
        const gamePlayerIndex = tetrisRoom.gameData!.players.findIndex(
          p => p.userId === room.players.find(u => u.id === userId)?.userId
        )
        if (gamePlayerIndex !== -1) {
          tetrisRoom.gameData!.players.splice(gamePlayerIndex, 1)
        }
      }
    }

    // If room is empty, delete it
    if (room.players.length === 0) {
      this.rooms.delete(roomId)
      console.log(`Room deleted: ${roomId} (empty)`)
    } else {
      // If host left, assign new host
      if (room.hostId === userId && room.players.length > 0) {
        room.hostId = room.players[0].id
      }
      console.log(`User ${userId} left room ${roomId}`)
    }

    return true
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId)
  }

  getRooms(type?: 'tetris' | 'holdem'): Room[] {
    const allRooms = Array.from(this.rooms.values())
    if (type) {
      return allRooms.filter(room => room.type === type)
    }
    return allRooms
  }

  updateRoomStatus(roomId: string, status: 'waiting' | 'playing' | 'finished'): boolean {
    const room = this.rooms.get(roomId)
    if (!room) {
      return false
    }
    room.status = status
    return true
  }

  updateRoomGameData(roomId: string, gameData: any): boolean {
    const room = this.rooms.get(roomId)
    if (!room) {
      return false
    }
    room.gameData = gameData
    return true
  }
}