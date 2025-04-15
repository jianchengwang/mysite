<template>
    <div class="min-h-screen bg-zinc-50 py-12">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
          <h1 class="text-3xl font-bold text-zinc-900 mb-4">English Typing Practice</h1>
          <p class="text-lg text-zinc-600">Improve your typing speed with English chunks</p>
        </div>
  
        <!-- Stats -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div class="bg-white p-6 rounded-lg shadow-sm border border-zinc-200">
            <h3 class="text-sm font-medium text-zinc-500 mb-1">WPM</h3>
            <p class="text-2xl font-bold text-zinc-900">{{ stats.wpm }}</p>
          </div>
          <div class="bg-white p-6 rounded-lg shadow-sm border border-zinc-200">
            <h3 class="text-sm font-medium text-zinc-500 mb-1">Accuracy</h3>
            <p class="text-2xl font-bold text-zinc-900">{{ stats.accuracy }}%</p>
          </div>
          <div class="bg-white p-6 rounded-lg shadow-sm border border-zinc-200">
            <h3 class="text-sm font-medium text-zinc-500 mb-1">Time</h3>
            <p class="text-2xl font-bold text-zinc-900">{{ stats.time }}s</p>
          </div>
        </div>
  
        <!-- Typing Area -->
        <div class="bg-white p-8 rounded-lg shadow-sm border border-zinc-200 mb-8">
          <div class="mb-6">
            <div class="flex justify-between items-center mb-2">
              <h2 class="text-lg font-medium text-zinc-900">Current Text</h2>
              <div class="flex items-center space-x-2">
                <label for="difficulty" class="text-sm text-zinc-600">Difficulty:</label>
                <select id="difficulty" v-model="selectedDifficulty" class="text-sm border border-zinc-300 rounded-md px-2 py-1">
                  <option value="all">All</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
            <div class="bg-zinc-50 p-4 rounded-md border border-zinc-200 min-h-[100px] flex items-center">
              <p class="text-lg text-zinc-800 leading-relaxed">{{ currentChunk.text }}</p>
            </div>
          </div>
  
          <div class="mb-6">
            <h2 class="text-lg font-medium text-zinc-900 mb-2">Your Input</h2>
            <textarea
              v-model="userInput"
              class="w-full p-4 border border-zinc-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows="3"
              placeholder="Start typing here..."
              @input="checkInput"
              ref="inputField"
            ></textarea>
          </div>
  
          <div class="flex justify-between items-center">
            <div class="flex items-center space-x-2">
              <button
                @click="resetPractice"
                class="px-4 py-2 bg-zinc-100 text-zinc-800 rounded-md hover:bg-zinc-200 transition-colors"
              >
                Reset
              </button>
              <button
                @click="nextChunk"
                class="px-4 py-2 bg-zinc-100 text-zinc-800 rounded-md hover:bg-zinc-200 transition-colors"
              >
                Next
              </button>
            </div>
            <div class="text-sm text-zinc-500">
              {{ completedChunks }} / {{ totalChunks }} completed
            </div>
          </div>
        </div>
  
        <!-- Results -->
        <div v-if="showResults" class="bg-white p-8 rounded-lg shadow-sm border border-zinc-200">
          <h2 class="text-xl font-bold text-zinc-900 mb-4">Practice Results</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 class="text-lg font-medium text-zinc-800 mb-2">Performance</h3>
              <ul class="space-y-2">
                <li class="flex justify-between">
                  <span class="text-zinc-600">Words Per Minute:</span>
                  <span class="font-medium">{{ stats.wpm }}</span>
                </li>
                <li class="flex justify-between">
                  <span class="text-zinc-600">Accuracy:</span>
                  <span class="font-medium">{{ stats.accuracy }}%</span>
                </li>
                <li class="flex justify-between">
                  <span class="text-zinc-600">Time:</span>
                  <span class="font-medium">{{ stats.time }}s</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 class="text-lg font-medium text-zinc-800 mb-2">History</h3>
              <div class="max-h-40 overflow-y-auto">
                <ul class="space-y-2">
                  <li v-for="(result, index) in practiceHistory" :key="index" class="text-sm">
                    <span class="text-zinc-600">{{ result.text.substring(0, 30) }}...</span>
                    <span class="ml-2" :class="result.correct ? 'text-green-600' : 'text-red-600'">
                      {{ result.correct ? '✓' : '✗' }}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div class="mt-6 flex justify-center">
            <button
              @click="resetPractice"
              class="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Start New Practice
            </button>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, computed, onMounted, nextTick } from 'vue'
  
  interface TypingChunk {
    id: string
    text: string
    difficulty: string
  }
  
  interface PracticeResult {
    text: string
    correct: boolean
    time: number
  }
  
  // State
  const chunks = ref<TypingChunk[]>([])
  const currentChunkIndex = ref(0)
  const userInput = ref('')
  const startTime = ref(0)
  const isPracticing = ref(false)
  const selectedDifficulty = ref('all')
  const practiceHistory = ref<PracticeResult[]>([])
  const showResults = ref(false)
  const inputField = ref<HTMLTextAreaElement | null>(null)
  
  // Computed
  const currentChunk = computed(() => chunks.value[currentChunkIndex.value] || { text: 'Loading...', id: '0', difficulty: 'easy' })
  const totalChunks = computed(() => chunks.value.length)
  const completedChunks = computed(() => practiceHistory.value.length)
  
  const stats = computed(() => {
    if (practiceHistory.value.length === 0) {
      return { wpm: 0, accuracy: 0, time: 0 }
    }
  
    const totalTime = practiceHistory.value.reduce((sum, result) => sum + result.time, 0)
    const correctCount = practiceHistory.value.filter(result => result.correct).length
    const totalWords = practiceHistory.value.reduce((sum, result) => {
      return sum + result.text.split(' ').length
    }, 0)
  
    const accuracy = Math.round((correctCount / practiceHistory.value.length) * 100)
    const wpm = totalTime > 0 ? Math.round((totalWords / totalTime) * 60) : 0
  
    return {
      wpm,
      accuracy,
      time: Math.round(totalTime)
    }
  })
  
  // Methods
  const loadChunks = async () => {
    try {
      const { data } = await useAsyncData(() => 
        queryCollection('dataset').where('stem', '=', 'dataset/typing-chunks').first()
      )
      console.info(data)
      if (data.value && typeof data.value === 'object' && 'meta' in data.value && 'items' in data.value.meta) {
        chunks.value = data.value.meta.items as TypingChunk[]
      } else {
        console.error('Failed to load typing chunks')
      }
    } catch (error) {
      console.error('Error loading typing chunks:', error)
    }
  }
  
  const filterChunksByDifficulty = () => {
    if (selectedDifficulty.value === 'all') {
      return chunks.value
    }
    return chunks.value.filter(chunk => chunk.difficulty === selectedDifficulty.value)
  }
  
  const nextChunk = () => {
    const filteredChunks = filterChunksByDifficulty()
    if (filteredChunks.length === 0) {
      return
    }
    
    const randomIndex = Math.floor(Math.random() * filteredChunks.length)
    const selectedChunk = filteredChunks[randomIndex]
    currentChunkIndex.value = chunks.value.findIndex(chunk => chunk.id === selectedChunk.id)
    userInput.value = ''
    startTime.value = Date.now()
    isPracticing.value = false
    showResults.value = false
    
    nextTick(() => {
      if (inputField.value) {
        inputField.value.focus()
      }
    })
  }
  
  const checkInput = () => {
    if (!isPracticing.value) {
      startTime.value = Date.now()
      isPracticing.value = true
    }
    
    if (userInput.value.length >= currentChunk.value.text.length) {
      const endTime = Date.now()
      const timeSpent = (endTime - startTime.value) / 1000 // in seconds
      
      const isCorrect = userInput.value === currentChunk.value.text
      practiceHistory.value.push({
        text: currentChunk.value.text,
        correct: isCorrect,
        time: timeSpent
      })
      
      isPracticing.value = false
      showResults.value = true
    }
  }
  
  const resetPractice = () => {
    practiceHistory.value = []
    showResults.value = false
    userInput.value = ''
    isPracticing.value = false
    nextChunk()
  }
  
  // Lifecycle
  onMounted(async () => {
    await loadChunks()
    nextChunk()
  })
  </script> 