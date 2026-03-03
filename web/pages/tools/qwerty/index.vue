<template>
  <div class="min-h-screen bg-zinc-50 flex flex-col justify-center items-center py-12 px-4">
    <ClientOnly>
      <!-- Title -->
      <h1 class="text-5xl font-bold font-hand mb-12 transform -rotate-2">Qwerty Practice</h1>

      <!-- 顶部统计 -->
      <div class="flex space-x-12 mb-12 text-center sketch-border-2 p-6 bg-white relative">
        <div class="absolute -top-4 -left-4 bg-yellow-100 border border-black px-2 font-hand transform -rotate-12">Stats</div>
        <div>
          <div class="text-zinc-500 font-hand text-lg">WPM</div>
          <div class="text-3xl font-bold text-zinc-900 font-sketch">{{ stats.wpm }}</div>
        </div>
        <div class="border-l-2 border-zinc-200 h-12 self-center mx-2"></div>
        <div>
          <div class="text-zinc-500 font-hand text-lg">Accuracy</div>
          <div class="text-3xl font-bold text-zinc-900 font-sketch">{{ stats.accuracy }}%</div>
        </div>
        <div class="border-l-2 border-zinc-200 h-12 self-center mx-2"></div>
        <div>
          <div class="text-zinc-500 font-hand text-lg">Time</div>
          <div class="text-3xl font-bold text-zinc-900 font-sketch">{{ stats.time }}s</div>
        </div>
      </div>

      <!-- 缓存统计 -->
      <div v-if="!customParagraphMode" class="mb-6 text-xl font-hand text-zinc-600 flex items-center space-x-6">
        <span>已掌握：<span class="font-bold text-green-600 underline decoration-wavy">{{ correctCount }}</span> / <span class="font-bold">{{ totalWords }}</span></span>
        <span>待练习：<span class="font-bold text-blue-600 underline decoration-dotted">{{ remainCount }}</span></span>
      </div>

      <!-- 字典选择 -->
      <div v-if="!customParagraphMode" class="mb-8 flex flex-wrap items-center justify-center gap-4 sketch-border-3 p-4 bg-white">
        <div class="flex items-center space-x-2">
          <label for="dict" class="text-lg font-hand text-zinc-800">Dictionary:</label>
          <select id="dict" v-model="selectedDict" class="font-hand text-lg border-2 border-black rounded px-3 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-200">
            <option v-for="dict in dictFiles" :key="dict" :value="dict">{{ dict }}</option>
          </select>
        </div>
        
        <div class="flex items-center space-x-2">
          <label for="difficulty" class="text-lg font-hand text-zinc-800">Difficulty:</label>
          <select id="difficulty" v-model="selectedDifficulty" class="font-hand text-lg border-2 border-black rounded px-3 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-200">
            <option value="all">All</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <button @click="playClick(); nextGroup()" class="sketch-button bg-blue-50">Next Group →</button>
        
        <div class="flex items-center gap-4 ml-4">
          <label class="flex items-center cursor-pointer select-none font-hand text-lg">
            <input type="checkbox" v-model="autoSpeak" class="mr-2 w-5 h-5 accent-zinc-900" />
            自动发音
          </label>
          <label class="flex items-center cursor-pointer select-none font-hand text-lg">
            <input type="checkbox" v-model="isRandom" class="mr-2 w-5 h-5 accent-zinc-900" />
            随机抽取
          </label>
          <label class="flex items-center cursor-pointer select-none font-hand text-lg">
            <input type="checkbox" v-model="showTrans" class="mr-2 w-5 h-5 accent-zinc-900" />
            显示翻译
          </label>
        </div>
        
        <button @click="clearCorrectIndexes(selectedDict); correctIndexes = []; nextGroup();" class="sketch-button bg-red-50 text-red-700 !border-red-900">清除缓存</button>
      </div>

      <!-- 自定义段落模式 -->
      <div class="mb-8 flex items-center space-x-12">
        <label class="flex items-center cursor-pointer select-none font-hand text-2xl">
          <input type="checkbox" v-model="customParagraphMode" class="mr-3 w-6 h-6 accent-zinc-900" />
          🎨 自定义段落
        </label>
        <label class="flex items-center cursor-pointer select-none font-hand text-2xl">
          <input type="checkbox" v-model="dictationMode" class="mr-3 w-6 h-6 accent-zinc-900" />
          ✍️ 默写模式
        </label>
      </div>

      <template v-if="customParagraphMode">
        <div class="mb-12 w-full flex flex-col items-center">
          <textarea v-model="customParagraph" rows="6" 
            class="w-full max-w-2xl sketch-border-2 p-6 text-xl font-hand bg-white focus:outline-none focus:ring-4 focus:ring-blue-100" 
            placeholder="Paste English text here, each line or sentence will be one task..."></textarea>
          <button @click="startCustomPractice" class="sketch-button bg-green-50 mt-6 text-xl px-8 py-3">Start Practice! 🚀</button>
        </div>
      </template>

      <!-- 打字区 -->
      <div v-if="(!customParagraphMode) || (customParagraphMode && customPracticeStarted)" 
        class="relative sketch-card bg-white px-12 py-16 min-w-[800px] min-h-[220px] flex flex-col items-center justify-center mb-12 select-none text-5xl font-sketch tracking-wider outline-none focus:ring-4 focus:ring-yellow-100 transition-all cursor-text shadow-xl" 
        tabindex="0" @click="focusTypingArea" ref="typingArea" @focus="handleFocus" @blur="handleBlur">
        
        <div class="absolute -top-4 right-8 !bg-zinc-900 !text-white font-hand px-4 py-1 transform rotate-2">Type here!</div>

        <!-- 打字区：根据默写模式切换显示 -->
        <template v-if="!dictationMode">
          <div class="flex items-center space-x-6">
            <!-- 原有字符显示 -->
            <span class="leading-relaxed">
              <span v-for="(char, idx) in currentChunk.text.split('')" :key="idx">
                <span v-if="idx < typedChars.length"
                  :class="typedChars[idx].correct ? 'text-green-600 underline decoration-green-300 decoration-4 underline-offset-8' : 'text-red-500 underline decoration-red-400 decoration-double'">
                  {{ char }}
                </span>
                <span v-else-if="idx === typedChars.length"
                  class="text-blue-600 border-b-4 border-blue-400 animate-pulse">
                  {{ char }}
                </span>
                <span v-else class="text-zinc-300">{{ char }}</span>
              </span>
            </span>
            <button @click="speakWord(currentChunk.text)" 
              class="w-12 h-12 flex items-center justify-center rounded-full sketch-border-3 bg-white hover:bg-yellow-50 text-2xl shadow-sm transition-transform hover:scale-110"
              title="Play sound">
              <span>🔊</span>
            </button>
          </div>
        </template>
        <template v-else>
          <!-- 默写模式内容 -->
          <div class="flex items-center space-x-8">
            <span class="leading-relaxed">
              <span v-for="(_, idx) in currentChunk.text.split('')" :key="idx" class="dictation-char">
                <span v-if="idx < typedChars.length" class="text-zinc-800">{{ typedChars[idx].char }}</span>
                <span v-else class="dictation-underline text-zinc-300">_</span>
              </span>
            </span>
            <button @click="speakWord(currentChunk.text)"
              class="w-12 h-12 flex items-center justify-center rounded-full sketch-border-3 bg-white hover:bg-yellow-50 text-2xl shadow-sm transition-transform hover:scale-110"
              title="Play sound">
              <span>🔊</span>
            </button>
          </div>
          <!-- 显示答案 -->
          <div v-if="showAnswer" :class="['mt-8','font-sketch','text-3xl', lastCorrect ? 'text-green-600' : 'text-red-500 underline decoration-wavy']">
            {{ currentChunk.text }}
          </div>
        </template>

        <!-- Dictionary metadata -->
        <div v-if="!customParagraphMode" class="w-full mt-10 pt-8 border-t-2 border-dashed border-zinc-200">
          <div v-if="currentChunk.usphone || currentChunk.ukphone" class="text-xl text-zinc-400 text-center font-hand">
            <span v-if="currentChunk.usphone">US: [{{ currentChunk.usphone }}]</span>
            <span v-if="currentChunk.ukphone" class="ml-6">UK: [{{ currentChunk.ukphone }}]</span>
          </div>
          <div v-if="showTrans && currentChunk.trans && currentChunk.trans.length" class="mt-4 text-2xl text-zinc-600 text-center font-sans !tracking-normal">
            <span v-for="(tran, i) in currentChunk.trans" :key="i" class="mx-2">{{ tran }}</span>
          </div>
          <div v-if="currentChunk.example" class="mt-4 text-xl text-zinc-500 italic text-center font-hand bg-zinc-50 p-3 sketch-border-3">
            <div v-if="Array.isArray(currentChunk.example)">
              <div v-for="(ex, i) in currentChunk.example" :key="i">"{{ ex }}"</div>
            </div>
            <div v-else>"{{ currentChunk.example }}"</div>
          </div>
        </div>
      </div>

      <!-- 进度 -->
      <div v-if="(!customParagraphMode) || (customParagraphMode && customPracticeStarted)" class="text-2xl font-hand text-zinc-500 mb-12">
        <span class="sketch-border-2 px-4 py-1">{{ completedChunks }} / {{ totalChunks }} completed</span>
      </div>

      <!-- 结束弹窗 -->
      <div v-if="showResults" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
        <div class="sketch-card bg-white p-12 max-w-md w-full text-center relative">
          <div class="absolute -top-6 -right-6 text-6xl transform rotate-12">🏁</div>
          <h2 class="text-4xl font-bold mb-8 text-zinc-900 font-hand underline decoration-yellow-400 decoration-8">Practice Done!</h2>
          <div class="space-y-4 mb-10 text-2xl font-hand">
            <div class="flex justify-between border-b border-dashed border-zinc-300 pb-2">
              <span>Speed:</span>
              <span class="font-bold font-sketch">{{ stats.wpm }} WPM</span>
            </div>
            <div class="flex justify-between border-b border-dashed border-zinc-300 pb-2">
              <span>Accuracy:</span>
              <span class="font-bold font-sketch">{{ stats.accuracy }}%</span>
            </div>
            <div class="flex justify-between border-b border-dashed border-zinc-300 pb-2">
              <span>Total Time:</span>
              <span class="font-bold font-sketch">{{ stats.time }}s</span>
            </div>
          </div>
          <button @click="resetPractice" class="sketch-button bg-yellow-100 text-2xl w-full py-4">New Practice! 📝</button>
        </div>
      </div>
    </ClientOnly>
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