import express from 'express'
import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import cors from 'cors'
import { UserManager } from './managers/UserManager'
import { RoomManager } from './managers/RoomManager'
import { WSMessage, User } from './types'

const PORT = process.env.WS_PORT || 3001
const app = express()
const server = createServer(app)

app.use(cors())
app.use(express.json())

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

const wss = new WebSocketServer({ server, path: '/ws' })

const userManager = new UserManager()
const roomManager = new RoomManager()

wss.on('connection', (ws: WebSocket, req) => {
  console.log('New WebSocket connection')
  
  let currentUser: (User & { ws: WebSocket }) | null = null
  let currentRoomId: string | null = null

  // Handle incoming messages
  ws.on('message', (data: Buffer) => {
    try {
      const message: WSMessage = JSON.parse(data.toString())
      handleMessage(ws, message)
    } catch (error) {
      console.error('Error parsing message:', error)
      ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid message format' } }))
    }
  })

  // Handle connection close
  ws.on('close', () => {
    console.log('WebSocket connection closed')
    if (currentUser) {
      userManager.removeUser(currentUser.id)
      broadcastOnlineUsers()
    }
    if (currentRoomId && currentUser) {
      roomManager.leaveRoom(currentRoomId, currentUser.id)
      broadcastRoomUpdate(currentRoomId)
    }
  })

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error)
  })

  async function handleMessage(ws: WebSocket, message: WSMessage) {
    switch (message.type) {
      case 'auth':
        // 인증 처리 (JWT 토큰 등)
        const { token, userId, username } = message.payload || {}
        currentUser = userManager.addUser(ws, userId, username)
        ws.send(JSON.stringify({ 
          type: 'auth_success', 
          payload: { userId: currentUser.id } 
        }))
        broadcastOnlineUsers()
        break

      case 'get_online_users':
        ws.send(JSON.stringify({
          type: 'online_users',
          payload: {
            users: userManager.getUsers(),
            count: userManager.getUserCount()
          }
        }))
        break

      case 'create_room':
        const { roomType } = message.payload || {}
        if (!currentUser) {
          ws.send(JSON.stringify({ type: 'error', payload: { message: 'Not authenticated' } }))
          return
        }
        const room = roomManager.createRoom(roomType, currentUser)
        currentRoomId = room.id
        ws.send(JSON.stringify({
          type: 'room_created',
          payload: { room }
        }))
        broadcastRoomList()
        break

      case 'join_room':
        const { roomId } = message.payload || {}
        if (!currentUser) {
          ws.send(JSON.stringify({ type: 'error', payload: { message: 'Not authenticated' } }))
          return
        }
        const joinedRoom = roomManager.joinRoom(roomId, currentUser)
        if (joinedRoom) {
          currentRoomId = roomId
          ws.send(JSON.stringify({
            type: 'room_joined',
            payload: { room: joinedRoom }
          }))
          broadcastRoomUpdate(roomId)
          broadcastRoomList()
        } else {
          ws.send(JSON.stringify({ type: 'error', payload: { message: 'Room not found or full' } }))
        }
        break

      case 'leave_room':
        if (currentRoomId && currentUser) {
          roomManager.leaveRoom(currentRoomId, currentUser.id)
          broadcastRoomUpdate(currentRoomId)
          broadcastRoomList()
          currentRoomId = null
        }
        break

      case 'get_rooms':
        ws.send(JSON.stringify({
          type: 'room_list',
          payload: {
            rooms: roomManager.getRooms(message.payload?.type)
          }
        }))
        break

      case 'game_message':
        // 게임별 메시지 처리 (테트리스, 홀덤 등)
        if (currentRoomId && currentUser) {
          handleGameMessage(currentRoomId, currentUser.id, message)
        }
        break

      default:
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Unknown message type' } }))
    }
  }

  function handleGameMessage(roomId: string, userId: string, message: WSMessage) {
    const room = roomManager.getRoom(roomId)
    if (!room) return

    // 게임별로 메시지 전달
    broadcastToRoom(roomId, {
      type: 'game_message',
      payload: {
        ...message.payload,
        userId,
        timestamp: Date.now()
      }
    })
  }

  function broadcastOnlineUsers() {
    const message = JSON.stringify({
      type: 'online_users',
      payload: {
        users: userManager.getUsers(),
        count: userManager.getUserCount()
      }
    })
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    })
  }

  function broadcastRoomList() {
    const message = JSON.stringify({
      type: 'room_list',
      payload: {
        rooms: roomManager.getRooms()
      }
    })
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    })
  }

  function broadcastRoomUpdate(roomId: string) {
    const room = roomManager.getRoom(roomId)
    if (!room) return

    const message = JSON.stringify({
      type: 'room_update',
      payload: { room }
    })

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    })
  }

  function broadcastToRoom(roomId: string, message: any) {
    const room = roomManager.getRoom(roomId)
    if (!room) return

    const messageStr = JSON.stringify(message)
    room.players.forEach((player: User) => {
      const user = userManager.getUser(player.id)
      if (user && user.ws.readyState === WebSocket.OPEN) {
        user.ws.send(messageStr)
      }
    })
  }
})

server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`)
})