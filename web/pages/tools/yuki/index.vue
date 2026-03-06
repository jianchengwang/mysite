<template>
  <div class="min-h-screen bg-[#fcfcfc] font-hand py-4 px-4 md:px-8">
    <div class="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 class="text-4xl font-bold text-zinc-900 mb-1">Yuki AI</h1>
        <p class="text-zinc-600 italic">A minimalist hand-drawn AI companion</p>
      </div>
      <div class="w-full md:w-auto">
        <div class="model-selector-container relative group">
          <label class="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">AI Model</label>
          <input
            v-model="modelSearch"
            @focus="showModelDropdown = true"
            placeholder="Search AI model..."
            class="sketch-border px-3 py-2 bg-white outline-none focus:sketch-shadow-sm text-sm w-full md:w-80"
          />
          <div v-if="showModelDropdown" class="absolute top-full right-0 mt-2 w-full md:w-80 max-h-80 overflow-y-auto bg-white sketch-border z-50 shadow-xl">
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
    </div>

    <div v-if="!apiKey" class="max-w-xl mx-auto sketch-card mt-16 text-center bg-white">
      <h2 class="text-xl font-bold mb-3 text-red-600">Missing API Key</h2>
      <p class="mb-5 text-zinc-600">Please set your OpenRouter API Key in global settings (top right gear icon).</p>
      <button class="sketch-button !bg-zinc-900 !text-white" @click="openGlobalSettings">
        Open Global Settings
      </button>
    </div>

    <div v-else class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div class="lg:col-span-5 space-y-5">
        <div class="sketch-card bg-white p-4 md:p-5">
          <div class="flex items-center justify-between gap-2 mb-3">
            <h2 class="text-2xl font-bold">{{ currentCharacterName }}</h2>
            <span class="text-xs uppercase tracking-wide text-zinc-500">Live2D</span>
          </div>

          <div class="character-container w-full aspect-square max-w-[520px] mx-auto sketch-border-3 p-0 overflow-hidden bg-white relative">
            <ClientOnly>
              <div id="L2dCanvas" class="w-full h-full relative"></div>
              <div v-if="!isModelLoaded" class="absolute inset-0 flex items-center justify-center bg-white/80">
                <span class="animate-pulse italic">Summoning {{ currentCharacterName }}...</span>
              </div>
            </ClientOnly>
          </div>

          <div v-if="characterResponse" class="mt-4 sketch-border-3 p-4 bg-white max-w-[460px] mx-auto relative">
            <div class="absolute -top-3 left-10 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[12px] border-b-black"></div>
            <p class="text-sm leading-relaxed">{{ characterResponse }}</p>
          </div>
        </div>

        <div class="sketch-card bg-white p-4 md:p-5">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-2xl font-bold">Model Switch Panel</h3>
            <span class="text-xs uppercase tracking-wide text-zinc-500">{{ availableLive2dModels.length }} models</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3">
            <button
              v-for="model in availableLive2dModels"
              :key="model.id"
              type="button"
              @click="handleLive2dModelChange(model.id)"
              :class="[
                'model-card text-left p-3 sketch-border transition-all duration-200',
                currentLive2dModel === model.id ? '!bg-zinc-900 !text-white scale-[1.01]' : 'bg-white hover:bg-zinc-50'
              ]"
            >
              <div class="thumbnail-box mb-2" :class="currentLive2dModel === model.id ? 'thumbnail-active' : ''">
                <span class="text-xl font-bold">{{ model.name.slice(0, 1) }}</span>
              </div>
              <p class="text-sm font-bold leading-tight">{{ model.name }}</p>
              <p class="text-[10px] opacity-70 truncate">{{ model.id }}</p>
            </button>
          </div>
        </div>
      </div>

      <div class="lg:col-span-7 flex flex-col h-auto lg:h-[75vh] min-h-[500px]">
        <div class="flex-1 flex flex-col sketch-card bg-white p-0 overflow-hidden">
          <div ref="chatContainer" class="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
            <div v-for="(msg, index) in messages" :key="index" :class="['flex', msg.role === 'user' ? 'justify-end' : 'justify-start']">
              <div
                :class="[
                  'max-w-[90%] p-4 sketch-border-3 relative group',
                  msg.role === 'user' ? 'bg-zinc-50' : 'bg-white'
                ]"
              >
                <div v-if="msg.images && msg.images.length" class="mb-3 flex flex-wrap gap-2">
                  <img v-for="(img, i) in msg.images" :key="i" :src="img" class="max-w-[200px] max-h-[200px] object-contain sketch-border" />
                </div>
                <div class="prose prose-zinc max-w-none prose-sm sm:prose-base" v-html="renderMarkdown(msg.content)"></div>
                
                <!-- Play button for assistant messages -->
                <button 
                  v-if="msg.role === 'assistant'"
                  @click="playVoice(msg.content)"
                  class="absolute -right-10 top-0 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-zinc-400 hover:text-zinc-800"
                  title="Play message"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                </button>
              </div>
            </div>
            <div v-if="isLoading" class="flex justify-start">
              <div class="p-4 sketch-border-3 bg-white animate-pulse italic">
                {{ currentCharacterName }} is thinking...
              </div>
            </div>
          </div>

          <div class="p-4 border-t-2 border-zinc-200 bg-zinc-50/50">
            <div v-if="selectedImage" class="mb-3 relative inline-block">
              <img :src="selectedImage" class="w-20 h-20 object-cover sketch-border" />
              <button @click="selectedImage = null" class="absolute -top-2 -right-2 bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-zinc-800 transition-colors">×</button>
            </div>

            <div class="flex gap-3 items-end">
              <div class="flex-1 relative">
                <textarea
                  v-model="inputMessage"
                  @keydown.enter.prevent="handleEnter"
                  rows="2"
                  placeholder="Type your message..."
                  class="w-full p-3 pr-10 sketch-border bg-white resize-none outline-none focus:sketch-shadow-sm min-h-[80px]"
                ></textarea>
                <button
                  @click="fileInput?.click()"
                  class="absolute right-3 bottom-3 text-zinc-400 hover:text-zinc-800 transition-colors"
                  title="Upload Image"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </button>
                <input type="file" ref="fileInput" class="hidden" accept="image/*" @change="handleImageUpload" />
              </div>
              <div class="flex flex-col gap-2">
                <button
                  @click="sendMessage"
                  :disabled="isLoading || (!inputMessage.trim() && !selectedImage)"
                  class="sketch-button py-2 min-w-[80px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
                <div class="flex items-center justify-between mt-1 gap-3">
                  <div class="flex items-center gap-3">
                    <label class="flex items-center cursor-pointer select-none text-xs text-zinc-500 hover:text-zinc-700">
                      <input type="checkbox" v-model="autoPronounce" class="mr-1 w-3 h-3 accent-zinc-900" />
                      Auto-Speak
                    </label>
                    <button 
                      @click="stopVoice"
                      class="text-[10px] text-red-500 hover:text-red-700 font-bold border border-red-200 px-1 rounded bg-red-50"
                      v-if="isSpeaking"
                    >
                      Stop Speaking
                    </button>
                  </div>
                  <button @click="clearChat" class="text-xs text-zinc-400 hover:text-zinc-600 underline">Clear</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { marked } from 'marked'

definePageMeta({ layout: 'default' })

const GLOBAL_KEY_STORAGE = 'global_openrouter_key'

const apiKey = ref('')
const currentModel = ref('google/gemini-2.0-flash-001')
const messages = ref<any[]>([])
const inputMessage = ref('')
const isLoading = ref(false)
const chatContainer = ref<HTMLElement | null>(null)
const selectedImage = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const autoPronounce = ref(true)
const isSpeaking = ref(false)

const availableLive2dModels = ref([
  { id: 'xuefeng_3', name: 'Sarah' },
  { id: 'xuefeng', name: 'Emma' },
  { id: 'lafei_4', name: 'Sophie' },
  { id: 'lafei', name: 'Lafei' },
  { id: 'chuixue_3', name: 'Chuixue' }
])
const currentLive2dModel = ref('xuefeng_3')

const currentCharacterName = computed(() => {
  const model = availableLive2dModels.value.find((m) => m.id === currentLive2dModel.value)
  return model ? model.name : 'Sarah'
})

const availableModels = ref<any[]>([
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash (Fast)' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini (Smart)' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat' }
])
const modelSearch = ref('')
const showModelDropdown = ref(false)

const filteredModels = computed(() => {
  if (!modelSearch.value) return availableModels.value.slice(0, 50)
  const search = modelSearch.value.toLowerCase()
  return availableModels.value.filter(
    (m) => (m.name?.toLowerCase().includes(search)) || (m.id?.toLowerCase().includes(search))
  )
})

const selectModel = (m: any) => {
  currentModel.value = m.id
  modelSearch.value = m.name || m.id
  showModelDropdown.value = false
  localStorage.setItem('yuki_current_model', m.id)
}

const isModelLoaded = ref(false)
const characterResponse = ref('')
let l2dv: any = null
let speechSynthesis: SpeechSynthesis | null = null

const defaultMessage = computed(() => `Hi there! I'm ${currentCharacterName.value}, your hand-drawn AI companion. How can I help you today?`)

const syncGlobalKey = () => {
  apiKey.value = localStorage.getItem(GLOBAL_KEY_STORAGE) || ''
}

const handleGlobalKeyChange = () => {
  syncGlobalKey()
  if (apiKey.value && !l2dv) {
    initLive2D()
  }
}

onMounted(async () => {
  syncGlobalKey()

  window.addEventListener('storage', handleGlobalKeyChange)
  window.addEventListener('global-openrouter-key-updated', handleGlobalKeyChange as EventListener)

  const savedMessages = localStorage.getItem('yuki_messages')
  if (savedMessages) {
    try {
      messages.value = JSON.parse(savedMessages)
    } catch (e) {
      console.error('Failed to load messages:', e)
      messages.value = [{ role: 'assistant', content: defaultMessage.value }]
    }
  } else {
    messages.value = [{ role: 'assistant', content: defaultMessage.value }]
  }

  characterResponse.value = defaultMessage.value

  const savedModel = localStorage.getItem('yuki_current_model')
  if (savedModel) {
    currentModel.value = savedModel
  }

  const savedL2dModel = localStorage.getItem('yuki_live2d_model')
  if (savedL2dModel) {
    currentLive2dModel.value = savedL2dModel
  }

  scrollToBottom()
  await fetchModels()

  const initialModel = availableModels.value.find((m) => m.id === currentModel.value)
  modelSearch.value = initialModel?.name || currentModel.value

  if (apiKey.value) {
    initLive2D()
  }

  if (window.speechSynthesis) {
    speechSynthesis = window.speechSynthesis
  }

  window.addEventListener('click', handleOutsideClick)
})

onUnmounted(() => {
  if (l2dv) {
    l2dv = null
  }
  if (speechSynthesis) {
    speechSynthesis.cancel()
  }

  window.removeEventListener('click', handleOutsideClick)
  window.removeEventListener('storage', handleGlobalKeyChange)
  window.removeEventListener('global-openrouter-key-updated', handleGlobalKeyChange as EventListener)
})

const openGlobalSettings = () => {
  window.dispatchEvent(new Event('open-global-settings'))
}

const handleOutsideClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.model-selector-container')) {
    showModelDropdown.value = false
  }
}

const fetchModels = async () => {
  const cached = localStorage.getItem('yuki_available_models')
  if (cached) {
    try {
      availableModels.value = JSON.parse(cached)
    } catch {
      // no-op
    }
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models')
    const data = await response.json()
    if (data.data) {
      availableModels.value = data.data.map((m: any) => ({
        id: m.id,
        name: m.name
      }))
      localStorage.setItem('yuki_available_models', JSON.stringify(availableModels.value))
    }
  } catch (error) {
    console.error('Failed to fetch models:', error)
  }
}

const handleImageUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      selectedImage.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}

const handleEnter = (e: KeyboardEvent) => {
  if (e.shiftKey) return
  sendMessage()
}

const renderMarkdown = (text: string) => {
  return marked(text) as string
}

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

const sendMessage = async () => {
  if (isLoading.value || (!inputMessage.value.trim() && !selectedImage.value)) return
  if (!apiKey.value) return

  const userText = inputMessage.value.trim()
  const userImage = selectedImage.value

  const newMessage: any = { role: 'user', content: userText }
  if (userImage) {
    newMessage.images = [userImage]
  }

  messages.value.push(newMessage)
  inputMessage.value = ''
  selectedImage.value = null
  if (fileInput.value) fileInput.value.value = ''

  isLoading.value = true
  scrollToBottom()
  localStorage.setItem('yuki_current_model', currentModel.value)

  try {
    const apiMessages = messages.value.map((m) => {
      if (m.images && m.images.length) {
        const content = [{ type: 'text', text: m.content || '' }]
        m.images.forEach((img: string) => {
          content.push({
            type: 'image_url',
            image_url: { url: img }
          } as any)
        })
        return { role: m.role, content }
      }
      return { role: m.role, content: m.content }
    })

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.value}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Gemini Site'
      },
      body: JSON.stringify({
        model: currentModel.value,
        messages: [
          { role: 'system', content: `You are ${currentCharacterName.value}, a friendly hand-drawn AI companion. Keep answers concise, natural, and helpful.` },
          ...apiMessages
        ]
      })
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error?.message || 'Failed to fetch response')
    }

    const data = await response.json()
    const message = data.choices[0].message
    let aiText = ''
    const imageUrls: string[] = []

    if (Array.isArray(message.content)) {
      message.content.forEach((c: any) => {
        if (c.type === 'text') aiText += c.text
        if (c.type === 'image_url') imageUrls.push(c.image_url.url)
      })
    } else {
      aiText = message.content || ''
    }

    if (message.images && Array.isArray(message.images)) {
      message.images.forEach((imgObj: any) => {
        if (typeof imgObj === 'string') {
          if (!imageUrls.includes(imgObj)) imageUrls.push(imgObj)
        } else if (imgObj.image_url && imgObj.image_url.url) {
          if (!imageUrls.includes(imgObj.image_url.url)) imageUrls.push(imgObj.image_url.url)
        }
      })
    }

    if (imageUrls.length === 0) {
      const urlRegex = /https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp)(?:\?\S+)?/gi
      const matches = aiText.match(urlRegex)
      if (matches) {
        matches.forEach((url: string) => {
          const cleanUrl = url.split(')')[0].split('"')[0].split("'")[0]
          if (!imageUrls.includes(cleanUrl)) imageUrls.push(cleanUrl)
        })
      }
    }

    messages.value.push({
      role: 'assistant',
      content: aiText,
      images: imageUrls.length > 0 ? imageUrls : undefined
    })
    characterResponse.value = aiText.length > 200 ? `${aiText.substring(0, 200)}...` : aiText

    localStorage.setItem('yuki_messages', JSON.stringify(messages.value))

    if (l2dv) {
      l2dv.startMotion('tap_body')
    }
    if (autoPronounce.value) {
      playVoice(aiText)
    }
  } catch (error: any) {
    console.error('AI Error:', error)
    messages.value.push({ role: 'assistant', content: `Error: ${error.message}` })
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

const clearChat = () => {
  if (confirm('Clear chat history?')) {
    messages.value = [{ role: 'assistant', content: defaultMessage.value }]
    characterResponse.value = defaultMessage.value
    localStorage.removeItem('yuki_messages')
  }
}

const initLive2D = async () => {
  try {
    const canvas = document.getElementById('L2dCanvas')
    if (!canvas) return

    isModelLoaded.value = false
    canvas.innerHTML = ''

    await Promise.all([
      loadScript('https://unpkg.com/core-js-bundle@3.6.1/minified.js'),
      loadScript('https://cdn.jsdelivr.net/gh/jianchengwang/live2d_models@main/assets/js/lib/live2dcubismcore.min.js'),
      loadScript('https://cdn.jsdelivr.net/gh/jianchengwang/live2d_models@main/assets/js/live2dv3.js'),
      loadScript('https://cdn.jsdelivr.net/gh/jianchengwang/live2d_models@main/assets/js/charData.js')
    ])

    if (window.L2dViewer) {
      window.l2dv = new window.L2dViewer({
        el: canvas,
        modelHomePath: 'https://cdn.jsdelivr.net/gh/jianchengwang/live2d_models@main/assets/model/moc3/',
        model: currentLive2dModel.value,
        width: canvas.clientWidth || 500,
        height: canvas.clientHeight || 500,
        autoMotion: true
      })

      l2dv = window.l2dv
      isModelLoaded.value = true
    }
  } catch (error) {
    console.error('Failed to initialize Live2D:', error)
  }
}

const handleLive2dModelChange = (modelId: string) => {
  if (currentLive2dModel.value === modelId) return

  currentLive2dModel.value = modelId
  localStorage.setItem('yuki_live2d_model', modelId)

  if (l2dv) {
    l2dv.loadModel(modelId)
  }

  characterResponse.value = `Hi there! I'm ${currentCharacterName.value}.`
  if (autoPronounce.value) {
    playVoice(characterResponse.value)
  }
}

const stopVoice = () => {
  if (speechSynthesis) {
    speechSynthesis.cancel()
    isSpeaking.value = false
  }
}

const playVoice = (text: string) => {
  if (!speechSynthesis) return

  try {
    speechSynthesis.cancel()
    
    // Strip markdown syntax, emojis, and special characters
    const cleanText = text
      .replace(/https?:\/\/\S+/g, '') // Remove URLs
      .replace(/[*_~`#>\[\]\(\)]/g, '') // Remove markdown syntax
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // Remove emojis
      .replace(/[^\p{L}\p{N}\s.,!?'"-\u4e00-\u9fa5]/gu, '') // Remove other special chars, keep unicode letters/numbers and Chinese
      .replace(/\s+/g, ' ')
      .trim()
      
    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.lang = 'en-US'
    utterance.pitch = 1.0
    utterance.rate = 0.9

    const voices = speechSynthesis.getVoices()
    let englishVoice = voices.find(
      (voice) => voice.lang.includes('en') && (
        voice.name.includes('Samantha') || 
        voice.name.includes('Karen') || 
        voice.name.includes('Victoria') ||
        voice.name.includes('Zira') ||
        voice.name.includes('Tessa') ||
        voice.name.includes('Moira') ||
        voice.name.toLowerCase().includes('female')
      )
    )
    
    // Fallback if no specific female voice found
    if (!englishVoice) {
      englishVoice = voices.find((voice) => voice.lang.includes('en'))
    }

    if (englishVoice) {
      utterance.voice = englishVoice
    }

    utterance.onstart = () => { isSpeaking.value = true }
    utterance.onend = () => { isSpeaking.value = false }
    utterance.onerror = () => { isSpeaking.value = false }

    speechSynthesis.speak(utterance)
  } catch (error) {
    console.error('Failed to play voice:', error)
    isSpeaking.value = false
  }
}

const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
    document.head.appendChild(script)
  })
}

declare global {
  interface Window {
    l2dv: any;
    L2dViewer: any;
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

:deep(.prose) {
  font-family: 'Patrick Hand', cursive;
}

.character-container {
  border-radius: 40px 10px 45px 15px / 15px 45px 15px 40px;
}

.thumbnail-box {
  @apply h-16 sketch-border flex items-center justify-center bg-zinc-50;
}

.thumbnail-active {
  @apply bg-zinc-800 text-white border-white;
}

.model-card {
  border-radius: 18px 10px 14px 9px / 9px 14px 10px 18px;
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #e4e4e7;
  border-radius: 10px;
}

::-webkit-scrollbar-thumb:hover {
  background: #d4d4d8;
}

#L2dCanvas {
  display: flex;
  justify-content: center;
  align-items: center;
}

.model-selector-container .sketch-border {
  border-radius: 12px 4px 14px 5px / 5px 14px 5px 12px;
}
</style>
