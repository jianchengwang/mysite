<template>
  <div class="min-h-screen bg-[#fef2f2] font-hand py-8 px-4">
    <div class="max-w-4xl mx-auto">
      <div class="mb-8 text-center">
        <h1 class="text-5xl font-bold text-zinc-900 mb-2">Rednote Optimizer</h1>
        <p class="text-zinc-600 italic">Polish your XiaoHongShu posts with AI ✨</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Left: Text Editor -->
        <div class="space-y-6">
          <div class="sketch-card bg-white">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-2xl font-bold">Draft Copy</h2>
              <select v-model="textModel" class="p-1 text-xs sketch-border bg-white outline-none">
                <option v-for="m in textModels" :key="m.id" :value="m.id">{{ m.name }}</option>
              </select>
            </div>
            <textarea 
              v-model="rawText" 
              rows="8" 
              class="w-full p-4 sketch-border focus:sketch-shadow-sm outline-none resize-none text-base"
              placeholder="Paste your raw thoughts here..."
            ></textarea>
            
            <div class="mt-4 flex flex-wrap gap-2">
              <button 
                @click="optimizeCopy" 
                :disabled="isOptimizing || !rawText"
                class="flex-1 sketch-button !bg-rose-500 !text-white disabled:opacity-50"
              >
                {{ isOptimizing ? '🪄 Optimizing...' : '🚀 Optimize for Rednote' }}
              </button>
            </div>
          </div>

          <div v-if="optimizedText" class="sketch-card bg-white relative">
            <div class="absolute -top-3 -right-3 bg-rose-100 border border-rose-900 px-2 py-1 text-xs font-bold rotate-6">Result</div>
            <h2 class="text-2xl font-bold mb-4">Optimized Copy</h2>
            <div class="p-4 sketch-border bg-rose-50/30 whitespace-pre-wrap text-base relative group">
              {{ optimizedText }}
              <button 
                @click="copyToClipboard(optimizedText)"
                class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white border border-zinc-200 rounded hover:bg-zinc-50"
                title="Copy to clipboard"
              >
                📋
              </button>
            </div>
          </div>
        </div>

        <!-- Right: Image Tools -->
        <div class="space-y-6">
          <div class="sketch-card bg-white">
            <h2 class="text-2xl font-bold mb-4">Visuals</h2>
            
            <!-- Image Preview List -->
            <div v-if="images.length > 0" class="grid grid-cols-2 gap-3 mb-6">
              <div v-for="(img, idx) in images" :key="idx" class="relative group">
                <img :src="img" class="w-full aspect-square object-cover sketch-border" />
                <button 
                  @click="removeImage(idx)" 
                  class="absolute -top-2 -right-2 bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            </div>

            <div class="space-y-3">
              <div class="flex gap-2">
                <button @click="openWhiteboard" class="flex-1 sketch-button !bg-zinc-900 !text-white text-sm">
                  🎨 Draw on Whiteboard
                </button>
                <button @click="triggerUpload" class="flex-1 sketch-button bg-white text-sm">
                  📤 Upload Image
                </button>
              </div>
              
              <div class="pt-4 border-t border-dashed border-zinc-200">
                <div class="flex justify-between items-center mb-2">
                  <h3 class="font-bold text-sm">AI Image Generation</h3>
                  <select v-model="imageModel" class="p-1 text-[10px] sketch-border bg-white outline-none">
                    <option v-for="m in imageModels" :key="m.id" :value="m.id">{{ m.name }}</option>
                  </select>
                </div>
                <div class="flex gap-2">
                  <input 
                    v-model="imagePrompt" 
                    placeholder="Describe image..." 
                    class="flex-1 p-2 text-sm sketch-border outline-none"
                    @keyup.enter="generateImage"
                  />
                  <button 
                    @click="generateImage" 
                    :disabled="isGeneratingImage || !imagePrompt"
                    class="sketch-button py-2 px-4 !bg-rose-500 !text-white text-sm disabled:opacity-50"
                  >
                    {{ isGeneratingImage ? '...' : '✨' }}
                  </button>
                </div>
              </div>
            </div>
            
            <input type="file" ref="fileInput" class="hidden" accept="image/*" @change="handleUpload" />
          </div>

          <!-- Quick Tips -->
          <div class="sketch-card bg-rose-50 border-rose-200 text-xs italic space-y-2">
            <p>💡 Tip: Rednote loves emojis and vertical spacing!</p>
            <p>💡 Tip: Use the Whiteboard to create custom hand-drawn labels.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Whiteboard Modal -->
    <Teleport to="body">
      <div v-if="showWhiteboard" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <div class="bg-white w-full max-w-6xl h-[90vh] rounded-2xl overflow-hidden flex flex-col relative shadow-2xl border-4 border-zinc-900">
          <button 
            @click="showWhiteboard = false" 
            class="absolute top-4 right-4 z-[110] w-10 h-10 bg-white border-2 border-zinc-900 rounded-full flex items-center justify-center text-2xl hover:bg-zinc-100"
          >
            ×
          </button>
          <div class="flex-1 overflow-hidden">
            <WhiteboardCanvas is-modal @save="handleWhiteboardSave" />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import WhiteboardCanvas from '~/components/WhiteboardCanvas.vue'

definePageMeta({ layout: 'default' })

const apiKey = ref('')
const rawText = ref('')
const optimizedText = ref('')
const isOptimizing = ref(false)

const textModel = ref('google/gemini-2.0-flash-001')
const imageModel = ref('black-forest-labs/flux-schnell')

const textModels = [
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat' }
]

const imageModels = [
  { id: 'black-forest-labs/flux-schnell', name: 'Flux Schnell' },
  { id: 'openai/dall-e-3', name: 'DALL-E 3' },
  { id: 'google/imagen-3', name: 'Imagen 3' }
]

const images = ref<string[]>([])
const imagePrompt = ref('')
const isGeneratingImage = ref(false)
const showWhiteboard = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

onMounted(() => {
  apiKey.value = localStorage.getItem('global_openrouter_key') || ''
})

const optimizeCopy = async () => {
  if (!rawText.value || !apiKey.value) {
    if (!apiKey.value) alert('Please set OpenRouter API Key in settings')
    return
  }
  
  isOptimizing.value = true
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.value}`,
      },
      body: JSON.stringify({
        model: textModel.value,
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert Rednote (XiaoHongShu) copywriter. Transform the user text into an engaging Rednote post. Use catchy headings, appropriate emojis, bullet points for readability, and relevant hashtags at the end. Keep it friendly and lifestyle-oriented.' 
          },
          { role: 'user', content: rawText.value }
        ]
      })
    })

    if (!response.ok) throw new Error('Failed to optimize')
    const data = await response.json()
    optimizedText.value = data.choices[0].message.content
  } catch (error: any) {
    alert('Optimization failed: ' + error.message)
  } finally {
    isOptimizing.value = false
  }
}

const generateImage = async () => {
  if (!imagePrompt.value || !apiKey.value) return
  isGeneratingImage.value = true
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.value}`,
      },
      body: JSON.stringify({
        model: imageModel.value,
        messages: [{ role: 'user', content: imagePrompt.value }],
        modalities: ["image"]
      })
    })

    if (!response.ok) throw new Error('Generation failed')
    const data = await response.json()
    const message = data.choices[0].message
    
    let imageUrl = ''
    if (Array.isArray(message.content)) {
      const imgObj = message.content.find((c: any) => c.type === 'image_url')
      if (imgObj) imageUrl = imgObj.image_url.url
    } else if (message.images && message.images.length > 0) {
      imageUrl = typeof message.images[0] === 'string' ? message.images[0] : (message.images[0].image_url?.url || '')
    }

    if (imageUrl) {
      images.value.push(imageUrl)
      imagePrompt.value = ''
    }
  } catch (error: any) {
    alert('Image generation failed: ' + error.message)
  } finally {
    isGeneratingImage.value = false
  }
}

const openWhiteboard = () => {
  showWhiteboard.value = true
}

const handleWhiteboardSave = (dataUrl: string) => {
  images.value.push(dataUrl)
  showWhiteboard.value = false
}

const triggerUpload = () => {
  fileInput.value?.click()
}

const handleUpload = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target?.result) {
        images.value.push(event.target.result as string)
      }
    }
    reader.readAsDataURL(file)
  }
}

const removeImage = (idx: number) => {
  images.value.splice(idx, 1)
}

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text)
  alert('Copied to clipboard!')
}
</script>

<style scoped>
.font-hand { font-family: 'Patrick Hand', cursive; }
h1, h2, h3 { font-family: 'Indie Flower', cursive; }
</style>
