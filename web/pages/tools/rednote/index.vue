<template>
  <div class="min-h-screen bg-[#fef2f2] font-hand py-8 px-4">
    <div class="max-w-6xl mx-auto">
      <div class="mb-8 text-center">
        <h1 class="text-5xl font-bold text-zinc-900 mb-2">Rednote Optimizer</h1>
        <p class="text-zinc-600 italic">Polish your XiaoHongShu posts with AI ✨</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Left: Editing & Generation (7 columns) -->
        <div class="lg:col-span-7 space-y-6">
          <!-- Text Editing -->
          <div class="sketch-card bg-white">
            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
              <h2 class="text-2xl font-bold">1. Draft Copy</h2>
              <select v-model="textModel" class="p-2 text-sm sketch-border bg-white outline-none w-full sm:w-64 max-w-full">
                <option v-for="m in textModels" :key="m.id" :value="m.id">{{ m.name }}</option>
              </select>
            </div>
            <textarea 
              v-model="rawText" 
              rows="6" 
              class="w-full p-4 sketch-border focus:sketch-shadow-sm outline-none resize-none text-base"
              placeholder="Paste your raw thoughts here..."
            ></textarea>
            
            <div class="mt-4">
              <button 
                @click="optimizeCopy" 
                :disabled="isOptimizing || !rawText"
                class="w-full sketch-button !bg-rose-500 !text-white disabled:opacity-50"
              >
                {{ isOptimizing ? '🪄 Optimizing...' : '🚀 Optimize for Rednote' }}
              </button>
            </div>
          </div>

          <!-- Visuals -->
          <div class="sketch-card bg-white">
            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
              <h2 class="text-2xl font-bold">2. Visuals</h2>
              <select v-model="imageModel" class="p-2 text-sm sketch-border bg-white outline-none w-full sm:w-64 max-w-full">
                <option v-for="m in imageModels" :key="m.id" :value="m.id">{{ m.name }}</option>
              </select>
            </div>
            
            <div class="space-y-4">
              <!-- Actions -->
              <div class="flex gap-2">
                <button @click="openWhiteboard" class="flex-1 sketch-button !bg-zinc-900 !text-white text-sm py-2">
                  🎨 Draw
                </button>
                <button @click="triggerUpload" class="flex-1 sketch-button bg-white text-sm py-2">
                  📤 Upload
                </button>
              </div>
              
              <!-- AI Image -->
              <div class="flex gap-2">
                <input 
                  v-model="imagePrompt" 
                  placeholder="Describe image to generate..." 
                  class="flex-1 p-2 text-sm sketch-border outline-none"
                  @keyup.enter="generateImage"
                />
                <button 
                  @click="generateImage" 
                  :disabled="isGeneratingImage || !imagePrompt"
                  class="sketch-button py-2 px-4 !bg-rose-500 !text-white text-sm disabled:opacity-50 whitespace-nowrap"
                >
                  {{ isGeneratingImage ? '...' : '✨ Gen' }}
                </button>
              </div>
            </div>
            
            <input type="file" ref="fileInput" class="hidden" accept="image/*" @change="handleUpload" multiple />
          </div>
        </div>

        <!-- Right: Mobile Preview (5 columns) -->
        <div class="lg:col-span-5 flex justify-center">
          <div class="w-full max-w-[400px] sketch-card bg-white p-0 overflow-hidden flex flex-col relative" style="min-height: 700px; max-height: 800px;">
            <div class="bg-rose-500 text-white text-center py-3 font-bold flex justify-between items-center px-4">
              <span class="text-sm opacity-80">&lt; Back</span>
              <span>Rednote Preview</span>
              <button @click="copyToClipboard(optimizedText)" class="hover:text-rose-200 text-lg" title="Copy Text">📋</button>
            </div>
            
            <div class="flex-1 overflow-y-auto pb-4 custom-scrollbar">
              <!-- Image Carousel -->
              <div class="w-full aspect-[3/4] bg-zinc-100 border-b border-zinc-200 relative overflow-hidden flex items-center justify-center">
                <div v-if="images.length > 0" class="w-full h-full relative group">
                  <img :src="images[currentImageIdx]" class="w-full h-full object-cover" />
                  
                  <!-- Remove Image button -->
                  <button 
                    @click="removeImage(currentImageIdx)" 
                    class="absolute top-2 right-2 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>

                  <!-- Navigation Dots -->
                  <div v-if="images.length > 1" class="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                    <div v-for="(_, idx) in images" :key="idx" 
                        class="w-2 h-2 rounded-full border border-black/20"
                        :class="idx === currentImageIdx ? 'bg-rose-500 scale-110' : 'bg-white/80'"
                    ></div>
                  </div>
                  <!-- Arrow Keys -->
                  <button v-if="images.length > 1" @click="prevImage" class="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold font-sans hover:bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">&lt;</button>
                  <button v-if="images.length > 1" @click="nextImage" class="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold font-sans hover:bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">&gt;</button>
                </div>
                <div v-else class="text-zinc-400 text-center p-8">
                  <div class="text-4xl mb-2">📸</div>
                  <p>No visuals yet.<br>Add images from the left panel.</p>
                </div>
              </div>

              <!-- Content Area -->
              <div class="p-5">
                <div v-if="optimizedText" class="whitespace-pre-wrap text-[15px] leading-[1.8] text-zinc-800 font-sans">
                  {{ optimizedText }}
                </div>
                <div v-else class="text-zinc-400 text-center mt-10 font-sans text-sm">
                  <p>No optimized copy yet.<br>Generate text from the left panel.</p>
                </div>
              </div>
            </div>
            
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

// Initial default models
const textModels = ref([
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat' }
])

const imageModels = ref([
  { id: 'black-forest-labs/flux-schnell', name: 'Flux Schnell' },
  { id: 'openai/dall-e-3', name: 'DALL-E 3' },
  { id: 'google/imagen-3', name: 'Imagen 3' },
  { id: 'stabilityai/stable-diffusion-3-medium', name: 'Stable Diffusion 3' }
])

const images = ref<string[]>([])
const currentImageIdx = ref(0)
const imagePrompt = ref('')
const isGeneratingImage = ref(false)
const showWhiteboard = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

onMounted(() => {
  apiKey.value = localStorage.getItem('global_openrouter_key') || ''
  fetchModels()
})

const fetchModels = async () => {
  const cached = localStorage.getItem('rednote_available_models')
  if (cached) {
    try {
      const parsed = JSON.parse(cached)
      if (parsed.length > 0) {
        textModels.value = parsed
      }
    } catch {
      // no-op
    }
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models')
    const data = await response.json()
    if (data.data) {
      const formattedModels = data.data.map((m: any) => ({
        id: m.id,
        name: m.name
      }))
      
      textModels.value = formattedModels
      localStorage.setItem('rednote_available_models', JSON.stringify(formattedModels))
      
      const fetchedImageModels = formattedModels.filter((m: any) => 
        m.id.includes('dall-e') || m.id.includes('flux') || m.id.includes('stable-diffusion') || m.id.includes('imagen')
      )
      if (fetchedImageModels.length > 0) {
        imageModels.value = fetchedImageModels
      }
    }
  } catch (error) {
    console.error('Failed to fetch models:', error)
  }
}

const prevImage = () => {
  if (images.value.length > 0) {
    currentImageIdx.value = (currentImageIdx.value - 1 + images.value.length) % images.value.length
  }
}

const nextImage = () => {
  if (images.value.length > 0) {
    currentImageIdx.value = (currentImageIdx.value + 1) % images.value.length
  }
}

const optimizeCopy = async () => {
  if (!rawText.value || !apiKey.value) {
    if (!apiKey.value) alert('Please set OpenRouter API Key in global settings')
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
  if (!imagePrompt.value || !apiKey.value) {
    if (!apiKey.value) alert('Please set OpenRouter API Key in global settings')
    return
  }
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
        messages: [{ role: 'user', content: imagePrompt.value }]
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
    } else if (message.content && message.content.startsWith('http')) {
      imageUrl = message.content
    }

    if (imageUrl) {
      images.value.push(imageUrl)
      imagePrompt.value = ''
      currentImageIdx.value = images.value.length - 1
    } else {
      alert('Failed to parse image from response.')
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
  currentImageIdx.value = images.value.length - 1
  showWhiteboard.value = false
}

const triggerUpload = () => {
  fileInput.value?.click()
}

const handleUpload = (e: Event) => {
  const files = (e.target as HTMLInputElement).files
  if (files && files.length > 0) {
    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          images.value.push(event.target.result as string)
          currentImageIdx.value = images.value.length - 1
        }
      }
      reader.readAsDataURL(file)
    })
  }
}

const removeImage = (idx: number) => {
  images.value.splice(idx, 1)
  if (currentImageIdx.value >= images.value.length) {
    currentImageIdx.value = Math.max(0, images.value.length - 1)
  }
}

const copyToClipboard = (text: string) => {
  if (!text) return
  navigator.clipboard.writeText(text)
  alert('Copied to clipboard!')
}
</script>

<style scoped>
.font-hand { font-family: 'Patrick Hand', cursive; }
h1, h2, h3 { font-family: 'Indie Flower', cursive; }

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #e4e4e7;
  border-radius: 10px;
}
</style>