<template>
  <div class="min-h-screen bg-[#fcfcfc] px-4 py-4 font-hand md:px-8">
    <div class="mx-auto mb-6 flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 class="mb-1 text-3xl font-bold text-zinc-900 sm:text-4xl">Yuki AI</h1>
        <p class="text-sm text-zinc-600 italic sm:text-base">A minimalist hand-drawn AI companion</p>
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

    <div v-else class="mx-auto grid max-w-7xl grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
      <div class="order-2 space-y-5 lg:order-1 lg:col-span-5">
        <div class="sketch-card bg-white p-4 md:p-5">
          <div class="flex items-center justify-between gap-2 mb-3">
            <h2 class="text-2xl font-bold">{{ currentCharacterName }}</h2>
            <div class="flex items-center gap-3">
              <span class="text-xs uppercase tracking-wide text-zinc-500">Live2D</span>
              <button class="text-xs font-bold uppercase tracking-wide text-zinc-500 lg:hidden" @click="mobileCharacterExpanded = !mobileCharacterExpanded">
                {{ mobileCharacterExpanded ? 'Hide' : 'Show' }}
              </button>
            </div>
          </div>

          <div v-show="mobileCharacterExpanded || isDesktopViewport" class="character-container relative mx-auto aspect-[4/5] w-full max-w-[620px] overflow-hidden bg-[radial-gradient(circle_at_top,_#ffffff_0%,_#f4f4f5_58%,_#e4e4e7_100%)] p-0 sketch-border-3">
            <ClientOnly>
              <div id="L2dCanvas" class="w-full h-full relative"></div>
              <div v-if="!isModelLoaded" class="absolute inset-0 flex items-center justify-center bg-white/80">
                <span class="animate-pulse italic">Summoning {{ currentCharacterName }}...</span>
              </div>
            </ClientOnly>
          </div>

          <div v-if="characterResponse && (mobileCharacterExpanded || isDesktopViewport)" class="mt-4 sketch-border-3 p-4 bg-white max-w-[460px] mx-auto relative">
            <div class="absolute -top-3 left-10 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[12px] border-b-black"></div>
            <p class="text-sm leading-relaxed">{{ characterResponse }}</p>
          </div>
        </div>

        <div class="sketch-card bg-white p-4 md:p-5">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-2xl font-bold">Model Switch Panel</h3>
            <div class="flex items-center gap-3">
              <span class="text-xs uppercase tracking-wide text-zinc-500">{{ filteredLive2dModels.length }} / {{ availableLive2dModels.length }} models</span>
              <button class="text-xs font-bold uppercase tracking-wide text-zinc-500 lg:hidden" @click="mobileSwitchExpanded = !mobileSwitchExpanded">
                {{ mobileSwitchExpanded ? 'Hide' : 'Show' }}
              </button>
            </div>
          </div>
          <div v-show="mobileSwitchExpanded || isDesktopViewport" class="space-y-3">
            <input
              v-model="live2dSearch"
              type="text"
              placeholder="Search Live2D model..."
              class="w-full bg-white px-3 py-2 sketch-border outline-none focus:sketch-shadow-sm text-sm"
            />
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            <button
              v-for="model in filteredLive2dModels"
              :key="model.id"
              type="button"
              @click="handleLive2dModelChange(model.id)"
              :class="[
                'model-card text-left p-3 sketch-border transition-all duration-200',
                currentLive2dModel === model.id ? '!bg-zinc-900 !text-white scale-[1.01]' : 'bg-white hover:bg-zinc-50'
              ]"
            >
              <div class="thumbnail-box mb-2" :class="currentLive2dModel === model.id ? 'thumbnail-active' : ''">
                <span class="text-xl font-bold">{{ model.badge || model.name.slice(0, 1) }}</span>
              </div>
              <p class="text-sm font-bold leading-tight">{{ model.name }}</p>
              <p class="text-[10px] opacity-70 truncate">{{ model.id }}</p>
            </button>
            </div>
            <div v-if="filteredLive2dModels.length === 0" class="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
              No Live2D models match the current search.
            </div>
          </div>
        </div>
      </div>

      <div class="order-1 flex min-h-[56vh] flex-col lg:order-2 lg:col-span-7 lg:h-[75vh] lg:min-h-[420px]">
        <div class="flex flex-1 flex-col overflow-hidden sketch-card bg-white p-0">
          <div ref="chatContainer" class="flex-1 space-y-5 overflow-y-auto p-4 scroll-smooth sm:p-6 sm:space-y-6">
            <div v-for="(msg, index) in messages" :key="index" :class="['flex', msg.role === 'user' ? 'justify-end' : 'justify-start']">
              <div
                :class="[
                  'relative group max-w-[94%] p-3 sketch-border-3 sm:max-w-[90%] sm:p-4',
                  msg.role === 'user' ? 'bg-zinc-50' : 'bg-white'
                ]"
              >
                <div v-if="msg.images && msg.images.length" class="mb-3 flex flex-wrap gap-2">
                  <img
                    v-for="(img, i) in msg.images"
                    :key="i"
                    :src="img"
                    class="max-w-[200px] max-h-[200px] object-contain sketch-border cursor-zoom-in"
                    @click="openImagePreview(msg.images, i)"
                  />
                </div>
                <div class="prose prose-zinc max-w-none prose-sm sm:prose-base" v-html="renderMarkdown(msg.content)"></div>
                
                <!-- Play button for assistant messages -->
                <button 
                  v-if="msg.role === 'assistant'"
                  @click="playVoice(msg.content)"
                  class="absolute right-1 top-1 rounded-full bg-white/90 p-2 text-zinc-400 opacity-100 transition-opacity hover:text-zinc-800 sm:-right-10 sm:top-0 sm:bg-transparent sm:opacity-0 sm:group-hover:opacity-100"
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

          <div class="border-t-2 border-zinc-200 bg-zinc-50/50 p-4">
            <div v-if="selectedImage" class="mb-3 relative inline-block">
              <img :src="selectedImage" class="w-20 h-20 object-cover sketch-border cursor-zoom-in" @click="openImagePreview([selectedImage], 0)" />
              <button @click="selectedImage = null" class="absolute -top-2 -right-2 bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-zinc-800 transition-colors">×</button>
            </div>

            <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
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
              <div class="flex flex-col gap-2 sm:w-auto">
                <button
                  @click="sendMessage"
                  :disabled="isLoading || (!inputMessage.trim() && !selectedImage)"
                  class="sketch-button min-w-[80px] py-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Send
                </button>
                <div class="mt-1 flex flex-wrap items-center justify-between gap-3">
                  <div class="flex flex-wrap items-center gap-3">
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

    <ImageLightbox v-model="previewOpen" :images="previewImages" :start-index="previewStartIndex" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue'
import ImageLightbox from '~/components/ImageLightbox.vue'
import { useGlobalOpenRouterKey } from '~/composables/useGlobalOpenRouterKey'
import { renderSafeMarkdown } from '~/utils/safeRichText'

definePageMeta({ layout: 'default' })

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  images?: string[]
}

type Live2dModelOption = {
  id: string
  name: string
  path: string
  badge?: string
}

const REMOTE_IMAGE_URL_PATTERN = /^https?:\/\//i

const { apiKey, openGlobalSettings } = useGlobalOpenRouterKey()
const currentModel = ref('google/gemini-2.0-flash-001')
const messages = ref<ChatMessage[]>([])
const inputMessage = ref('')
const isLoading = ref(false)
const chatContainer = ref<HTMLElement | null>(null)
const selectedImage = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const autoPronounce = ref(true)
const isSpeaking = ref(false)
const previewOpen = ref(false)
const previewImages = ref<string[]>([])
const previewStartIndex = ref(0)
const mobileCharacterExpanded = ref(false)
const mobileSwitchExpanded = ref(false)
const isDesktopViewport = ref(false)
const live2dSearch = ref('')

const availableLive2dModels = ref<Live2dModelOption[]>([
  { id: 'xuefeng_3', name: 'Sarah', path: 'xuefeng_3', badge: 'S' },
  { id: 'xuefeng', name: 'Emma', path: 'xuefeng', badge: 'E' },
  { id: 'lafei_4', name: 'Sophie', path: 'lafei_4', badge: 'So' },
  { id: 'lafei', name: 'Lafei', path: 'lafei', badge: 'L' },
  { id: 'chuixue_3', name: 'Chuixue', path: 'chuixue_3', badge: 'C' },
  { id: 'ariu', name: 'Ariu', path: 'ariu', badge: 'Ar' },
  { id: '6xb', name: '6XB', path: '6xb', badge: '6X' }
])
const currentLive2dModel = ref('xuefeng_3')

const currentLive2dModelConfig = computed(() =>
  availableLive2dModels.value.find((model) => model.id === currentLive2dModel.value) || availableLive2dModels.value[0]
)

const currentCharacterName = computed(() => currentLive2dModelConfig.value?.name || 'Sarah')
const currentLive2dRuntimeModel = computed(() => currentLive2dModelConfig.value?.path || currentLive2dModel.value)

const filteredLive2dModels = computed(() => {
  const query = live2dSearch.value.trim().toLowerCase()
  if (!query) return availableLive2dModels.value

  return availableLive2dModels.value.filter((model) =>
    `${model.name}\n${model.id}\n${model.path}`.toLowerCase().includes(query)
  )
})

const availableModels = ref<any[]>([
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash (Fast)', outputModalities: ['text'] },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini (Smart)', outputModalities: ['text'] },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', outputModalities: ['text'] },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', outputModalities: ['text'] }
])
const modelSearch = ref('')
const showModelDropdown = ref(false)

const syncViewportMode = () => {
  isDesktopViewport.value = window.innerWidth >= 1024
  if (isDesktopViewport.value) {
    mobileCharacterExpanded.value = true
    mobileSwitchExpanded.value = true
  }
}

const filteredModels = computed(() => {
  if (!modelSearch.value) return availableModels.value.slice(0, 50)
  const search = modelSearch.value.toLowerCase()
  return availableModels.value.filter(
    (m) => (m.name?.toLowerCase().includes(search)) || (m.id?.toLowerCase().includes(search))
  )
})

const currentModelSupportsImages = computed(() => {
  const model = availableModels.value.find((m) => m.id === currentModel.value)
  const outputModalities = model?.outputModalities || []
  return outputModalities.includes('image') ||
    currentModel.value.includes('flux') ||
    currentModel.value.includes('dall-e') ||
    currentModel.value.includes('stable-diffusion') ||
    currentModel.value.includes('imagen')
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

const createDefaultMessages = (): ChatMessage[] => [{ role: 'assistant', content: defaultMessage.value }]

const normalizeStoredMessages = (value: unknown): ChatMessage[] => {
  if (!Array.isArray(value)) return []

  return value
    .map((entry): ChatMessage | null => {
      const role = entry?.role === 'user' ? 'user' : entry?.role === 'assistant' ? 'assistant' : null
      const content = typeof entry?.content === 'string' ? entry.content : ''
      const images = Array.isArray(entry?.images)
        ? entry.images.filter((image): image is string => typeof image === 'string' && REMOTE_IMAGE_URL_PATTERN.test(image))
        : undefined

      if (!role) return null
      if (!content.trim() && (!images || images.length === 0)) return null

      return {
        role,
        content,
        images: images?.length ? images : undefined
      }
    })
    .filter((entry): entry is ChatMessage => Boolean(entry))
}

const persistMessages = () => {
  try {
    const persistableMessages = messages.value
      .map((message) => ({
        role: message.role,
        content: message.content,
        images: message.images?.filter((image) => REMOTE_IMAGE_URL_PATTERN.test(image))
      }))
      .filter((message) => message.content.trim() || message.images?.length)

    localStorage.setItem('yuki_messages', JSON.stringify(persistableMessages))
  } catch (error) {
    console.error('Failed to persist messages:', error)
  }
}

onMounted(async () => {
  syncViewportMode()
  window.addEventListener('resize', syncViewportMode)
  const savedMessages = localStorage.getItem('yuki_messages')
  if (savedMessages) {
    try {
      messages.value = normalizeStoredMessages(JSON.parse(savedMessages))
    } catch (e) {
      console.error('Failed to load messages:', e)
      messages.value = createDefaultMessages()
    }
  } else {
    messages.value = createDefaultMessages()
  }

  if (messages.value.length === 0) {
    messages.value = createDefaultMessages()
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

  window.removeEventListener('resize', syncViewportMode)
  window.removeEventListener('click', handleOutsideClick)
})

watch(apiKey, (value) => {
  if (value && !l2dv) {
    initLive2D()
  }
})

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
        name: m.name,
        outputModalities: m.architecture?.output_modalities || []
      }))
      localStorage.setItem('yuki_available_models', JSON.stringify(availableModels.value))
    }
  } catch (error) {
    console.error('Failed to fetch models:', error)
  }
}

const extractImageUrls = (message: any) => {
  const urls: string[] = []
  const pushUrl = (value?: string) => {
    if (!value) return
    const cleanUrl = value.trim().split(')')[0].split('"')[0].split("'")[0]
    if (cleanUrl && !urls.includes(cleanUrl)) {
      urls.push(cleanUrl)
    }
  }

  if (Array.isArray(message?.content)) {
    message.content.forEach((entry: any) => {
      if (entry?.type === 'image_url') {
        pushUrl(entry.image_url?.url)
      }
    })
  }

  if (Array.isArray(message?.images)) {
    message.images.forEach((entry: any) => {
      if (typeof entry === 'string') {
        pushUrl(entry)
      } else {
        pushUrl(entry?.image_url?.url || entry?.url)
      }
    })
  }

  if (typeof message?.content === 'string') {
    if (message.content.startsWith('http') || message.content.startsWith('data:image')) {
      pushUrl(message.content)
    }

    const markdownMatches = message.content.matchAll(/!\[[^\]]*]\(([^)\s]+)[^)]*\)/g)
    for (const match of markdownMatches) {
      pushUrl(match[1])
    }

    const urlMatches = message.content.match(/https?:\/\/[^\s)"']+/gi) || []
    urlMatches.forEach((match: string) => pushUrl(match))
  }

  return urls
}

const sanitizeSpeechText = (text: string) => {
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*]\(([^)]+)\)/g, ' ')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[*_~`#>\[\]\(\){}]/g, ' ')
    .replace(/[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/g, ' ')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/[^A-Za-z0-9\s.,!?;:'"()-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
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
  return renderSafeMarkdown(text)
}

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

const openImagePreview = (images: string[], startIndex = 0) => {
  if (!images?.length) return
  previewImages.value = images.filter(Boolean)
  previewStartIndex.value = startIndex
  previewOpen.value = true
}

const sendMessage = async () => {
  if (isLoading.value || (!inputMessage.value.trim() && !selectedImage.value)) return
  if (!apiKey.value) return

  const userText = inputMessage.value.trim()
  const userImage = selectedImage.value

  const newMessage: ChatMessage = { role: 'user', content: userText }
  if (userImage) {
    newMessage.images = [userImage]
  }

  messages.value.push(newMessage)
  persistMessages()
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
        ],
        ...(currentModelSupportsImages.value ? { modalities: ['text', 'image'] } : {})
      })
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error?.message || 'Failed to fetch response')
    }

    const data = await response.json()
    const message = data.choices[0].message
    let aiText = ''
    const imageUrls = extractImageUrls(message)

    if (Array.isArray(message.content)) {
      message.content.forEach((c: any) => {
        if (c.type === 'text' && typeof c.text === 'string') aiText += c.text
      })
    } else {
      aiText = message.content || ''
    }

    messages.value.push({
      role: 'assistant',
      content: aiText,
      images: imageUrls.length > 0 ? imageUrls : undefined
    })
    characterResponse.value = aiText.length > 200 ? `${aiText.substring(0, 200)}...` : aiText

    persistMessages()

    if (l2dv) {
      l2dv.startMotion('tap_body')
    }
    if (autoPronounce.value) {
      playVoice(aiText)
    }
  } catch (error: any) {
    console.error('AI Error:', error)
    messages.value.push({ role: 'assistant', content: `Error: ${error.message}` })
    persistMessages()
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
        model: currentLive2dRuntimeModel.value,
        width: Math.round((canvas.clientWidth || 520) * Math.min(window.devicePixelRatio || 1, 2)),
        height: Math.round((canvas.clientHeight || 640) * Math.min(window.devicePixelRatio || 1, 2)),
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
    l2dv.loadModel(currentLive2dRuntimeModel.value)
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

    const cleanText = sanitizeSpeechText(text)
    if (!cleanText) {
      isSpeaking.value = false
      return
    }

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
  min-height: 120px;
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
  overflow: hidden;
}

:deep(#L2dCanvas canvas) {
  width: 100% !important;
  height: 100% !important;
  image-rendering: auto;
  transform-origin: center bottom;
}

.model-selector-container .sketch-border {
  border-radius: 12px 4px 14px 5px / 5px 14px 5px 12px;
}
</style>
