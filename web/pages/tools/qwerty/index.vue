<template>
  <div class="min-h-screen bg-zinc-50 flex flex-col justify-center items-center">
    <!-- 顶部统计 -->
    <div class="flex space-x-8 mb-12 text-center">
      <div>
        <div class="text-zinc-500 text-sm">WPM</div>
        <div class="text-2xl font-bold text-zinc-900">{{ stats.wpm }}</div>
      </div>
      <div>
        <div class="text-zinc-500 text-sm">Accuracy</div>
        <div class="text-2xl font-bold text-zinc-900">{{ stats.accuracy }}%</div>
      </div>
      <div>
        <div class="text-zinc-500 text-sm">Time</div>
        <div class="text-2xl font-bold text-zinc-900">{{ stats.time }}s</div>
      </div>
    </div>

    <!-- 缓存统计 -->
    <div v-if="!customParagraphMode" class="mb-2 text-sm text-zinc-500 flex items-center space-x-4">
      <span>已掌握：<span class="font-bold text-green-600">{{ correctCount }}</span> / <span class="font-bold">{{ totalWords }}</span></span>
      <span>待练习：<span class="font-bold text-blue-600">{{ remainCount }}</span></span>
    </div>

    <!-- 字典选择 -->
    <div v-if="!customParagraphMode" class="mb-6 flex items-center space-x-2">
      <label for="dict" class="text-sm text-zinc-600">Dictionary:</label>
      <select id="dict" v-model="selectedDict" class="text-sm border border-zinc-300 rounded-md px-2 py-1">
        <option v-for="dict in dictFiles" :key="dict" :value="dict">{{ dict }}</option>
      </select>
      <label for="difficulty" class="text-sm text-zinc-600 ml-4">Difficulty:</label>
      <select id="difficulty" v-model="selectedDifficulty" class="text-sm border border-zinc-300 rounded-md px-2 py-1">
        <option value="all">All</option>
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>
      <button @click="playClick(); nextGroup()" class="ml-4 px-3 py-1 bg-zinc-100 text-zinc-800 rounded hover:bg-zinc-200">Next</button>
      <label class="ml-4 flex items-center cursor-pointer select-none">
        <input type="checkbox" v-model="autoSpeak" class="mr-1 align-middle" />
        <span class="text-sm text-zinc-600">自动发音</span>
      </label>
      <label class="ml-4 flex items-center cursor-pointer select-none">
        <input type="checkbox" v-model="isRandom" class="mr-1 align-middle" />
        <span class="text-sm text-zinc-600">随机抽取</span>
      </label>
      <label class="ml-4 flex items-center cursor-pointer select-none">
        <input type="checkbox" v-model="showTrans" class="mr-1 align-middle" />
        <span class="text-sm text-zinc-600">显示翻译</span>
      </label>
      <button @click="clearCorrectIndexes(selectedDict); correctIndexes = []; nextGroup();" class="ml-4 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 border border-red-200">清除缓存</button>
    </div>

    <!-- 自定义段落模式 -->
    <div class="mb-6 flex items-center space-x-6">
      <label class="flex items-center cursor-pointer select-none">
        <input type="checkbox" v-model="customParagraphMode" class="mr-1 align-middle" />
        <span class="text-sm text-zinc-600">自定义段落</span>
      </label>
      <label class="flex items-center cursor-pointer select-none">
        <input type="checkbox" v-model="dictationMode" class="mr-1 align-middle" />
        <span class="text-sm text-zinc-600">默写模式</span>
      </label>
      <template v-if="!customParagraphMode">
        <!-- 原有字典选择、难度、缓存、自动发音、随机抽取等 -->
        <!-- ...原有内容... -->
      </template>
    </div>
    <template v-if="customParagraphMode">
      <div class="mb-4 w-full flex flex-col items-center">
        <textarea v-model="customParagraph" rows="6" class="w-[600px] border border-zinc-300 rounded p-2 text-base" placeholder="粘贴英文段落，每行或每句为一题"></textarea>
        <button @click="startCustomPractice" class="mt-2 px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">开始练习</button>
      </div>
    </template>

    <!-- 打字区 -->
    <div v-if="(!customParagraphMode) || (customParagraphMode && customPracticeStarted)" class="relative bg-white px-8 py-12 rounded-lg shadow-md border border-zinc-200 min-w-[800px] min-h-[180px] flex flex-col items-center justify-center mb-8 select-none text-4xl font-mono tracking-wide outline-none focus:outline-none" tabindex="0" @click="focusTypingArea" ref="typingArea" @focus="handleFocus" @blur="handleBlur">
      <!-- 打字区：根据默写模式切换显示 -->
      <template v-if="!dictationMode">
        <div class="flex items-center space-x-3">
          <!-- 原有字符显示 -->
          <span>
            <span v-for="(char, idx) in currentChunk.text.split('')" :key="idx">
              <span v-if="idx < typedChars.length"
                :class="typedChars[idx].correct ? 'text-green-600' : 'text-red-500 underline'">
                {{ char }}
              </span>
              <span v-else-if="idx === typedChars.length"
                class="text-blue-600 underline font-bold animate-pulse">
                {{ char }}
              </span>
              <span v-else class="text-zinc-400">{{ char }}</span>
            </span>
          </span>
          <button @click="speakWord(currentChunk.text)" 
            class="ml-4 w-10 h-10 flex items-center justify-center rounded-full bg-zinc-200 hover:bg-blue-200 text-xl shadow-sm focus:outline-none border border-zinc-100"
            title="播放发音">
            <span role="img" aria-label="sound">🔊</span>
          </button>
        </div>
      </template>
      <template v-else>
        <!-- 默写模式内容：始终显示下划线，用户输入覆盖，下方显示答案 -->
        <div class="flex items-center space-x-6">
          <!-- 下划线和用户输入 -->
          <span>
            <span v-for="(_, idx) in currentChunk.text.split('')" :key="idx" class="dictation-char">
              <span v-if="idx < typedChars.length">{{ typedChars[idx].char }}</span>
              <span v-else class="dictation-underline">_</span>
            </span>
          </span>
          <!-- 发音按钮 -->
          <button @click="speakWord(currentChunk.text)"
            class="ml-4 w-10 h-10 flex items-center justify-center rounded-full bg-zinc-200 hover:bg-blue-200 text-xl shadow-sm focus:outline-none border border-zinc-100"
            title="播放发音">
            <span role="img" aria-label="sound">🔊</span>
          </button>
        </div>
        <!-- 显示答案 -->
        <div v-if="showAnswer" :class="['mt-4','font-mono','text-2xl', lastCorrect ? 'text-green-600' : 'text-red-500']">
          {{ currentChunk.text }}
        </div>
      </template>
      <div v-if="!customParagraphMode">
        <div v-if="currentChunk.usphone || currentChunk.ukphone" class="mt-1 text-xs text-zinc-400 text-center">
          <span v-if="currentChunk.usphone">美: [{{ currentChunk.usphone }}]</span>
          <span v-if="currentChunk.ukphone" class="ml-2">英: [{{ currentChunk.ukphone }}]</span>
        </div>
        <div v-if="showTrans && currentChunk.trans && currentChunk.trans.length" class="mt-2 text-base text-zinc-500 text-center">
          <span v-for="(tran, i) in currentChunk.trans" :key="i">{{ tran }}</span>
        </div>
        <div v-if="currentChunk.example" class="mt-2 text-base text-zinc-400 italic text-center">
          <div v-if="Array.isArray(currentChunk.example)">
            <div v-for="(ex, i) in currentChunk.example" :key="i">{{ ex }}</div>
          </div>
          <div v-else>{{ currentChunk.example }}</div>
        </div>
      </div>
    </div>

    <!-- 进度 -->
    <div v-if="(!customParagraphMode) || (customParagraphMode && customPracticeStarted)" class="text-sm text-zinc-500 mb-8">{{ completedChunks }} / {{ totalChunks }} completed</div>

    <!-- 结束弹窗 -->
    <div v-if="showResults" class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-lg p-8 min-w-[320px] text-center">
        <h2 class="text-xl font-bold mb-4 text-zinc-900">Practice Results</h2>
        <div class="mb-2">WPM: <span class="font-bold">{{ stats.wpm }}</span></div>
        <div class="mb-2">Accuracy: <span class="font-bold">{{ stats.accuracy }}%</span></div>
        <div class="mb-4">Time: <span class="font-bold">{{ stats.time }}s</span></div>
        <button @click="resetPractice" class="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Start New Practice</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'

interface TypingChunk {
  id: string
  text: string
  difficulty: string
  trans?: string[]
  usphone?: string
  ukphone?: string
  example?: string | string[]
}

interface PracticeResult {
  text: string
  correct: boolean
  time: number
}

const dictFiles = ref<string[]>([])
const selectedDict = ref('')
const chunks = ref<TypingChunk[]>([])
const currentGroupIndex = ref(0)
const selectedDifficulty = ref('all')
const practiceHistory = ref<PracticeResult[]>([])
const showResults = ref(false)
const typingArea = ref<HTMLElement | null>(null)

// 打字状态
const typedChars = ref<{char: string, correct: boolean}[]>([])
const startTime = ref(0)
const isPracticing = ref(false)

// 当前组和索引
const currentGroup = ref<TypingChunk[]>([])
const currentGroupIndexes = ref<number[]>([]);

const currentChunk = computed(() => currentGroup.value[currentGroupIndex.value] || { text: 'Loading...', id: '0', difficulty: 'easy' })
const totalChunks = computed(() => currentGroup.value.length)
const completedChunks = computed(() => currentGroupIndex.value)

const stats = computed(() => {
  if (!practiceHistory.value || practiceHistory.value.length === 0) {
    return { wpm: 0, accuracy: 0, time: 0 }
  }
  const totalTime = practiceHistory.value.reduce((sum, result) => sum + result.time, 0)
  const correctCount = practiceHistory.value.filter(result => result.correct).length
  const totalWords = practiceHistory.value.reduce((sum, result) => sum + result.text.split(' ').length, 0)
  const accuracy = Math.round((correctCount / practiceHistory.value.length) * 100)
  const wpm = totalTime > 0 ? Math.round((totalWords / totalTime) * 60) : 0
  return { wpm, accuracy, time: Math.round(totalTime) }
})

const difficultyWordCount: Record<string, number> = {
  easy: 5,
  medium: 10,
  hard: 20,
  all: 5 // 默认
}

const autoSpeak = ref(true)
const isRandom = ref(true) // 是否随机，默认随机
const showTrans = ref(true)
const dictationMode = ref(false)
const showAnswer = ref(false)
const lastCorrect = ref(false)

// 存储和读取本地已答对索引
function getCorrectIndexesKey(dict: string) {
  return `qwerty_correct_${dict}`
}
function loadCorrectIndexes(dict: string): number[] {
  try {
    const raw = localStorage.getItem(getCorrectIndexesKey(dict))
    if (!raw) return []
    return JSON.parse(raw)
  } catch { return [] }
}
function saveCorrectIndexes(dict: string, indexes: number[]) {
  localStorage.setItem(getCorrectIndexesKey(dict), JSON.stringify(indexes))
}
function clearCorrectIndexes(dict: string) {
  localStorage.removeItem(getCorrectIndexesKey(dict))
}
const correctIndexes = ref<number[]>([])

// 预加载音效
let clickAudio: HTMLAudioElement | null = null
let correctAudio: HTMLAudioElement | null = null
let beepAudio: HTMLAudioElement | null = null

if (process.client) {
  clickAudio = new Audio('/qwerty/sounds/click.wav')
  correctAudio = new Audio('/qwerty/sounds/correct.wav')
  beepAudio = new Audio('/qwerty/sounds/beep.wav')
}

function playClick() {
  if (clickAudio) {
    clickAudio.currentTime = 0
    clickAudio.play()
  }
}

function playCorrect() {
  if (correctAudio) {
    correctAudio.currentTime = 0
    correctAudio.play()
  }
}

function playBeep() {
  if (beepAudio) {
    beepAudio.currentTime = 0
    beepAudio.play()
  }
}

function speakWord(word: string) {
  if (process.client && word) {
    // 先取消上一次的发音，防止队列堆积
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    const utter = new window.SpeechSynthesisUtterance(word)
    utter.lang = 'en-US'
    // 优先选择自然的英文女声
    const voices = window.speechSynthesis.getVoices()
    const enVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Google US English') || v.name.includes('English')))
    if (enVoice) utter.voice = enVoice
    window.speechSynthesis.speak(utter)
  }
}

watch([currentGroup, currentGroupIndex, autoSpeak], ([group, idx, auto]) => {
  if (auto && group && group[idx] && group[idx].text) {
    speakWord(group[idx].text)
  }
})

// 获取所有字典文件名（假设后端/构建时可注入，或用静态配置）
async function fetchDictFiles() {
  // 由于 public 目录无法直接列目录，需手动维护或构建时注入
  // 这里假设有个静态文件 dicts/index.json 记录所有字典文件名
  try {
    const res = await fetch('/qwerty/dicts/index.json')
    dictFiles.value = await res.json()
    if (dictFiles.value.length > 0) {
      selectedDict.value = dictFiles.value[0]
    }
  } catch (e) {
    dictFiles.value = []
  }
}

// 加载选中字典内容
async function loadChunksFromDict() {
  if (!selectedDict.value) return
  try {
    const res = await fetch(`/qwerty/dicts/${selectedDict.value}`)
    const data = await res.json()
    // 适配为 TypingChunk 结构，保留音标和例句
    chunks.value = data.map((item: any, idx: number) => ({
      id: String(idx),
      text: item.name,
      difficulty: 'all', // 可根据需要扩展
      trans: item.trans,
      usphone: item.usphone,
      ukphone: item.ukphone,
      example: item.example
    }))
    correctIndexes.value = loadCorrectIndexes(selectedDict.value)
  } catch (e) {
    chunks.value = []
    correctIndexes.value = []
  }
}

const filterChunksByDifficulty = () => {
  return chunks.value
}

const nextGroup = () => {
  const filteredChunks = filterChunksByDifficulty()
  if (filteredChunks.length === 0) return
  // 排除已答对的
  const available = filteredChunks.filter((_, idx) => !correctIndexes.value.includes(idx))
  if (available.length === 0) {
    // 全部做完，重置再抽题
    correctIndexes.value = []
    saveCorrectIndexes(selectedDict.value, [])
    return nextGroup()
  }
  let group: TypingChunk[] = []
  if (selectedDifficulty.value === 'all') {
    // all 模式：直接使用全部可用项
    group = available
  } else {
    // 按难度分组
    const wordCount = difficultyWordCount[selectedDifficulty.value] || 5
    if (isRandom.value) {
      const shuffled = available.slice().sort(() => Math.random() - 0.5)
      group = shuffled.slice(0, wordCount)
    } else {
      group = available.slice(0, wordCount)
    }
  }
  currentGroup.value = group
  // 记录当前组在原数组中的索引（用于存储）
  currentGroupIndexes.value = group.map(chunk => chunks.value.findIndex(c => c.id === chunk.id))
  // 开始新组时重置练习历史和状态，清空统计
  practiceHistory.value = []
  currentGroupIndex.value = 0
  typedChars.value = []
  startTime.value = 0
  isPracticing.value = false
  showResults.value = false
  nextTick(() => {
    focusTypingArea()
  })
}

const focusTypingArea = () => {
  if (typingArea.value) typingArea.value.focus()
}

// 新增：聚焦和失焦事件处理
const handleFocus = () => {
  window.addEventListener('keydown', handleKeydown)
}
const handleBlur = () => {
  window.removeEventListener('keydown', handleKeydown)
}

const customParagraphMode = ref(false)
const customParagraph = ref('')
const customChunks = ref<TypingChunk[]>([])
const customPracticeStarted = ref(false)

function startCustomPractice() {
  // 按段落分句或直接整段
  const text = customParagraph.value.trim()
  if (!text) return
  practiceHistory.value = []  // 清空练习历史，重置统计
  // 可按句号/换行分句，也可整段
  // 这里简单按换行或句号分句
  const sentences = text.split(/\n+|(?<=[.!?])\s+/).filter(s => s.trim().length > 0)
  customChunks.value = sentences.map((s, idx) => ({
    id: String(idx),
    text: s,
    difficulty: 'all'
  }))
  currentGroup.value = customChunks.value
  currentGroupIndex.value = 0
  typedChars.value = []
  startTime.value = 0
  isPracticing.value = false
  showResults.value = false
  customPracticeStarted.value = true
  nextTick(() => {
    focusTypingArea()
  })
}

// 打字区只在满足以下条件时显示：
// 1. 非自定义段落模式，或 2. 自定义段落模式且 customPracticeStarted

// handleKeydown 逻辑兼容 customParagraphMode，customPracticeStarted 结束时直接重置 customPracticeStarted
const handleKeydown = (e: KeyboardEvent) => {
  if (showResults.value) return
  // 默写模式：Enter 触发下一项
  if (dictationMode.value && e.key === 'Enter' && showAnswer.value) {
    showAnswer.value = false
    typedChars.value = []
    if (currentGroupIndex.value < currentGroup.value.length - 1) {
      currentGroupIndex.value++
      startTime.value = 0
      nextTick(() => focusTypingArea())
    } else {
      if (customParagraphMode.value) {
        customPracticeStarted.value = false
      } else {
        nextGroup()
      }
    }
    e.preventDefault()
    return
  }
  if (!isPracticing.value) {
    startTime.value = Date.now()
    isPracticing.value = true
  }
  // 空格键阻止页面滚动
  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault()
  }
  if (e.key === 'Backspace') {
    if (typedChars.value.length > 0) {
      typedChars.value.pop()
      playClick()
    }
    e.preventDefault()
    return
  }
  if (e.key.length === 1) {
    const idx = typedChars.value.length
    const expected = currentChunk.value.text[idx] || ''
    const correct = e.key === expected
    typedChars.value.push({ char: e.key, correct })
    if (typedChars.value.length < currentChunk.value.text.length) {
      // 在默写模式下所有按键使用点击音
      if (dictationMode.value) {
        playClick()
      } else if (correct) {
        playClick()
      } else {
        playBeep()
      }
    } else {
      // 单词/句子打完
      const endTime = Date.now()
      const timeSpent = (endTime - startTime.value) / 1000
      const isCorrect = typedChars.value.every((c, i) => c.char === currentChunk.value.text[i])
      practiceHistory.value.push({
        text: currentChunk.value.text,
        correct: isCorrect,
        time: timeSpent
      })
      isPracticing.value = false
      if (isCorrect) {
        if (!customParagraphMode.value) {
          correctIndexes.value.push(currentGroupIndexes.value[currentGroupIndex.value])
          saveCorrectIndexes(selectedDict.value, correctIndexes.value)
        }
        playCorrect()
      } else {
        playBeep()
      }
      // 默写模式：记录并显示答案，等待 Enter
      if (dictationMode.value) {
        lastCorrect.value = isCorrect
        showAnswer.value = true
      } else {
        // 非默写模式：延迟操作，保证最后一个字符高亮可见
        setTimeout(() => {
          if (customParagraphMode.value) {
            if (currentGroupIndex.value < currentGroup.value.length - 1) {
              currentGroupIndex.value++
              typedChars.value = []
              startTime.value = 0
              nextTick(() => focusTypingArea())
            } else {
              customPracticeStarted.value = false
            }
          } else if (currentGroupIndex.value < currentGroup.value.length - 1) {
            currentGroupIndex.value++
            typedChars.value = []
            startTime.value = 0
            nextTick(() => focusTypingArea())
          } else {
            if (selectedDifficulty.value === 'all') {
              nextGroup()
            } else {
              showResults.value = true
            }
          }
        }, 500)
      }
    }
  }
}

onMounted(async () => {
  await fetchDictFiles()
  await loadChunksFromDict()
  nextGroup()
  // 不再全局监听，改为聚焦时监听
  // window.addEventListener('keydown', handleKeydown)
  nextTick(() => {
    focusTypingArea()
  })
})

// 切换字典或难度时，直接生成新组
watch(selectedDict, async () => {
  await loadChunksFromDict()
  nextGroup()
})
watch(selectedDifficulty, () => {
  nextGroup()
})

// 切换自定义段落模式时，重置统计和答案显示
watch(customParagraphMode, (val) => {
  if (val) {
    practiceHistory.value = []
    showResults.value = false
    showAnswer.value = false
  }
})

// 统计信息
const totalWords = computed(() => chunks.value.length)
const correctCount = computed(() => correctIndexes.value.length)
const remainCount = computed(() => totalWords.value - correctCount.value)

const resetPractice = () => {
  practiceHistory.value = []
  showResults.value = false
  typedChars.value = []
  isPracticing.value = false
  nextGroup()
}
</script>

<style scoped>
.min-w-\[800px\] { min-width: 800px; }
.min-h-\[180px\] { min-height: 180px; }
.animate-pulse {
  animation: pulse 1s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
/* 默写模式下划线和字母间距 */
.dictation-char {
  display: inline-block;
  letter-spacing: 0.4em;
  font-size: 1.2em;
}
.dictation-underline {
  border-bottom: 2.5px solid #222;
  padding: 0 0.18em;
  font-size: 1.2em;
}
</style> 