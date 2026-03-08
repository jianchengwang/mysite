<template>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 font-hand">
    <div class="text-center mb-8 sm:mb-10">
      <h1 class="text-4xl md:text-5xl font-bold text-zinc-900 mb-3 font-hand">Typing Story Lab</h1>
      <p class="text-base sm:text-lg text-zinc-600 italic">
        Generate or paste English text, clean it up, and practice it like a sketchbook typing drill.
      </p>
    </div>

    <div v-if="mode === 'input'" class="space-y-8">
      <div v-if="!apiKey" class="sketch-card p-5 bg-red-50 border-red-200 text-red-700">
        <p class="text-sm italic">
          AI generation needs your global OpenRouter key. You can still paste custom text and start typing without it.
        </p>
        <button @click="openGlobalSettings" class="mt-3 sketch-button bg-white text-zinc-900 py-1 px-4">
          Open Settings
        </button>
      </div>

      <div class="grid gap-6 xl:grid-cols-[1.4fr_0.9fr] xl:gap-8">
        <div class="sketch-card p-4 sm:p-6 bg-white">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <h2 class="text-2xl font-bold text-zinc-900">Input Text</h2>
              <p class="text-zinc-500 italic text-sm">Paste anything or let the generator draft a clean practice passage.</p>
            </div>
            <div class="text-sm text-zinc-500">
              {{ inputStats.characters }} chars · {{ inputStats.words }} words
            </div>
          </div>

          <textarea
            v-model="inputText"
            rows="14"
            placeholder="Paste custom English text here, or generate a fresh topic-based passage on the right."
            class="w-full sketch-border bg-white px-4 py-3 outline-none focus:sketch-shadow-sm resize-none text-base sm:text-lg leading-relaxed"
          ></textarea>

          <div class="mt-4 flex flex-wrap items-center gap-3">
            <button @click="formatText" :disabled="!inputText.trim()" class="sketch-button bg-yellow-50 py-2 px-5 disabled:opacity-50">
              Format Text
            </button>
            <button @click="clearText" :disabled="!inputText" class="sketch-button bg-white text-zinc-700 py-2 px-5 disabled:opacity-50">
              Clear
            </button>
            <button
              @click="startTyping"
              :disabled="!normalizedInputText"
              class="sketch-button !bg-zinc-900 !text-white py-2 px-5 disabled:opacity-50"
            >
              Start Typing
            </button>
            <span class="text-xs sm:text-sm italic text-zinc-500">Tip: formatting removes fancy punctuation and collapses messy spacing.</span>
          </div>
        </div>

        <div class="sketch-card p-4 sm:p-6 bg-white space-y-5">
          <div>
            <h2 class="text-2xl font-bold text-zinc-900">AI Generator</h2>
            <p class="text-zinc-500 italic text-sm">Pick a topic and drop a ready-to-type passage straight into the editor.</p>
          </div>

          <div>
            <label class="block text-sm font-bold text-zinc-700 mb-2">Topic</label>
            <select v-model="selectedTopic" class="w-full sketch-border bg-white px-3 py-2 outline-none focus:sketch-shadow-sm">
              <option v-for="option in topics" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>

          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <div>
              <label class="block text-sm font-bold text-zinc-700 mb-2">Length</label>
              <select v-model="selectedLength" class="w-full sketch-border bg-white px-3 py-2 outline-none focus:sketch-shadow-sm">
                <option v-for="option in lengthOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-bold text-zinc-700 mb-2">Model</label>
              <div ref="modelSelectorRef" class="relative">
                <input
                  v-model="modelSearch"
                  placeholder="Search AI model..."
                  class="w-full sketch-border bg-white px-3 py-2 pr-10 outline-none focus:sketch-shadow-sm"
                  @focus="showModelDropdown = true"
                  @keydown.enter.prevent="chooseFirstModel"
                />
                <button
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs"
                  @click.prevent="showModelDropdown = !showModelDropdown"
                >
                  ▼
                </button>
                <div
                  v-if="showModelDropdown"
                  class="absolute top-full left-0 mt-2 w-full max-h-60 overflow-y-auto bg-white sketch-border z-20 shadow-xl"
                >
                  <button
                    v-for="model in filteredModels"
                    :key="model.id"
                    class="w-full text-left px-3 py-2 hover:bg-zinc-100 border-b border-zinc-100 last:border-0"
                    @mousedown.prevent="selectModel(model)"
                  >
                    <div class="font-bold text-sm text-zinc-900 truncate">{{ model.name || model.id }}</div>
                    <div class="text-[10px] text-zinc-400 truncate">{{ model.id }}</div>
                  </button>
                  <div v-if="filteredModels.length === 0" class="px-3 py-2 text-sm text-zinc-500 italic">
                    No models found
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label class="block text-sm font-bold text-zinc-700 mb-2">Optional instruction</label>
            <textarea
              v-model="generatorPrompt"
              rows="4"
              placeholder="Example: make it office-themed, beginner-friendly, or include a few numbers."
              class="w-full sketch-border bg-white px-3 py-2 outline-none focus:sketch-shadow-sm resize-none"
            ></textarea>
          </div>

          <button
            @click="generatePassage"
            :disabled="loading || !apiKey"
            class="w-full sketch-button py-3 text-lg !bg-zinc-900 !text-white disabled:opacity-50"
          >
            {{ loading ? 'Generating...' : 'Generate Practice Text' }}
          </button>

          <div class="sketch-border bg-zinc-50 px-4 py-3 text-sm text-zinc-600 italic">
            Generated text is automatically simplified before it lands in the editor.
          </div>
        </div>
      </div>

      <div v-if="statusMessage" class="sketch-card p-4" :class="statusTone === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'">
        <p>{{ statusMessage }}</p>
      </div>
    </div>

    <div v-else class="space-y-8">
      <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 sm:gap-6">
        <div>
          <h2 class="text-2xl sm:text-3xl font-bold text-zinc-900">Typing Mode</h2>
          <p class="text-zinc-500 italic mt-1">Current character stays highlighted. Press `Esc` to go back to the editor.</p>
        </div>
        <div class="flex flex-wrap gap-3">
          <button @click="restartTyping" class="sketch-button bg-white py-2 px-5">Restart</button>
          <button @click="stopTyping" class="sketch-button bg-red-50 text-red-700 py-2 px-5">Back to Input</button>
        </div>
      </div>

      <div class="grid gap-4 grid-cols-2 md:grid-cols-4">
        <div class="sketch-card p-4 sm:p-5 bg-white">
          <p class="text-sm uppercase tracking-wide text-zinc-500 mb-2">WPM</p>
          <p class="text-3xl sm:text-4xl font-bold text-zinc-900 font-sketch">{{ stats.wpm }}</p>
        </div>
        <div class="sketch-card p-4 sm:p-5 bg-white">
          <p class="text-sm uppercase tracking-wide text-zinc-500 mb-2">Accuracy</p>
          <p class="text-3xl sm:text-4xl font-bold text-zinc-900 font-sketch">{{ stats.accuracy }}%</p>
        </div>
        <div class="sketch-card p-4 sm:p-5 bg-white">
          <p class="text-sm uppercase tracking-wide text-zinc-500 mb-2">Progress</p>
          <p class="text-3xl sm:text-4xl font-bold text-zinc-900 font-sketch">{{ stats.progress }}%</p>
        </div>
        <div class="sketch-card p-4 sm:p-5 bg-white">
          <p class="text-sm uppercase tracking-wide text-zinc-500 mb-2">Time</p>
          <p class="text-3xl sm:text-4xl font-bold text-zinc-900 font-sketch">{{ stats.seconds }}s</p>
        </div>
      </div>

      <div class="sketch-card bg-white p-4 sm:p-6 md:p-8">
        <div class="mb-5">
          <div class="flex items-center justify-between text-sm text-zinc-500 mb-2">
            <span>{{ typedEntries.length }} / {{ practiceCharacters.length }} characters</span>
            <span v-if="isFinished" class="font-bold text-emerald-700">Completed</span>
          </div>
          <div class="h-4 sketch-border bg-zinc-100 overflow-hidden">
            <div class="h-full bg-emerald-400 transition-all duration-200" :style="{ width: `${stats.progress}%` }"></div>
          </div>
        </div>

        <div class="typing-surface sketch-border bg-zinc-50/70 p-4 sm:p-5 md:p-8 text-lg sm:text-xl md:text-2xl leading-loose text-zinc-700 break-words">
          <span
            v-for="(char, index) in practiceCharacters"
            :key="`${index}-${char === ' ' ? 'space' : char}`"
            class="typing-char"
            :class="characterClass(index)"
          >
            {{ renderCharacter(char) }}
          </span>
        </div>

        <div class="mt-5 flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm text-zinc-500 italic">
          <span>Green = correct</span>
          <span>Red = incorrect</span>
          <span>Yellow = current character</span>
          <span>Backspace removes your last input</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

definePageMeta({ layout: 'default' })

type TopicOption = { value: string; label: string }
type LengthOption = { value: string; label: string; words: string }
type TypedEntry = { char: string; correct: boolean }
type ModelOption = { id: string; name: string }

const GLOBAL_KEY_STORAGE = 'global_openrouter_key'
const MODEL_STORAGE_KEY = 'typing_generator_model'
const MODEL_CACHE_KEY = 'typing_available_models'
const DEFAULT_MODEL = 'google/gemini-2.0-flash-001'
const DEFAULT_SYSTEM_PROMPT = `You write English typing practice passages.
Always return valid JSON only.
Keep the language natural and easy to type.
Output plain ASCII characters only.
Use only English letters, English numbers, spaces, and English punctuation.
Do not use Chinese punctuation, full-width punctuation, smart punctuation, emojis, accents, symbols outside ASCII, or any other multibyte characters.
The final passage must be pure English text optimized for typing practice.`

const topics: TopicOption[] = [
  { value: 'daily_routines', label: 'Daily Routines' },
  { value: 'work_life', label: 'Work Life' },
  { value: 'travel', label: 'Travel' },
  { value: 'small_talk', label: 'Small Talk' },
  { value: 'technology', label: 'Technology' },
  { value: 'study_habits', label: 'Study Habits' },
  { value: 'health', label: 'Health & Wellness' },
  { value: 'coffee_shop', label: 'Coffee Shop' },
  { value: 'job_interview', label: 'Job Interview' },
  { value: 'movies', label: 'Movies & TV' }
]

const lengthOptions: LengthOption[] = [
  { value: 'short', label: 'Short', words: '80 to 110 words' },
  { value: 'medium', label: 'Medium', words: '130 to 170 words' },
  { value: 'long', label: 'Long', words: '190 to 240 words' }
]

const mode = ref<'input' | 'typing'>('input')
const apiKey = ref('')
const inputText = ref('')
const practiceText = ref('')
const selectedTopic = ref(topics[0].value)
const selectedLength = ref(lengthOptions[1].value)
const selectedModel = ref(DEFAULT_MODEL)
const availableModels = ref<ModelOption[]>([])
const modelSearch = ref('')
const showModelDropdown = ref(false)
const generatorPrompt = ref('')
const loading = ref(false)
const statusMessage = ref('')
const statusTone = ref<'success' | 'error'>('success')

const typedEntries = ref<TypedEntry[]>([])
const startedAt = ref<number | null>(null)
const completedAt = ref<number | null>(null)
const timerNow = ref(Date.now())
const modelSelectorRef = ref<HTMLElement | null>(null)

let timerId: ReturnType<typeof setInterval> | null = null

const normalizedInputText = computed(() => inputText.value.replace(/\r\n?/g, '\n').trim())
const practiceCharacters = computed(() => practiceText.value.split(''))
const correctCount = computed(() => typedEntries.value.filter((entry) => entry.correct).length)
const elapsedMs = computed(() => {
  if (!startedAt.value) return 0
  const end = completedAt.value ?? timerNow.value
  return Math.max(0, end - startedAt.value)
})

const inputStats = computed(() => {
  const clean = normalizedInputText.value
  const words = clean ? clean.split(/\s+/).length : 0
  return {
    characters: clean.length,
    words
  }
})

const stats = computed(() => {
  const total = practiceCharacters.value.length
  const typed = typedEntries.value.length
  const accuracy = typed > 0 ? Math.round((correctCount.value / typed) * 100) : 100
  const progress = total > 0 ? Math.min(100, Math.round((typed / total) * 100)) : 0
  const minutes = elapsedMs.value / 60000
  const wpm = minutes > 0 ? Math.round((correctCount.value / 5) / minutes) : 0

  return {
    wpm,
    accuracy,
    progress,
    seconds: Math.round(elapsedMs.value / 1000)
  }
})

const isFinished = computed(() => practiceCharacters.value.length > 0 && typedEntries.value.length >= practiceCharacters.value.length)

const syncGlobalKey = () => {
  apiKey.value = localStorage.getItem(GLOBAL_KEY_STORAGE) || ''
}

const openGlobalSettings = () => {
  window.dispatchEvent(new Event('open-global-settings'))
}

const setStatus = (message: string, tone: 'success' | 'error' = 'success') => {
  statusMessage.value = message
  statusTone.value = tone
}

const clearStatus = () => {
  statusMessage.value = ''
  statusTone.value = 'success'
}

const sanitizeForTyping = (text: string) => {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[“”«»„‟]/g, '"')
    .replace(/[‘’‚‛‹›]/g, "'")
    .replace(/[—–]/g, '-')
    .replace(/…/g, '...')
    .replace(/[•·]/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[^A-Za-z0-9\s.,!?;:'"()\-]/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const formatText = () => {
  if (!inputText.value.trim()) return
  const before = inputText.value.length
  inputText.value = sanitizeForTyping(inputText.value)
  setStatus(`Formatted text for smoother typing. ${before} chars -> ${inputText.value.length} chars.`)
}

const clearText = () => {
  inputText.value = ''
  clearStatus()
}

const resetTypingState = () => {
  typedEntries.value = []
  startedAt.value = null
  completedAt.value = null
  timerNow.value = Date.now()
}

const startTyping = () => {
  const text = normalizedInputText.value
  if (!text) {
    setStatus('Add some text before starting typing mode.', 'error')
    return
  }
  practiceText.value = text
  resetTypingState()
  clearStatus()
  mode.value = 'typing'
}

const stopTyping = () => {
  mode.value = 'input'
  resetTypingState()
}

const restartTyping = () => {
  if (!practiceText.value) return
  resetTypingState()
}

const renderCharacter = (char: string) => {
  if (char === ' ') return '\u00A0'
  return char
}

const characterClass = (index: number) => {
  const typed = typedEntries.value[index]
  if (typed) {
    return typed.correct ? 'is-correct' : 'is-wrong'
  }
  if (index === typedEntries.value.length) {
    return 'is-current'
  }
  return 'is-upcoming'
}

const topicLabel = computed(() =>
  topics.find((item) => item.value === selectedTopic.value)?.label || selectedTopic.value
)

const lengthLabel = computed(() =>
  lengthOptions.find((item) => item.value === selectedLength.value)?.words || lengthOptions[1].words
)

const filteredModels = computed(() => {
  if (!modelSearch.value) {
    return availableModels.value.slice(0, 50)
  }

  const query = modelSearch.value.toLowerCase()
  return availableModels.value.filter((model) =>
    model.name.toLowerCase().includes(query) || model.id.toLowerCase().includes(query)
  )
})

const parseCachedModels = (raw: string | null): ModelOption[] => {
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is ModelOption =>
      typeof item?.id === 'string' && typeof item?.name === 'string'
    )
  } catch {
    return []
  }
}

const ensureSelectedModel = () => {
  if (availableModels.value.length === 0) return
  if (!availableModels.value.find((model) => model.id === selectedModel.value)) {
    selectedModel.value = availableModels.value[0].id
  }
}

const syncModelSearch = () => {
  const activeModel = availableModels.value.find((model) => model.id === selectedModel.value)
  modelSearch.value = activeModel?.name || selectedModel.value
}

const selectModel = (model: ModelOption) => {
  selectedModel.value = model.id
  modelSearch.value = model.name || model.id
  showModelDropdown.value = false
}

const chooseFirstModel = () => {
  const [firstModel] = filteredModels.value
  if (firstModel) {
    selectModel(firstModel)
  }
}

const handleOutsideClick = (event: MouseEvent) => {
  if (!modelSelectorRef.value) return
  if (!modelSelectorRef.value.contains(event.target as Node)) {
    showModelDropdown.value = false
    syncModelSearch()
  }
}

const fetchModels = async () => {
  const cachedModels = parseCachedModels(localStorage.getItem(MODEL_CACHE_KEY))
  if (cachedModels.length > 0) {
    availableModels.value = cachedModels
    ensureSelectedModel()
    syncModelSearch()
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models')
    const data = await response.json()

    if (Array.isArray(data.data)) {
      const fetchedModels = data.data
        .map((model: any) => ({
          id: model.id,
          name: model.name || model.id
        }))
        .filter((model: ModelOption) => typeof model.id === 'string' && model.id.length > 0)

      if (fetchedModels.length > 0) {
        availableModels.value = fetchedModels
        localStorage.setItem(MODEL_CACHE_KEY, JSON.stringify(fetchedModels))
        ensureSelectedModel()
        syncModelSearch()
      }
    }
  } catch (error) {
    console.error('Failed to fetch typing models:', error)
    if (availableModels.value.length === 0) {
      availableModels.value = [
        { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash' },
        { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
        { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku' }
      ]
      ensureSelectedModel()
      syncModelSearch()
    }
  }
}

const generatePassage = async () => {
  if (!apiKey.value) {
    setStatus('Set your global OpenRouter key before generating text.', 'error')
    return
  }

  loading.value = true
  clearStatus()

  try {
    const prompt = `Write one English typing practice passage about ${topicLabel.value}.
Length target: ${lengthLabel.value}.
Requirements:
- one paragraph only
- natural and readable
- useful for typing practice
- ASCII characters only
- use only English punctuation such as commas, periods, question marks, exclamation marks, semicolons, colons, apostrophes, quotation marks, parentheses, and hyphens
- do not use Chinese commas, Chinese periods, full-width punctuation, curly quotes, em dashes, bullets, emojis, or any non-ASCII character
- no markdown
- no bullet points
- no emojis
- pure English text only

Extra instruction: ${generatorPrompt.value.trim() || 'none'}

Return JSON:
{
  "text": "practice passage"
}`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.value}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Typing Story Lab'
      },
      body: JSON.stringify({
        model: selectedModel.value,
        messages: [
          { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error?.message || 'Failed to generate practice text')
    }

    const data = await response.json()
    const result = JSON.parse(data.choices?.[0]?.message?.content || '{}')
    const generated = typeof result.text === 'string' ? result.text : ''

    if (!generated.trim()) {
      throw new Error('The model returned an empty passage')
    }

    const sanitized = sanitizeForTyping(generated)
    if (!sanitized) {
      throw new Error('The generated passage did not contain usable ASCII typing text')
    }

    inputText.value = sanitized
    setStatus(`Generated a ${selectedLength.value} ${topicLabel.value.toLowerCase()} passage and inserted it into the editor.`)
  } catch (error: any) {
    setStatus(error.message || 'An error occurred while generating text.', 'error')
  } finally {
    loading.value = false
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (mode.value !== 'typing') return

  if (event.key === 'Escape') {
    event.preventDefault()
    stopTyping()
    return
  }

  if (event.metaKey || event.ctrlKey || event.altKey) return

  if (event.key === 'Tab') {
    event.preventDefault()
    return
  }

  if (event.key === 'Backspace') {
    event.preventDefault()
    if (typedEntries.value.length > 0) {
      typedEntries.value.pop()
      completedAt.value = null
    }
    return
  }

  if (isFinished.value) {
    event.preventDefault()
    return
  }

  const expected = practiceCharacters.value[typedEntries.value.length]
  const typedChar = event.key === 'Enter' ? '\n' : event.key

  if (typedChar.length !== 1) return

  event.preventDefault()

  if (!startedAt.value) {
    startedAt.value = Date.now()
  }

  typedEntries.value.push({
    char: typedChar,
    correct: typedChar === expected
  })

  if (typedEntries.value.length >= practiceCharacters.value.length) {
    completedAt.value = Date.now()
  }
}

const startTimer = () => {
  if (timerId) return
  timerId = window.setInterval(() => {
    timerNow.value = Date.now()
  }, 250)
}

const stopTimer = () => {
  if (!timerId) return
  window.clearInterval(timerId)
  timerId = null
}

watch(selectedModel, (value) => {
  if (process.client) {
    localStorage.setItem(MODEL_STORAGE_KEY, value)
  }
  syncModelSearch()
})

watch(mode, (value) => {
  if (!process.client) return
  if (value === 'typing') {
    startTimer()
  } else {
    stopTimer()
  }
})

onMounted(() => {
  syncGlobalKey()
  selectedModel.value = localStorage.getItem(MODEL_STORAGE_KEY) || DEFAULT_MODEL
  syncModelSearch()
  fetchModels()
  window.addEventListener('storage', syncGlobalKey)
  window.addEventListener('global-openrouter-key-updated', syncGlobalKey as EventListener)
  window.addEventListener('keydown', handleKeydown)
  document.addEventListener('mousedown', handleOutsideClick)
})

onUnmounted(() => {
  stopTimer()
  window.removeEventListener('storage', syncGlobalKey)
  window.removeEventListener('global-openrouter-key-updated', syncGlobalKey as EventListener)
  window.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('mousedown', handleOutsideClick)
})
</script>

<style scoped>
.typing-surface {
  min-height: 280px;
  white-space: pre-wrap;
  word-break: break-word;
}

.typing-char {
  display: inline-block;
  min-width: 0.45em;
  border-radius: 0.3rem;
  transition: background-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
}

.typing-char.is-upcoming {
  color: #94a3b8;
}

.typing-char.is-current {
  color: #18181b;
  background: #fef3c7;
  box-shadow: inset 0 -3px 0 #f59e0b;
  transform: translateY(-1px);
}

.typing-char.is-correct {
  color: #166534;
  background: #dcfce7;
}

.typing-char.is-wrong {
  color: #b91c1c;
  background: #fee2e2;
}
</style>
