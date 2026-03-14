<template>
  <div class="min-h-screen bg-[#fff9f1] px-4 py-6 font-hand sm:px-6 lg:px-8 lg:py-8">
    <div class="mx-auto max-w-[1480px] space-y-6">
      <section>
        <article class="sketch-card relative overflow-hidden bg-[#fff7eb] p-6 sm:p-8">
          <div class="pointer-events-none absolute inset-y-0 right-0 w-56 bg-[radial-gradient(circle_at_center,_rgba(253,230,138,0.36),_transparent_72%)]"></div>
          <div class="pointer-events-none absolute -left-10 top-8 h-28 w-28 rotate-12 rounded-[42%_58%_63%_37%/43%_44%_56%_57%] border-2 border-zinc-900/70 bg-[#ffd7a0] opacity-50"></div>
          <div class="relative space-y-6">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">OpenClaw Crew Desk</p>
                <h1 class="mt-3 text-4xl font-bold leading-tight text-zinc-900 sm:text-5xl">Lobster Workshop</h1>
                <p class="mt-4 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
                  One boss lobster takes orders. Helper lobsters wake up only when you delegate work.
                </p>
              </div>

              <div class="flex flex-wrap items-center gap-3">
                <span
                  class="inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-bold"
                  :class="statusPillClass"
                >
                  <span class="h-2.5 w-2.5 rounded-full bg-current"></span>
                  {{ statusLabel }}
                </span>
                <button class="sketch-button px-4 py-2 text-sm" @click="showSettingsModal = true">
                  Workshop Settings
                </button>
              </div>
            </div>

            <div class="grid gap-5 xl:grid-cols-[minmax(0,1.28fr)_340px] xl:items-start">
              <div class="rounded-[30px] border-2 border-zinc-900 bg-white/88 p-5 shadow-[6px_6px_0_0_rgba(0,0,0,1)] sm:p-6">
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p class="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">Office Stage</p>
                    <h2 class="mt-2 text-3xl font-bold text-zinc-900">Main Lobster On Duty</h2>
                    <p class="mt-3 max-w-2xl text-sm leading-7 text-zinc-600">{{ bossStatusNote }}</p>
                  </div>

                  <div class="flex flex-wrap gap-3">
                    <button
                      class="sketch-button px-5 py-3 !bg-zinc-900 !text-white"
                      :disabled="status === 'connecting'"
                      @click="connect"
                    >
                      {{ connectButtonLabel }}
                    </button>
                    <button
                      v-if="status === 'connected'"
                      class="sketch-button px-5 py-3 border-red-200 text-red-600"
                      @click="disconnect"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>

                <div class="mt-5 overflow-hidden rounded-[28px] border-2 border-zinc-900 bg-[#fffdf7] shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
                  <div class="relative aspect-[16/10] min-h-[300px] sm:min-h-[380px]">
                    <img
                      src="/tools/lobster-workshop/office-stage.webp"
                      alt="Pixel office background"
                      class="h-full w-full object-cover [image-rendering:pixelated]"
                    />
                    <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#fff7eb]/35 via-transparent to-white/10"></div>

                    <div class="absolute left-[44%] top-[56%] w-[32%] min-w-[140px] max-w-[240px] -translate-x-1/2 -translate-y-1/2">
                      <img
                        src="/tools/lobster-workshop/lobster-boss.svg"
                        alt="Boss lobster"
                        class="w-full drop-shadow-[0_8px_0_rgba(34,34,34,0.2)] [image-rendering:pixelated]"
                      />
                    </div>

                    <div
                      v-for="(worker, index) in stageWorkers"
                      :key="worker.id"
                      class="absolute flex flex-col items-center gap-2"
                      :style="stageWorkerStyle(index)"
                    >
                      <div class="rounded-full border-2 border-zinc-900 bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-700 shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                        {{ worker.title }}
                      </div>
                      <img
                        :src="lobsterAssetForVariant(worker.variant)"
                        :alt="`${worker.title} lobster`"
                        class="w-16 sm:w-20 drop-shadow-[0_6px_0_rgba(34,34,34,0.18)] [image-rendering:pixelated]"
                      />
                    </div>
                  </div>
                </div>

                <div class="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
                  <div class="rounded-[24px] border-2 border-zinc-900 bg-[#fff9ef] p-4 shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
                    <p class="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Latest Boss Note</p>
                    <p class="mt-3 text-sm leading-7 text-zinc-700">{{ bossReplyDigest }}</p>
                  </div>

                  <div class="rounded-[24px] border border-zinc-200 bg-white p-4">
                    <p class="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Crew Setup</p>
                    <p class="mt-3 text-sm leading-7 text-zinc-700">{{ helperRosterSummary }}</p>
                  </div>

                  <div
                    v-if="lastError"
                    class="rounded-[20px] border-2 border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 lg:col-span-2"
                  >
                    {{ lastError }}
                  </div>
                </div>
              </div>

              <div>
                <div class="rounded-[30px] border-2 border-zinc-900 bg-[#fffdf8] p-5 shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
                  <div class="flex items-start justify-between gap-3 border-b border-zinc-200 pb-4">
                    <div>
                      <p class="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">Crew Floor</p>
                      <h2 class="text-2xl font-bold text-zinc-900">Active Helpers</h2>
                    </div>
                    <span class="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
                      {{ stageWorkers.length }} visible
                    </span>
                  </div>

                  <div class="mt-4 space-y-3">
                    <div
                      v-for="worker in stageWorkers"
                      :key="worker.id"
                      class="flex items-center gap-3 rounded-[22px] border-2 border-zinc-900 bg-white p-3 shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                    >
                      <div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] border border-zinc-200 bg-[#fff6e8]">
                        <img
                          :src="lobsterAssetForVariant(worker.variant)"
                          :alt="`${worker.title} helper lobster`"
                          class="h-14 w-14 [image-rendering:pixelated]"
                        />
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center justify-between gap-3">
                          <p class="text-sm font-bold text-zinc-900">{{ worker.title }}</p>
                          <span class="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                            {{ worker.subtitle }}
                          </span>
                        </div>
                        <p class="mt-2 text-sm leading-6 text-zinc-600">{{ worker.note }}</p>
                      </div>
                    </div>
                  </div>

                  <div
                    v-if="!stageWorkers.length"
                    class="mt-4 rounded-[22px] border-2 border-dashed border-zinc-300 bg-white px-5 py-10 text-center text-sm text-zinc-500"
                  >
                    Turn on helper lobsters and pick a worker to stage the crew.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section class="grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
        <article class="sketch-card flex min-h-[760px] flex-col bg-white p-5 sm:p-6">
          <div class="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 pb-4">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">Boss Channel</p>
              <h2 class="text-2xl font-bold text-zinc-900">Chat With Boss Lobster</h2>
            </div>
            <button
              class="sketch-button px-4 py-2 text-sm border-red-200 text-red-600"
              :disabled="!activeRunId"
              @click="abortActiveRun"
            >
              Stop Run
            </button>
          </div>

          <div class="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
            <div
              v-for="message in messages"
              :key="message.id"
              :class="[
                'max-w-[94%] rounded-[28px] border-2 px-4 py-3 shadow-[4px_4px_0_0_rgba(0,0,0,1)]',
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
              class="max-w-[94%] rounded-[28px] border-2 border-sky-600 bg-sky-50 px-4 py-3 text-zinc-900 shadow-[4px_4px_0_0_rgba(14,165,233,0.18)]"
            >
              <div class="mb-2 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-sky-700">
                <span>Boss Lobster</span>
                <span>Streaming</span>
              </div>
              <p class="text-[15px] leading-7 whitespace-pre-wrap">{{ streamingText }}</p>
            </div>

            <div
              v-if="!messages.length && !streamingText"
              class="flex min-h-[260px] items-center justify-center rounded-[28px] border-2 border-dashed border-zinc-300 bg-[#fffdf8] px-6 text-center text-zinc-500"
            >
              Connect the workshop, then send the first order to Boss Lobster.
            </div>
          </div>

          <div class="mt-5 space-y-4 border-t border-zinc-200 pt-4">
            <div class="rounded-[24px] border border-zinc-200 bg-[#fffaf3] p-4">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <label class="inline-flex items-center gap-3 text-sm font-bold text-zinc-900">
                  <input v-model="launchSubagents" type="checkbox" class="h-4 w-4 accent-zinc-900" />
                  Launch helper lobsters
                </label>
                <p class="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  {{ launchSubagents ? `${selectedWorkers.length} helpers armed` : 'Boss only' }}
                </p>
              </div>

              <div class="mt-4 grid gap-3 sm:grid-cols-3">
                <button
                  v-for="worker in workerOptions"
                  :key="worker.id"
                  type="button"
                  class="rounded-[22px] border-2 p-4 text-left transition-all"
                  :class="workerChipClass(worker.id)"
                  @click="toggleWorker(worker.id)"
                >
                  <div class="flex items-center gap-3">
                    <div class="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[16px] border-2 border-zinc-900 bg-white shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                      <img
                        :src="lobsterAssetForVariant(worker.variant)"
                        :alt="`${worker.label} helper lobster`"
                        class="h-14 w-14 [image-rendering:pixelated]"
                      />
                    </div>
                    <div class="min-w-0">
                      <p class="text-sm font-bold">{{ worker.label }}</p>
                      <p class="mt-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500">{{ worker.short }}</p>
                    </div>
                  </div>
                  <p class="mt-3 text-xs leading-5 text-zinc-600">{{ worker.helper }}</p>
                </button>
              </div>
            </div>

            <textarea
              v-model="draft"
              rows="5"
              class="w-full resize-none rounded-[24px] border-2 border-zinc-900 bg-[#fffdf8] px-4 py-4 text-base outline-none"
              placeholder="Ask Boss Lobster to investigate, plan, implement, or delegate work to the helper crew..."
              @keydown.enter.exact.prevent="handleSendOrder"
            ></textarea>

            <div class="flex flex-wrap items-center justify-between gap-3">
              <p class="max-w-2xl text-sm text-zinc-500">
                Press <span class="font-bold text-zinc-800">Enter</span> to send. Use <span class="font-bold text-zinc-800">Shift + Enter</span> for a new line.
              </p>
              <button
                class="sketch-button px-6 py-3 !bg-zinc-900 !text-white"
                :disabled="!canSendOrder"
                @click="handleSendOrder"
              >
                {{ sending ? 'Dispatching...' : 'Send Order' }}
              </button>
            </div>
          </div>
        </article>

        <aside class="space-y-6">
          <article class="sketch-card bg-white p-5 sm:p-6">
            <div class="flex items-start justify-between gap-3 border-b border-zinc-200 pb-4">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">Crew Floor</p>
                <h2 class="text-2xl font-bold text-zinc-900">Helper Jobs</h2>
              </div>
              <button class="sketch-button px-4 py-2 text-sm" :disabled="status !== 'connected'" @click="refreshDeck">
                Sync
              </button>
            </div>

            <div class="mt-4 space-y-4">
              <div
                v-for="card in crewCards"
                :key="card.id"
                class="rounded-[26px] border-2 border-zinc-900 bg-[#fffaf2] p-4 shadow-[3px_3px_0_0_rgba(0,0,0,1)]"
              >
                <div class="flex gap-4">
                  <div class="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[22px] border-2 border-zinc-900 bg-white shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                    <img
                      :src="lobsterAssetForVariant(card.variant)"
                      :alt="`${card.title} helper lobster`"
                      class="h-20 w-20 [image-rendering:pixelated]"
                    />
                  </div>

                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 class="text-lg font-bold text-zinc-900">{{ card.title }}</h3>
                        <p class="mt-1 text-xs uppercase tracking-[0.16em] text-zinc-500">{{ card.taskLine }}</p>
                      </div>
                      <span
                        class="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]"
                        :class="crewStatusClass(card.status)"
                      >
                        {{ card.status }}
                      </span>
                    </div>

                    <p class="mt-3 text-sm font-bold text-zinc-700">{{ card.note }}</p>
                    <p class="mt-2 text-sm leading-6 text-zinc-600 whitespace-pre-wrap">{{ card.detail }}</p>

                    <div class="mt-4 h-2 overflow-hidden rounded-full bg-zinc-200">
                      <div
                        class="h-full rounded-full transition-all duration-300"
                        :class="progressBarClass(card.status)"
                        :style="{ width: `${card.progress}%` }"
                      ></div>
                    </div>

                    <div class="mt-3 flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-[0.16em] text-zinc-400">
                      <span>{{ card.progress }}% progress</span>
                      <span>{{ timeAgo(card.lastSeen) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div
                v-if="!crewCards.length"
                class="rounded-[22px] border-2 border-dashed border-zinc-300 bg-[#fffdf8] px-5 py-12 text-center text-sm text-zinc-500"
              >
                No helper telemetry yet. Turn on helper lobsters, choose a worker, and send an order.
              </div>
            </div>
          </article>

          <article class="sketch-card bg-white p-5 sm:p-6">
            <div class="flex items-start justify-between gap-3 border-b border-zinc-200 pb-4">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">Task Board</p>
                <h2 class="text-2xl font-bold text-zinc-900">Todo Checklist</h2>
              </div>
              <span class="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
                {{ todoItems.length || 0 }} items
              </span>
            </div>

            <div class="mt-4 space-y-3">
              <div
                v-for="item in todoItems"
                :key="item.id"
                class="rounded-[22px] border-2 border-zinc-900 bg-[#fffaf2] p-4 shadow-[3px_3px_0_0_rgba(0,0,0,1)]"
              >
                <div class="flex items-start gap-3">
                  <span
                    class="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold"
                    :class="todoBadgeClass(item.status)"
                  >
                    {{ todoBadgeText(item.status) }}
                  </span>
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p class="text-sm font-bold text-zinc-900">{{ item.label }}</p>
                        <p class="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">{{ item.workerLabel }}</p>
                      </div>
                      <span
                        class="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]"
                        :class="crewStatusClass(item.status)"
                      >
                        {{ item.status }}
                      </span>
                    </div>
                    <div class="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200">
                      <div
                        class="h-full rounded-full transition-all duration-300"
                        :class="progressBarClass(item.status)"
                        :style="{ width: `${item.progress}%` }"
                      ></div>
                    </div>
                    <p class="mt-3 text-sm leading-6 text-zinc-600">{{ item.detail }}</p>
                  </div>
                </div>
              </div>

              <div
                v-if="!todoItems.length"
                class="rounded-[22px] border-2 border-dashed border-zinc-300 bg-[#fffdf8] px-5 py-10 text-center text-sm text-zinc-500"
              >
                Send an order and the workshop will turn it into a live checklist.
              </div>
            </div>
          </article>
        </aside>
      </section>
    </div>

    <Teleport to="body">
      <div
        v-if="showSettingsModal"
        class="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
        @click.self="showSettingsModal = false"
      >
        <div class="sketch-card w-full max-w-2xl bg-white p-5 sm:p-6">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">Connection Setup</p>
              <h2 class="text-3xl font-bold text-zinc-900">Workshop Settings</h2>
            </div>
            <button class="text-3xl leading-none text-zinc-500 hover:text-zinc-900" @click="showSettingsModal = false">
              ×
            </button>
          </div>

          <div class="mt-5 grid gap-4 sm:grid-cols-2">
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

          <div class="mt-5 flex flex-wrap items-start justify-between gap-3">
            <p class="max-w-xl text-sm text-zinc-500">
              These settings stay in your browser. Close this panel, then reconnect the workshop.
            </p>
            <button class="sketch-button px-5 py-3 !bg-zinc-900 !text-white" @click="showSettingsModal = false">
              Done
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useOpenClawGateway, type LobsterMinionCard } from '~/composables/useOpenClawGateway'

definePageMeta({ layout: 'default' })

type WorkerId = 'codex' | 'claude-code' | 'gemini-cli'
type CrewStatus = 'queued' | 'idle' | 'working' | 'done' | 'error'

type WorkerOption = {
  id: WorkerId
  label: string
  short: string
  helper: string
  variant: 'codex' | 'claude' | 'gemini'
}

type DispatchPlan = {
  id: string
  task: string
  createdAt: number
  workers: WorkerId[]
}

type CrewCardView = {
  id: string
  title: string
  shortLabel: string
  taskLine: string
  note: string
  detail: string
  status: CrewStatus
  progress: number
  lastSeen: number
  variant: 'worker' | 'codex' | 'claude' | 'gemini'
}

type StageWorkerView = {
  id: string
  title: string
  subtitle: string
  note: string
  variant: 'worker' | 'codex' | 'claude' | 'gemini'
}

type TodoItem = {
  id: string
  label: string
  workerLabel: string
  detail: string
  status: CrewStatus
  progress: number
}

type LobsterVariant = 'boss' | 'worker' | 'codex' | 'claude' | 'gemini'
type StageSlot = {
  left: string
  top: string
}

const DISPATCH_PREFS_STORAGE_KEY = 'lobster_workshop_dispatch_prefs_v1'

const lobsterAssetMap: Record<LobsterVariant, string> = {
  boss: '/tools/lobster-workshop/lobster-boss.svg',
  worker: '/tools/lobster-workshop/lobster-worker-neutral.svg',
  codex: '/tools/lobster-workshop/lobster-worker-codex.svg',
  claude: '/tools/lobster-workshop/lobster-worker-claude.svg',
  gemini: '/tools/lobster-workshop/lobster-worker-gemini.svg'
}

const stageSlots: StageSlot[] = [
  { left: '12%', top: '60%' },
  { left: '43%', top: '18%' },
  { left: '77%', top: '18%' },
  { left: '80%', top: '68%' }
]

const workerOptions: WorkerOption[] = [
  {
    id: 'codex',
    label: 'Codex',
    short: 'Fast Fixes',
    helper: 'Best for implementation-heavy tasks, code edits, and quick iteration.',
    variant: 'codex'
  },
  {
    id: 'claude-code',
    label: 'Claude Code',
    short: 'Deep Review',
    helper: 'Good for careful reasoning, larger refactors, and longer written updates.',
    variant: 'claude'
  },
  {
    id: 'gemini-cli',
    label: 'Gemini CLI',
    short: 'Wide Scan',
    helper: 'Useful for broad searching, repo scanning, and extra comparison passes.',
    variant: 'gemini'
  }
]

const workerAliasMap: Record<WorkerId, string[]> = {
  codex: ['codex', 'codex-lobster'],
  'claude-code': ['claude', 'claude code', 'claude-code', 'claude_code', 'claude-lobster'],
  'gemini-cli': ['gemini', 'gemini cli', 'gemini-cli', 'gemini_cli', 'gemini-lobster']
}

const workerOptionMap = workerOptions.reduce<Record<WorkerId, WorkerOption>>((acc, worker) => {
  acc[worker.id] = worker
  return acc
}, {} as Record<WorkerId, WorkerOption>)

const {
  gatewayUrl,
  sessionKey,
  token,
  password,
  status,
  lastError,
  draft,
  messages,
  streamingText,
  activeRunId,
  sending,
  minionCards,
  latestAssistantMessage,
  connect,
  disconnect,
  refreshDeck,
  sendMessage,
  abortActiveRun
} = useOpenClawGateway()

const showSettingsModal = ref(false)
const launchSubagents = ref(true)
const selectedWorkers = ref<WorkerId[]>(['codex'])
const recentDispatches = ref<DispatchPlan[]>([])

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

const connectButtonLabel = computed(() => {
  if (status.value === 'connected') return 'Reconnect Workshop'
  if (status.value === 'connecting') return 'Connecting...'
  return 'Connect Workshop'
})

const bossStatusNote = computed(() => {
  if (status.value === 'connecting') return 'Boss Lobster is waking the gateway and checking the dock lines.'
  if (status.value === 'connected' && streamingText.value) return 'Boss Lobster is steering the run and waiting for helper reports.'
  if (status.value === 'connected') return 'The workshop is online. Send a task and the crew will start moving.'
  return 'The workshop is docked. Open settings if needed, then connect the gateway.'
})

const bossReplyDigest = computed(() =>
  streamingText.value || latestAssistantMessage.value || 'The next boss update will appear here once the workshop starts talking.'
)

const helperRosterSummary = computed(() => {
  if (!launchSubagents.value) {
    return 'Helpers are off. Boss Lobster will handle the next order alone.'
  }

  if (!selectedWorkers.value.length) {
    return 'No helper lobster is armed yet. Pick Codex, Claude Code, or Gemini CLI before you dispatch work.'
  }

  const labels = selectedWorkers.value.map(workerId => workerOptionMap[workerId].label).join(', ')
  return `${selectedWorkers.value.length} helper ${selectedWorkers.value.length > 1 ? 'lobsters are' : 'lobster is'} armed: ${labels}.`
})

const latestDispatch = computed(() => recentDispatches.value[0] || null)

const canSendOrder = computed(() =>
  status.value === 'connected' &&
  !sending.value &&
  draft.value.trim().length > 0 &&
  (!launchSubagents.value || selectedWorkers.value.length > 0)
)

const normalizeWorkerText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .trim()

const detectWorkerId = (...parts: string[]) => {
  const joined = normalizeWorkerText(parts.filter(Boolean).join(' '))
  return workerOptions.find(worker =>
    workerAliasMap[worker.id].some(alias => joined.includes(normalizeWorkerText(alias)))
  )?.id
}

const truncateTask = (value: string, limit = 76) =>
  value.length <= limit ? value : `${value.slice(0, limit - 1)}…`

const progressFromStatus = (statusValue: CrewStatus) => {
  if (statusValue === 'queued') return 18
  if (statusValue === 'idle') return 28
  if (statusValue === 'working') return 64
  return 100
}

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

const crewStatusClass = (statusValue: CrewStatus) => {
  if (statusValue === 'queued') return 'bg-zinc-200 text-zinc-600'
  if (statusValue === 'working') return 'bg-sky-100 text-sky-700'
  if (statusValue === 'done') return 'bg-emerald-100 text-emerald-700'
  if (statusValue === 'error') return 'bg-red-100 text-red-700'
  return 'bg-zinc-100 text-zinc-500'
}

const progressBarClass = (statusValue: CrewStatus) => {
  if (statusValue === 'queued') return 'bg-zinc-500'
  if (statusValue === 'working') return 'bg-sky-500'
  if (statusValue === 'done') return 'bg-emerald-500'
  if (statusValue === 'error') return 'bg-red-500'
  return 'bg-zinc-400'
}

const todoBadgeClass = (statusValue: CrewStatus) => {
  if (statusValue === 'done') return 'border-emerald-200 bg-emerald-100 text-emerald-700'
  if (statusValue === 'error') return 'border-red-200 bg-red-100 text-red-700'
  if (statusValue === 'working') return 'border-sky-200 bg-sky-100 text-sky-700'
  return 'border-zinc-200 bg-zinc-100 text-zinc-500'
}

const todoBadgeText = (statusValue: CrewStatus) => {
  if (statusValue === 'done') return 'OK'
  if (statusValue === 'error') return '!'
  if (statusValue === 'working') return '...'
  return '>'
}

const workerChipClass = (workerId: WorkerId) => {
  const active = selectedWorkers.value.includes(workerId)
  return [
    launchSubagents.value ? 'cursor-pointer' : 'cursor-not-allowed opacity-55',
    active
      ? 'border-zinc-900 bg-[#ffe9c6] shadow-[4px_4px_0_0_rgba(0,0,0,1)]'
      : 'border-zinc-200 bg-white hover:border-zinc-400'
  ]
}

const lobsterAssetForVariant = (variant: LobsterVariant) => lobsterAssetMap[variant] || lobsterAssetMap.worker

const stageWorkerStyle = (index: number) => {
  const slot = stageSlots[index] || stageSlots[stageSlots.length - 1]
  return {
    left: slot.left,
    top: slot.top,
    transform: 'translate(-50%, -50%)'
  }
}

const toggleWorker = (workerId: WorkerId) => {
  if (!launchSubagents.value) return

  if (selectedWorkers.value.includes(workerId)) {
    selectedWorkers.value = selectedWorkers.value.filter(id => id !== workerId)
  } else {
    selectedWorkers.value = [...selectedWorkers.value, workerId]
  }
}

const buildGatewayMessage = (taskText: string, workers: WorkerId[]) => {
  if (!workers.length) return taskText

  const dispatchLines = workers.map((workerId, index) => {
    const worker = workerOptionMap[workerId]
    return `${index + 1}. Launch one ACP helper session for ${worker.label}. Use the ACP runtime, delegate the task below, keep the helper focused on execution, and make it report progress back to the boss.`
  })

  return `${taskText}

[Workshop Dispatch]
You are Boss Lobster coordinating helper lobsters through OpenClaw.
Use ACP helper sessions for the selected workers below:
${dispatchLines.join('\n')}

Primary task:
${taskText}

After delegation, keep the boss reply concise and continue reporting helper progress.`
}

const saveDispatchPrefs = () => {
  if (!import.meta.client) return
  localStorage.setItem(DISPATCH_PREFS_STORAGE_KEY, JSON.stringify({
    launchSubagents: launchSubagents.value,
    selectedWorkers: selectedWorkers.value
  }))
}

const loadDispatchPrefs = () => {
  if (!import.meta.client) return
  try {
    const raw = localStorage.getItem(DISPATCH_PREFS_STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as { launchSubagents?: boolean; selectedWorkers?: WorkerId[] }
    if (typeof parsed.launchSubagents === 'boolean') {
      launchSubagents.value = parsed.launchSubagents
    }
    if (Array.isArray(parsed.selectedWorkers)) {
      const nextWorkers = parsed.selectedWorkers.filter((workerId): workerId is WorkerId =>
        workerOptions.some(worker => worker.id === workerId)
      )
      if (nextWorkers.length > 0) {
        selectedWorkers.value = nextWorkers
      }
    }
  } catch {
    // Ignore corrupted local preferences.
  }
}

const registerDispatch = (task: string, workers: WorkerId[]) => {
  recentDispatches.value = [
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      task,
      createdAt: Date.now(),
      workers
    },
    ...recentDispatches.value
  ].slice(0, 6)
}

const matchingActualCard = (dispatch: DispatchPlan, workerId: WorkerId) =>
  minionCards.value.find((card) => {
    const detectedWorker = detectWorkerId(card.label, card.badge, card.note, card.detail, card.sessionKey || '')
    return detectedWorker === workerId && card.lastSeen >= dispatch.createdAt - 5000
  })

const buildCrewCardFromMinion = (card: LobsterMinionCard): CrewCardView => {
  const detectedWorker = detectWorkerId(card.label, card.badge, card.note, card.detail, card.sessionKey || '')
  const option = detectedWorker ? workerOptionMap[detectedWorker] : null

  return {
    id: card.id,
    title: option?.label || card.label,
    shortLabel: option?.short || 'Crew Update',
    taskLine: truncateTask(card.note, 58),
    note: card.note,
    detail: card.detail,
    status: card.status,
    progress: progressFromStatus(card.status),
    lastSeen: card.lastSeen,
    variant: option?.variant || 'worker'
  }
}

const crewCards = computed<CrewCardView[]>(() => {
  const dispatch = latestDispatch.value
  if (!dispatch || dispatch.workers.length === 0) {
    return []
  }

  const actualCards = dispatch.workers
    .map((workerId) => matchingActualCard(dispatch, workerId))
    .filter((card): card is LobsterMinionCard => Boolean(card))
    .map(buildCrewCardFromMinion)

  const placeholders = dispatch.workers
    .filter(workerId => !matchingActualCard(dispatch, workerId))
    .map((workerId) => {
      const worker = workerOptionMap[workerId]
      return {
        id: `${dispatch.id}-${workerId}`,
        title: worker.label,
        shortLabel: worker.short,
        taskLine: truncateTask(dispatch.task, 58),
        note: 'Queued by Boss Lobster',
        detail: dispatch.task,
        status: 'queued' as const,
        progress: progressFromStatus('queued'),
        lastSeen: dispatch.createdAt,
        variant: worker.variant
      }
    })

  return [...actualCards, ...placeholders]
    .sort((left, right) => right.lastSeen - left.lastSeen)
    .slice(0, 8)
})

const stageWorkers = computed<StageWorkerView[]>(() => {
  if (crewCards.value.length > 0) {
    return crewCards.value.slice(0, 4).map((card) => ({
      id: card.id,
      title: card.title,
      subtitle: card.status,
      note: card.note || card.taskLine,
      variant: card.variant
    }))
  }

  if (latestDispatch.value && latestDispatch.value.workers.length === 0 && !launchSubagents.value) {
    return []
  }

  if (!launchSubagents.value) return []

  return selectedWorkers.value.slice(0, 4).map((workerId) => {
    const worker = workerOptionMap[workerId]
    return {
      id: `stage-${workerId}`,
      title: worker.label,
      subtitle: 'armed',
      note: worker.short,
      variant: worker.variant
    }
  })
})

const todoItems = computed<TodoItem[]>(() => {
  const items = recentDispatches.value.flatMap((dispatch) => {
    if (dispatch.workers.length === 0) {
      const statusValue: CrewStatus = streamingText.value ? 'working' : 'queued'
      return [{
        id: `${dispatch.id}-boss`,
        label: truncateTask(dispatch.task, 68),
        workerLabel: 'Boss Lobster',
        detail: 'Handled directly by the boss without helper lobsters.',
        status: statusValue,
        progress: progressFromStatus(statusValue)
      }]
    }

    return dispatch.workers.map((workerId) => {
      const worker = workerOptionMap[workerId]
      const actualCard = matchingActualCard(dispatch, workerId)
      const statusValue: CrewStatus = actualCard?.status || 'queued'
      return {
        id: `${dispatch.id}-${workerId}`,
        label: truncateTask(dispatch.task, 68),
        workerLabel: worker.label,
        detail: actualCard?.detail || 'Queued for helper dispatch. Waiting for telemetry from OpenClaw.',
        status: statusValue,
        progress: progressFromStatus(statusValue)
      }
    })
  })

  return items.slice(0, 10)
})

const handleSendOrder = async () => {
  const taskText = draft.value.trim()
  if (!taskText || !canSendOrder.value) return

  const workers = launchSubagents.value ? [...selectedWorkers.value] : []
  const success = await sendMessage({
    displayText: taskText,
    gatewayText: buildGatewayMessage(taskText, workers)
  })

  if (success) {
    registerDispatch(taskText, workers)
  }
}

watch([launchSubagents, selectedWorkers], saveDispatchPrefs, { deep: true })

onMounted(() => {
  loadDispatchPrefs()
})
</script>
