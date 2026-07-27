import { createServer } from 'http'
import { readFileSync, existsSync } from 'fs'
import { join, extname, dirname } from 'path'
import { fileURLToPath } from 'url'

const PORT = parseInt(process.env.PORT || '3000', 10)
const __dirname = dirname(fileURLToPath(import.meta.url))
const STATIC_DIR = join(__dirname, '..', 'dist')

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
}

// Simple HTTP only first, then add WebSocket
const server = createServer((req, res) => {
  const url = req.url || '/'
  console.log('Request:', url)

  // Special test endpoint
  if (url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('pong ' + STATIC_DIR)
    return
  }

  const filePath = url === '/' || !extname(url)
    ? join(STATIC_DIR, 'index.html')
    : join(STATIC_DIR, url)

  if (existsSync(filePath)) {
    const ext = extname(filePath)
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
    res.end(readFileSync(filePath))
    return
  }

  // SPA fallback
  const index = join(STATIC_DIR, 'index.html')
  if (existsSync(index)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(readFileSync(index))
    return
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('OK - static dir: ' + STATIC_DIR)
})

// Import ws only if available
try {
  const { WebSocketServer } = await import('ws')
  const wss = new WebSocketServer({ noServer: true })

  interface Room { code: string; peers: any[] }
  const rooms = new Map<string, Room>()
  const genCode = () => { let c = ''; for (let i = 0; i < 6; i++) c += Math.floor(Math.random() * 10).toString(); return c }

  server.on('upgrade', (req, socket, head) => {
    if (req.url === '/ws') {
      wss.handleUpgrade(req, socket, head, (ws: any) => {
        wss.emit('connection', ws, req)
      })
    } else { socket.destroy() }
  })

  wss.on('connection', (ws: any) => {
    ws.on('message', (raw: any) => {
      try {
        const msg = JSON.parse(raw.toString())
        switch (msg.type) {
          case 'create_room': {
            let code = genCode(); while (rooms.has(code)) code = genCode()
            rooms.set(code, { code, peers: [ws] })
            ws.send(JSON.stringify({ type: 'room_created', code }))
            break
          }
          case 'join_room': {
            const code = msg.code; const room = rooms.get(code)
            if (!room) { ws.send(JSON.stringify({ type: 'error', message: '房间不存在' })); return }
            if (room.peers.length >= 2) { ws.send(JSON.stringify({ type: 'error', message: '房间已满' })); return }
            room.peers.push(ws)
            ws.send(JSON.stringify({ type: 'room_joined', code }))
            const other = room.peers.find((p: any) => p !== ws)
            if (other?.readyState === 1) other.send(JSON.stringify({ type: 'peer_joined' }))
            break
          }
          case 'x3dh_init': case 'x3dh_reply': case 'data': {
            const room = Array.from(rooms.values()).find(r => r.peers.includes(ws))
            if (room) {
              const other = room.peers.find((p: any) => p !== ws && p.readyState === 1)
              if (other) other.send(JSON.stringify(msg))
            }
            break
          }
        }
      } catch {}
    })
    ws.on('close', () => {
      for (const [code, room] of rooms) {
        if (room.peers.includes(ws)) {
          const other = room.peers.find((p: any) => p !== ws && p.readyState === 1)
          if (other) other.send(JSON.stringify({ type: 'peer_left' }))
          rooms.delete(code); break
        }
      }
    })
  })
} catch (e) {
  console.log('WebSocket not available:', (e as Error).message)
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Static: ${STATIC_DIR}`)
  console.log(`Exists: ${existsSync(join(STATIC_DIR, 'index.html'))}`)
})
