<template>
  <div class="min-h-screen bg-zinc-50 flex flex-col justify-center items-center py-8 sm:py-12 px-4">
    <ClientOnly>
      <!-- Title -->
      <h1 class="mb-8 text-center text-4xl font-bold font-hand transform -rotate-2 sm:mb-12 sm:text-5xl">Qwerty Practice</h1>

      <!-- Top stats -->
      <div class="relative mb-8 flex w-full max-w-4xl flex-col gap-4 bg-white p-5 text-center sketch-border-2 sm:mb-12 sm:flex-row sm:items-center sm:justify-center sm:gap-8 sm:p-6">
        <div class="absolute -top-4 -left-4 bg-yellow-100 border border-black px-2 font-hand transform -rotate-12">Stats</div>
        <div>
          <div class="text-zinc-500 font-hand text-lg">WPM</div>
          <div class="text-3xl font-bold text-zinc-900 font-sketch">{{ stats.wpm }}</div>
        </div>
        <div class="hidden h-12 self-center border-l-2 border-zinc-200 sm:block"></div>
        <div>
          <div class="text-zinc-500 font-hand text-lg">Accuracy</div>
          <div class="text-3xl font-bold text-zinc-900 font-sketch">{{ stats.accuracy }}%</div>
        </div>
        <div class="hidden h-12 self-center border-l-2 border-zinc-200 sm:block"></div>
        <div>
          <div class="text-zinc-500 font-hand text-lg">Time</div>
          <div class="text-3xl font-bold text-zinc-900 font-sketch">{{ stats.time }}s</div>
        </div>
      </div>

      <!-- Progress stats -->
      <div v-if="!customParagraphMode" class="mb-6 flex flex-col items-center gap-2 text-center text-lg font-hand text-zinc-600 sm:flex-row sm:gap-6 sm:text-xl">
        <span>Mastered: <span class="font-bold text-green-600 underline decoration-wavy">{{ correctCount }}</span> / <span class="font-bold">{{ totalWords }}</span></span>
        <span>Remaining: <span class="font-bold text-blue-600 underline decoration-dotted">{{ remainCount }}</span></span>
      </div>

      <!-- Dictionary controls -->
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
        
        <div class="ml-0 flex flex-wrap items-center gap-4 sm:ml-4">
          <label class="flex items-center cursor-pointer select-none font-hand text-lg">
            <input type="checkbox" v-model="autoSpeak" class="mr-2 w-5 h-5 accent-zinc-900" />
            Auto pronounce
          </label>
          <label class="flex items-center cursor-pointer select-none font-hand text-lg">
            <input type="checkbox" v-model="isRandom" class="mr-2 w-5 h-5 accent-zinc-900" />
            Randomize picks
          </label>
          <label class="flex items-center cursor-pointer select-none font-hand text-lg">
            <input type="checkbox" v-model="showTrans" class="mr-2 w-5 h-5 accent-zinc-900" />
            Show translation
          </label>
        </div>
        
        <button @click="clearCorrectIndexes(selectedDict); correctIndexes = []; nextGroup();" class="sketch-button bg-red-50 text-red-700 !border-red-900">Clear progress</button>
      </div>

      <!-- Custom paragraph mode -->
      <div class="mb-8 flex w-full max-w-4xl flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-center sm:gap-12">
        <label class="flex items-center cursor-pointer select-none font-hand text-xl sm:text-2xl">
          <input type="checkbox" v-model="customParagraphMode" class="mr-3 w-6 h-6 accent-zinc-900" />
          🎨 Custom paragraph
        </label>
        <label class="flex items-center cursor-pointer select-none font-hand text-xl sm:text-2xl">
          <input type="checkbox" v-model="dictationMode" class="mr-3 w-6 h-6 accent-zinc-900" />
          ✍️ Dictation mode
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

      <!-- Typing area -->
      <div v-if="(!customParagraphMode) || (customParagraphMode && customPracticeStarted)" 
        class="relative mb-12 flex w-full max-w-5xl flex-col items-center justify-center bg-white px-5 py-10 text-2xl font-sketch tracking-wide outline-none transition-all cursor-text shadow-xl sketch-card min-h-[220px] focus:ring-4 focus:ring-yellow-100 sm:px-8 sm:py-14 sm:text-4xl lg:px-12 lg:py-16 lg:text-5xl" 
        tabindex="0" @click="focusTypingArea" ref="typingArea" @focus="handleFocus" @blur="handleBlur">
        
        <div class="absolute -top-4 right-4 !bg-zinc-900 !text-white font-hand px-3 py-1 text-sm transform rotate-2 sm:right-8 sm:px-4 sm:text-base">Type here!</div>

        <!-- Switch display based on dictation mode -->
        <template v-if="!dictationMode">
          <div class="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
            <!-- Standard typing display -->
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
              class="flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl shadow-sm transition-transform sketch-border-3 hover:bg-yellow-50 hover:scale-110"
              title="Play sound">
              <span>🔊</span>
            </button>
          </div>
        </template>
        <template v-else>
          <!-- Dictation mode content -->
          <div class="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
            <span class="leading-relaxed">
              <span v-for="(_, idx) in currentChunk.text.split('')" :key="idx" class="dictation-char">
                <span v-if="idx < typedChars.length" class="text-zinc-800">{{ typedChars[idx].char }}</span>
                <span v-else class="dictation-underline text-zinc-300">_</span>
              </span>
            </span>
            <button @click="speakWord(currentChunk.text)"
              class="flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl shadow-sm transition-transform sketch-border-3 hover:bg-yellow-50 hover:scale-110"
              title="Play sound">
              <span>🔊</span>
            </button>
          </div>
          <!-- Reveal answer -->
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
          <div v-if="showTrans && currentChunk.trans && currentChunk.trans.length" class="mt-4 text-2xl text-zinc-600 text-center font-sans !tracking-tighter" style="letter-spacing: -0.1em;">
            <span v-for="(tran, i) in currentChunk.trans" :key="i" class="mx-1">{{ tran }}</span>
          </div>
          <div v-if="currentChunk.example" class="mt-4 text-xl text-zinc-500 italic text-center font-hand bg-zinc-50 p-3 sketch-border-3">
            <div v-if="Array.isArray(currentChunk.example)">
              <div v-for="(ex, i) in currentChunk.example" :key="i">"{{ ex }}"</div>
            </div>
            <div v-else>"{{ currentChunk.example }}"</div>
          </div>
        </div>
      </div>

      <!-- Progress -->
      <div v-if="(!customParagraphMode) || (customParagraphMode && customPracticeStarted)" class="text-2xl font-hand text-zinc-500 mb-12">
        <span class="sketch-border-2 px-4 py-1">{{ completedChunks }} / {{ totalChunks }} completed</span>
      </div>

      <!-- Results modal -->
      <div v-if="showResults" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm sm:p-6">
        <div class="sketch-card relative w-full max-w-md bg-white p-6 text-center sm:p-12">
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

// Typing state
const typedChars = ref<{char: string, correct: boolean}[]>([])
const startTime = ref(0)
const isPracticing = ref(false)

// Current group and index
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
  all: 5 // Default
}

const autoSpeak = ref(true)
const isRandom = ref(true) // Random mode is enabled by default
const showTrans = ref(true)
const dictationMode = ref(false)
const showAnswer = ref(false)
const lastCorrect = ref(false)

// Persist and read locally mastered item indexes
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

// Preload sound effects
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
    // Cancel any previous utterance to avoid speech queue buildup.
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    const utter = new window.SpeechSynthesisUtterance(word)
    utter.lang = 'en-US'
    // Prefer a natural-sounding English voice when available.
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

// Load all dictionary file names.
async function fetchDictFiles() {
  // The public directory cannot be enumerated directly, so use a static index file.
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

// Load the selected dictionary.
async function loadChunksFromDict() {
  if (!selectedDict.value) return
  try {
    const res = await fetch(`/qwerty/dicts/${selectedDict.value}`)
    const data = await res.json()
    // Adapt the data to the TypingChunk shape while preserving metadata.
    chunks.value = data.map((item: any, idx: number) => ({
      id: String(idx),
      text: item.name,
      difficulty: 'all', // Extend later if dictionary difficulty is added.
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
  // Exclude already mastered items.
  const available = filteredChunks.filter((_, idx) => !correctIndexes.value.includes(idx))
  if (available.length === 0) {
    // Reset when everything has been completed.
    correctIndexes.value = []
    saveCorrectIndexes(selectedDict.value, [])
    return nextGroup()
  }
  let group: TypingChunk[] = []
  if (selectedDifficulty.value === 'all') {
    // In all mode, use every available item.
    group = available
  } else {
    // Otherwise take a smaller batch.
    const wordCount = difficultyWordCount[selectedDifficulty.value] || 5
    if (isRandom.value) {
      const shuffled = available.slice().sort(() => Math.random() - 0.5)
      group = shuffled.slice(0, wordCount)
    } else {
      group = available.slice(0, wordCount)
    }
  }
  currentGroup.value = group
  // Store the original indexes for mastery tracking.
  currentGroupIndexes.value = group.map(chunk => chunks.value.findIndex(c => c.id === chunk.id))
  // Reset practice state for the next batch.
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

// Focus and blur handling
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
  // Split the paragraph into practice units.
  const text = customParagraph.value.trim()
  if (!text) return
  practiceHistory.value = []
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

// The typing area only shows when practice is active.

// Keep the key handling compatible with custom paragraph mode.
const handleKeydown = (e: KeyboardEvent) => {
  if (showResults.value) return
  // In dictation mode, Enter advances after the answer is revealed.
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
  // Prevent the page from scrolling on space.
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
      // Dictation mode always uses the click sound.
      if (dictationMode.value) {
        playClick()
      } else if (correct) {
        playClick()
      } else {
        playBeep()
      }
    } else {
      // The current word or sentence is complete.
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
      // In dictation mode, show the answer and wait for Enter.
      if (dictationMode.value) {
        lastCorrect.value = isCorrect
        showAnswer.value = true
      } else {
        // Delay the transition so the last highlight remains visible.
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
  nextTick(() => {
    focusTypingArea()
  })
})

// Regenerate the batch when the dictionary or difficulty changes.
watch(selectedDict, async () => {
  await loadChunksFromDict()
  nextGroup()
})
watch(selectedDifficulty, () => {
  nextGroup()
})

// Reset status when custom paragraph mode toggles.
watch(customParagraphMode, (val) => {
  if (val) {
    practiceHistory.value = []
    showResults.value = false
    showAnswer.value = false
  }
})

// Summary stats
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
.animate-pulse {
  animation: pulse 1s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
/* Dictation mode underline and spacing */
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

@media (max-width: 640px) {
  .dictation-char {
    letter-spacing: 0.22em;
    font-size: 1em;
  }

  .dictation-underline {
    font-size: 1em;
  }
}
</style> 
