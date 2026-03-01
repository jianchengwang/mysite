<template>
  <div class="min-h-screen bg-[#fcfcfc] font-hand py-4 px-4 md:px-8">
    <!-- Header -->
    <div class="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 class="text-4xl font-bold text-zinc-900 mb-1">Yuki AI</h1>
        <p class="text-zinc-600 italic">A minimalist hand-drawn AI companion</p>
      </div>
      <div class="flex gap-4 items-center w-full md:w-auto">
        <!-- Model Selector with Search -->
        <div class="model-selector-container relative group flex-1 md:flex-none">
          <input 
            v-model="modelSearch"
            @focus="showModelDropdown = true"
            placeholder="Search AI model..."
            class="sketch-border px-3 py-1 bg-white outline-none focus:sketch-shadow-sm text-sm w-full md:w-64"
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
        <button @click="resetApiKey" class="text-xs text-zinc-400 hover:text-zinc-600 underline shrink-0">Reset Key</button>
      </div>
    </div>

    <!-- API Key Input (if not set) -->
    <div v-if="!apiKey" class="max-w-md mx-auto sketch-card mt-20">
      <h2 class="text-xl font-bold mb-4">Set OpenRouter API Key</h2>
      <p class="mb-4 text-sm text-zinc-500 italic">Your API key is stored locally in your browser and used only to call OpenRouter directly.</p>
      <div class="flex flex-col gap-4">
        <input 
          v-model="tempApiKey" 
          type="password" 
          placeholder="sk-or-v1-..." 
          class="px-4 py-2 sketch-border bg-white outline-none focus:sketch-shadow-sm w-full"
        />
        <button @click="saveApiKey" class="sketch-button w-full">Save Key</button>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      <!-- Left: Live2D Character (40% width on desktop) -->
      <div class="lg:col-span-5 relative flex flex-col items-center">
        <div class="character-container w-full aspect-square max-w-[500px] sketch-card p-0 overflow-hidden bg-white relative">
          <ClientOnly>
            <div id="L2dCanvas" class="w-full h-full relative"></div>
            <div v-if="!isModelLoaded" class="absolute inset-0 flex items-center justify-center bg-white/80">
              <span class="animate-pulse italic">Summoning Yuki...</span>
            </div>
          </ClientOnly>
        </div>
        <!-- Yuki's thoughts/bubble -->
        <div v-if="characterResponse" class="mt-4 sketch-border-3 p-4 bg-white max-w-[400px] relative">
          <div class="absolute -top-3 left-10 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[12px] border-b-black"></div>
          <p class="text-sm leading-relaxed">{{ characterResponse }}</p>
        </div>
      </div>

      <!-- Right: Chat Interface (60% width on desktop) -->
      <div class="lg:col-span-7 flex flex-col h-[75vh] min-h-[500px]">
        <div class="flex-1 flex flex-col sketch-card bg-white p-0 overflow-hidden">
          <!-- Messages -->
          <div 
            ref="chatContainer" 
            class="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
          >
            <div v-for="(msg, index) in messages" :key="index" :class="['flex', msg.role === 'user' ? 'justify-end' : 'justify-start']">
              <div 
                :class="[
                  'max-w-[90%] p-4 sketch-border-3 relative', 
                  msg.role === 'user' ? 'bg-zinc-50' : 'bg-white'
                ]"
              >
                <!-- Image in message -->
                <div v-if="msg.images && msg.images.length" class="mb-3 flex flex-wrap gap-2">
                  <img v-for="(img, i) in msg.images" :key="i" :src="img" class="max-w-[200px] max-h-[200px] object-contain sketch-border" />
                </div>
                
                <div class="prose prose-zinc max-w-none prose-sm sm:prose-base" v-html="renderMarkdown(msg.content)"></div>
              </div>
            </div>
            <div v-if="isLoading" class="flex justify-start">
              <div class="p-4 sketch-border-3 bg-white animate-pulse italic">
                Yuki is thinking...
              </div>
            </div>
          </div>

          <!-- Input Area -->
          <div class="p-4 border-t-2 border-zinc-200 bg-zinc-50/50">
            <!-- Image Preview -->
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
                  @click="$refs.fileInput.click()" 
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
                <button @click="clearChat" class="text-xs text-zinc-400 hover:text-zinc-600 underline">Clear</button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue'
import { marked } from 'marked'

definePageMeta({ layout: 'default' })

// State
const apiKey = ref('')
const tempApiKey = ref('')
const currentModel = ref('google/gemini-2.0-flash-001')
const messages = ref<any[]>([
  { role: 'assistant', content: "Hi there! I'm Yuki, your hand-drawn AI companion. How can I help you today?" }
])
const inputMessage = ref('')
const isLoading = ref(false)
const chatContainer = ref<HTMLElement | null>(null)
const selectedImage = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

// Model search and selection
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
  return availableModels.value.filter(m => 
    (m.name?.toLowerCase().includes(search)) || 
    (m.id?.toLowerCase().includes(search))
  )
})

const selectModel = (m: any) => {
  currentModel.value = m.id
  modelSearch.value = m.name || m.id
  showModelDropdown.value = false
  localStorage.setItem('yuki_current_model', m.id)
}

// Live2D State
const isModelLoaded = ref(false)
const characterResponse = ref("Hi there! I'm Yuki, your hand-drawn AI companion. How can I help you today?")
let l2dv: any = null

onMounted(async () => {
  const storedKey = localStorage.getItem('yuki_api_key')
  if (storedKey) {
    apiKey.value = storedKey
  }
  
  const savedMessages = localStorage.getItem('yuki_messages')
  if (savedMessages) {
    try {
      messages.value = JSON.parse(savedMessages)
    } catch (e) {
      console.error('Failed to load messages:', e)
    }
  }

  const savedModel = localStorage.getItem('yuki_current_model')
  if (savedModel) {
    currentModel.value = savedModel
  }
  
  scrollToBottom()
  
  // Fetch models from OpenRouter
  await fetchModels()
  
  // Set initial model search text
  const initialModel = availableModels.value.find(m => m.id === currentModel.value)
  if (initialModel) {
    modelSearch.value = initialModel.name || initialModel.id
  } else {
    modelSearch.value = currentModel.value
  }

  // Initialize Live2D
  initLive2D()

  // Click outside to close dropdown
  window.addEventListener('click', handleOutsideClick)
})

onUnmounted(() => {
  if (l2dv) {
    l2dv = null
  }
  window.removeEventListener('click', handleOutsideClick)
})

const handleOutsideClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.model-selector-container')) {
    showModelDropdown.value = false
  }
}

const fetchModels = async () => {
  // Load from cache first
  const cached = localStorage.getItem('yuki_available_models')
  if (cached) {
    try {
      availableModels.value = JSON.parse(cached)
    } catch (e) {}
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

// Handlers
const saveApiKey = () => {
  if (tempApiKey.value.trim()) {
    apiKey.value = tempApiKey.value.trim()
    localStorage.setItem('yuki_api_key', apiKey.value)
    tempApiKey.value = ''
    nextTick(() => {
      initLive2D()
    })
  }
}

const resetApiKey = () => {
  if (confirm('Are you sure you want to reset your API key?')) {
    apiKey.value = ''
    localStorage.removeItem('yuki_api_key')
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
  return marked(text)
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
    // Format messages for OpenRouter
    const apiMessages = messages.value.map(m => {
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
        messages: apiMessages
      })
    })
    
    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error?.message || 'Failed to fetch response')
    }
    
    const data = await response.json()
    const aiText = data.choices[0].message.content
    
    // Extract image URLs from the response content
    const imageUrls: string[] = []
    const urlRegex = /https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp)(?:\?\S+)?/gi
    const matches = aiText.match(urlRegex)
    if (matches) {
      matches.forEach((url: string) => {
        // Clean up URL (remove trailing markdown parens or quotes)
        const cleanUrl = url.split(')')[0].split('"')[0].split("'")[0]
        imageUrls.push(cleanUrl)
      })
    }

    messages.value.push({ 
      role: 'assistant', 
      content: aiText,
      images: imageUrls.length > 0 ? imageUrls : undefined
    })
    characterResponse.value = aiText.length > 200 ? aiText.substring(0, 200) + '...' : aiText
    
    localStorage.setItem('yuki_messages', JSON.stringify(messages.value))
    
    // Trigger Live2D motion
    if (l2dv) {
      l2dv.startMotion('tap_body')
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
    messages.value = [
      { role: 'assistant', content: "Hi there! I'm Yuki, your hand-drawn AI companion. How can I help you today?" }
    ]
    characterResponse.value = "Hi there! I'm Yuki, your hand-drawn AI companion. How can I help you today?"
    localStorage.removeItem('yuki_messages')
  }
}

// Live2D Initialization
const initLive2D = async () => {
  try {
    const canvas = document.getElementById('L2dCanvas')
    if (!canvas) return
    
    // Clear canvas
    canvas.innerHTML = ''
    
    // Load SDK scripts if not already loaded
    await Promise.all([
      loadScript('https://unpkg.com/core-js-bundle@3.6.1/minified.js'),
      loadScript('https://cdn.jsdelivr.net/gh/jianchengwang/live2d_models@main/assets/js/lib/live2dcubismcore.min.js'),
      loadScript('https://cdn.jsdelivr.net/gh/jianchengwang/live2d_models@main/assets/js/live2dv3.js'),
      loadScript('https://cdn.jsdelivr.net/gh/jianchengwang/live2d_models@main/assets/js/charData.js'),
    ])

    if (window.L2dViewer) {
      // Initialize Viewer
      window.l2dv = new window.L2dViewer({
        el: canvas,
        modelHomePath: 'https://cdn.jsdelivr.net/gh/jianchengwang/live2d_models@main/assets/model/moc3/',
        model: 'xuefeng_3',
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

// Extend window interface
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

h1, h2 {
  font-family: 'Indie Flower', cursive;
}

/* Override prose to use hand-drawn font */
:deep(.prose) {
  font-family: 'Patrick Hand', cursive;
}

.character-container {
  border-radius: 40px 10px 45px 15px / 15px 45px 15px 40px;
}

/* Custom Scrollbar */
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

/* Style for the model dropdown search */
.model-selector-container .sketch-border {
  border-radius: 12px 4px 14px 5px / 5px 14px 5px 12px;
}
</style>
