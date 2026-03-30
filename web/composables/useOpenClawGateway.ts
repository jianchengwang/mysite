import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

type GatewayHelloOk = {
  type: 'hello-ok'
  protocol: number
  server?: {
    version?: string
    connId?: string
  }
  features?: {
    methods?: string[]
    events?: string[]
  }
  snapshot?: unknown
  auth?: {
    deviceToken?: string
    role?: string
    scopes?: string[]
    issuedAtMs?: number
  }
  policy?: {
    tickIntervalMs?: number
  }
}

type GatewayResponseFrame = {
  type: 'res'
  id: string
  ok: boolean
  payload?: unknown
  error?: {
    code?: string
    message?: string
    details?: unknown
  }
}

type GatewayEventFrame = {
  type: 'event'
  event: string
  payload?: unknown
  seq?: number
}

type ChatBlock = {
  type: 'text'
  text: string
}

export type LobsterChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  blocks: ChatBlock[]
  timestamp: number
  runId?: string
  sessionKey?: string
}

export type LobsterMinionCard = {
  id: string
  label: string
  badge: string
  status: 'idle' | 'working' | 'done' | 'error'
  note: string
  detail: string
  lastSeen: number
  sessionKey?: string
  runId?: string
}

export type LobsterEventEntry = {
  id: string
  ts: number
  event: string
  summary: string
}

export type LobsterSendOptions = {
  displayText?: string
  gatewayText?: string
}

type DeviceIdentity = {
  deviceId: string
  publicKey: string
  privateKey: string
}

type StoredDeviceIdentity = DeviceIdentity & {
  version: 1
  createdAtMs: number
}

type StoredDeviceToken = {
  token: string
  issuedAtMs: number
  scopes: string[]
}

type PendingRequest = {
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
}

type ChatEventState = '' | 'delta' | 'final' | 'aborted' | 'error'

const WS_URL_STORAGE_KEY = 'lobster_workshop_ws_url'
const SESSION_STORAGE_KEY = 'lobster_workshop_session_key'
const TOKEN_STORAGE_KEY = 'lobster_workshop_token'
const PASSWORD_STORAGE_KEY = 'lobster_workshop_password'
const INSTANCE_STORAGE_KEY = 'lobster_workshop_instance_id'
const DEVICE_IDENTITY_STORAGE_KEY = 'lobster_workshop_device_identity_v1'
const DEVICE_TOKEN_STORAGE_KEY = 'lobster_workshop_device_tokens_v1'

const CONNECT_TIMEOUT_MS = 750
const MAX_EVENT_LOG = 80
const MAX_MINIONS = 12
const MAX_MESSAGES = 200
const CHAT_WINDOW_SLOP_MS = 2_000

const defaultGatewayUrl = 'ws://127.0.0.1:18780'
const GATEWAY_CONTROL_UI_CLIENT_ID = 'openclaw-control-ui'
const GATEWAY_WEBCHAT_MODE = 'webchat'

const textEncoder = new TextEncoder()

const base64UrlEncode = (bytes: Uint8Array) => {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '')
}

const base64UrlDecode = (input: string) => {
  const normalized = input.replaceAll('-', '+').replaceAll('_', '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = atob(padded)
  const output = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    output[i] = binary.charCodeAt(i)
  }
  return output
}

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

export const createId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

const toTrimmedString = (value: unknown) => {
  if (typeof value !== 'string') return ''
  return value.trim()
}
// ... (rest of helper functions unchanged)

const truncateText = (value: string, limit = 180) =>
  value.length <= limit ? value : `${value.slice(0, limit - 1)}…`

const normalizeGatewayUrl = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^wss?:\/\//i.test(trimmed)) return trimmed
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/^http/i, 'ws')
  return `ws://${trimmed}`
}

const buildDeviceAuthPayload = (params: {
  deviceId: string
  clientId: string
  clientMode: string
  role: string
  scopes: string[]
  signedAtMs: number
  token?: string | null
  nonce: string
}) =>
  [
    'v2',
    params.deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    params.scopes.join(','),
    String(params.signedAtMs),
    params.token ?? '',
    params.nonce
  ].join('|')

const fingerprintPublicKey = async (publicKey: Uint8Array) => {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) {
    throw new Error('WebCrypto is not available.')
  }
  const digest = await subtle.digest('SHA-256', publicKey)
  return bytesToHex(new Uint8Array(digest))
}

const extractTextParts = (message: unknown): string[] => {
  if (!message || typeof message !== 'object') {
    return typeof message === 'string' ? [message] : []
  }

  const candidate = message as Record<string, unknown>
  const blocks: string[] = []

  if (typeof candidate.text === 'string' && candidate.text.trim()) {
    blocks.push(candidate.text.trim())
  }

  const content = candidate.content
  if (Array.isArray(content)) {
    content.forEach((entry) => {
      if (!entry || typeof entry !== 'object') return
      const record = entry as Record<string, unknown>
      if (record.type === 'text' && typeof record.text === 'string' && record.text.trim()) {
        blocks.push(record.text.trim())
      } else if (record.type === 'toolcall') {
        const toolName = toTrimmedString(record.name) || 'tool'
        blocks.push(`[Tool] ${toolName}`)
      } else if (record.type === 'toolresult') {
        const toolName = toTrimmedString(record.name) || 'tool'
        const resultText = toTrimmedString(record.text)
        blocks.push(resultText ? `[Result] ${toolName}: ${resultText}` : `[Result] ${toolName}`)
      } else if ((record.type === 'image' || record.type === 'image_url') && blocks.length === 0) {
        blocks.push('[Image]')
      }
    })
  } else if (typeof content === 'string' && content.trim()) {
    blocks.push(content.trim())
  }

  return blocks.filter(Boolean)
}

const looksLikeStructuredMachinePayload = (text: string) => {
  const trimmed = text.trim()
  if (!trimmed) return false
  return (
    /^[\[{]/.test(trimmed) ||
    /"nodes"|"commands"|"pathEnv"|"displayName"|"remoteIp"|"connectedAtMs"/.test(trimmed)
  )
}

const parseStructuredMachinePayload = (text: string) => {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

const summarizeStructuredPayload = (text: string) => {
  try {
    const parsed = parseStructuredMachinePayload(text)
    if (!parsed || typeof parsed !== 'object') {
      return '[Large machine response omitted.]'
    }

    const summaryParts: string[] = []

    if (typeof parsed.status === 'string' && parsed.status) {
      summaryParts.push(`status: ${parsed.status}`)
    }
    if (typeof parsed.action === 'string' && parsed.action) {
      summaryParts.push(`action: ${parsed.action}`)
    }
    if (typeof parsed.count === 'number') {
      summaryParts.push(`count: ${parsed.count}`)
    }
    if (Array.isArray(parsed.nodes)) {
      summaryParts.push(`${parsed.nodes.length} node(s)`)
    }
    if (Array.isArray(parsed.commands)) {
      summaryParts.push(`${parsed.commands.length} command(s)`)
    }

    return summaryParts.length
      ? `[Large machine response omitted: ${summaryParts.join(', ')}.]`
      : '[Large machine response omitted.]'
  } catch {
    return '[Large machine response omitted.]'
  }
}

const summarizeStructuredErrorPayload = (payload: Record<string, unknown>) => {
  const tool = toTrimmedString(payload.tool)
  const action = toTrimmedString(payload.action)
  const status = toTrimmedString(payload.status)
  const directError =
    toTrimmedString(payload.error) ||
    toTrimmedString(payload.errorMessage) ||
    toTrimmedString(payload.message)

  let objectError = ''
  if (!directError && payload.error && typeof payload.error === 'object') {
    objectError = formatPreview(payload.error)
  }

  const errorText = directError || objectError || 'Unknown gateway error.'
  const prefixParts = [tool, action, status].filter(Boolean)
  const prefix = prefixParts.length ? `${prefixParts.join(' / ')}: ` : ''
  return `[Gateway error] ${prefix}${errorText}`
}

const flattenChatBlocks = (message: LobsterChatMessage) =>
  message.blocks
    .map(block => block.text.trim())
    .filter(Boolean)
    .join('\n\n')
    .trim()

const getMessageIdentityKey = (message: LobsterChatMessage) => {
  const normalizedText = flattenChatBlocks(message).replace(/\s+/g, ' ').trim()
  const sessionKey = message.sessionKey || ''
  if (message.runId) {
    return `${message.role}|${sessionKey}|run|${message.runId}|${normalizedText}`
  }
  return `${message.role}|${sessionKey}|ts|${message.timestamp}|${normalizedText}`
}

const isEquivalentChatMessage = (left: LobsterChatMessage, right: LobsterChatMessage) => {
  if (left.role !== right.role) return false
  const leftSession = left.sessionKey || ''
  const rightSession = right.sessionKey || ''
  if (leftSession && rightSession && leftSession !== rightSession) return false
  if (flattenChatBlocks(left) !== flattenChatBlocks(right)) return false
  if (left.role === 'user') {
    if (left.runId && right.runId && left.runId !== right.runId) return false
    return Math.abs(left.timestamp - right.timestamp) < 120_000
  }
  if (left.runId || right.runId) {
    return (left.runId || '') === (right.runId || '')
  }
  return Math.abs(left.timestamp - right.timestamp) < 90_000
}

const upsertAssistantMessageForRun = (existing: LobsterChatMessage[], nextMessage: LobsterChatMessage) => {
  if (nextMessage.role !== 'assistant') {
    return [...existing, nextMessage].slice(-MAX_MESSAGES)
  }

  const nextRunId = nextMessage.runId || ''
  if (!nextRunId) {
    return [...existing, nextMessage].slice(-MAX_MESSAGES)
  }

  return [
    ...existing.filter((message) => !(message.role === 'assistant' && (message.runId || '') === nextRunId)),
    nextMessage
  ].slice(-MAX_MESSAGES)
}

const sanitizeChatText = (text: string, role: LobsterChatMessage['role']) => {
  const trimmed = text.trim()
  if (!trimmed) return ''
  if (/\[chat\.history\].*message too large/i.test(trimmed)) {
    return '[History skipped an oversized reply.]'
  }

  const structuredPayload = role !== 'user' ? parseStructuredMachinePayload(trimmed) : null
  if (structuredPayload) {
    const hasMachineErrorEnvelope =
      typeof structuredPayload.status === 'string' &&
      String(structuredPayload.status).toLowerCase() === 'error' &&
      (typeof structuredPayload.error === 'string' || typeof structuredPayload.tool === 'string')

    if (hasMachineErrorEnvelope) {
      return summarizeStructuredErrorPayload(structuredPayload)
    }
  }

  const lineCount = trimmed.split(/\r?\n/).length
  const oversizedMachineReply =
    role !== 'user' &&
    looksLikeStructuredMachinePayload(trimmed) &&
    (trimmed.length > 700 || lineCount > 20)

  if (oversizedMachineReply) {
    return summarizeStructuredPayload(trimmed)
  }

  if (role !== 'user' && trimmed.length > 2_000) {
    return `${truncateText(trimmed, 520)}\n\n[Large reply truncated.]`
  }

  return trimmed
}

const normalizeChatMessage = (message: unknown, fallback: Partial<LobsterChatMessage> = {}): LobsterChatMessage | null => {
  const roleValue =
    message && typeof message === 'object' && typeof (message as Record<string, unknown>).role === 'string'
      ? String((message as Record<string, unknown>).role).toLowerCase()
      : fallback.role || 'assistant'

  const role: LobsterChatMessage['role'] =
    roleValue === 'user'
      ? 'user'
      : roleValue === 'system'
        ? 'system'
        : 'assistant'

  const blocks = extractTextParts(message)
    .map(text => sanitizeChatText(text, role))
    .filter(Boolean)
    .map(text => ({ type: 'text' as const, text }))
  if (blocks.length === 0) return null

  const timestamp =
    message && typeof message === 'object' && typeof (message as Record<string, unknown>).timestamp === 'number'
      ? Number((message as Record<string, unknown>).timestamp)
      : fallback.timestamp || Date.now()

  return {
    id:
      (message && typeof message === 'object' && typeof (message as Record<string, unknown>).id === 'string'
        ? String((message as Record<string, unknown>).id)
        : fallback.id) || createId(),
    role,
    blocks,
    timestamp,
    runId:
      message && typeof message === 'object' && typeof (message as Record<string, unknown>).runId === 'string'
        ? String((message as Record<string, unknown>).runId)
        : fallback.runId,
    sessionKey:
      message && typeof message === 'object' && typeof (message as Record<string, unknown>).sessionKey === 'string'
        ? String((message as Record<string, unknown>).sessionKey)
        : fallback.sessionKey
  }
}

const formatPreview = (value: unknown) => {
  if (value == null) return ''
  if (typeof value === 'string') return truncateText(value.replace(/\s+/g, ' ').trim())
  try {
    return truncateText(JSON.stringify(value))
  } catch {
    return truncateText(String(value))
  }
}

const isAssistantLikeChatMessage = (message: unknown) => {
  if (!message || typeof message !== 'object') return false
  const candidate = message as Record<string, unknown>
  const role = toTrimmedString(candidate.role).toLowerCase()
  if (role && role !== 'assistant') return false
  return Array.isArray(candidate.content) || typeof candidate.text === 'string'
}

const shouldReloadHistoryForFinalEvent = (payload: Record<string, unknown>) => {
  if (toTrimmedString(payload.state) !== 'final') {
    return false
  }
  return !isAssistantLikeChatMessage(payload.message)
}

const getSubagentTail = (sessionKey: string) => {
  const match = sessionKey.match(/:subagent:([^:]+)$/)
  if (match?.[1]) return match[1]
  const nestedMatches = [...sessionKey.matchAll(/:subagent:([^:]+)/g)]
  return nestedMatches.at(-1)?.[1] || ''
}

const inferMinionLabel = (payload: Record<string, unknown>, data: Record<string, unknown>) => {
  const explicit =
    toTrimmedString(payload.label) ||
    toTrimmedString(data.label) ||
    toTrimmedString(data.displayName) ||
    toTrimmedString(data.agentName) ||
    toTrimmedString(data.subagentName) ||
    toTrimmedString(data.name)

  if (explicit) return explicit

  const sessionKey = toTrimmedString(payload.sessionKey)
  const subagentTail = sessionKey ? getSubagentTail(sessionKey) : ''
  if (subagentTail) return subagentTail

  return toTrimmedString(data.toolCallId) || 'Deckhand'
}

const inferMinionBadge = (stream: string, data: Record<string, unknown>) => {
  if (stream === 'tool') return toTrimmedString(data.name) || 'Tool'
  if (stream === 'lifecycle') return toTrimmedString(data.phase).replaceAll('_', ' ') || 'Lifecycle'
  if (stream === 'compaction') return 'Compaction'
  return stream || 'Agent'
}

const inferMinionStatus = (payload: Record<string, unknown>) => {
  const stream = toTrimmedString(payload.stream)
  const data = payload.data && typeof payload.data === 'object' ? payload.data as Record<string, unknown> : {}
  const phase = toTrimmedString(data.phase)

  if (stream === 'tool') {
    if (phase === 'result') return 'done'
    if (phase === 'error') return 'error'
    return 'working'
  }

  if (phase === 'fallback_cleared' || phase === 'end') return 'done'
  if (phase === 'error') return 'error'
  return 'working'
}

const buildMinionNote = (payload: Record<string, unknown>) => {
  const stream = toTrimmedString(payload.stream)
  const data = payload.data && typeof payload.data === 'object' ? payload.data as Record<string, unknown> : {}
  const phase = toTrimmedString(data.phase)

  if (stream === 'tool') {
    if (phase === 'result') return 'Delivered tool output'
    if (phase === 'update') return 'Streaming partial output'
    return 'Executing assigned work'
  }

  if (stream === 'lifecycle' && phase === 'fallback') return 'Switching models for resilience'
  if (stream === 'compaction') return 'Compressing context'
  return phase ? `Lifecycle: ${phase.replaceAll('_', ' ')}` : 'Reporting from the deck'
}

const buildMinionDetail = (payload: Record<string, unknown>) => {
  const data = payload.data && typeof payload.data === 'object' ? payload.data as Record<string, unknown> : {}
  const preview =
    formatPreview(data.result) ||
    formatPreview(data.partialResult) ||
    formatPreview(data.args) ||
    formatPreview(data.reasonSummary) ||
    formatPreview(data.reason) ||
    formatPreview(data.error)

  const sessionKey = toTrimmedString(payload.sessionKey)
  if (preview) return preview
  if (sessionKey) return truncateText(sessionKey, 96)
  return 'Standing by.'
}

const normalizeErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>
    if (typeof record.message === 'string') return record.message
  }
  return 'Unknown gateway error.'
}

const isSecureGatewayContext = () =>
  import.meta.client &&
  typeof window !== 'undefined' &&
  !!globalThis.crypto?.subtle &&
  (window.isSecureContext || ['localhost', '127.0.0.1'].includes(window.location.hostname))

export const useOpenClawGateway = () => {
  const gatewayUrl = ref(defaultGatewayUrl)
  const sessionKey = ref('main')
  const token = ref('')
  const password = ref('')
  const status = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const serverVersion = ref('')
  const serverConnId = ref('')
  const lastError = ref('')
  const draft = ref('')
  const messages = ref<LobsterChatMessage[]>([])
  const streamingText = ref('')
  const activeRunId = ref('')
  const sending = ref(false)
  const nodes = ref<Record<string, unknown>[]>([])
  const presenceEntries = ref<Record<string, unknown>[]>([])
  const minionCards = ref<LobsterMinionCard[]>([])
  const eventLog = ref<LobsterEventEntry[]>([])
  const availableMethods = ref<string[]>([])
  const availableEvents = ref<string[]>([])
  const deviceAuthReady = ref(false)
  const chatWindowStartedAt = ref(Date.now())

  let ws: WebSocket | null = null
  let connectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let refreshTimer: ReturnType<typeof setInterval> | null = null
  let historyPollTimer: ReturnType<typeof setInterval> | null = null
  let historyPollDeadline = 0
  let connectNonce = ''
  let connectSent = false
  let reconnectDelay = 1200
  let manuallyClosed = false
  let hasConnectedOnce = false
  const pending = new Map<string, PendingRequest>()

  const bossMood = computed(() => {
    if (status.value === 'connecting') return 'Waking the crew'
    if (streamingText.value) return 'Boss Lobster is thinking'
    if (lastError.value) return 'Needs a quick fix'
    if (status.value === 'connected') return 'Commanding the workshop'
    return 'Docked and waiting'
  })

  const latestAssistantMessage = computed(() => {
    const assistantMessages = [...messages.value].reverse().find(message => message.role === 'assistant')
    return assistantMessages?.blocks.map(block => block.text).join('\n\n') || ''
  })

  const storeSettings = () => {
    if (!import.meta.client) return
    localStorage.setItem(WS_URL_STORAGE_KEY, gatewayUrl.value.trim() || defaultGatewayUrl)
    localStorage.setItem(SESSION_STORAGE_KEY, sessionKey.value.trim() || 'main')
    localStorage.setItem(TOKEN_STORAGE_KEY, token.value.trim())
    localStorage.setItem(PASSWORD_STORAGE_KEY, password.value.trim())
  }

  const loadStoredSettings = () => {
    if (!import.meta.client) return
    gatewayUrl.value = localStorage.getItem(WS_URL_STORAGE_KEY) || defaultGatewayUrl
    sessionKey.value = localStorage.getItem(SESSION_STORAGE_KEY) || 'main'
    token.value = localStorage.getItem(TOKEN_STORAGE_KEY) || ''
    password.value = localStorage.getItem(PASSWORD_STORAGE_KEY) || ''
  }

  const getStableInstanceId = () => {
    if (!import.meta.client) return createId()
    const existing = localStorage.getItem(INSTANCE_STORAGE_KEY)
    if (existing) return existing
    const nextId = createId()
    localStorage.setItem(INSTANCE_STORAGE_KEY, nextId)
    return nextId
  }

  const loadStoredDeviceTokens = () => {
    if (!import.meta.client) return {} as Record<string, StoredDeviceToken>
    try {
      const raw = localStorage.getItem(DEVICE_TOKEN_STORAGE_KEY)
      if (!raw) return {}
      const parsed = JSON.parse(raw) as Record<string, StoredDeviceToken>
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }

  const saveStoredDeviceTokens = (payload: Record<string, StoredDeviceToken>) => {
    if (!import.meta.client) return
    localStorage.setItem(DEVICE_TOKEN_STORAGE_KEY, JSON.stringify(payload))
  }

  const readDeviceToken = (deviceId: string, role: string) => {
    const store = loadStoredDeviceTokens()
    return store[`${role}:${deviceId}`]?.token || ''
  }

  const writeDeviceToken = (deviceId: string, role: string, nextToken: string, scopes: string[] = []) => {
    if (!nextToken) return
    const store = loadStoredDeviceTokens()
    store[`${role}:${deviceId}`] = {
      token: nextToken,
      issuedAtMs: Date.now(),
      scopes
    }
    saveStoredDeviceTokens(store)
  }

  const loadOrCreateDeviceIdentity = async (): Promise<DeviceIdentity | null> => {
    if (!isSecureGatewayContext()) return null

    const subtle = globalThis.crypto?.subtle
    if (!subtle) return null

    try {
      const raw = localStorage.getItem(DEVICE_IDENTITY_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as StoredDeviceIdentity
        if (
          parsed?.version === 1 &&
          typeof parsed.deviceId === 'string' &&
          typeof parsed.publicKey === 'string' &&
          typeof parsed.privateKey === 'string'
        ) {
          const publicKeyBytes = base64UrlDecode(parsed.publicKey)
          const derivedId = await fingerprintPublicKey(publicKeyBytes)
          if (derivedId === parsed.deviceId) {
            return {
              deviceId: parsed.deviceId,
              publicKey: parsed.publicKey,
              privateKey: parsed.privateKey
            }
          }
        }
      }
    } catch {
      // Ignore corrupted local identity and regenerate.
    }

    const keyPair = await subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])
    const publicKeyRaw = new Uint8Array(await subtle.exportKey('raw', keyPair.publicKey))
    const privateKeyPkcs8 = new Uint8Array(await subtle.exportKey('pkcs8', keyPair.privateKey))
    const deviceId = await fingerprintPublicKey(publicKeyRaw)
    const identity: StoredDeviceIdentity = {
      version: 1,
      deviceId,
      publicKey: base64UrlEncode(publicKeyRaw),
      privateKey: base64UrlEncode(privateKeyPkcs8),
      createdAtMs: Date.now()
    }
    localStorage.setItem(DEVICE_IDENTITY_STORAGE_KEY, JSON.stringify(identity))
    return {
      deviceId: identity.deviceId,
      publicKey: identity.publicKey,
      privateKey: identity.privateKey
    }
  }

  const signDevicePayload = async (privateKeyBase64Url: string, payload: string) => {
    const subtle = globalThis.crypto?.subtle
    if (!subtle) {
      throw new Error('WebCrypto is not available for device authentication.')
    }
    const privateKey = await subtle.importKey(
      'pkcs8',
      base64UrlDecode(privateKeyBase64Url),
      { name: 'Ed25519' },
      false,
      ['sign']
    )
    const signature = await subtle.sign('Ed25519', privateKey, textEncoder.encode(payload))
    return base64UrlEncode(new Uint8Array(signature))
  }

  const pushSystemMessage = (text: string) => {
    const message = normalizeChatMessage(
      { role: 'system', content: [{ type: 'text', text }] },
      { id: createId(), timestamp: Date.now(), role: 'system' }
    )
    if (!message) return
    messages.value = [...messages.value, message].slice(-MAX_MESSAGES)
  }

  const resetChatWindow = (startedAt = Date.now()) => {
    chatWindowStartedAt.value = startedAt
    stopHistoryPolling()
    messages.value = []
    minionCards.value = []
    streamingText.value = ''
    activeRunId.value = ''
    lastError.value = ''
  }

  const mergeHistoryMessages = (incoming: LobsterChatMessage[]) => {
    const windowStart = chatWindowStartedAt.value - CHAT_WINDOW_SLOP_MS
    const filteredIncoming = incoming.filter(message => message.timestamp >= windowStart)
    const nextMap = new Map<string, LobsterChatMessage>()

    messages.value
      .filter(message => message.timestamp >= windowStart)
      .forEach((message) => {
        nextMap.set(getMessageIdentityKey(message), message)
      })

    filteredIncoming.forEach((message) => {
      const messageKey = getMessageIdentityKey(message)
      const equivalentEntry = [...nextMap.entries()].find(([, existing]) => isEquivalentChatMessage(existing, message))
      if (equivalentEntry) {
        const [existingKey, existingMessage] = equivalentEntry
        const nextMessage =
          (message.runId && !existingMessage.runId) ||
          (message.sessionKey && !existingMessage.sessionKey)
            ? { ...existingMessage, ...message }
            : existingMessage
        nextMap.set(existingKey, nextMessage)
        return
      }
      nextMap.set(messageKey, message)
    })

    messages.value = [...nextMap.values()]
      .sort((left, right) => left.timestamp - right.timestamp)
      .slice(-MAX_MESSAGES)
  }

  const inferRecentRunIdForSession = (currentSessionKey: string) => {
    const now = Date.now()
    return [...messages.value]
      .reverse()
      .find((message) => {
        if (!message.runId) return false
        const messageSessionKey = message.sessionKey || currentSessionKey
        if (!(messageSessionKey === currentSessionKey || messageSessionKey.startsWith(`${currentSessionKey}:`))) {
          return false
        }
        return now - message.timestamp < 20 * 60 * 1000
      })
      ?.runId || ''
  }

  const updateMinion = (payload: GatewayEventFrame) => {
    const record = payload.payload && typeof payload.payload === 'object'
      ? payload.payload as Record<string, unknown>
      : {}
    const data = record.data && typeof record.data === 'object'
      ? record.data as Record<string, unknown>
      : {}
    const stream = toTrimmedString(record.stream)

    if (payload.event !== 'agent' || !stream) {
      return
    }

    const toolCallId = toTrimmedString(data.toolCallId)
    const sessionKeyValue = toTrimmedString(record.sessionKey)
    const runIdValue = toTrimmedString(record.runId)

    // Any session other than the main one or with an explicit subagent name is a minion.
    // This makes the UI more reactive to any background work.
    const hasSubagentContext =
      (sessionKeyValue && sessionKeyValue !== sessionKey.value.trim()) ||
      Boolean(toTrimmedString(data.subagentName)) ||
      sessionKeyValue.includes(':subagent:')

    if (!hasSubagentContext) {
      return
    }

    const minionId = toolCallId || `${stream}:${runIdValue || createId()}`
    const nextCard: LobsterMinionCard = {
      id: minionId,
      label: inferMinionLabel(record, data),
      badge: inferMinionBadge(stream, data),
      status: inferMinionStatus(record),
      note: buildMinionNote(record),
      detail: buildMinionDetail(record),
      lastSeen: Date.now(),
      runId: runIdValue || undefined,
      sessionKey: sessionKeyValue || undefined
    }

    const nextCards = [nextCard, ...minionCards.value.filter(card => card.id !== minionId)]
      .sort((left, right) => right.lastSeen - left.lastSeen)
      .slice(0, MAX_MINIONS)

    minionCards.value = nextCards
  }

  const pushEventLog = (event: GatewayEventFrame) => {
    const payload = event.payload && typeof event.payload === 'object'
      ? event.payload as Record<string, unknown>
      : {}
    const summary =
      event.event === 'chat'
        ? truncateText(
            [
              toTrimmedString(payload.state),
              toTrimmedString(payload.errorMessage),
              extractTextParts(payload.message).join(' ')
            ].filter(Boolean).join(' · '),
            140
          ) || 'Chat update'
        : event.event === 'agent'
          ? truncateText(buildMinionDetail(payload), 140)
          : truncateText(formatPreview(payload) || 'Event received', 140)

    eventLog.value = [
      {
        id: `${event.event}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ts: Date.now(),
        event: event.event,
        summary
      },
      ...eventLog.value
    ].slice(0, MAX_EVENT_LOG)
  }

  const pushDiagnosticEvent = (event: string, summary: string) => {
    const trimmed = summary.trim()
    if (!trimmed) return
    eventLog.value = [
      {
        id: `${event}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ts: Date.now(),
        event,
        summary: truncateText(trimmed, 140)
      },
      ...eventLog.value
    ].slice(0, MAX_EVENT_LOG)
  }

  const setConnectedState = (hello: GatewayHelloOk) => {
    status.value = 'connected'
    lastError.value = ''
    reconnectDelay = 1200
    hasConnectedOnce = true
    serverVersion.value = hello.server?.version || ''
    serverConnId.value = hello.server?.connId || ''
    availableMethods.value = hello.features?.methods || []
    availableEvents.value = hello.features?.events || []
    const snapshot = hello.snapshot && typeof hello.snapshot === 'object'
      ? hello.snapshot as Record<string, unknown>
      : null

    if (snapshot?.presence && Array.isArray(snapshot.presence)) {
      presenceEntries.value = snapshot.presence as Record<string, unknown>[]
    }
  }

  const resetPending = (reason: Error) => {
    pending.forEach(({ reject }) => reject(reason))
    pending.clear()
  }

  const cleanupTimers = () => {
    if (connectTimer) {
      clearTimeout(connectTimer)
      connectTimer = null
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
    if (historyPollTimer) {
      clearInterval(historyPollTimer)
      historyPollTimer = null
    }
    historyPollDeadline = 0
  }

  const request = <T = unknown>(method: string, params?: unknown): Promise<T> => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('Gateway is not connected.'))
    }
    const id = createId()
    const frame = { type: 'req', id, method, params }
    return new Promise<T>((resolve, reject) => {
      pending.set(id, { resolve, reject })
      ws?.send(JSON.stringify(frame))
    })
  }

  const stopHistoryPolling = () => {
    if (historyPollTimer) {
      clearInterval(historyPollTimer)
      historyPollTimer = null
    }
    historyPollDeadline = 0
  }

  const normalizeChatPayload = (payload: Record<string, unknown>): ChatEventState => {
    const state = toTrimmedString(payload.state) as ChatEventState
    const currentSessionKey = sessionKey.value.trim() || 'main'
    const rawPayloadSessionKey = toTrimmedString(payload.sessionKey)
    const payloadSessionKey = rawPayloadSessionKey || currentSessionKey
    const sessionMatchesCurrent =
      payloadSessionKey === currentSessionKey ||
      payloadSessionKey.startsWith(`${currentSessionKey}:`)

    if (!sessionMatchesCurrent) {
      return ''
    }

    const runId = toTrimmedString(payload.runId)
    const effectiveRunId = runId || activeRunId.value || inferRecentRunIdForSession(currentSessionKey) || ''
    const normalizedMessage = normalizeChatMessage(payload.message, {
      id: effectiveRunId || createId(),
      role: 'assistant',
      timestamp: Date.now(),
      runId: effectiveRunId || undefined,
      sessionKey: payloadSessionKey || undefined
    })

    // If we're waiting for a reply, and a new runId arrives for our session, 
    // it's likely the server-generated runId for our request.
    if (runId && activeRunId.value && runId !== activeRunId.value) {
      const oldId = activeRunId.value
      // If we see a chat delta for the same session, update activeRunId
      if (state === 'delta' || state === 'final') {
        activeRunId.value = runId
        const userMsg = messages.value.find(m => m.runId === oldId && m.role === 'user')
        if (userMsg) {
          userMsg.runId = runId
        }
      }
    } else if (runId && !activeRunId.value && (state === 'delta' || state === 'final')) {
      // Catch runs started elsewhere or missed by sendMessage
      activeRunId.value = runId
    }

    if (state === 'delta') {
      const parts = normalizedMessage?.blocks.map(block => block.text) || []
      if (parts.length > 0) {
        // If it's for our active run, update streaming text
        if ((runId && runId === activeRunId.value) || (!runId && effectiveRunId === activeRunId.value)) {
          streamingText.value = parts.join('\n\n')
        }
      }
      return state
    }

    if (state === 'final') {
      stopHistoryPolling()
      if (normalizedMessage) {
        messages.value = upsertAssistantMessageForRun(messages.value, normalizedMessage)
      } else if (streamingText.value.trim()) {
        messages.value = upsertAssistantMessageForRun(messages.value, {
          id: effectiveRunId || createId(),
          role: 'assistant',
          blocks: [{ type: 'text', text: streamingText.value.trim() }],
          timestamp: Date.now(),
          runId: effectiveRunId || undefined,
          sessionKey: payloadSessionKey || undefined
        })
      }
      streamingText.value = ''
      if (!runId || effectiveRunId === activeRunId.value) {
        activeRunId.value = ''
      }
      return state
    }

    if (state === 'aborted') {
      stopHistoryPolling()
      if (streamingText.value.trim()) {
        messages.value = [
          ...messages.value,
          {
            id: runId || createId(),
            role: 'assistant',
            blocks: [{ type: 'text', text: `${streamingText.value.trim()}\n\n[Run aborted]` }],
            timestamp: Date.now(),
            runId: runId || undefined,
            sessionKey: payloadSessionKey || undefined
          }
        ].slice(-MAX_MESSAGES)
      } else {
        pushSystemMessage('The current run was aborted.')
      }
      streamingText.value = ''
      activeRunId.value = ''
      return state
    }

    if (state === 'error') {
      stopHistoryPolling()
      lastError.value = toTrimmedString(payload.errorMessage) || 'OpenClaw reported an error.'
      if (lastError.value) {
        pushSystemMessage(lastError.value)
        pushDiagnosticEvent('chat.error', lastError.value)
      }
      streamingText.value = ''
      activeRunId.value = ''
      return state
    }

    return state
  }

  const loadHistory = async () => {
    if (status.value !== 'connected') return
    try {
      const response = await request<{ messages?: unknown[] }>('chat.history', {
        sessionKey: sessionKey.value.trim() || 'main',
        limit: 80
      })
      const nextMessages = Array.isArray(response.messages)
        ? response.messages
            .map((message, index) => normalizeChatMessage(message, { id: `history-${index}`, timestamp: Date.now() }))
            .filter((message): message is LobsterChatMessage => Boolean(message))
        : []
      mergeHistoryMessages(nextMessages)
    } catch (error) {
      lastError.value = normalizeErrorMessage(error)
      pushDiagnosticEvent('chat.history', lastError.value)
    }
  }

  const startHistoryPolling = (runId: string, userTimestamp: number) => {
    stopHistoryPolling()
    historyPollDeadline = Date.now() + 30_000

    const poll = async () => {
      if (status.value !== 'connected') {
        stopHistoryPolling()
        return
      }
      if (Date.now() > historyPollDeadline) {
        if (activeRunId.value === runId) {
          activeRunId.value = ''
          streamingText.value = ''
          lastError.value = 'Boss Lobster is taking longer than expected. You can retry or reconnect.'
          pushSystemMessage(lastError.value)
          pushDiagnosticEvent('timeout', lastError.value)
        }
        stopHistoryPolling()
        return
      }

      await loadHistory()

      const hasAssistantReply = messages.value.some((message) => {
        if (message.role !== 'assistant') return false
        if (runId && message.runId === runId) return true
        return message.timestamp >= userTimestamp
      })

      if (hasAssistantReply) {
        if (activeRunId.value === runId) {
          activeRunId.value = ''
          streamingText.value = ''
        }
        stopHistoryPolling()
      }
    }

    historyPollTimer = setInterval(() => {
      void poll()
    }, 2500)

    void poll()
  }

  const loadPresence = async () => {
    if (status.value !== 'connected') return
    try {
      const response = await request<unknown>('system-presence', {})
      if (Array.isArray(response)) {
        presenceEntries.value = response as Record<string, unknown>[]
      } else if (response && typeof response === 'object' && Array.isArray((response as Record<string, unknown>).presence)) {
        presenceEntries.value = (response as Record<string, unknown>).presence as Record<string, unknown>[]
      }
    } catch (error) {
      lastError.value = normalizeErrorMessage(error)
    }
  }

  const loadNodes = async () => {
    if (status.value !== 'connected') return
    try {
      const response = await request<{ nodes?: Record<string, unknown>[] }>('node.list', {})
      nodes.value = Array.isArray(response.nodes) ? response.nodes : []
    } catch (error) {
      lastError.value = normalizeErrorMessage(error)
    }
  }

  const refreshDeck = async () => {
    await Promise.allSettled([loadPresence(), loadNodes()])
  }

  const handleMessage = async (raw: string) => {
    let parsed: GatewayResponseFrame | GatewayEventFrame | null = null
    try {
      parsed = JSON.parse(raw)
    } catch {
      return
    }

    if (!parsed || typeof parsed !== 'object') return

    if (parsed.type === 'event') {
      if (parsed.event === 'connect.challenge') {
        const payload = parsed.payload && typeof parsed.payload === 'object'
          ? parsed.payload as Record<string, unknown>
          : {}
        connectNonce = toTrimmedString(payload.nonce)
        void sendConnect()
        return
      }

      pushEventLog(parsed)
      if (parsed.event === 'chat' && parsed.payload && typeof parsed.payload === 'object') {
        const chatPayload = parsed.payload as Record<string, unknown>
        const chatState = normalizeChatPayload(chatPayload)
        if (chatState === 'final' && shouldReloadHistoryForFinalEvent(chatPayload)) {
          void loadHistory()
        }
      } else if (parsed.event === 'agent') {
        updateMinion(parsed)
      } else if (parsed.event === 'presence') {
        const payload = parsed.payload && typeof parsed.payload === 'object'
          ? parsed.payload as Record<string, unknown>
          : {}
        if (Array.isArray(payload.presence)) {
          presenceEntries.value = payload.presence as Record<string, unknown>[]
        }
      }
      return
    }

    if (parsed.type === 'res') {
      const pendingRequest = pending.get(parsed.id)
      if (!pendingRequest) return
      pending.delete(parsed.id)
      if (parsed.ok) {
        pendingRequest.resolve(parsed.payload)
      } else {
        pendingRequest.reject(new Error(parsed.error?.message || parsed.error?.code || 'Gateway request failed.'))
      }
    }
  }

  const scheduleReconnect = () => {
    if (manuallyClosed || reconnectTimer) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      void connect()
    }, reconnectDelay)
    reconnectDelay = Math.min(Math.round(reconnectDelay * 1.7), 15000)
  }

  const startRefreshLoop = () => {
    if (refreshTimer) clearInterval(refreshTimer)
    refreshTimer = setInterval(() => {
      void refreshDeck()
    }, 15000)
  }

  const handleClose = (event: CloseEvent) => {
    cleanupTimers()
    status.value = 'disconnected'
    ws = null
    connectSent = false
    const normalizedUrl = normalizeGatewayUrl(gatewayUrl.value || defaultGatewayUrl)
    const fallbackReason =
      event.code === 1006 && !event.reason
        ? `Could not reach ${normalizedUrl}.`
        : (event.code ? `Gateway closed (${event.code})` : 'Gateway disconnected.')
    const reason = event.reason || fallbackReason
    if (!manuallyClosed) {
      lastError.value = reason
      pushDiagnosticEvent('socket.close', reason)
      if (hasConnectedOnce) {
        scheduleReconnect()
      }
    }
    resetPending(new Error(reason))
  }

  const sendConnect = async () => {
    if (!ws || ws.readyState !== WebSocket.OPEN || connectSent) return
    connectSent = true
    if (connectTimer) {
      clearTimeout(connectTimer)
      connectTimer = null
    }

    try {
      const role = 'operator'
      const scopes = ['operator.admin', 'operator.approvals', 'operator.pairing']
      const clientId = GATEWAY_CONTROL_UI_CLIENT_ID
      const clientMode = GATEWAY_WEBCHAT_MODE

      let deviceIdentity: DeviceIdentity | null = null
      let deviceToken = ''
      let device: Record<string, unknown> | undefined
      const trimmedToken = token.value.trim()
      const trimmedPassword = password.value.trim()

      if (isSecureGatewayContext()) {
        deviceIdentity = await loadOrCreateDeviceIdentity()
        deviceAuthReady.value = Boolean(deviceIdentity)
        if (deviceIdentity) {
          deviceToken = readDeviceToken(deviceIdentity.deviceId, role)
          const signedAtMs = Date.now()
          const payload = buildDeviceAuthPayload({
            deviceId: deviceIdentity.deviceId,
            clientId,
            clientMode,
            role,
            scopes,
            signedAtMs,
            token: trimmedToken || null,
            nonce: connectNonce
          })
          const signature = await signDevicePayload(deviceIdentity.privateKey, payload)
          device = {
            id: deviceIdentity.deviceId,
            publicKey: deviceIdentity.publicKey,
            signature,
            signedAt: signedAtMs,
            nonce: connectNonce
          }
        }
      } else {
        deviceAuthReady.value = false
      }

      const auth = trimmedToken || trimmedPassword
        ? {
            token: trimmedToken || undefined,
            password: trimmedPassword || undefined
          }
        : deviceToken
          ? { token: deviceToken }
          : undefined

      const hello = await request<GatewayHelloOk>('connect', {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: clientId,
          displayName: 'Lobster Workshop',
          version: 'lobster-workshop',
          platform: import.meta.client ? (navigator.platform || 'web') : 'web',
          mode: clientMode,
          instanceId: getStableInstanceId()
        },
        role,
        scopes,
        device,
        caps: ['tool-events'],
        auth,
        userAgent: import.meta.client ? navigator.userAgent : 'nuxt',
        locale: import.meta.client ? navigator.language : 'en-US'
      })

      setConnectedState(hello)
      if (hello.auth?.deviceToken && deviceIdentity) {
        writeDeviceToken(deviceIdentity.deviceId, hello.auth.role || role, hello.auth.deviceToken, hello.auth.scopes || [])
      }
      await refreshDeck()
      startRefreshLoop()
    } catch (error) {
      lastError.value = normalizeErrorMessage(error)
      ws?.close(4008, 'connect failed')
    }
  }

  const connect = async () => {
    if (!import.meta.client) return
    const normalizedUrl = normalizeGatewayUrl(gatewayUrl.value || defaultGatewayUrl)
    if (!normalizedUrl) {
      lastError.value = 'Please provide a valid WebSocket URL.'
      return
    }

    storeSettings()
    cleanupTimers()
    manuallyClosed = false
    resetChatWindow()
    status.value = 'connecting'
    serverVersion.value = ''
    serverConnId.value = ''
    connectNonce = ''
    connectSent = false

    if (ws) {
      ws.close()
      ws = null
    }

    ws = new WebSocket(normalizedUrl)
    ws.addEventListener('open', () => {
      connectTimer = setTimeout(() => {
        void sendConnect()
      }, CONNECT_TIMEOUT_MS)
    })
    ws.addEventListener('message', event => {
      void handleMessage(String(event.data ?? ''))
    })
    ws.addEventListener('close', handleClose)
    ws.addEventListener('error', () => {
      lastError.value = 'WebSocket connection failed.'
      pushDiagnosticEvent('socket.error', lastError.value)
    })
  }

  const disconnect = () => {
    manuallyClosed = true
    cleanupTimers()
    status.value = 'disconnected'
    connectSent = false
    connectNonce = ''
    if (ws) {
      ws.close(1000, 'manual disconnect')
      ws = null
    }
    resetPending(new Error('Gateway disconnected.'))
  }

  const sendMessage = async (options: LobsterSendOptions & { idempotencyKey?: string } = {}) => {
    const displayText = (options.displayText ?? draft.value).trim()
    const gatewayText = (options.gatewayText ?? displayText).trim()
    const text = displayText
    if (!text || status.value !== 'connected' || sending.value) return ''

    const runId = options.idempotencyKey || createId()
    const userMessage: LobsterChatMessage = {
      id: runId,
      role: 'user',
      blocks: [{ type: 'text', text }],
      timestamp: Date.now(),
      runId,
      sessionKey: sessionKey.value.trim() || 'main'
    }
    messages.value = [...messages.value, userMessage].slice(-MAX_MESSAGES)
    draft.value = ''
    sending.value = true
    activeRunId.value = runId
    streamingText.value = ''
    lastError.value = ''

    try {
      const response = await request<{ runId?: string }>('chat.send', {
        sessionKey: sessionKey.value.trim() || 'main',
        message: gatewayText,
        deliver: true,
        idempotencyKey: runId
      })

      const serverRunId = toTrimmedString(response?.runId)
      if (serverRunId && serverRunId !== runId) {
        activeRunId.value = serverRunId
        userMessage.id = serverRunId
        userMessage.runId = serverRunId
        startHistoryPolling(serverRunId, userMessage.timestamp)
        return serverRunId
      }

      startHistoryPolling(runId, userMessage.timestamp)
      return runId
    } catch (error) {
      const message = normalizeErrorMessage(error)
      lastError.value = message
      pushSystemMessage(message)
      pushDiagnosticEvent('chat.send', message)
      activeRunId.value = ''
      streamingText.value = ''
      return ''
    } finally {
      sending.value = false
    }
  }

  const abortActiveRun = async () => {
    if (status.value !== 'connected') return false
    const currentSessionKey = sessionKey.value.trim() || 'main'
    try {
      await request('chat.abort', activeRunId.value
        ? { sessionKey: currentSessionKey, runId: activeRunId.value }
        : { sessionKey: currentSessionKey })
      stopHistoryPolling()
      pushSystemMessage('The current run was asked to stop.')
      return true
    } catch (error) {
      lastError.value = normalizeErrorMessage(error)
      pushDiagnosticEvent('chat.abort', lastError.value)
      return false
    }
  }

  watch([gatewayUrl, sessionKey, token, password], () => {
    storeSettings()
  })

  onMounted(() => {
    loadStoredSettings()
  })

  onUnmounted(() => {
    disconnect()
  })

  return {
    gatewayUrl,
    sessionKey,
    token,
    password,
    status,
    serverVersion,
    serverConnId,
    lastError,
    draft,
    messages,
    streamingText,
    activeRunId,
    sending,
    nodes,
    presenceEntries,
    minionCards,
    eventLog,
    availableMethods,
    availableEvents,
    deviceAuthReady,
    bossMood,
    latestAssistantMessage,
    resetChatWindow,
    connect,
    disconnect,
    loadHistory,
    loadPresence,
    loadNodes,
    refreshDeck,
    sendMessage,
    abortActiveRun
  }
}
