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
              <button 
                v-if="isBrowserEnv"
                @click="toggleTextToSpeech"
                class="text-zinc-500 hover:text-zinc-700 flex items-center space-x-1 text-sm"
                :class="{ 'text-blue-500': isPlaying }"
              >
                <i class="pi" :class="isPlaying ? 'pi-pause' : 'pi-play'"></i>
                <span>{{ isPlaying ? 'Stop' : 'Read' }}</span>
              </button>
              <button 
                v-if="isBrowserEnv"
                @click="copyScenario"
                class="text-zinc-500 hover:text-zinc-700 flex items-center space-x-1 text-sm"
                :class="{ 'text-green-500': copied }"
              >
                <i class="pi" :class="copied ? 'pi-check' : 'pi-copy'"></i>
                <span>{{ copied ? 'Copied!' : 'Copy' }}</span>
              </button>
            </div>
          </div>
          <div class="prose prose-zinc max-w-none mt-4">
            <div class="bg-zinc-50 rounded-lg p-6">
              <div class="space-y-4">
                <div v-for="(message, index) in formatDialogue(scenario.content)" 
                   :key="index" 
                   class="dialogue-line"
                >
                  <div class="flex items-baseline space-x-3">
                    <span class="speaker-name text-sm font-medium" 
                          :class="index % 2 === 0 ? 'text-pink-600' : 'text-blue-600'">
                      {{ index % 2 === 0 ? 'Sarah' : 'Mark' }}:
                    </span>
                    <div v-html="highlightChunks(message)" 
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

const config = useRuntimeConfig()
const numChunks = ref(5)
const topic = ref('daily_routines')
const chunks = ref<Array<{ phrase: string; examples: string[] }>>([])
const scenario = ref<{ title: string; context: string; content: string } | null>(null)
const loading = ref(false)
const error = ref('')
const copied = ref(false)
const isPlaying = ref(false)

// 检查是否在浏览器环境
const isBrowserEnv = computed(() => process.client)

// 仅在浏览器环境中初始化语音合成
let speechSynthesis: SpeechSynthesis | undefined
let utterance: SpeechSynthesisUtterance | null = null

if (isBrowserEnv.value) {
  speechSynthesis = window.speechSynthesis
}

// 判断内容是否为对话形式
const isDialogue = (content: string): boolean => {
  if (!content) return false
  // 检查是否包含引号和说话者标识
  return content.includes('"') && 
         (content.includes('said') || 
          content.includes('replied') || 
          content.includes('asked') ||
          content.includes('exclaimed') ||
          content.includes('added') ||
          content.includes('continued') ||
          content.includes('responded') ||
          content.includes('chuckled') ||
          content.includes('laughed') ||
          content.includes('sighed'))
}

// 格式化对话内容
const formatDialogue = (content: string): string[] => {
  if (!content) return []
  
  // 移除说话者标识词（said, replied等）
  let cleanContent = content
    .replace(/"([^"]+)"/g, '$1') // 移除引号
    .replace(/\s*(said|replied|asked|chuckled|sighed|added|continued|responded|laughed|exclaimed)[^.]*/g, '')
    .replace(/Sarah:|Mark:/g, '') // 移除说话者标识
    .replace(/\s+/g, ' ') // 规范化空格
    .trim()
  
  // 按句子分割
  let sentences = cleanContent.split(/[.!?]+\s*/)
  
  // 过滤空句子并整理格式
  return sentences
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

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
  if (!speechSynthesis) return
  
  if (isPlaying.value) {
    speechSynthesis.cancel()
    isPlaying.value = false
  } else if (scenario.value) {
    const lines = formatDialogue(scenario.value.content)
    lines.forEach((line, index) => {
      const utterance = new SpeechSynthesisUtterance(line)
      // 设置不同的声音
      const voices = window.speechSynthesis.getVoices()
      const femaleVoice = voices.find(voice => voice.name.toLowerCase().includes('female'))
      const maleVoice = voices.find(voice => voice.name.toLowerCase().includes('male'))
      
      if (index % 2 === 0 && femaleVoice) {
        utterance.voice = femaleVoice
        utterance.pitch = 1.1
      } else if (maleVoice) {
        utterance.voice = maleVoice
        utterance.pitch = 0.9
      }
      
      if (index === lines.length - 1) {
        utterance.onend = () => {
          isPlaying.value = false
        }
      }
      speechSynthesis.speak(utterance)
    })
    isPlaying.value = true
  }
}

// 高亮显示chunks
const highlightChunks = (text: string): string => {
  if (!text || !chunks.value) return text
  let highlightedText = text
  chunks.value.forEach(chunk => {
    if (chunk.phrase) {
      const regex = new RegExp(`(${chunk.phrase})`, 'gi')
      highlightedText = highlightedText.replace(regex, '<span class="chunk-highlight">$1</span>')
    }
  })
  return highlightedText
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