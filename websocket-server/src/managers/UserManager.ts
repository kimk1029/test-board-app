import { WebSocket } from 'ws'
import { v4 as uuidv4 } from 'uuid'
import { User } from '../types'

export class UserManager {
  private users: Map<string, User & { ws: WebSocket }> = new Map()

  addUser(ws: WebSocket, userId?: number, username?: string): User & { ws: WebSocket } {
    const id = uuidv4()
    const user: User & { ws: WebSocket } = {
      id,
      userId,
      username,
      socketId: id,
      joinedAt: Date.now(),
      ws
    }
    this.users.set(id, user)
    console.log(`User connected: ${id} (total: ${this.users.size})`)
    return user
  }

  removeUser(userId: string): boolean {
    const removed = this.users.delete(userId)
    if (removed) {
      console.log(`User disconnected: ${userId} (total: ${this.users.size})`)
    }
    return removed
  }

  getUser(userId: string): (User & { ws: WebSocket }) | undefined {
    return this.users.get(userId)
  }

  getUsers(): User[] {
    return Array.from(this.users.values()).map(({ ws, ...user }) => user)
  }

  getUserCount(): number {
    return this.users.size
  }

  getUserBySocketId(socketId: string): (User & { ws: WebSocket }) | undefined {
    return Array.from(this.users.values()).find(u => u.socketId === socketId)
  }
}