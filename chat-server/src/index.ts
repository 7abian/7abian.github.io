/**
 * 合并服务器 — 静态文件 + WebSocket 信令，单端口
 *
 * - /ws            → WebSocket 信令
 * - 其他路径       → 静态文件 (./dist/)
 *
 * 所有内容通过一个端口提供服务，只需一条公网隧道
 */
import { createServer, IncomingMessage, ServerResponse } from 'http'
import { readFileSync, existsSync } from 'fs'
import { join, extname, dirname } from 'path'
import { fileURLToPath } from 'url'
import { WebSocketServer, WebSocket } from 'ws'

const PORT = parseInt(process.env.PORT || '3000', 10)
const __dirname = dirname(fileURLToPath(import.meta.url))
const STATIC_DIR = join(__dirname, '..', 'dist')

// MIME 类型映射
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
}

// ====== 房间管理 ======
interface Room {
  code: string
  peers: WebSocket[]
}
const rooms = new Map<string, Room>()

function generateCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) code += Math.floor(Math.random() * 10).toString()
  return code
}

function relay(sender: WebSocket, data: unknown): void {
  const room = findRoom(sender)
  if (!room) return
  for (const peer of room.peers) {
    if (peer !== sender && peer.readyState === WebSocket.OPEN) {
      peer.send(JSON.stringify(data))
      return
    }
  }
}

function findRoom(ws: WebSocket): Room | undefined {
  for (const [, room] of rooms) {
    if (room.peers.includes(ws)) return room
  }
}

// ====== HTTP 服务器 ======
const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  const url = req.url || '/'
  // SPA fallback：非文件路径 → index.html
  const filePath = url === '/' || !extname(url)
    ? join(STATIC_DIR, 'index.html')
    : join(STATIC_DIR, url)

  if (!existsSync(filePath)) {
    // SPA fallback
    const index = join(STATIC_DIR, 'index.html')
    if (existsSync(index)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(readFileSync(index))
      return
    }
    res.writeHead(404)
    res.end('Not found')
    return
  }

  const ext = extname(filePath)
  const contentType = MIME[ext] || 'application/octet-stream'
  res.writeHead(200, { 'Content-Type': contentType })
  res.end(readFileSync(filePath))
})

// ====== WebSocket（挂在 /ws 路径）======
const wss = new WebSocketServer({ noServer: true })

server.on('upgrade', (req, socket, head) => {
  if (req.url === '/ws') {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req)
    })
  } else {
    socket.destroy()
  }
})

wss.on('connection', (ws: WebSocket) => {
  console.log('📡 新 WebSocket 连接')

  ws.on('message', (raw) => {
    let msg: { type: string; [key: string]: unknown }
    try { msg = JSON.parse(raw.toString()) } catch { return }

    switch (msg.type) {
      case 'create_room': {
        let code = generateCode()
        while (rooms.has(code)) code = generateCode()
        rooms.set(code, { code, peers: [ws] })
        ws.send(JSON.stringify({ type: 'room_created', code }))
        console.log(`🏠 房间 ${code} 已创建`)
        break
      }
      case 'join_room': {
        const code = msg.code as string
        const room = rooms.get(code)
        if (!room) { ws.send(JSON.stringify({ type: 'error', message: '房间不存在' })); return }
        if (room.peers.length >= 2) { ws.send(JSON.stringify({ type: 'error', message: '房间已满' })); return }
        room.peers.push(ws)
        ws.send(JSON.stringify({ type: 'room_joined', code }))
        const other = room.peers.find(p => p !== ws)
        if (other) other.send(JSON.stringify({ type: 'peer_joined' }))
        console.log(`🚪 加入房间 ${code}（${room.peers.length}/2）`)
        break
      }
      case 'x3dh_init':
      case 'x3dh_reply':
        relay(ws, msg)
        console.log(`  ↪ 转发 ${msg.type}`)
        break
      case 'data':
        relay(ws, msg)
        console.log(`  📨 转发加密数据 (${(msg.payload as string)?.length || 0} chars)`)
        break
    }
  })

  ws.on('close', () => {
    const room = findRoom(ws)
    if (room) {
      const other = room.peers.find(p => p !== ws && p.readyState === WebSocket.OPEN)
      if (other) other.send(JSON.stringify({ type: 'peer_left' }))
      rooms.delete(room.code)
      console.log(`🗑️  房间 ${room.code} 已销毁`)
    }
  })
})

// ====== 启动 ======
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🔐 加密通讯服务器启动`)
  console.log(`   HTTP + WebSocket: http://localhost:${PORT}`)
  console.log(`   WebSocket 路径:   ws://localhost:${PORT}/ws`)
  console.log(`   静态文件:         ${STATIC_DIR}`)
  console.log(`   只转发 SDP/ICE/公钥，不接触消息内容\n`)
})
