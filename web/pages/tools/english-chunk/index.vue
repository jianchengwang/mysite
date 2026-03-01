<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="text-center mb-12">
      <h1 class="text-4xl font-bold text-zinc-900 mb-4">English Chunk Generator</h1>
      <p class="text-lg text-zinc-600">Generate common English chunks with example sentences and practice scenarios</p>
    </div>

    <!-- Generator Form -->
    <div class="bg-white rounded-lg shadow-sm border border-zinc-200 p-6 mb-8">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-zinc-700">Number of chunks</label>
          <select v-model="numChunks" class="rounded-md border-zinc-300 text-sm">
            <option v-for="n in 10" :key="n" :value="n">{{ n }}</option>
          </select>
        </div>
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-zinc-700">Topic</label>
          <select v-model="topic" class="rounded-md border-zinc-300 text-sm">
            <option value="daily_routines">Daily Routines</option>
            <option value="work_life">Work Life</option>
            <option value="socializing">Socializing</option>
            <option value="travel">Travel</option>
            <option value="shopping">Shopping</option>
            <option value="dining">Dining</option>
            <option value="health">Health & Wellness</option>
            <option value="education">Education</option>
            <option value="entertainment">Entertainment</option>
            <option value="technology">Technology</option>
          </select>
        </div>
        <Button 
          label="Generate Chunks" 
          class="w-full" 
          :loading="loading"
          @click="generateChunks"
        />
      </div>
    </div>

    <div v-if="chunks?.length > 0" class="space-y-8">
      <!-- Chunks Section -->
      <div class="space-y-6">
        <h2 class="text-2xl font-semibold text-zinc-900 mb-4">English Chunks</h2>
        <div v-for="(chunk, index) in chunks" :key="index" class="bg-white rounded-lg shadow-sm border border-zinc-200 p-6">
          <h3 class="text-lg font-semibold text-zinc-900 mb-4">{{ chunk.phrase }}</h3>
          <div class="space-y-3">
            <div v-for="(example, idx) in chunk.examples" :key="idx" class="text-zinc-600">
              <p class="text-sm text-zinc-500 mb-1">Example {{ idx + 1 }}:</p>
              <p class="text-base">{{ example }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Scenario Section -->
      <div v-if="scenario?.content" class="bg-white rounded-lg shadow-sm border border-zinc-200 p-6">
        <h2 class="text-2xl font-semibold text-zinc-900 mb-4">Practice Scenario</h2>
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-zinc-800">{{ scenario.title }}</h3>
              <p class="text-zinc-600 italic mt-2">{{ scenario.context }}</p>
            </div>
            <div class="flex items-center space-x-4">
              <ClientOnly>
                <button 
                  @click="toggleTextToSpeech"
                  class="text-zinc-500 hover:text-zinc-700 flex items-center space-x-1 text-sm"
                  :class="{ 'text-blue-500': isPlaying }"
                >
                  <i class="pi" :class="isPlaying ? 'pi-pause' : 'pi-play'"></i>
                  <span>{{ isPlaying ? 'Stop' : 'Read' }}</span>
                </button>
                <button 
                  @click="copyScenario"
                  class="text-zinc-500 hover:text-zinc-700 flex items-center space-x-1 text-sm"
                  :class="{ 'text-green-500': copied }"
                >
                  <i class="pi" :class="copied ? 'pi-check' : 'pi-copy'"></i>
                  <span>{{ copied ? 'Copied!' : 'Copy' }}</span>
                </button>
              </ClientOnly>
            </div>
          </div>
          <div class="prose prose-zinc max-w-none mt-4">
            <div class="bg-zinc-50 rounded-lg p-6">
              <div class="space-y-4">
                <div v-for="(message, index) in formattedDialogue" 
                   :key="index" 
                   class="dialogue-line"
                >
                  <div class="flex items-baseline space-x-3">
                    <span class="speaker-name text-sm font-medium" 
                          :class="index % 2 === 0 ? 'text-pink-600' : 'text-blue-600'">
                      {{ index % 2 === 0 ? 'Sarah' : 'Mark' }}:
                    </span>
                    <div v-html="highlightChunks(message, chunks)" 
                         class="dialogue-content flex-grow"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <i class="pi pi-spin pi-spinner text-4xl text-zinc-400"></i>
      <p class="mt-4 text-zinc-600">Generating chunks and scenario...</p>
    </div>

    <!-- Error State -->
    <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTTS } from '~/composables/useTTS'
import { useDialogue } from '~/composables/useDialogue'

const config = useRuntimeConfig()
const numChunks = ref(5)
const topic = ref('daily_routines')
const chunks = ref<Array<{ phrase: string; examples: string[] }>>([])
const scenario = ref<{ title: string; context: string; content: string } | null>(null)
const loading = ref(false)
const error = ref('')
const copied = ref(false)

const { isPlaying, speak, stop } = useTTS()
const { formatDialogue, highlightChunks } = useDialogue()

const formattedDialogue = computed(() => {
  return scenario.value ? formatDialogue(scenario.value.content) : []
})

const generateChunks = async () => {
  loading.value = true
  error.value = ''
  chunks.value = []
  scenario.value = null
  
  try {
    const response = await fetch(`${config.public.apiBase}/api/english-chunk/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        num_chunks: numChunks.value,
        topic: topic.value,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to generate chunks')
    }

    const data = await response.json()
    chunks.value = data.chunks
    scenario.value = data.scenario
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'An error occurred'
  } finally {
    loading.value = false
  }
}

// 复制场景内容
const copyScenario = async () => {
  if (!scenario.value) return
  
  try {
    await navigator.clipboard.writeText(scenario.value.content)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

// 文本转语音功能
const toggleTextToSpeech = () => {
  if (isPlaying.value) {
    stop()
  } else {
    speak(formattedDialogue.value)
  }
}
</script>

<style>
.prose {
  line-height: 1.8;
  font-size: 1.1rem;
}

.dialogue-line {
  margin-bottom: 1.5rem;
  animation: fade-in 0.5s ease-out;
}

.dialogue-content {
  line-height: 1.6;
}

/* Chunk 高亮样式 */
.chunk-highlight {
  background-color: rgba(250, 204, 21, 0.2);
  border-bottom: 2px solid #fbbf24;
  padding: 0 2px;
  border-radius: 2px;
  transition: background-color 0.2s ease;
}

.chunk-highlight:hover {
  background-color: rgba(250, 204, 21, 0.4);
}

/* 动画效果 */
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 按钮样式 */
button {
  transition: all 0.2s ease;
}

button:hover {
  transform: scale(1.05);
}

button:active {
  transform: scale(0.95);
}
</style> 