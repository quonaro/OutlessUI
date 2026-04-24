import type { QueryClient } from '@tanstack/vue-query'
import { computed, readonly, ref } from 'vue'

let queryClient: QueryClient | null = null
let apiBase = ''
let getToken: () => string | null = () => null

let socket: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
const pendingSends: string[] = []
const maxPending = 32
const wsConnected = ref(false)
const wsConnecting = ref(false)

function flushPendingSends() {
  if (!socket || socket.readyState !== WebSocket.OPEN) return
  while (pendingSends.length > 0) {
    const s = pendingSends.shift()
    if (s) socket.send(s)
  }
}

type WsPayload = Record<string, unknown>

const groupSyncSubs = new Map<string, Set<(msg: WsPayload) => void>>()
const globalSubs = new Set<(msg: WsPayload) => void>()
const openHandlers = new Set<() => void>()
/** After a reconnect, briefly trust idle `probe_unavailable_state` so the UI can recover if the tab missed done/cancel events. */
let suppressProbeStaleIdleIgnoreUntil = 0
let wsEverOpened = false

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
        // Invalidate infinite nodes query; avoid resetQueries so the grouped nodes UI does not unmount (reset clears cache -> isLoading -> v-if drops GroupAccordion and loses probe/sync progress state).
        if (k === 'nodes') {
          void queryClient.invalidateQueries({ queryKey: ['nodes', 'infinite'] })
          continue
        }
        void queryClient.invalidateQueries({ queryKey: [k] })
      }
    }
    return
  }
  for (const cb of [...globalSubs]) cb(msg)
  const gid = typeof msg.group_id === 'string' ? msg.group_id : ''
  if (!gid) return
  const set = groupSyncSubs.get(gid)
  if (!set) return
  for (const cb of [...set]) cb(msg)
}

export function subscribeAdminRealtime(cb: (msg: WsPayload) => void): () => void {
  globalSubs.add(cb)
  return () => {
    globalSubs.delete(cb)
  }
}

/** Run after each successful WebSocket open (initial connect and reconnect). */
export function onAdminRealtimeOpen(handler: () => void): () => void {
  openHandlers.add(handler)
  return () => {
    openHandlers.delete(handler)
  }
}

function notifyAdminRealtimeOpen() {
  for (const h of [...openHandlers]) h()
}

export function isProbeStaleIdleIgnoreSuspended(): boolean {
  return Date.now() < suppressProbeStaleIdleIgnoreUntil
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
  wsConnected.value = false
  wsConnecting.value = false
  wsEverOpened = false
  suppressProbeStaleIdleIgnoreUntil = 0
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
    wsConnected.value = true
    wsConnecting.value = false
    return
  }
  if (socket?.readyState === WebSocket.CONNECTING) {
    wsConnecting.value = true
    return
  }
  disconnectAdminRealtime()
  wsConnecting.value = true
  const ws = new WebSocket(url)
  socket = ws
  ws.onopen = () => {
    wsConnected.value = true
    wsConnecting.value = false
    if (wsEverOpened) {
      suppressProbeStaleIdleIgnoreUntil = Date.now() + 1500
    }
    wsEverOpened = true
    flushPendingSends()
    notifyAdminRealtimeOpen()
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
    wsConnected.value = false
    wsConnecting.value = false
    const t = getToken()
    if (t && apiBase) {
      reconnectTimer = setTimeout(() => connectAdminRealtime(), 2000)
    }
  }
  ws.onerror = () => {
    wsConnected.value = false
    ws.close()
  }
}

export function ensureAdminRealtimeConnected() {
  const token = getToken()
  if (!token) return
  if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return
  connectAdminRealtime()
}

export function useAdminRealtimeStatus() {
  const isBackendAvailable = computed(() => wsConnected.value)
  return {
    isConnected: readonly(wsConnected),
    isConnecting: readonly(wsConnecting),
    isBackendAvailable,
  }
}
