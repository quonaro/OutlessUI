import type { QueryClient } from '@tanstack/vue-query'

let queryClient: QueryClient | null = null
let apiBase = ''
let getToken: () => string | null = () => null

let socket: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
const pendingSends: string[] = []
const maxPending = 32

function flushPendingSends() {
  if (!socket || socket.readyState !== WebSocket.OPEN) return
  while (pendingSends.length > 0) {
    const s = pendingSends.shift()
    if (s) socket.send(s)
  }
}

type WsPayload = Record<string, unknown>

const groupSyncSubs = new Map<string, Set<(msg: WsPayload) => void>>()

export function setAdminRealtimeQueryClient(q: QueryClient) {
  queryClient = q
}

export function setAdminRealtimeConfig(baseURL: string, tokenGetter: () => string | null) {
  apiBase = baseURL.replace(/\/$/, '')
  getToken = tokenGetter
}

function buildWsURL(base: string, token: string | null): string {
  let u: URL
  if (base.startsWith('http://') || base.startsWith('https://')) {
    u = new URL(base)
  }
  else {
    const path = base.startsWith('/') ? base.slice(1) : base
    u = new URL(path || 'api', typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1')
  }
  const wsProto = u.protocol === 'https:' ? 'wss:' : 'ws:'
  const pathPrefix = u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '')
  const ws = new URL(`${wsProto}//${u.host}${pathPrefix}/v1/ws`)
  if (token) ws.searchParams.set('access_token', token)
  return ws.toString()
}

function dispatch(msg: WsPayload) {
  const t = msg.type
  if (t === 'invalidate' && queryClient) {
    const keys = msg.keys
    if (Array.isArray(keys)) {
      for (const k of keys) {
        if (typeof k !== 'string') continue
        // Infinite list keeps stale pages unless fully reset after bulk load / checks.
        if (k === 'nodes') {
          void queryClient.resetQueries({ queryKey: ['nodes', 'infinite'] })
          continue
        }
        void queryClient.invalidateQueries({ queryKey: [k] })
      }
    }
    return
  }
  const gid = typeof msg.group_id === 'string' ? msg.group_id : ''
  if (!gid) return
  const set = groupSyncSubs.get(gid)
  if (!set) return
  for (const cb of [...set]) cb(msg)
}

export function subscribeGroupSyncChannel(groupId: string, cb: (msg: WsPayload) => void): () => void {
  if (!groupSyncSubs.has(groupId)) groupSyncSubs.set(groupId, new Set())
  const s = groupSyncSubs.get(groupId)!
  s.add(cb)
  return () => {
    s.delete(cb)
    if (s.size === 0) groupSyncSubs.delete(groupId)
  }
}

export function sendAdminRealtime(payload: object) {
  const raw = JSON.stringify(payload)
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(raw)
    return
  }
  if (pendingSends.length < maxPending) pendingSends.push(raw)
  connectAdminRealtime()
}

export function disconnectAdminRealtime() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  pendingSends.length = 0
  if (socket) {
    socket.close()
    socket = null
  }
}

export function connectAdminRealtime() {
  if (typeof window === 'undefined') return
  const token = getToken()
  if (!token || !apiBase) {
    disconnectAdminRealtime()
    return
  }
  const url = buildWsURL(apiBase, token)
  if (socket?.readyState === WebSocket.OPEN) {
    return
  }
  if (socket?.readyState === WebSocket.CONNECTING) {
    return
  }
  disconnectAdminRealtime()
  const ws = new WebSocket(url)
  socket = ws
  ws.onopen = () => {
    flushPendingSends()
  }
  ws.onmessage = (ev) => {
    try {
      dispatch(JSON.parse(String(ev.data)) as WsPayload)
    }
    catch {
      /* ignore malformed */
    }
  }
  ws.onclose = () => {
    socket = null
    const t = getToken()
    if (t && apiBase) {
      reconnectTimer = setTimeout(() => connectAdminRealtime(), 2000)
    }
  }
  ws.onerror = () => {
    ws.close()
  }
}

export function ensureAdminRealtimeConnected() {
  const token = getToken()
  if (!token) return
  if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return
  connectAdminRealtime()
}
