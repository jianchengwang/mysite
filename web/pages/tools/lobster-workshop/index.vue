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
                      class="sketch-button border-red-200 px-5 py-3 text-red-600"
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

                    <div class="absolute left-1/2 top-[58%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
                      <div class="mb-3 flex flex-wrap items-center justify-center gap-2">
                        <span class="rounded-full border-2 border-zinc-900 bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-700 shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                          Boss Lobster
                        </span>
                        <span
                          class="rounded-full border-2 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                          :class="stageStatusChipClass(bossStageState.status)"
                        >
                          {{ bossStageState.label }}
                        </span>
                      </div>
                      <WorkshopActorSprite variant="boss" :status="bossStageState.status" :scale="3" size="stage" />
                    </div>

                    <div
                      v-for="(worker, index) in stageWorkers"
                      :key="worker.id"
                      class="absolute"
                      :style="stageWorkerStyle(worker, index)"
                    >
                      <div class="relative h-[138px] w-[116px]">
                        <div class="absolute left-1/2 top-[2px] -translate-x-1/2">
                          <span
                            class="rounded-full border-2 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                            :class="stageStatusChipClass(worker.status)"
                          >
                            {{ worker.statusLabel }}
                          </span>
                        </div>
                        <div class="absolute left-1/2 top-[34px] -translate-x-1/2">
                          <WorkshopActorSprite :variant="worker.variant" :status="worker.status" :scale="worker.scale" size="stage" />
                        </div>
                        <p class="absolute left-1/2 top-[84px] max-w-[7rem] -translate-x-1/2 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-700 leading-tight">
                          {{ worker.title }}
                        </p>
                        <p class="absolute left-1/2 top-[102px] max-w-[7rem] -translate-x-1/2 text-center text-[10px] uppercase tracking-[0.12em] text-zinc-600 leading-tight">
                          {{ worker.note }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  v-if="lastError"
                  class="mt-5 rounded-[20px] border-2 border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {{ lastError }}
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
                        <WorkshopActorSprite :variant="worker.variant" :status="worker.status" :scale="1" size="chip" />
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center justify-between gap-3">
                          <p class="text-sm font-bold text-zinc-900">{{ worker.title }}</p>
                          <span
                            class="rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]"
                            :class="stageStatusChipClass(worker.status)"
                          >
                            {{ worker.statusLabel }}
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
            <div class="flex flex-wrap gap-3">
              <button
                class="sketch-button px-4 py-2 text-sm"
                :disabled="!canClearChat"
                @click="clearChatWindow"
              >
                Clear Chat
              </button>
              <button
                class="sketch-button border-red-200 px-4 py-2 text-sm text-red-600"
                :disabled="!activeRunId"
                @click="abortActiveRun"
              >
                Stop Run
              </button>
            </div>
          </div>

          <div class="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
            <div
              v-for="message in chatMessages"
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
              <div class="mb-3 flex flex-wrap items-start justify-between gap-3 text-xs uppercase tracking-[0.18em] text-zinc-500">
                <span>{{ roleLabelMap[message.role] }}</span>
                <div class="flex flex-wrap items-center gap-2">
                  <button
                    v-if="message.hasThoughts"
                    class="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700 transition-colors hover:bg-amber-100"
                    @click="toggleThoughts(message.id)"
                  >
                    {{ isThoughtsOpen(message.id) ? 'Hide Thoughts' : 'Thoughts' }}
                  </button>
                  <span>{{ formatTime(message.timestamp) }}</span>
                </div>
              </div>

              <div
                v-if="message.hasThoughts && isThoughtsOpen(message.id)"
                class="mb-3 rounded-[22px] border border-dashed border-amber-300 bg-amber-50/80 p-3"
              >
                <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">Thoughts</p>
                <div class="lobster-markdown mt-2 text-[14px] leading-7 text-zinc-700" v-html="message.thoughtsHtml"></div>
              </div>

              <div class="lobster-markdown text-[15px] leading-7" v-html="message.bodyHtml"></div>
            </div>

            <div
              v-if="streamingChatCard"
              class="max-w-[94%] rounded-[28px] border-2 border-sky-600 bg-sky-50 px-4 py-3 text-zinc-900 shadow-[4px_4px_0_0_rgba(14,165,233,0.18)]"
            >
              <div class="mb-3 flex flex-wrap items-start justify-between gap-3 text-xs uppercase tracking-[0.18em] text-sky-700">
                <span>Boss Lobster</span>
                <div class="flex flex-wrap items-center gap-2">
                  <button
                    v-if="streamingChatCard.hasThoughts"
                    class="rounded-full border border-sky-300 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-sky-700 transition-colors hover:bg-sky-100"
                    @click="toggleThoughts(streamingChatCard.id)"
                  >
                    {{ isThoughtsOpen(streamingChatCard.id) ? 'Hide Thoughts' : 'Thoughts' }}
                  </button>
                  <span>Streaming</span>
                </div>
              </div>

              <div
                v-if="streamingChatCard.hasThoughts && isThoughtsOpen(streamingChatCard.id)"
                class="mb-3 rounded-[22px] border border-sky-200 bg-white/80 p-3"
              >
                <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700">Thoughts</p>
                <div class="lobster-markdown mt-2 text-[14px] leading-7 text-zinc-700" v-html="streamingChatCard.thoughtsHtml"></div>
              </div>

              <div class="lobster-markdown text-[15px] leading-7" v-html="streamingChatCard.bodyHtml"></div>
            </div>

            <div
              v-if="!chatMessages.length && !streamingChatCard"
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
                      <WorkshopActorSprite
                        :variant="worker.variant"
                        :status="selectedWorkers.includes(worker.id) ? 'armed' : 'idle'"
                        :scale="1"
                        size="chip"
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

            <div class="rounded-[22px] border border-zinc-200 bg-[#fffaf3] p-4">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Gateway Trace</p>
                  <p class="mt-1 text-sm text-zinc-600">Recent OpenClaw events and errors from this browser session.</p>
                </div>
                <span class="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                  {{ gatewayTraceItems.length }} recent
                </span>
              </div>

              <div v-if="gatewayTraceItems.length" class="mt-4 space-y-2">
                <div
                  v-for="trace in gatewayTraceItems"
                  :key="trace.id"
                  class="rounded-[16px] border border-zinc-200 bg-white px-3 py-3"
                >
                  <div class="flex flex-wrap items-start justify-between gap-2">
                    <span class="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-600">
                      {{ trace.event }}
                    </span>
                    <span class="text-[11px] uppercase tracking-[0.16em] text-zinc-400">{{ formatTime(trace.timestamp) }}</span>
                  </div>
                  <p class="mt-2 text-sm leading-6 text-zinc-700 whitespace-pre-wrap">{{ trace.summary }}</p>
                </div>
              </div>

              <div
                v-else
                class="mt-4 rounded-[16px] border border-dashed border-zinc-300 bg-white px-4 py-4 text-sm text-zinc-500"
              >
                Gateway events will appear here after the workshop connects and starts sending chat or helper updates.
              </div>
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
                    <WorkshopActorSprite :variant="card.variant" :status="card.status" :scale="1.35" size="card" />
                  </div>

                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 class="text-lg font-bold text-zinc-900">{{ card.title }}</h3>
                        <div class="mt-1 flex flex-wrap gap-2">
                          <span class="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                            {{ card.shortLabel }}
                          </span>
                          <span class="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                            {{ card.taskLine }}
                          </span>
                        </div>
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
                <button type="button" class="flex w-full items-start gap-3 text-left" @click="toggleTodoItem(item.id)">
                  <span
                    class="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold"
                    :class="todoBadgeClass(item.status)"
                  >
                    {{ isTodoOpen(item.id) ? '−' : todoBadgeText(item.status) }}
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
                    <p class="mt-3 text-sm leading-6 text-zinc-600">{{ item.summary }}</p>
                  </div>
                </button>

                <div v-if="isTodoOpen(item.id)" class="mt-4 space-y-4 border-t border-zinc-200 pt-4">
                  <div class="rounded-[18px] border border-zinc-200 bg-white/90 p-3">
                    <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Crew Update</p>
                    <p class="mt-2 text-sm leading-6 text-zinc-700 whitespace-pre-wrap">{{ item.detail }}</p>
                  </div>

                  <div
                    v-if="item.response"
                    class="rounded-[18px] border-2 border-zinc-900 bg-[#fffdf8] p-4 shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                  >
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                        {{ item.response.isStreaming ? 'Live Boss Reply' : 'Boss Reply' }}
                      </p>
                      <button
                        v-if="item.response.hasThoughts"
                        class="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700 transition-colors hover:bg-amber-100"
                        @click.stop="toggleThoughts(item.response.id)"
                      >
                        {{ isThoughtsOpen(item.response.id) ? 'Hide Thoughts' : 'Thoughts' }}
                      </button>
                    </div>

                    <div
                      v-if="item.response.hasThoughts && isThoughtsOpen(item.response.id)"
                      class="mt-3 rounded-[16px] border border-dashed border-amber-300 bg-amber-50/80 p-3"
                    >
                      <div class="lobster-markdown text-[14px] leading-7 text-zinc-700" v-html="item.response.thoughtsHtml"></div>
                    </div>

                    <div class="lobster-markdown mt-3 text-sm leading-7 text-zinc-800" v-html="item.response.bodyHtml"></div>
                  </div>

                  <div
                    v-else
                    class="rounded-[18px] border border-dashed border-zinc-300 bg-white px-4 py-4 text-sm text-zinc-500"
                  >
                    <p>Boss reply will appear here when the run reports back.</p>
                    <div v-if="gatewayTraceItems.length" class="mt-3 rounded-[14px] border border-zinc-200 bg-[#fffaf3] px-3 py-3 text-zinc-700">
                      <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Latest Gateway Event</p>
                      <p class="mt-2 text-sm leading-6 whitespace-pre-wrap">{{ gatewayTraceItems[0]?.summary }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div
                v-if="!todoItems.length"
                class="rounded-[22px] border-2 border-dashed border-zinc-300 bg-[#fffdf8] px-5 py-10 text-center text-sm text-zinc-500"
              >
                Launch helper lobsters and send an order to turn the deck into a live checklist.
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
                placeholder="ws://127.0.0.1:18780"
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
import { createId, type LobsterChatMessage, type LobsterMinionCard, useOpenClawGateway } from '~/composables/useOpenClawGateway'
import { renderSafeMarkdown } from '~/utils/safeRichText'

definePageMeta({ layout: 'default' })

type WorkerId = 'codex' | 'claude-code' | 'gemini-cli'
type CrewStatus = 'queued' | 'idle' | 'working' | 'done' | 'error'
type StageStatus = CrewStatus | 'armed' | 'online'

type WorkerOption = {
  id: WorkerId
  label: string
  short: string
  helper: string
  variant: 'codex' | 'claude' | 'gemini'
}

type DispatchPlan = {
  id: string
  runId: string
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
  status: StageStatus
  statusLabel: string
  note: string
  variant: 'worker' | 'codex' | 'claude' | 'gemini'
  scale: number
}

type RenderedReplyView = {
  id: string
  bodyText: string
  bodyHtml: string
  thoughtsHtml: string
  hasThoughts: boolean
  isStreaming: boolean
  isPlaceholder: boolean
  isFailure: boolean
  isRunning: boolean
}

type ChatCardView = {
  id: string
  role: LobsterChatMessage['role']
  timestamp: number
  bodyHtml: string
  thoughtsHtml: string
  hasThoughts: boolean
}

type GatewayTraceView = {
  id: string
  event: string
  summary: string
  timestamp: number
}

type TodoItem = {
  id: string
  label: string
  workerLabel: string
  summary: string
  detail: string
  status: CrewStatus
  progress: number
  response: RenderedReplyView | null
}

type ActorVariant = 'boss' | 'worker' | 'codex' | 'claude' | 'gemini'
type StageSlot = {
  left: string
  top: string
  scale: number
}

const DISPATCH_PREFS_STORAGE_KEY = 'lobster_workshop_dispatch_prefs_v1'
const RECENT_DISPATCHES_STORAGE_KEY = 'lobster_workshop_recent_dispatches_v1'
const THINK_TAG_PATTERN = /<think>([\s\S]*?)<\/think>/gi
const FINAL_TAG_PATTERN = /<final>([\s\S]*?)<\/final>/gi
const OMITTED_MACHINE_REPLY_PATTERN = /^\[(?:Large machine response omitted|History skipped an oversized reply|Machine tool payload omitted)/i
const FAILURE_REPLY_PATTERN = /(^|\n)(error:|fatal:|exception:|\[Gateway error\]|.*Command exited with code\s+\d+)/i
const RUNNING_REPLY_PATTERN = /(command still running|use process\s*\([^)]*\)\s*for follow-up|session [a-z0-9-]+,\s*pid\s*\d+)/i
const DISPATCH_STALL_MS = 35_000
const DISPATCH_ISSUE_PATTERN = /(taking longer than expected|timed out|timeout|connection failed|gateway closed|could not reach|reported an error|run was aborted|asked to stop|disconnected)/i

const stageSlots: StageSlot[] = [
  { left: '17.6%', top: '73.6%', scale: 1.36 }, // Large left workstation, left slot
  { left: '25.8%', top: '73.6%', scale: 1.36 }, // Large left workstation, right slot
  { left: '83.6%', top: '88.6%', scale: 1.38 }, // Bottom-right workstation
  { left: '19.6%', top: '43.2%', scale: 1.18 }, // Back-left workstation
  { left: '82.8%', top: '21.8%', scale: 1.18 } // Narrow top-right perch
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
  codex: ['codex', 'codex-lobster', 'code-agent', 'code_agent', 'developer'],
  'claude-code': ['claude', 'claude code', 'claude-code', 'claude_code', 'claude-lobster', 'anthropic'],
  'gemini-cli': ['gemini', 'gemini cli', 'gemini-cli', 'gemini_cli', 'gemini-lobster', 'google']
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
  eventLog,
  resetChatWindow,
  connect: connectGateway,
  disconnect: disconnectGateway,
  refreshDeck,
  sendMessage,
  abortActiveRun
} = useOpenClawGateway()

const connect = async () => {
  clearChatWindow()
  await connectGateway()
}

const disconnect = () => {
  disconnectGateway()
}

const showSettingsModal = ref(false)
const launchSubagents = ref(true)
const selectedWorkers = ref<WorkerId[]>(['codex'])
const recentDispatches = ref<DispatchPlan[]>([])
const openThoughtIds = ref<string[]>([])
const openTodoIds = ref<string[]>([])

const roleLabelMap: Record<LobsterChatMessage['role'], string> = {
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

const latestDispatch = computed(() => recentDispatches.value[0] || null)

const dispatchMapByRunId = computed(() =>
  new Map(
    recentDispatches.value
      .filter(dispatch => dispatch.runId)
      .map(dispatch => [dispatch.runId, dispatch] as const)
  )
)

const activeDispatch = computed(() =>
  activeRunId.value ? dispatchMapByRunId.value.get(activeRunId.value) || null : null
)

const STALLED_ISSUE_PATTERN = /(stalled|taking longer than expected|timed out|timeout|not reported back yet)/i

const getBossStageStateForDispatch = (dispatch: DispatchPlan) => {
  const reply = getDispatchReply(dispatch)
  const resolvedStatus = getDispatchResolvedStatus(dispatch)
  const issue = getDispatchIssue(dispatch)

  if (resolvedStatus === 'error') {
    const stalled = !reply && STALLED_ISSUE_PATTERN.test(issue)
    return {
      status: 'error' as const,
      label: stalled ? 'Stalled' : 'Error'
    }
  }

  if (resolvedStatus === 'working') {
    if (reply?.isRunning) {
      return {
        status: 'working' as const,
        label: 'Running'
      }
    }

    return {
      status: 'working' as const,
      label: dispatch.workers.length ? 'Dispatching' : 'Thinking'
    }
  }

  if (resolvedStatus === 'done') {
    return {
      status: 'online' as const,
      label: 'Online'
    }
  }

  return null
}

const bossStageState = computed<{ status: StageStatus; label: string }>(() => {
  if (status.value === 'connecting') {
    return { status: 'working', label: 'Waking' }
  }

  if (latestDispatch.value) {
    const dispatchState = getBossStageStateForDispatch(latestDispatch.value)
    if (dispatchState) return dispatchState
  }

  if (status.value === 'connected' && streamingText.value && activeDispatch.value?.workers.length) {
    return { status: 'working', label: 'Dispatching' }
  }
  if (status.value === 'connected' && streamingText.value) {
    return { status: 'working', label: 'Thinking' }
  }
  if (status.value === 'connected') {
    return { status: 'online', label: 'Online' }
  }
  return { status: 'idle', label: 'Docked' }
})

const bossStatusNote = computed(() => {
  const latestIssue = latestDispatch.value ? getDispatchIssue(latestDispatch.value) : ''
  if (status.value === 'connecting') return 'Boss Lobster is waking the gateway and checking the dock lines.'
  if (latestIssue) return latestIssue
  if (status.value === 'connected' && streamingText.value && activeDispatch.value?.workers.length) {
    return 'Boss Lobster is dispatching helper work. Follow detailed progress from the checklist on the right.'
  }
  if (status.value === 'connected' && streamingText.value) {
    return 'Boss Lobster is steering the current task and sending a direct response.'
  }
  if (status.value === 'connected') return 'The workshop is online. Send a task and the crew will start moving.'
  return 'The workshop is docked. Open settings if needed, then connect the gateway.'
})

const canSendOrder = computed(() =>
  status.value === 'connected' &&
  !sending.value &&
  !activeRunId.value &&
  draft.value.trim().length > 0 &&
  (!launchSubagents.value || selectedWorkers.value.length > 0)
)

const canClearChat = computed(() =>
  !sending.value &&
  !activeRunId.value &&
  (
    messages.value.length > 0 ||
    streamingText.value.trim().length > 0 ||
    recentDispatches.value.length > 0 ||
    minionCards.value.length > 0
  )
)

const normalizeWorkerText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[_\s-]+/g, ' ')
    .trim()

const detectWorkerId = (...parts: string[]) => {
  const joined = normalizeWorkerText(parts.filter(Boolean).join(' '))
  return workerOptions.find(worker =>
    workerAliasMap[worker.id].some(alias => {
      const normalizedAlias = normalizeWorkerText(alias)
      return joined.includes(normalizedAlias)
    })
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

const stageStatusChipClass = (statusValue: StageStatus) => {
  if (statusValue === 'working') return 'work-chip border-sky-300 bg-sky-100 text-sky-700'
  if (statusValue === 'done' || statusValue === 'online') return 'border-emerald-300 bg-emerald-100 text-emerald-700'
  if (statusValue === 'error') return 'border-red-300 bg-red-100 text-red-700'
  if (statusValue === 'armed') return 'border-amber-300 bg-amber-100 text-amber-700'
  return 'border-zinc-300 bg-zinc-100 text-zinc-600'
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

const TRACE_NOISE_EVENTS = new Set(['tick', 'health'])
const RECENT_DISPATCH_DISPLAY_MS = 10 * 60 * 1000

const stageWorkerStyle = (worker: StageWorkerView, index: number) => {
  const slot = stageSlots[index] || stageSlots[stageSlots.length - 1]
  const anchorPercent = Math.min(64, Math.max(54, ((34 + (32 * worker.scale)) / 138) * 100))
  return {
    left: slot.left,
    top: slot.top,
    transform: `translate(-50%, -${anchorPercent}%)`
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

const toggleExpandedId = (target: typeof openThoughtIds | typeof openTodoIds, id: string) => {
  if (target.value.includes(id)) {
    target.value = target.value.filter(entry => entry !== id)
  } else {
    target.value = [...target.value, id]
  }
}

const toggleThoughts = (id: string) => toggleExpandedId(openThoughtIds, id)
const isThoughtsOpen = (id: string) => openThoughtIds.value.includes(id)
const toggleTodoItem = (id: string) => toggleExpandedId(openTodoIds, id)
const isTodoOpen = (id: string) => openTodoIds.value.includes(id)

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
  localStorage.setItem(RECENT_DISPATCHES_STORAGE_KEY, JSON.stringify(recentDispatches.value))
}

const loadDispatchPrefs = () => {
  if (!import.meta.client) return
  try {
    const raw = localStorage.getItem(DISPATCH_PREFS_STORAGE_KEY)
    if (raw) {
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
    }

    const rawDispatches = localStorage.getItem(RECENT_DISPATCHES_STORAGE_KEY)
    if (rawDispatches) {
      const parsed = JSON.parse(rawDispatches) as DispatchPlan[]
      if (Array.isArray(parsed)) {
        // Only keep dispatches from the last hour to avoid stale history.
        const limit = Date.now() - 1 * 60 * 60 * 1000
        recentDispatches.value = parsed.filter(d => d.createdAt > limit).slice(0, 10)
      }
    }
  } catch {
    // Ignore corrupted local preferences.
  }
}

const registerDispatch = (task: string, workers: WorkerId[], runId: string) => {
  const dispatch: DispatchPlan = {
    id: runId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    runId,
    task,
    createdAt: Date.now(),
    workers
  }

  recentDispatches.value = [dispatch, ...recentDispatches.value].slice(0, 6)
  openTodoIds.value = workers.map(workerId => `${dispatch.id}-${workerId}`)
}

const getDisplayWorkersForDispatch = (dispatch: DispatchPlan) => {
  const seen = new Set<WorkerId>()
  const orderedWorkers: WorkerId[] = []
  const addWorker = (workerId: WorkerId) => {
    if (seen.has(workerId)) return
    seen.add(workerId)
    orderedWorkers.push(workerId)
  }

  dispatch.workers.forEach(addWorker)

  const shouldIncludeArmedWorkers =
    latestDispatch.value?.id === dispatch.id &&
    launchSubagents.value &&
    Date.now() - dispatch.createdAt < RECENT_DISPATCH_DISPLAY_MS

  if (shouldIncludeArmedWorkers) {
    selectedWorkers.value.forEach(addWorker)
  }

  return orderedWorkers
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
  const displayWorkers = dispatch ? getDisplayWorkersForDispatch(dispatch) : []
  if (!dispatch || displayWorkers.length === 0) {
    return []
  }

  return displayWorkers
    .map((workerId) => {
      const issueNote = getDispatchIssue(dispatch)
      const actualCard = matchingActualCard(dispatch, workerId)
      if (actualCard) {
        const builtCard = buildCrewCardFromMinion(actualCard)
        const resolvedStatus = getDispatchResolvedStatus(dispatch)
        const resolvedDetail = getDispatchStatusDetail(dispatch, resolvedStatus)
        const resolvedNote = getDispatchStatusNote(dispatch, resolvedStatus)
        if (issueNote && builtCard.status !== 'done') {
          return {
            ...builtCard,
            note: resolvedNote,
            detail: resolvedDetail,
            status: 'error' as const,
            progress: progressFromStatus('error')
          }
        }
        if (resolvedStatus !== 'queued' && builtCard.status !== resolvedStatus) {
          return {
            ...builtCard,
            note: resolvedNote,
            detail: resolvedDetail,
            status: resolvedStatus,
            progress: progressFromStatus(resolvedStatus)
          }
        }
        return builtCard
      }

      const worker = workerOptionMap[workerId]
      const fallbackStatus = dispatchFallbackStatus(dispatch)
      return {
        id: `${dispatch.id}-${workerId}`,
        title: worker.label,
        shortLabel: worker.short,
        taskLine: truncateTask(dispatch.task, 58),
        note: dispatch.workers.includes(workerId)
          ? getDispatchStatusNote(dispatch, fallbackStatus)
          : 'Awaiting helper launch',
        detail: dispatch.workers.includes(workerId)
          ? getDispatchStatusDetail(dispatch, fallbackStatus)
          : 'This helper is armed in the workshop UI and waiting for OpenClaw telemetry.',
        status: dispatch.workers.includes(workerId) ? fallbackStatus : 'queued',
        progress: progressFromStatus(dispatch.workers.includes(workerId) ? fallbackStatus : 'queued'),
        lastSeen: dispatch.createdAt,
        variant: worker.variant
      }
    })
    .slice(0, 8)
})

const stageWorkers = computed<StageWorkerView[]>(() => {
  if (crewCards.value.length > 0) {
    return crewCards.value.slice(0, 5).map((card, index) => ({
      id: card.id,
      title: card.title,
      status: card.status,
      statusLabel: card.status,
      note: card.note || card.taskLine,
      variant: card.variant,
      scale: stageSlots[index]?.scale || 1.55
    }))
  }

  if (latestDispatch.value && latestDispatch.value.workers.length === 0 && !launchSubagents.value) {
    return []
  }

  if (!launchSubagents.value) return []

  return selectedWorkers.value.slice(0, 5).map((workerId, index) => {
    const worker = workerOptionMap[workerId]
    return {
      id: `stage-${workerId}`,
      title: worker.label,
      status: 'armed' as const,
      statusLabel: 'armed',
      note: worker.short,
      variant: worker.variant,
      scale: stageSlots[index]?.scale || 1.55
    }
  })
})

const flattenMessageText = (message: LobsterChatMessage) =>
  message.blocks
    .map(block => block.text.trim())
    .filter(Boolean)
    .join('\n\n')
    .trim()

const getDispatchSystemIssue = (dispatch: DispatchPlan) =>
  [...messages.value]
    .filter(message => message.role === 'system' && message.timestamp >= dispatch.createdAt - 1000)
    .map(flattenMessageText)
    .map(text => text.trim())
    .filter(Boolean)
    .reverse()
    .find(text => DISPATCH_ISSUE_PATTERN.test(text)) || ''

const extractPrimaryTaskFromDispatch = (raw: string) => {
  const trimmed = raw.trim()
  if (!trimmed.includes('[Workshop Dispatch]')) return trimmed

  const primaryTaskMatch = trimmed.match(/Primary task:\s*([\s\S]*?)\n\nAfter delegation/i)
  if (primaryTaskMatch?.[1]?.trim()) {
    return primaryTaskMatch[1].trim()
  }

  const beforeDispatch = trimmed
    .split('[Workshop Dispatch]')[0]
    ?.split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !/^System:/i.test(line) && !/^\[[A-Z][a-z]{2}\s/.test(line))

  return beforeDispatch?.at(-1) || trimmed
}

const extractTaggedContent = (raw: string) => {
  const thoughtChunks: string[] = []
  let working = raw || ''

  working = working.replace(THINK_TAG_PATTERN, (_, thought: string) => {
    const cleaned = String(thought || '').trim()
    if (cleaned) {
      thoughtChunks.push(cleaned)
    }
    return ''
  })

  const finalChunks: string[] = []
  working = working.replace(FINAL_TAG_PATTERN, (_, finalChunk: string) => {
    const cleaned = String(finalChunk || '').trim()
    if (cleaned) {
      finalChunks.push(cleaned)
      return cleaned
    }
    return ''
  })

  const cleanedWorking = working.replace(/<\/?(?:think|final)>/gi, '').trim()
  const body = (finalChunks.length ? finalChunks.join('\n\n') : cleanedWorking).trim() || cleanedWorking

  return {
    body,
    thoughts: thoughtChunks.join('\n\n').trim()
  }
}

const buildRenderedReply = (id: string, rawText: string, isStreaming = false): RenderedReplyView => {
  const tagged = extractTaggedContent(rawText)
  const bodyMarkdown = tagged.body || '_No reply yet._'
  const thoughtsMarkdown = tagged.thoughts
  const isPlaceholder = OMITTED_MACHINE_REPLY_PATTERN.test(bodyMarkdown.trim())
  const isFailure = FAILURE_REPLY_PATTERN.test(bodyMarkdown.trim())
  const isRunning = RUNNING_REPLY_PATTERN.test(bodyMarkdown.trim())

  return {
    id,
    bodyText: bodyMarkdown,
    bodyHtml: renderSafeMarkdown(bodyMarkdown),
    thoughtsHtml: thoughtsMarkdown ? renderSafeMarkdown(thoughtsMarkdown) : '',
    hasThoughts: Boolean(thoughtsMarkdown),
    isStreaming,
    isPlaceholder,
    isFailure,
    isRunning
  }
}

const inferredRunIdByMessageId = computed(() => {
  const nextMap = new Map<string, string>()
  const assignedAssistantIds = new Set<string>()
  const messagesByTime = [...messages.value].sort((left, right) => left.timestamp - right.timestamp)
  const userMessages = messagesByTime.filter(message => message.role === 'user')
  const assistantMessages = messagesByTime.filter(message => message.role === 'assistant')

  recentDispatches.value
    .slice()
    .sort((left, right) => left.createdAt - right.createdAt)
    .forEach((dispatch) => {
      if (!dispatch.runId) return
      if (assistantMessages.some(message => message.runId === dispatch.runId)) return

      const loweredTask = dispatch.task.toLowerCase()
      const userMatch = userMessages
        .filter((message) => {
          const text = flattenMessageText(message).toLowerCase()
          if (!text) return false
          if (!text.includes(loweredTask)) return false
          return Math.abs(message.timestamp - dispatch.createdAt) < 10 * 60 * 1000
        })
        .sort((left, right) =>
          Math.abs(left.timestamp - dispatch.createdAt) - Math.abs(right.timestamp - dispatch.createdAt)
        )[0]

      if (!userMatch) return

      const nextUserTimestamp = userMessages
        .filter(message => message.timestamp > userMatch.timestamp)
        .map(message => message.timestamp)
        .sort((left, right) => left - right)[0] || Number.POSITIVE_INFINITY

      const assistantMatch = assistantMessages.find((message) =>
        !assignedAssistantIds.has(message.id) &&
        !message.runId &&
        message.timestamp >= userMatch.timestamp - 1000 &&
        message.timestamp < nextUserTimestamp
      )

      if (!assistantMatch) return

      assignedAssistantIds.add(assistantMatch.id)
      nextMap.set(assistantMatch.id, dispatch.runId)
    })

  return nextMap
})

const resolvedRunIdForMessage = (message: LobsterChatMessage) =>
  message.runId || inferredRunIdByMessageId.value.get(message.id) || ''

const renderedRepliesByRunId = computed(() => {
  const nextMap = new Map<string, RenderedReplyView>()

  messages.value.forEach((message) => {
    const resolvedRunId = resolvedRunIdForMessage(message)
    if (message.role !== 'assistant' || !resolvedRunId) return
    const rendered = buildRenderedReply(message.id, flattenMessageText(message))
    if (rendered.isPlaceholder) return
    nextMap.set(resolvedRunId, rendered)
  })

  if (activeRunId.value && streamingText.value.trim()) {
    nextMap.set(activeRunId.value, buildRenderedReply(`stream-${activeRunId.value}`, streamingText.value, true))
  }

  return nextMap
})

const isHelperDispatchRun = (runId?: string) =>
  Boolean(runId && dispatchMapByRunId.value.get(runId)?.workers.length)

const chatMessages = computed<ChatCardView[]>(() =>
  [...messages.value]
    .sort((left, right) => left.timestamp - right.timestamp)
    .filter((message, index, allMessages) => {
      if (message.role !== 'user') return true
      const previous = allMessages[index - 1]
      if (!previous || previous.role !== 'user') return true
      const currentText = extractPrimaryTaskFromDispatch(flattenMessageText(message))
      const previousText = extractPrimaryTaskFromDispatch(flattenMessageText(previous))
      if (!currentText || currentText !== previousText) return true
      return Math.abs(message.timestamp - previous.timestamp) > 120_000
    })
    .map((message) => {
      const rawText = message.role === 'user'
        ? extractPrimaryTaskFromDispatch(flattenMessageText(message))
        : flattenMessageText(message)
      const rendered = buildRenderedReply(message.id, rawText)
      if (message.role === 'assistant' && rendered.isPlaceholder) {
        return null
      }
      return {
        id: message.id,
        role: message.role,
        timestamp: message.timestamp,
        bodyHtml: rendered.bodyHtml,
        thoughtsHtml: rendered.thoughtsHtml,
        hasThoughts: rendered.hasThoughts
      }
    })
    .filter((message): message is ChatCardView => Boolean(message))
)

const streamingChatCard = computed(() => {
  if (!streamingText.value.trim()) return null

  const rendered = buildRenderedReply(`stream-${activeRunId.value || 'boss'}`, streamingText.value, true)
  if (rendered.isPlaceholder) return null
  return {
    ...rendered,
    role: 'assistant' as const
  }
})

const gatewayTraceItems = computed<GatewayTraceView[]>(() =>
  (eventLog.value.filter((entry) => {
    const eventName = entry.event.toLowerCase()
    if (!TRACE_NOISE_EVENTS.has(eventName)) return true
    return /(error|chat|dispatch|helper|agent|session|process|abort|history|timeout)/i.test(entry.summary || '')
  }).length
    ? eventLog.value.filter((entry) => {
        const eventName = entry.event.toLowerCase()
        if (!TRACE_NOISE_EVENTS.has(eventName)) return true
        return /(error|chat|dispatch|helper|agent|session|process|abort|history|timeout)/i.test(entry.summary || '')
      })
    : eventLog.value)
    .slice(0, 6)
    .map(entry => ({
      id: entry.id,
      event: entry.event,
      summary: entry.summary || 'Gateway event received.',
      timestamp: entry.ts
    }))
)

const getDispatchReply = (dispatch: DispatchPlan) => {
  if (dispatch.runId) {
    const directReply = renderedRepliesByRunId.value.get(dispatch.runId) || null
    if (directReply) return directReply
  }

  const nextDispatchAt = recentDispatches.value
    .filter(entry => entry.createdAt > dispatch.createdAt)
    .map(entry => entry.createdAt)
    .sort((left, right) => left - right)[0] || Number.POSITIVE_INFINITY

  const fallbackMessage = [...messages.value]
    .filter((message) =>
      message.role === 'assistant' &&
      message.timestamp >= dispatch.createdAt - 1000 &&
      message.timestamp < nextDispatchAt
    )
    .sort((left, right) => right.timestamp - left.timestamp)[0]

  if (!fallbackMessage) return null

  const rendered = buildRenderedReply(fallbackMessage.id, flattenMessageText(fallbackMessage))
  return rendered.isPlaceholder ? null : rendered
}

const getDispatchIssue = (dispatch: DispatchPlan) => {
  const reply = getDispatchReply(dispatch)
  if (reply && !reply.isStreaming) {
    return reply.isFailure ? reply.bodyText : ''
  }

  const systemIssue = getDispatchSystemIssue(dispatch)
  if (systemIssue) return systemIssue

  const age = Date.now() - dispatch.createdAt
  if (age >= DISPATCH_STALL_MS) {
    return 'Boss Lobster has not reported back yet. This helper run looks stalled. Try Stop Run or reconnect the workshop.'
  }

  if (lastError.value && latestDispatch.value?.id === dispatch.id) {
    return lastError.value
  }

  return ''
}

const getDispatchResolvedStatus = (dispatch: DispatchPlan): CrewStatus => {
  if (dispatch.runId && activeRunId.value === dispatch.runId && streamingText.value.trim()) {
    return 'working'
  }

  const reply = getDispatchReply(dispatch)
  if (reply && !reply.isStreaming) {
    if (reply.isFailure) return 'error'
    if (reply.isRunning) return 'working'
    return 'done'
  }

  if (getDispatchIssue(dispatch)) {
    return 'error'
  }

  return 'queued'
}

const getDispatchStatusNote = (dispatch: DispatchPlan, statusValue: CrewStatus) => {
  const reply = getDispatchReply(dispatch)
  if (statusValue === 'error') return 'Boss reported an error'
  if (statusValue === 'working') {
    return reply?.isRunning ? 'Helper still running' : 'Dispatch in progress'
  }
  if (statusValue === 'done') return 'Boss reply received'
  return 'Queued by Boss Lobster'
}

const getDispatchStatusDetail = (dispatch: DispatchPlan, statusValue: CrewStatus) => {
  const reply = getDispatchReply(dispatch)
  if ((statusValue === 'working' || statusValue === 'done' || statusValue === 'error') && reply?.bodyText) {
    return reply.bodyText
  }
  const issue = getDispatchIssue(dispatch)
  if (statusValue === 'error' && issue) {
    return issue
  }
  return dispatch.task
}

const dispatchFallbackStatus = (dispatch: DispatchPlan): CrewStatus => {
  return getDispatchResolvedStatus(dispatch)
}

const todoItems = computed<TodoItem[]>(() => {
  const items = recentDispatches.value
    .filter(dispatch => getDisplayWorkersForDispatch(dispatch).length > 0)
    .flatMap((dispatch) => {
      const reply = getDispatchReply(dispatch)
      const displayWorkers = getDisplayWorkersForDispatch(dispatch)
      return displayWorkers.map((workerId) => {
        const worker = workerOptionMap[workerId]
        const issueNote = getDispatchIssue(dispatch)
        const actualCard = matchingActualCard(dispatch, workerId)
        const isRequestedInDispatch = dispatch.workers.includes(workerId)
        const statusValue: CrewStatus = issueNote && actualCard?.status !== 'done'
          ? 'error'
          : actualCard?.status || (isRequestedInDispatch ? dispatchFallbackStatus(dispatch) : 'queued')

        return {
          id: `${dispatch.id}-${workerId}`,
          label: truncateTask(dispatch.task, 68),
          workerLabel: worker.label,
          summary: statusValue === 'error'
            ? issueNote || 'Boss Lobster did not send a usable reply. Try reconnecting or sending the task again.'
            : actualCard?.note || (!isRequestedInDispatch
            ? 'Helper is armed in the UI. Waiting for launch telemetry from OpenClaw.'
            : statusValue === 'working'
              ? 'Helper run is active. Open this item to follow the latest boss reply.'
              : 'Queued for helper dispatch. Waiting for telemetry from OpenClaw.'),
          detail: statusValue === 'error'
            ? issueNote || dispatch.task
            : actualCard?.detail || (isRequestedInDispatch ? dispatch.task : 'No helper session has reported in yet for this armed worker.'),
          status: statusValue,
          progress: progressFromStatus(statusValue),
          response: isRequestedInDispatch ? reply : null
        }
      })
    })

  return items.slice(0, 10)
})

const clearChatWindow = () => {
  resetChatWindow()
  draft.value = ''
  recentDispatches.value = []
  openThoughtIds.value = []
  openTodoIds.value = []
}

const handleSendOrder = async () => {
  const taskText = draft.value.trim()
  if (!taskText || !canSendOrder.value) return

  const workers = launchSubagents.value ? [...selectedWorkers.value] : []
  const initialRunId = createId()
  registerDispatch(taskText, workers, initialRunId)

  const finalRunId = await sendMessage({
    displayText: taskText,
    gatewayText: buildGatewayMessage(taskText, workers),
    idempotencyKey: initialRunId
  })

  if (finalRunId && finalRunId !== initialRunId) {
    const dispatch = recentDispatches.value.find(d => d.runId === initialRunId)
    if (dispatch) {
      dispatch.runId = finalRunId
      dispatch.id = finalRunId
    }
  }
}

watch([launchSubagents, selectedWorkers, recentDispatches], saveDispatchPrefs, { deep: true })

onMounted(() => {
  loadDispatchPrefs()
})
</script>

<style scoped>
.work-chip {
  animation: work-chip-pulse 1.15s ease-in-out infinite;
}

.lobster-markdown :deep(p) {
  margin: 0.55rem 0;
}

.lobster-markdown :deep(p:first-child) {
  margin-top: 0;
}

.lobster-markdown :deep(p:last-child) {
  margin-bottom: 0;
}

.lobster-markdown :deep(ul),
.lobster-markdown :deep(ol) {
  margin: 0.55rem 0;
  padding-left: 1.4rem;
}

.lobster-markdown :deep(li) {
  margin: 0.28rem 0;
}

.lobster-markdown :deep(strong) {
  font-weight: 700;
}

.lobster-markdown :deep(em) {
  font-style: italic;
}

.lobster-markdown :deep(code) {
  border-radius: 0.4rem;
  background: rgba(24, 24, 27, 0.08);
  padding: 0.05rem 0.35rem;
  font-size: 0.92em;
}

.lobster-markdown :deep(pre) {
  overflow-x: auto;
  border-radius: 1rem;
  background: #1f2937;
  color: #f8fafc;
  padding: 0.85rem 1rem;
}

.lobster-markdown :deep(pre code) {
  background: transparent;
  padding: 0;
  color: inherit;
}

.lobster-markdown :deep(a) {
  color: #0369a1;
  text-decoration: underline;
}

.lobster-markdown :deep(blockquote) {
  margin: 0.8rem 0;
  border-left: 3px solid rgba(245, 158, 11, 0.4);
  padding-left: 0.85rem;
  color: #57534e;
}

@keyframes lobster-idle {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }

  50% {
    transform: translateY(-4px) rotate(-1deg);
  }
}

@keyframes lobster-ready {
  0%,
  100% {
    transform: translateY(0) rotate(-1.5deg);
  }

  50% {
    transform: translateY(-6px) rotate(1.5deg);
  }
}

@keyframes lobster-working {
  0%,
  100% {
    transform: translateY(0) rotate(-2deg) scale(1);
  }

  25% {
    transform: translateY(-4px) rotate(2deg) scale(1.02);
  }

  50% {
    transform: translateY(-7px) rotate(-1deg) scale(1.03);
  }

  75% {
    transform: translateY(-3px) rotate(2deg) scale(1.02);
  }
}

@keyframes lobster-done {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }

  40% {
    transform: translateY(-5px) rotate(-1deg);
  }

  65% {
    transform: translateY(-2px) rotate(2deg);
  }
}

@keyframes lobster-error {
  0%,
  100% {
    transform: translateX(0);
  }

  25% {
    transform: translateX(-2px);
  }

  75% {
    transform: translateX(2px);
  }
}

@keyframes work-chip-pulse {
  0%,
  100% {
    box-shadow: 2px 2px 0 0 rgba(0, 0, 0, 1);
  }

  50% {
    box-shadow: 2px 2px 0 0 rgba(0, 0, 0, 1), 0 0 0 6px rgba(125, 211, 252, 0.2);
  }
}
</style>
