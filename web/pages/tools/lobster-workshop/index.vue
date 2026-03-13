<template>
  <div class="min-h-screen bg-[#fff9f1] px-4 py-6 font-hand sm:px-6 lg:px-8 lg:py-8">
    <div class="mx-auto max-w-7xl space-y-6">
      <section class="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div class="sketch-card relative overflow-hidden bg-[#fff7eb] p-5 sm:p-7">
          <div class="pointer-events-none absolute -left-10 top-6 h-28 w-28 rounded-[48%_52%_61%_39%/44%_44%_56%_56%] border-2 border-[#1f2937] bg-[#ffddb0] opacity-70"></div>
          <div class="pointer-events-none absolute right-4 top-4 rotate-6 rounded-full border-2 border-zinc-900 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">
            Lobster Boss
          </div>
          <div class="relative">
            <p class="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-zinc-500">OpenClaw Bridge</p>
            <h1 class="max-w-3xl text-4xl font-bold leading-tight text-zinc-900 sm:text-5xl">
              Lobster Workshop
            </h1>
            <p class="mt-3 max-w-3xl text-base text-zinc-600 sm:text-lg">
              One boss lobster, a whole deck of minions. Connect to your OpenClaw gateway, chat from the workshop, and keep an eye on every subagent run.
            </p>

            <div class="mt-6 grid gap-4 sm:grid-cols-3">
              <div class="rounded-[24px] border-2 border-zinc-900 bg-white p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                <p class="text-xs uppercase tracking-[0.22em] text-zinc-500">Boss Mood</p>
                <p class="mt-2 text-xl font-bold text-zinc-900">{{ bossMood }}</p>
              </div>
              <div class="rounded-[24px] border-2 border-zinc-900 bg-white p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                <p class="text-xs uppercase tracking-[0.22em] text-zinc-500">Minions</p>
                <p class="mt-2 text-3xl font-bold text-zinc-900">{{ minionCards.length }}</p>
              </div>
              <div class="rounded-[24px] border-2 border-zinc-900 bg-white p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                <p class="text-xs uppercase tracking-[0.22em] text-zinc-500">Deck Nodes</p>
                <p class="mt-2 text-3xl font-bold text-zinc-900">{{ connectedNodeCount }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="sketch-card space-y-4 bg-white p-5 sm:p-6">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">Connection</p>
              <h2 class="text-2xl font-bold text-zinc-900">Gateway Deck</h2>
            </div>
            <span
              class="inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-bold"
              :class="statusPillClass"
            >
              <span class="h-2.5 w-2.5 rounded-full bg-current"></span>
              {{ statusLabel }}
            </span>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <label class="space-y-2 sm:col-span-2">
              <span class="block text-sm font-bold text-zinc-700">Gateway WS URL</span>
              <input
                v-model="gatewayUrl"
                class="w-full rounded-[18px] border-2 border-zinc-900 bg-[#fffdf8] px-4 py-3 text-sm outline-none"
                placeholder="ws://127.0.0.1:18789"
              />
            </label>
            <label class="space-y-2">
              <span class="block text-sm font-bold text-zinc-700">Session Key</span>
              <input
                v-model="sessionKey"
                class="w-full rounded-[18px] border-2 border-zinc-900 bg-[#fffdf8] px-4 py-3 text-sm outline-none"
                placeholder="main"
              />
            </label>
            <label class="space-y-2">
              <span class="block text-sm font-bold text-zinc-700">Gateway Token</span>
              <input
                v-model="token"
                class="w-full rounded-[18px] border-2 border-zinc-900 bg-[#fffdf8] px-4 py-3 text-sm outline-none"
                placeholder="Optional"
              />
            </label>
            <label class="space-y-2 sm:col-span-2">
              <span class="block text-sm font-bold text-zinc-700">Gateway Password</span>
              <input
                v-model="password"
                type="password"
                class="w-full rounded-[18px] border-2 border-zinc-900 bg-[#fffdf8] px-4 py-3 text-sm outline-none"
                placeholder="Optional"
              />
            </label>
          </div>

          <div class="flex flex-wrap gap-3">
            <button
              class="sketch-button px-5 py-3 !bg-zinc-900 !text-white"
              :disabled="status === 'connecting'"
              @click="connect"
            >
              {{ status === 'connected' ? 'Reconnect Deck' : 'Connect Deck' }}
            </button>
            <button
              class="sketch-button px-5 py-3"
              :disabled="status !== 'connected'"
              @click="refreshDeck"
            >
              Refresh Radar
            </button>
            <button
              class="sketch-button px-5 py-3 border-red-200 text-red-600"
              :disabled="status === 'disconnected'"
              @click="disconnect"
            >
              Disconnect
            </button>
          </div>

          <div class="rounded-[22px] border border-zinc-200 bg-[#fffaf3] p-4 text-sm text-zinc-600">
            <p class="font-bold text-zinc-800">Handshake note</p>
            <p class="mt-2">
              On <span class="font-bold text-zinc-800">localhost</span> or <span class="font-bold text-zinc-800">HTTPS</span>, this page creates a browser device identity for OpenClaw automatically.
              <span v-if="!deviceAuthReady" class="font-bold text-amber-700"> If you connect over plain HTTP, your gateway may require token-only auth or allow-insecure auth.</span>
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-[20px] border border-zinc-200 bg-zinc-50 p-4">
              <p class="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">Server</p>
              <p class="mt-2 text-lg font-bold text-zinc-900">{{ serverVersion || 'Unknown' }}</p>
              <p class="mt-1 text-xs text-zinc-500">Conn ID: {{ serverConnId || '—' }}</p>
            </div>
            <div class="rounded-[20px] border border-zinc-200 bg-zinc-50 p-4">
              <p class="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">Capabilities</p>
              <p class="mt-2 text-lg font-bold text-zinc-900">{{ availableMethods.length }}</p>
              <p class="mt-1 text-xs text-zinc-500">{{ availableEvents.length }} live events reported</p>
            </div>
          </div>

          <div v-if="lastError" class="rounded-[20px] border-2 border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {{ lastError }}
          </div>
        </div>
      </section>

      <section class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr_0.92fr]">
        <article class="sketch-card flex min-h-[720px] flex-col bg-white p-5 sm:p-6">
          <div class="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 pb-4">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">Boss Channel</p>
              <h2 class="text-2xl font-bold text-zinc-900">Boss Lobster Chat</h2>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                class="sketch-button px-4 py-2 text-sm"
                :disabled="status !== 'connected'"
                @click="loadHistory"
              >
                Reload History
              </button>
              <button
                class="sketch-button px-4 py-2 text-sm border-red-200 text-red-600"
                :disabled="!activeRunId"
                @click="abortActiveRun"
              >
                Stop Run
              </button>
            </div>
          </div>

          <div class="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
            <div
              v-for="message in messages"
              :key="message.id"
              :class="[
                'max-w-[92%] rounded-[28px] border-2 px-4 py-3 shadow-[4px_4px_0_0_rgba(0,0,0,1)]',
                message.role === 'user'
                  ? 'ml-auto border-zinc-900 bg-[#ffe0bb] text-zinc-900'
                  : message.role === 'system'
                    ? 'mx-auto border-dashed border-zinc-400 bg-zinc-100 text-zinc-600'
                    : 'border-zinc-900 bg-[#fff8ef] text-zinc-900'
              ]"
            >
              <div class="mb-2 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-zinc-500">
                <span>{{ roleLabelMap[message.role] }}</span>
                <span>{{ formatTime(message.timestamp) }}</span>
              </div>
              <div class="space-y-2 text-[15px] leading-7">
                <p v-for="(block, blockIndex) in message.blocks" :key="`${message.id}-${blockIndex}`">{{ block.text }}</p>
              </div>
            </div>

            <div
              v-if="streamingText"
              class="max-w-[92%] rounded-[28px] border-2 border-sky-600 bg-sky-50 px-4 py-3 text-zinc-900 shadow-[4px_4px_0_0_rgba(14,165,233,0.18)]"
            >
              <div class="mb-2 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-sky-700">
                <span>Boss Lobster</span>
                <span>Streaming</span>
              </div>
              <p class="text-[15px] leading-7 whitespace-pre-wrap">{{ streamingText }}</p>
            </div>

            <div
              v-if="!messages.length && !streamingText"
              class="flex min-h-[220px] items-center justify-center rounded-[28px] border-2 border-dashed border-zinc-300 bg-[#fffdf8] px-6 text-center text-zinc-500"
            >
              Connect to OpenClaw, then send the first order to the boss lobster.
            </div>
          </div>

          <div class="mt-5 space-y-3 border-t border-zinc-200 pt-4">
            <textarea
              v-model="draft"
              rows="5"
              class="w-full resize-none rounded-[24px] border-2 border-zinc-900 bg-[#fffdf8] px-4 py-4 text-base outline-none"
              placeholder="Ask Boss Lobster to brief the crew, launch a subagent run, or check what the deckhands are doing..."
              @keydown.enter.exact.prevent="sendMessage"
            ></textarea>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <p class="max-w-2xl text-sm text-zinc-500">
                Press <span class="font-bold text-zinc-800">Enter</span> to send. Use <span class="font-bold text-zinc-800">Shift + Enter</span> for a new line.
              </p>
              <button
                class="sketch-button px-6 py-3 !bg-zinc-900 !text-white"
                :disabled="status !== 'connected' || sending || !draft.trim()"
                @click="sendMessage"
              >
                {{ sending ? 'Dispatching...' : 'Send Order' }}
              </button>
            </div>
          </div>
        </article>

        <article class="space-y-6">
          <div class="sketch-card bg-white p-5 sm:p-6">
            <div class="flex items-start justify-between gap-3 border-b border-zinc-200 pb-4">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">Crew Radar</p>
                <h2 class="text-2xl font-bold text-zinc-900">Minion Monitor</h2>
              </div>
              <span class="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
                {{ minionCards.length }} active cards
              </span>
            </div>

            <div class="mt-4 space-y-3">
              <div
                v-for="minion in minionCards"
                :key="minion.id"
                class="rounded-[24px] border-2 border-zinc-900 bg-[#fffaf2] p-4 shadow-[3px_3px_0_0_rgba(0,0,0,1)]"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">{{ minion.badge }}</p>
                    <h3 class="mt-1 text-lg font-bold text-zinc-900">{{ minion.label }}</h3>
                  </div>
                  <span
                    class="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.16em]"
                    :class="minionStatusClass(minion.status)"
                  >
                    {{ minion.status }}
                  </span>
                </div>
                <p class="mt-3 text-sm font-bold text-zinc-700">{{ minion.note }}</p>
                <p class="mt-2 text-sm leading-6 text-zinc-600 whitespace-pre-wrap">{{ minion.detail }}</p>
                <div class="mt-3 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.16em] text-zinc-400">
                  <span>{{ minion.sessionKey || 'main deck' }}</span>
                  <span>{{ timeAgo(minion.lastSeen) }}</span>
                </div>
              </div>

              <div
                v-if="!minionCards.length"
                class="rounded-[24px] border-2 border-dashed border-zinc-300 bg-[#fffdf8] px-5 py-12 text-center text-sm text-zinc-500"
              >
                No minion telemetry yet. Once OpenClaw emits `agent` events, the deckhands will appear here.
              </div>
            </div>
          </div>

          <div class="sketch-card bg-white p-5 sm:p-6">
            <div class="flex items-center justify-between gap-3 border-b border-zinc-200 pb-4">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">Boss Reply</p>
                <h2 class="text-2xl font-bold text-zinc-900">Quick Summary</h2>
              </div>
              <button class="sketch-button px-4 py-2 text-sm" :disabled="status !== 'connected'" @click="loadHistory">
                Refresh
              </button>
            </div>
            <div class="mt-4 rounded-[24px] border border-zinc-200 bg-[#fffaf3] p-4 text-sm leading-7 text-zinc-700 whitespace-pre-wrap">
              {{ latestAssistantMessage || 'The latest boss answer will appear here for quick scanning.' }}
            </div>
          </div>
        </article>

        <article class="space-y-6">
          <div class="sketch-card bg-white p-5 sm:p-6">
            <div class="flex items-center justify-between gap-3 border-b border-zinc-200 pb-4">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">Field Presence</p>
                <h2 class="text-2xl font-bold text-zinc-900">Connected Instances</h2>
              </div>
              <button class="sketch-button px-4 py-2 text-sm" :disabled="status !== 'connected'" @click="loadPresence">
                Refresh
              </button>
            </div>

            <div class="mt-4 space-y-3">
              <div
                v-for="(entry, index) in presenceEntries"
                :key="presenceKey(entry, index)"
                class="rounded-[22px] border border-zinc-200 bg-zinc-50 p-4"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-sm font-bold text-zinc-900">{{ presenceLabel(entry) }}</p>
                    <p class="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
                      {{ presenceMode(entry) }}
                    </p>
                  </div>
                  <span class="rounded-full border border-zinc-300 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                    {{ presenceRoles(entry) }}
                  </span>
                </div>
                <p class="mt-3 text-sm leading-6 text-zinc-600">
                  {{ presenceSummary(entry) }}
                </p>
              </div>

              <div
                v-if="!presenceEntries.length"
                class="rounded-[22px] border-2 border-dashed border-zinc-300 bg-[#fffdf8] px-5 py-10 text-center text-sm text-zinc-500"
              >
                No presence entries reported yet.
              </div>
            </div>
          </div>

          <div class="sketch-card bg-white p-5 sm:p-6">
            <div class="flex items-center justify-between gap-3 border-b border-zinc-200 pb-4">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">Node Deck</p>
                <h2 class="text-2xl font-bold text-zinc-900">Connected Nodes</h2>
              </div>
              <button class="sketch-button px-4 py-2 text-sm" :disabled="status !== 'connected'" @click="loadNodes">
                Refresh
              </button>
            </div>

            <div class="mt-4 space-y-3">
              <div
                v-for="(node, index) in nodes"
                :key="nodeKey(node, index)"
                class="rounded-[22px] border border-zinc-200 bg-[#fffaf3] p-4"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-sm font-bold text-zinc-900">{{ nodeLabel(node) }}</p>
                    <p class="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
                      {{ nodePlatform(node) }}
                    </p>
                  </div>
                  <span
                    class="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]"
                    :class="nodeConnected(node) ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-200 text-zinc-500'"
                  >
                    {{ nodeConnected(node) ? 'connected' : 'offline' }}
                  </span>
                </div>
                <p class="mt-3 text-sm leading-6 text-zinc-600">{{ nodeSummary(node) }}</p>
              </div>

              <div
                v-if="!nodes.length"
                class="rounded-[22px] border-2 border-dashed border-zinc-300 bg-[#fffdf8] px-5 py-10 text-center text-sm text-zinc-500"
              >
                No node inventory yet.
              </div>
            </div>
          </div>

          <div class="sketch-card bg-white p-5 sm:p-6">
            <div class="border-b border-zinc-200 pb-4">
              <p class="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">Signal Log</p>
              <h2 class="text-2xl font-bold text-zinc-900">Event Feed</h2>
            </div>
            <div class="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-1">
              <div
                v-for="entry in eventLog"
                :key="entry.id"
                class="rounded-[20px] border border-zinc-200 bg-zinc-50 p-3"
              >
                <div class="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                  <span>{{ entry.event }}</span>
                  <span>{{ formatTime(entry.ts) }}</span>
                </div>
                <p class="mt-2 text-sm leading-6 text-zinc-700">{{ entry.summary }}</p>
              </div>
              <div
                v-if="!eventLog.length"
                class="rounded-[22px] border-2 border-dashed border-zinc-300 bg-[#fffdf8] px-5 py-10 text-center text-sm text-zinc-500"
              >
                Event frames will show up here after the workshop is connected.
              </div>
            </div>
          </div>
        </article>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useOpenClawGateway } from '~/composables/useOpenClawGateway'

definePageMeta({ layout: 'default' })

const {
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
  connect,
  disconnect,
  loadHistory,
  loadPresence,
  loadNodes,
  refreshDeck,
  sendMessage,
  abortActiveRun
} = useOpenClawGateway()

const roleLabelMap: Record<string, string> = {
  user: 'Captain',
  assistant: 'Boss Lobster',
  system: 'Workshop'
}

const statusLabel = computed(() => {
  if (status.value === 'connected') return 'Connected'
  if (status.value === 'connecting') return 'Connecting'
  return 'Disconnected'
})

const statusPillClass = computed(() => {
  if (status.value === 'connected') return 'border-emerald-300 bg-emerald-50 text-emerald-700'
  if (status.value === 'connecting') return 'border-amber-300 bg-amber-50 text-amber-700'
  return 'border-zinc-300 bg-zinc-100 text-zinc-500'
})

const connectedNodeCount = computed(() =>
  nodes.value.filter(node => Boolean((node as Record<string, unknown>).connected)).length
)

const formatTime = (timestamp: number) =>
  new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(timestamp)

const timeAgo = (timestamp: number) => {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000))
  if (seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  return `${hours}h ago`
}

const minionStatusClass = (statusValue: string) => {
  if (statusValue === 'working') return 'bg-sky-100 text-sky-700'
  if (statusValue === 'done') return 'bg-emerald-100 text-emerald-700'
  if (statusValue === 'error') return 'bg-red-100 text-red-700'
  return 'bg-zinc-200 text-zinc-500'
}

const presenceKey = (entry: Record<string, unknown>, index: number) =>
  String(entry.instanceId || entry.host || entry.ip || index)

const presenceLabel = (entry: Record<string, unknown>) =>
  String(entry.host || entry.instanceId || entry.ip || 'Unknown instance')

const presenceMode = (entry: Record<string, unknown>) =>
  String(entry.mode || entry.platform || 'workshop')

const presenceRoles = (entry: Record<string, unknown>) => {
  const roles = Array.isArray(entry.roles) ? entry.roles.filter(role => typeof role === 'string') : []
  return roles.length ? roles.join(', ') : 'no role'
}

const presenceSummary = (entry: Record<string, unknown>) => {
  const parts = [
    entry.text,
    entry.reason,
    entry.modelIdentifier,
    typeof entry.lastInputSeconds === 'number' ? `last input ${entry.lastInputSeconds}s ago` : ''
  ].filter(part => typeof part === 'string' || typeof part === 'number')
  return parts.length ? parts.join(' · ') : 'No extra presence metadata.'
}

const nodeKey = (node: Record<string, unknown>, index: number) =>
  String(node.nodeId || node.displayName || index)

const nodeLabel = (node: Record<string, unknown>) =>
  String(node.displayName || node.nodeId || 'Unknown node')

const nodePlatform = (node: Record<string, unknown>) =>
  String(node.platform || node.deviceFamily || 'unknown platform')

const nodeConnected = (node: Record<string, unknown>) => Boolean(node.connected)

const nodeSummary = (node: Record<string, unknown>) => {
  const caps = Array.isArray(node.caps) ? node.caps.length : 0
  const commands = Array.isArray(node.commands) ? node.commands.length : 0
  const parts = [
    typeof node.remoteIp === 'string' ? node.remoteIp : '',
    typeof node.version === 'string' ? `v${node.version}` : '',
    caps ? `${caps} caps` : '',
    commands ? `${commands} commands` : ''
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : 'No node metadata yet.'
}
</script>
