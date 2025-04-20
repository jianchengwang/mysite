<template>
  <div class="min-h-screen bg-gray-50 p-0 md:p-8 flex flex-col items-center">
    <div class="w-full max-w-4xl space-y-8">
      <h1 class="text-2xl font-bold mb-2 text-center">XAI Chat</h1>

      <!-- Chat Section -->
      <div class="bg-white shadow rounded p-0 md:p-0 flex flex-col h-[70vh]">
        <div class="flex justify-between items-center px-4 pt-4 pb-2 border-b">
          <h2 class="text-xl font-semibold">Chat</h2>
          <button @click="clearChat" class="text-xs px-2 py-1 bg-gray-100 hover:bg-red-200 text-gray-700 rounded">清空聊天</button>
        </div>
        <div class="flex-1 overflow-auto px-2 py-4 space-y-2 bg-gray-50">
          <div v-for="(msg, idx) in messages" :key="idx" class="flex w-full" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
            <div class="flex items-end" :class="msg.role === 'user' ? 'flex-row-reverse' : ''">
              <div class="w-8 h-8 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 font-bold mr-2 ml-2 select-none">
                <span v-if="msg.role === 'user'">U</span>
                <span v-else>A</span>
              </div>
              <div class="max-w-[80vw] md:max-w-2xl p-3 rounded-xl shadow-sm text-sm whitespace-pre-wrap break-words"
                :class="msg.role === 'user' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-white text-gray-900 border rounded-bl-none'">
                <template v-if="msg.role === 'assistant'">
                  <template v-if="msg.type === 'image'">
                    <div class="flex flex-col items-center">
                      <img :src="msg.imageSrc!" class="w-48 h-48 object-contain border rounded cursor-pointer hover:shadow-lg transition mb-2" @click="openPreview(msg.imageSrc!)" />
                      <div class="text-xs text-gray-700 mb-1">Revised Prompt: {{ msg.revised_prompt }}</div>
                      <div v-if="msg.content" v-html="renderMarkdown(msg.content || '')"></div>
                    </div>
                  </template>
                  <template v-else>
                    <span v-html="renderMarkdown(msg.content || '')"></span>
                  </template>
                </template>
                <template v-else>
                  {{ msg.content }}
                </template>
              </div>
            </div>
          </div>
        </div>
        <div class="p-3 border-t bg-white flex items-end space-x-2">
          <label class="cursor-pointer inline-flex items-center">
            <input type="file" accept="image/*" multiple @change="onFileChange" class="hidden" />
            <span class="px-2 py-1 bg-gray-200 rounded text-sm mr-2">📷</span>
          </label>
          <textarea v-model="chatInput" rows="1" placeholder="Enter message..." class="flex-1 border rounded p-2 resize-none" @keydown.enter.exact.prevent="onSend"></textarea>
          <label class="flex items-center space-x-1 select-none text-sm text-gray-700 mr-2">
            <input type="checkbox" v-model="isImageMode" class="accent-green-600" />
            <span>Image</span>
          </label>
          <button @click="onSend" class="px-4 py-2 bg-blue-600 text-white rounded">Send</button>
        </div>
        <div v-if="imageUrls.length" class="flex space-x-2 px-3 pb-2 overflow-auto">
          <div v-for="(src, i) in imageUrls" :key="i" class="relative group">
            <img :src="src" class="h-12 w-auto object-contain border rounded" />
            <button @click="removeImage(i)" class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-80 group-hover:opacity-100">×</button>
          </div>
        </div>
        <div v-if="previewImg" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" @click.self="closePreview">
          <img :src="previewImg" class="max-w-3xl max-h-[80vh] rounded shadow-2xl border-4 border-white" />
          <button @click="closePreview" class="absolute top-8 right-8 text-white text-3xl font-bold bg-black bg-opacity-40 rounded-full w-10 h-10 flex items-center justify-center">×</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { marked } from 'marked'
const config = useRuntimeConfig()

// Chat state
const chatInput = ref('')
const imageFiles = ref<File[]>([])
const imageUrls = ref<string[]>([])
const isImageMode = ref(false)
const messages = ref<Array<{ role: string; content?: string; type?: string; imageSrc?: string; revised_prompt?: string }>>([])

// 图片预览弹窗
const previewImg = ref<string | null>(null)
function openPreview(src: string) {
  if (src) previewImg.value = src
}
function closePreview() {
  previewImg.value = null
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files) return
  const files = Array.from(input.files)
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue
    const reader = new FileReader()
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        imageUrls.value.push(e.target.result)
        imageFiles.value.push(file)
      }
    }
    reader.readAsDataURL(file)
  }
}

function removeImage(idx: number) {
  imageUrls.value.splice(idx, 1)
  imageFiles.value.splice(idx, 1)
}

function clearChat() {
  messages.value = []
}

function renderMarkdown(text: string) {
  return marked.parse(text || '')
}

async function sendChat() {
  if (!chatInput.value && !imageUrls.value.length) return
  messages.value.push({ role: 'user', content: chatInput.value })
  try {
    const res = await fetch(
      `${config.public.apiBase}/api/xai/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: chatInput.value, image_urls: imageUrls.value })
      }
    )
    const data = await res.json()
    messages.value.push({ role: 'assistant', content: data.message })
  } catch (e) {
    messages.value.push({ role: 'assistant', content: 'Error contacting XAI.' })
  }
  chatInput.value = ''
  imageFiles.value = []
  imageUrls.value = []
}

async function generateImageFromPrompt() {
  if (!chatInput.value) return
  messages.value.push({ role: 'user', content: chatInput.value })
  try {
    const res = await fetch(
      `${config.public.apiBase}/api/xai/images/generations`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: chatInput.value })
      }
    )
    const data = await res.json()
    for (const item of data) {
      let imageSrc: string = ''
      if (typeof item.url === 'string') imageSrc = item.url
      else if (typeof item.b64_json === 'string') imageSrc = `data:image/png;base64,${item.b64_json}`
      messages.value.push({
        role: 'assistant',
        type: 'image',
        imageSrc,
        revised_prompt: item.revised_prompt,
        content: ''
      })
    }
  } catch (e) {
    messages.value.push({ role: 'assistant', content: '图片生成失败' })
  }
  chatInput.value = ''
}

function onSend() {
  if (isImageMode.value) {
    generateImageFromPrompt()
  } else {
    sendChat()
  }
}
</script>

<style scoped>
.group:hover .group-hover\:opacity-100 {
  opacity: 1 !important;
}
.bg-gray-50 {
  background: #f8fafc;
}
.max-h-72 {
  max-height: 18rem;
}
.h-\[70vh\] {
  height: 70vh;
}
</style>
