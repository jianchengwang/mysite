<template>
  <div class="max-w-4xl mx-auto px-4 py-8 h-screen flex flex-col font-hand">
    <!-- Header -->
    <div class="mb-8 text-center">
      <h1 class="text-4xl font-bold text-zinc-900 mb-2 font-hand">Yuki AI</h1>
      <p class="text-zinc-600 font-hand">A minimalist hand-drawn AI chat assistant</p>
    </div>

    <!-- API Key Input (if not set) -->
    <div v-if="!apiKey" class="sketch-card mb-8">
      <h2 class="text-xl font-bold mb-4">Set OpenRouter API Key</h2>
      <p class="mb-4 text-sm text-zinc-500 italic">Your API key is stored locally in your browser and used only to call OpenRouter directly.</p>
      <div class="flex gap-4">
        <input 
          v-model="tempApiKey" 
          type="password" 
          placeholder="sk-or-v1-..." 
          class="flex-1 px-4 py-2 sketch-border bg-white outline-none focus:sketch-shadow-sm"
        />
        <button @click="saveApiKey" class="sketch-button">Save</button>
      </div>
    </div>

    <!-- Chat Interface -->
    <div v-else class="flex-1 flex flex-col min-h-0 sketch-card bg-white p-0 overflow-hidden">
      <!-- Messages -->
      <div 
        ref="chatContainer" 
        class="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
      >
        <div v-for="(msg, index) in messages" :key="index" :class="['flex', msg.role === 'user' ? 'justify-end' : 'justify-start']">
          <div 
            :class="[
              'max-w-[85%] p-4 sketch-border-3', 
              msg.role === 'user' ? 'bg-zinc-50' : 'bg-white'
            ]"
          >
            <div class="prose prose-zinc max-w-none" v-html="renderMarkdown(msg.content)"></div>
          </div>
        </div>
        <div v-if="isLoading" class="flex justify-start">
          <div class="p-4 sketch-border-3 bg-white animate-pulse">
            Thinking...
          </div>
        </div>
      </div>

      <!-- Input -->
      <div class="p-4 border-t-2 border-zinc-200 bg-zinc-50/50">
        <div class="flex gap-4 items-end">
          <textarea 
            v-model="inputMessage" 
            @keydown.enter.prevent="sendMessage"
            rows="2"
            placeholder="Type your message..."
            class="flex-1 p-3 sketch-border bg-white resize-none outline-none focus:sketch-shadow-sm"
          ></textarea>
          <div class="flex flex-col gap-2">
            <button @click="sendMessage" :disabled="isLoading" class="sketch-button py-2">Send</button>
            <button @click="clearChat" class="text-xs text-zinc-400 hover:text-zinc-600 underline">Clear</button>
            <button @click="resetApiKey" class="text-xs text-zinc-400 hover:text-zinc-600 underline">Reset Key</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { marked } from 'marked'

definePageMeta({ layout: 'default' })

const apiKey = ref('')
const tempApiKey = ref('')
const messages = ref<{ role: string; content: string }[]>([
  { role: 'assistant', content: "Hi there! I'm Yuki, your hand-drawn AI companion. How can I help you today?" }
])
const inputMessage = ref('')
const isLoading = ref(false)
const chatContainer = ref<HTMLElement | null>(null)

onMounted(() => {
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
  
  scrollToBottom()
})

const saveApiKey = () => {
  if (tempApiKey.value.trim()) {
    apiKey.value = tempApiKey.value.trim()
    localStorage.setItem('yuki_api_key', apiKey.value)
    tempApiKey.value = ''
  }
}

const resetApiKey = () => {
  if (confirm('Are you sure you want to reset your API key?')) {
    apiKey.value = ''
    localStorage.removeItem('yuki_api_key')
  }
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
  if (isLoading.value || !inputMessage.value.trim()) return
  
  const userText = inputMessage.value.trim()
  messages.value.push({ role: 'user', content: userText })
  inputMessage.value = ''
  isLoading.value = true
  scrollToBottom()
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.value}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Gemini Site'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: messages.value.map(m => ({ role: m.role, content: m.content }))
      })
    })
    
    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error?.message || 'Failed to fetch response')
    }
    
    const data = await response.json()
    const aiText = data.choices[0].message.content
    messages.value.push({ role: 'assistant', content: aiText })
    localStorage.setItem('yuki_messages', JSON.stringify(messages.value))
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
    localStorage.removeItem('yuki_messages')
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
</style>
