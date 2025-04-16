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

    <!-- 字典选择 -->
    <div class="mb-6 flex items-center space-x-2">
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
    </div>

    <!-- 打字区 -->
    <div class="relative bg-white px-8 py-12 rounded-lg shadow-md border border-zinc-200 min-w-[800px] min-h-[180px] flex flex-col items-center justify-center mb-8 select-none text-4xl font-mono tracking-wide outline-none focus:outline-none" tabindex="0" @click="focusTypingArea" ref="typingArea">
      <div class="flex items-center space-x-3">
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
        <button @click="playClick(); speakWord(currentChunk.text)" 
          class="ml-4 w-10 h-10 flex items-center justify-center rounded-full bg-zinc-200 hover:bg-blue-200 text-xl shadow-sm focus:outline-none border border-zinc-100"
          title="播放发音">
          <span role="img" aria-label="sound">🔊</span>
        </button>
      </div>
      <div v-if="currentChunk.trans && currentChunk.trans.length" class="mt-4 text-base text-zinc-500 text-center">
        <span v-for="(tran, i) in currentChunk.trans" :key="i">{{ tran }}</span>
      </div>
      <div v-if="currentChunk.usphone || currentChunk.ukphone" class="mt-1 text-xs text-zinc-400 text-center">
        <span v-if="currentChunk.usphone">美: [{{ currentChunk.usphone }}]</span>
        <span v-if="currentChunk.ukphone" class="ml-2">英: [{{ currentChunk.ukphone }}]</span>
      </div>
    </div>

    <!-- 进度 -->
    <div class="text-sm text-zinc-500 mb-8">{{ completedChunks }} / {{ totalChunks }} completed</div>

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

// 预加载音效
const clickAudio = new Audio('/qwerty/sounds/click.wav')
const correctAudio = new Audio('/qwerty/sounds/correct.wav')
const beepAudio = new Audio('/qwerty/sounds/beep.wav')

function playClick() {
  clickAudio.currentTime = 0
  clickAudio.play()
}
function playCorrect() {
  correctAudio.currentTime = 0
  correctAudio.play()
}
function playBeep() {
  beepAudio.currentTime = 0
  beepAudio.play()
}

function speakWord(word: string) {
  if (!word) return
  const utter = new window.SpeechSynthesisUtterance(word)
  utter.lang = 'en-US'
  window.speechSynthesis.speak(utter)
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
    // 适配为 TypingChunk 结构，保留音标
    chunks.value = data.map((item: any, idx: number) => ({
      id: String(idx),
      text: item.name,
      difficulty: 'all', // 可根据需要扩展
      trans: item.trans,
      usphone: item.usphone,
      ukphone: item.ukphone
    }))
  } catch (e) {
    chunks.value = []
  }
}

const filterChunksByDifficulty = () => {
  return chunks.value
}

const nextGroup = () => {
  const filteredChunks = filterChunksByDifficulty()
  if (filteredChunks.length === 0) return
  const wordCount = difficultyWordCount[selectedDifficulty.value] || 5
  // 随机抽取 wordCount 个单词
  const shuffled = filteredChunks.slice().sort(() => Math.random() - 0.5)
  const group = shuffled.slice(0, wordCount)
  currentGroup.value = group
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

const handleKeydown = (e: KeyboardEvent) => {
  if (showResults.value) return
  if (!isPracticing.value) {
    startTime.value = Date.now()
    isPracticing.value = true
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
    if (correct) {
      playCorrect()
    } else {
      playBeep()
    }
    // 结束判断：单词打完
    if (typedChars.value.length >= currentChunk.value.text.length) {
      const endTime = Date.now()
      const timeSpent = (endTime - startTime.value) / 1000
      const isCorrect = typedChars.value.every((c, i) => c.char === currentChunk.value.text[i])
      practiceHistory.value.push({
        text: currentChunk.value.text,
        correct: isCorrect,
        time: timeSpent
      })
      isPracticing.value = false
      // 如果还有下一个单词，切换到下一个
      if (currentGroupIndex.value < currentGroup.value.length - 1) {
        currentGroupIndex.value++
        typedChars.value = []
        startTime.value = 0
        nextTick(() => {
          focusTypingArea()
        })
      } else {
        // 组结束，弹窗成绩
        showResults.value = true
      }
    }
  }
}

const resetPractice = () => {
  practiceHistory.value = []
  showResults.value = false
  typedChars.value = []
  isPracticing.value = false
  nextGroup()
}

onMounted(async () => {
  await fetchDictFiles()
  await loadChunksFromDict()
  nextGroup()
  window.addEventListener('keydown', handleKeydown)
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
</style> 