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

        <div class="flex flex-col md:flex-row items-start md:items-center md:items-center justify-between gap-4">
          <div class="flex-1">
            <label class="block text-sm font-bold text-zinc-700 mb-2">Number of chunks</label>
            <select v-model="numChunks" class="w-full sketch-border bg-white px-3 py-2 outline-none focus:sketch-shadow-sm font-hand">
              <option v-for="n in 10" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>
          <div class="flex-1">
            <label class="block text-sm font-bold text-zinc-700 mb-2">Model</label>
            <div ref="modelSelectorRef" class="model-selector-container relative group">
              <input
                v-model="modelSearch"
                @focus="showModelDropdown = true"
                placeholder="Search AI model..."
                class="w-full sketch-border bg-white px-3 py-2 outline-none focus:sketch-shadow-sm font-hand"
              />
              <div v-if="showModelDropdown" class="absolute top-full left-0 mt-2 w-full max-h-60 overflow-y-auto bg-white sketch-border z-50 shadow-xl">
                <div
                  v-for="m in filteredModels"
                  :key="m.id"
                  class="px-3 py-2 hover:bg-zinc-100 cursor-pointer text-sm border-b border-zinc-100 last:border-0"
                  @click="selectModel(m)"
                >
                  <div class="font-bold">{{ m.name || m.id }}</div>
                  <div class="text-[10px] text-zinc-400 truncate">{{ m.id }}</div>
                </div>
                <div v-if="filteredModels.length === 0" class="px-3 py-2 text-sm text-zinc-500 italic">
                  No models found
                </div>
              </div>
            </div>
          </div>
          <div class="flex-1">
            <label class="block text-sm font-bold text-zinc-700 mb-2">Topic</label>
            <select v-model="topic" class="w-full sketch-border bg-white px-3 py-2 outline-none focus:sketch-shadow-sm font-hand">
              <option v-for="topicOption in topics" :key="topicOption.value" :value="topicOption.value">
                {{ topicOption.label }}
              </option>
            </select>
          </div>
        </div>
        <div class="grid gap-4 md:grid-cols-[1fr_220px]">
          <div>
            <label class="block text-sm font-bold text-zinc-700 mb-2">Custom system prompt</label>
            <textarea
              v-model="customSystemPrompt"
              rows="4"
              placeholder="Add style or teaching constraints for the model..."
              class="w-full sketch-border bg-white px-3 py-2 outline-none focus:sketch-shadow-sm font-hand resize-none"
            ></textarea>
          </div>
          <div>
            <label class="block text-sm font-bold text-zinc-700 mb-2">Prompt behavior</label>
            <select v-model="systemPromptMode" class="w-full sketch-border bg-white px-3 py-2 outline-none focus:sketch-shadow-sm font-hand">
              <option value="append">Append to default</option>
              <option value="override">Override default</option>
            </select>
            <p class="mt-2 text-xs text-zinc-500 italic">
              Append keeps the built-in generator rules. Override replaces them completely.
            </p>
          </div>
        </div>
        <button 
          @click="generateChunks"
          :disabled="loading || !apiKey"
          class="w-full sketch-button py-3 text-lg !bg-zinc-900 !text-white disabled:opacity-50"
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
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between items-start md:items-center gap-4 mb-6">
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
          <div class="mb-6 flex flex-wrap gap-3">
            <div class="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-bold text-zinc-600">
              {{ formattedDialogue.length }} dialogue lines
            </div>
            <div
              class="rounded-full border px-3 py-1 text-xs font-bold"
              :class="missingChunks.length === 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'"
            >
              {{ missingChunks.length === 0 ? 'All chunks covered' : `${missingChunks.length} chunks missing in dialogue` }}
            </div>
          </div>

          <div v-if="missingChunks.length > 0" class="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Missing chunks: {{ missingChunks.join(', ') }}
          </div>

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
import { useGlobalOpenRouterKey } from '~/composables/useGlobalOpenRouterKey'
import { useTTS } from '~/composables/useTTS'
import { escapeHtml } from '~/utils/safeRichText'

definePageMeta({ layout: 'default' })

type TopicOption = { value: string; label: string }

const DEFAULT_SYSTEM_PROMPT = `You are an expert English fluency coach and curriculum designer.
Generate practical multi-word chunks for learners, keep the language natural and useful, and return only valid JSON.`

const topics: TopicOption[] = [
  { value: 'daily_routines', label: 'Daily Routines' },
  { value: 'work_life', label: 'Work Life' },
  { value: 'socializing', label: 'Socializing' },
  { value: 'travel', label: 'Travel' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'dining', label: 'Dining Out' },
  { value: 'health', label: 'Health & Wellness' },
  { value: 'education', label: 'Education' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'technology', label: 'Technology' },
  { value: 'job_interviews', label: 'Job Interviews' },
  { value: 'remote_work', label: 'Remote Work' },
  { value: 'friendship_conflicts', label: 'Friendship Conflicts' },
  { value: 'dating', label: 'Dating & Relationships' },
  { value: 'airport_survival', label: 'Airport Survival' },
  { value: 'small_talk', label: 'Small Talk' },
  { value: 'money_management', label: 'Money Management' },
  { value: 'fitness', label: 'Fitness & Training' },
  { value: 'movies_and_tv', label: 'Movies & TV' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'customer_service', label: 'Customer Service' },
  { value: 'creative_hobbies', label: 'Creative Hobbies' }
]

const numChunks = ref(5)
const topic = ref('daily_routines')
const selectedModel = ref('google/gemini-2.0-flash-001')
const aiModels = ref<{id: string, name: string}[]>([])
const modelSearch = ref('')
const showModelDropdown = ref(false)
const modelSelectorRef = ref<HTMLElement | null>(null)
const customSystemPrompt = ref('')
const systemPromptMode = ref<'append' | 'override'>('append')
const chunks = ref<Array<{ phrase: string; examples: string[] }>>([])
const scenario = ref<{ title: string; context: string; content: string } | null>(null)
const loading = ref(false)
const error = ref('')
const copied = ref(false)
const { apiKey, openGlobalSettings } = useGlobalOpenRouterKey()

const { isPlaying, speak, stop } = useTTS()

const selectedTopicLabel = computed(() =>
  topics.find(item => item.value === topic.value)?.label || topic.value.replace(/_/g, ' ')
)

const recommendedDialogueTurns = computed(() => Math.max(8, numChunks.value * 2 + 2))

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const filteredModels = computed(() => {
  if (!modelSearch.value) return aiModels.value.slice(0, 50)
  const search = modelSearch.value.toLowerCase()
  return aiModels.value.filter(
    (m) => (m.name?.toLowerCase().includes(search)) || (m.id?.toLowerCase().includes(search))
  )
})

const selectModel = (m: any) => {
  selectedModel.value = m.id
  modelSearch.value = m.name || m.id
  showModelDropdown.value = false
  localStorage.setItem('english_chunk_current_model', m.id)
}

const handleOutsideClick = (event: MouseEvent) => {
  const target = event.target as Node
  if (modelSelectorRef.value && !modelSelectorRef.value.contains(target)) {
    showModelDropdown.value = false
  }
}

const fetchModels = async () => {
  try {
    const cached = localStorage.getItem('english_chunk_available_models')
    if (cached) {
      aiModels.value = JSON.parse(cached)
      if (!aiModels.value.find(m => m.id === selectedModel.value) && aiModels.value.length > 0) {
        selectedModel.value = aiModels.value[0].id
      }
    }
    const response = await fetch('https://openrouter.ai/api/v1/models')
    const data = await response.json()
    if (data.data) {
      aiModels.value = data.data.map((m: any) => ({
        id: m.id,
        name: m.name
      }))
      localStorage.setItem('english_chunk_available_models', JSON.stringify(aiModels.value))
      if (!aiModels.value.find(m => m.id === selectedModel.value) && aiModels.value.length > 0) {
        selectedModel.value = aiModels.value[0].id
      }
    }
  } catch (error) {
    console.error('Failed to fetch models:', error)
    if (aiModels.value.length === 0) {
      aiModels.value = [
        { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash' },
        { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku' },
        { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
        { id: 'x-ai/grok-2-vision', name: 'Grok 2' }
      ]
    }
  }
}

onMounted(() => {
  fetchModels()
  document.addEventListener('mousedown', handleOutsideClick)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleOutsideClick)
})

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

const missingChunks = computed(() => {
  const content = scenario.value?.content?.toLowerCase() || ''
  return chunks.value
    .map(chunk => chunk.phrase)
    .filter(phrase => phrase && !new RegExp(`\\b${escapeRegExp(phrase.toLowerCase())}\\b`, 'i').test(content))
})

const highlightChunks = (text: string, chunksList: any[]) => {
  let highlighted = escapeHtml(text)
  chunksList.forEach(chunk => {
    const phrase = escapeHtml(chunk.phrase || '')
    if (!phrase) return
    const regex = new RegExp(`\\b(${escapeRegExp(phrase)})\\b`, 'gi')
    highlighted = highlighted.replace(regex, '<span class="chunk-highlight">$1</span>')
  })
  return highlighted
}

const buildSystemPrompt = () => {
  const customPrompt = customSystemPrompt.value.trim()
  if (systemPromptMode.value === 'override') {
    return customPrompt || DEFAULT_SYSTEM_PROMPT
  }
  return customPrompt
    ? `${DEFAULT_SYSTEM_PROMPT}\n\nAdditional instructions:\n${customPrompt}`
    : DEFAULT_SYSTEM_PROMPT
}

const generateChunks = async () => {
  if (!apiKey.value) return
  loading.value = true
  error.value = ''
  chunks.value = []
  scenario.value = null
  
  try {
    const prompt = `Generate ${numChunks.value} English chunks and a practice scenario for the topic '${selectedTopicLabel.value}'.
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
}

Requirements:
- Return exactly ${numChunks.value} chunks.
- Make every chunk practical, natural, and distinct.
- The scenario must feel like one complete scene with a clear beginning, development, and ending.
- The scenario content must contain at least ${recommendedDialogueTurns.value} dialogue lines.
- Use enough dialogue to naturally cover all ${numChunks.value} chunks.
- Every chunk phrase must appear at least once somewhere in the scenario dialogue.
- Keep the dialogue realistic for the chosen topic, not just a random list of lines.
- Prefer two named speakers unless a third speaker is necessary for the scene.`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.value}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Gemini English Chunk'
      },
      body: JSON.stringify({
        model: selectedModel.value,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: prompt }
        ],
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
