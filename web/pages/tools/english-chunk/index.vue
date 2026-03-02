<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 font-hand">
    <div class="text-center mb-12">
      <h1 class="text-4xl font-bold text-zinc-900 mb-4 font-hand">English Chunk Generator</h1>
      <p class="text-lg text-zinc-600 italic">Generate common English chunks with example sentences and practice scenarios</p>
    </div>

    <!-- Generator Form -->
    <div class="sketch-card p-6 mb-8 bg-white">
      <div class="space-y-6">
        <div v-if="!apiKey" class="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-red-700 text-sm italic">
          <p>Please set your OpenRouter API Key in the Global Settings (top right gear icon) to use this tool.</p>
          <button @click="openGlobalSettings" class="mt-3 sketch-button bg-white text-zinc-900 py-1 px-4 not-italic">Open Settings</button>
        </div>

        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex-1">
            <label class="block text-sm font-bold text-zinc-700 mb-2">Number of chunks</label>
            <select v-model="numChunks" class="w-full sketch-border bg-white px-3 py-2 outline-none focus:sketch-shadow-sm font-hand">
              <option v-for="n in 10" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>
          <div class="flex-1">
            <label class="block text-sm font-bold text-zinc-700 mb-2">Topic</label>
            <select v-model="topic" class="w-full sketch-border bg-white px-3 py-2 outline-none focus:sketch-shadow-sm font-hand">
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
        </div>
        <button 
          @click="generateChunks"
          :disabled="loading || !apiKey"
          class="w-full sketch-button py-3 text-lg bg-zinc-900 text-white disabled:opacity-50"
        >
          {{ loading ? 'Generating...' : '✨ Generate Chunks' }}
        </button>
      </div>
    </div>

    <div v-if="chunks?.length > 0" class="space-y-8">
      <!-- Chunks Section -->
      <div class="space-y-6">
        <h2 class="text-2xl font-bold text-zinc-900 mb-4">English Chunks</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div v-for="(chunk, index) in chunks" :key="index" class="sketch-card p-6 bg-white hover:sketch-shadow transition-all">
            <h3 class="text-xl font-bold text-zinc-900 mb-4 border-b-2 border-zinc-100 pb-2">{{ chunk.phrase }}</h3>
            <div class="space-y-4">
              <div v-for="(example, idx) in chunk.examples" :key="idx" class="text-zinc-600">
                <p class="text-xs text-zinc-400 mb-1 italic">Example {{ idx + 1 }}:</p>
                <p class="text-base leading-relaxed">{{ example }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Scenario Section -->
      <div v-if="scenario?.content" class="sketch-card p-8 bg-white border-2 border-zinc-900">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 class="text-2xl font-bold text-zinc-900">{{ scenario.title }}</h2>
            <p class="text-zinc-500 italic mt-1">{{ scenario.context }}</p>
          </div>
          <div class="flex items-center gap-4 shrink-0">
            <button 
              @click="toggleTextToSpeech"
              class="sketch-button py-1 px-4 text-sm flex items-center gap-2"
              :class="{ 'bg-zinc-100': isPlaying }"
            >
              <span>{{ isPlaying ? '⏸ Stop' : '▶ Play' }}</span>
            </button>
            <button 
              @click="copyScenario"
              class="sketch-button py-1 px-4 text-sm flex items-center gap-2"
              :class="{ 'bg-green-50': copied }"
            >
              <span>{{ copied ? '✅ Copied' : '📋 Copy' }}</span>
            </button>
          </div>
        </div>

        <div class="bg-zinc-50/50 sketch-border p-6 md:p-8">
          <div class="space-y-6">
            <div v-for="(message, index) in formattedDialogue" 
                 :key="index" 
                 class="dialogue-line"
            >
              <div class="flex items-baseline gap-4">
                <span class="text-sm font-bold uppercase tracking-wider min-w-[60px]" 
                      :class="index % 2 === 0 ? 'text-blue-600' : 'text-purple-600'">
                  {{ message.speaker }}:
                </span>
                <div v-html="highlightChunks(message.text, chunks)" 
                     class="text-lg leading-relaxed flex-grow"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error" class="mt-8 sketch-card p-4 bg-red-50 border-red-200 text-red-700">
      <p class="font-bold">Oops!</p>
      <p>{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTTS } from '~/composables/useTTS'

definePageMeta({ layout: 'default' })

const numChunks = ref(5)
const topic = ref('daily_routines')
const chunks = ref<Array<{ phrase: string; examples: string[] }>>([])
const scenario = ref<{ title: string; context: string; content: string } | null>(null)
const loading = ref(false)
const error = ref('')
const copied = ref(false)
const apiKey = ref('')
const GLOBAL_KEY_STORAGE = 'global_openrouter_key'

const { isPlaying, speak, stop } = useTTS()

const syncGlobalKey = () => {
  apiKey.value = localStorage.getItem(GLOBAL_KEY_STORAGE) || ''
}

onMounted(() => {
  syncGlobalKey()
  window.addEventListener('storage', syncGlobalKey)
  window.addEventListener('global-openrouter-key-updated', syncGlobalKey as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('storage', syncGlobalKey)
  window.removeEventListener('global-openrouter-key-updated', syncGlobalKey as EventListener)
})

const openGlobalSettings = () => {
  window.dispatchEvent(new Event('open-global-settings'))
}

const formattedDialogue = computed(() => {
  if (!scenario.value?.content) return []
  return scenario.value.content.split('\n')
    .filter(line => line.includes(':'))
    .map(line => {
      const [speaker, ...textParts] = line.split(':')
      return {
        speaker: speaker.trim(),
        text: textParts.join(':').trim()
      }
    })
})

const highlightChunks = (text: string, chunksList: any[]) => {
  let highlighted = text
  chunksList.forEach(chunk => {
    const phrase = chunk.phrase
    const regex = new RegExp(`\\b(${phrase})\\b`, 'gi')
    highlighted = highlighted.replace(regex, '<span class="chunk-highlight">$1</span>')
  })
  return highlighted
}

const generateChunks = async () => {
  if (!apiKey.value) return
  loading.value = true
  error.value = ''
  chunks.value = []
  scenario.value = null
  
  try {
    const prompt = `Generate ${numChunks.value} English chunks and a practice scenario for the topic '${topic.value.replace('_', ' ')}'. 
Return strictly a JSON object with this structure:
{
  "chunks": [
    { "phrase": "phrase here", "examples": ["example sentence 1", "example sentence 2"] }
  ],
  "scenario": {
    "title": "scenario title",
    "context": "brief context",
    "content": "Speaker A: ...\\nSpeaker B: ..."
  }
}`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.value}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Gemini English Chunk'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error?.message || 'Failed to generate chunks')
    }

    const data = await response.json()
    const result = JSON.parse(data.choices[0].message.content)
    
    chunks.value = result.chunks
    scenario.value = result.scenario
  } catch (e: any) {
    error.value = e.message || 'An error occurred'
  } finally {
    loading.value = false
  }
}

const copyScenario = async () => {
  if (!scenario.value) return
  try {
    await navigator.clipboard.writeText(scenario.value.content)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

const toggleTextToSpeech = () => {
  if (isPlaying.value) {
    stop()
  } else {
    // Convert formatted dialogue back to array of strings for speak
    const lines = formattedDialogue.value.map(d => `${d.speaker}: ${d.text}`)
    speak(lines)
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Indie+Flower&display=swap');

.font-hand {
  font-family: 'Patrick Hand', cursive;
}

h1, h2, h3 {
  font-family: 'Indie Flower', cursive;
}

.chunk-highlight {
  @apply bg-yellow-100 border-b-2 border-yellow-400 px-1 rounded-sm transition-colors;
}

.chunk-highlight:hover {
  @apply bg-yellow-200;
}

.dialogue-line {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
}
</style>
