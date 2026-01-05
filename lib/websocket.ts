'use client'

export class WebSocketClient {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private listeners: Map<string, Set<(data: any) => void>> = new Map()
  private isAuthenticated = false
  private userId?: number
  private username?: string

  constructor(private url: string = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws') {}

  connect(userId?: number, username?: string, token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.userId = userId
        this.username = username

        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
          console.log('WebSocket connected')
          this.reconnectAttempts = 0
          
          // 인증 메시지 전송
          this.send({
            type: 'auth',
            payload: { token, userId, username }
          })
        }

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            
            if (message.type === 'auth_success') {
              this.isAuthenticated = true
              resolve()
            } else if (message.type === 'error' && message.payload?.message === 'Not authenticated') {
              reject(new Error('Authentication failed'))
            } else {
              this.handleMessage(message)
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          reject(error)
        }

        this.ws.onclose = () => {
          console.log('WebSocket disconnected')
          this.isAuthenticated = false
          
          // 재연결 시도
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++
            setTimeout(() => {
              console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`)
              this.connect(this.userId, this.username).catch(() => {
                // 재연결 실패는 조용히 처리
              })
            }, this.reconnectDelay * this.reconnectAttempts)
          }
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.isAuthenticated = false
    this.listeners.clear()
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket is not connected')
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  off(event: string, callback: (data: any) => void) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.delete(callback)
    }
  }

  private handleMessage(message: any) {
    const callbacks = this.listeners.get(message.type)
    if (callbacks) {
      callbacks.forEach(callback => callback(message.payload))
    }
  }

  // 편의 메서드들
  getOnlineUsers() {
    this.send({ type: 'get_online_users' })
  }

  createRoom(type: 'tetris' | 'holdem') {
    this.send({ type: 'create_room', payload: { roomType: type } })
  }

  joinRoom(roomId: string) {
    this.send({ type: 'join_room', payload: { roomId } })
  }

  leaveRoom() {
    this.send({ type: 'leave_room' })
  }

  getRooms(type?: 'tetris' | 'holdem') {
    this.send({ type: 'get_rooms', payload: { type } })
  }

  sendGameMessage(payload: any) {
    this.send({ type: 'game_message', payload })
  }

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN && this.isAuthenticated
  }
}

// 싱글톤 인스턴스
let wsClientInstance: WebSocketClient | null = null

export function getWebSocketClient(): WebSocketClient {
  if (!wsClientInstance) {
    wsClientInstance = new WebSocketClient()
  }
  return wsClientInstance
}