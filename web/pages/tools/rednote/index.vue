<template>
  <div class="min-h-screen bg-[#fef2f2] px-4 py-6 font-hand sm:py-8">
    <div class="max-w-6xl mx-auto">
      <div class="mb-6 text-center sm:mb-8">
        <h1 class="mb-2 text-4xl font-bold text-zinc-900 sm:text-5xl">Rednote Optimizer</h1>
        <p class="text-sm text-zinc-600 italic sm:text-base">Polish your XiaoHongShu posts with AI ✨</p>
      </div>

      <div v-if="!apiKey" class="mb-6 sketch-card bg-white text-center">
        <h2 class="mb-3 text-xl font-bold text-red-600">Missing API Key</h2>
        <p class="mb-4 text-zinc-600">Set your global OpenRouter key first so text and image generation work without runtime errors.</p>
        <button class="sketch-button !bg-zinc-900 !text-white" @click="openGlobalSettings">
          Open Global Settings
        </button>
      </div>

      <div class="sticky top-20 z-20 mb-4 -mx-1 flex gap-2 overflow-x-auto bg-[#fef2f2]/95 px-1 py-1 backdrop-blur sm:hidden">
        <a href="#rednote-draft" class="shrink-0 rounded-full border-2 border-zinc-900 bg-white px-4 py-2 text-sm font-bold shadow-[3px_3px_0_0_rgba(0,0,0,1)]">Draft</a>
        <a href="#rednote-visuals" class="shrink-0 rounded-full border-2 border-zinc-900 bg-white px-4 py-2 text-sm font-bold shadow-[3px_3px_0_0_rgba(0,0,0,1)]">Visuals</a>
        <a href="#rednote-preview" class="shrink-0 rounded-full border-2 border-zinc-900 bg-white px-4 py-2 text-sm font-bold shadow-[3px_3px_0_0_rgba(0,0,0,1)]">Preview</a>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <!-- Left: Editing & Generation (7 columns) -->
        <div class="lg:col-span-7 space-y-6">
          <!-- Text Editing -->
          <div id="rednote-draft" class="sketch-card bg-white scroll-mt-24">
            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
              <h2 class="text-2xl font-bold">1. Draft Copy</h2>
              <div ref="textModelComboboxRef" class="relative w-full sm:w-72 max-w-full">
                <input
                  v-model="textModelQuery"
                  placeholder="Search text model..."
                  class="w-full p-2 pr-10 text-sm sketch-border bg-white text-black outline-none"
                  @focus="textModelOpen = true"
                  @keydown.enter.prevent="chooseFirstTextModel"
                />
                <button
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 text-xs"
                  @click.prevent="textModelOpen = !textModelOpen"
                >
                  ▼
                </button>
                <div
                  v-if="textModelOpen"
                  class="absolute left-0 right-0 top-[calc(100%+6px)] z-20 bg-white border-2 border-zinc-900 rounded-lg shadow-lg max-h-56 overflow-y-auto"
                >
                  <button
                    v-for="m in filteredTextModels"
                    :key="m.id"
                    class="w-full text-left px-3 py-2 hover:bg-zinc-100 border-b border-zinc-100 last:border-b-0"
                    @mousedown.prevent="selectTextModel(m)"
                  >
                    <p class="text-sm text-zinc-900 truncate">{{ m.name }}</p>
                    <p class="text-[11px] text-zinc-500 truncate">{{ m.id }}</p>
                  </button>
                  <div v-if="filteredTextModels.length === 0" class="px-3 py-3 text-sm text-zinc-500">
                    No model match found.
                  </div>
                </div>
              </div>
            </div>
            <textarea 
              v-model="rawText" 
              rows="6" 
              class="w-full p-4 sketch-border bg-white text-black placeholder:text-zinc-500 focus:sketch-shadow-sm outline-none resize-none text-base"
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
          <div id="rednote-visuals" class="sketch-card bg-white scroll-mt-24">
            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
              <h2 class="text-2xl font-bold">2. Visuals</h2>
              <select v-model="imageModel" class="p-2 text-sm sketch-border bg-white text-black outline-none w-full sm:w-64 max-w-full">
                <option v-for="m in imageModels" :key="m.id" :value="m.id">{{ m.name }}</option>
              </select>
            </div>
            
            <div class="space-y-4">
              <!-- Actions -->
              <div class="flex flex-col gap-2 sm:flex-row">
                <button @click="openWhiteboard" class="flex-1 sketch-button !bg-zinc-900 !text-white text-sm py-2">
                  🎨 Draw
                </button>
                <button @click="triggerUpload" class="flex-1 sketch-button bg-white text-sm py-2">
                  📤 Upload
                </button>
              </div>
              
              <!-- AI Image -->
              <div class="flex flex-col gap-2 sm:flex-row">
                <input 
                  v-model="imagePrompt" 
                  placeholder="Describe image to generate..." 
                  class="flex-1 p-2 text-sm sketch-border bg-white text-black placeholder:text-zinc-500 outline-none"
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

              <div class="space-y-2">
                <textarea
                  v-model="galleryEditPrompt"
                  rows="3"
                  placeholder="Prompt for selected images (merge / edit)..."
                  class="w-full p-3 text-sm sketch-border bg-white text-black placeholder:text-zinc-500 outline-none resize-none"
                ></textarea>
                <button
                  @click="generateMergedImage"
                  :disabled="isMergingImages || selectedGalleryIds.length === 0 || !galleryEditPrompt"
                  class="w-full sketch-button py-2 text-sm !bg-zinc-900 !text-white disabled:opacity-50"
                >
                  {{ isMergingImages ? '✨ Merging...' : `✨ Merge/Edit ${selectedGalleryIds.length || 0} Selected` }}
                </button>
              </div>

              <div class="rounded-xl border-2 border-zinc-200 bg-zinc-50 p-3">
                <div class="flex justify-between items-center mb-2">
                  <h3 class="font-bold text-zinc-900">Gallery</h3>
                  <p class="text-xs text-zinc-500">Drag image to right preview</p>
                </div>
                <div v-if="galleryImages.length > 0" class="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                  <div
                    v-for="img in galleryImages"
                    :key="img.id"
                    draggable="true"
                    class="group relative rounded-lg overflow-hidden border-2 bg-white cursor-grab active:cursor-grabbing"
                    :class="isGallerySelected(img.id) ? 'border-rose-500' : 'border-zinc-200'"
                    @dragstart="handleGalleryDragStart($event, img.id)"
                    @dragend="draggedGalleryId = null"
                  >
                    <img
                      :src="img.src"
                      class="w-full aspect-square object-cover"
                      @click="toggleGallerySelection(img.id)"
                    />
                    <label class="absolute left-1 top-1 bg-white/85 rounded px-1.5 py-0.5 text-[10px] text-zinc-700 flex items-center gap-1">
                      <input
                        type="checkbox"
                        :checked="isGallerySelected(img.id)"
                        @change="toggleGallerySelection(img.id)"
                        @click.stop
                      />
                      Pick
                    </label>
                    <div class="absolute right-1 top-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        class="w-7 h-7 rounded bg-black/65 text-white text-sm leading-none"
                        title="Delete"
                        @click.stop="deleteGalleryImage(img.id)"
                      >
                        ×
                      </button>
                      <button
                        class="w-7 h-7 rounded bg-black/65 text-white text-xs"
                        title="Add to Preview"
                        @click.stop="addToPreview(img.id)"
                      >
                        +
                      </button>
                      <button
                        class="w-7 h-7 rounded bg-black/65 text-white text-xs"
                        title="Download"
                        @click.stop="downloadImage(img)"
                      >
                        ↓
                      </button>
                    </div>
                    <div class="absolute bottom-0 left-0 right-0 px-1.5 py-1 bg-black/45 text-white text-[10px] uppercase tracking-wide">
                      {{ img.source }}
                    </div>
                  </div>
                </div>
                <div v-else class="py-8 text-center text-sm text-zinc-500">
                  No gallery images yet. Use Draw, Upload, or Gen first.
                </div>
              </div>
            </div>
            
            <input type="file" ref="fileInput" class="hidden" accept="image/*" @change="handleUpload" multiple />
          </div>
        </div>

        <!-- Right: Mobile Preview (5 columns) -->
        <div id="rednote-preview" class="lg:col-span-5 flex justify-center scroll-mt-24">
          <div class="w-full max-w-[420px] sketch-card bg-white p-0 overflow-hidden flex flex-col relative min-h-[560px] sm:min-h-[700px] sm:max-h-[800px]">
            <div class="bg-rose-500 text-white text-center py-3 font-bold flex justify-between items-center px-4">
              <span class="text-sm opacity-80">&lt; Back</span>
              <span>Rednote Preview</span>
              <button @click="copyToClipboard(optimizedText)" class="hover:text-rose-200 text-lg" title="Copy Text">📋</button>
            </div>
            
            <div class="flex-1 overflow-y-auto pb-4 custom-scrollbar">
              <!-- Image Carousel -->
              <div
                class="w-full aspect-[3/4] bg-zinc-100 border-b border-zinc-200 relative overflow-hidden flex items-center justify-center transition-colors"
                :class="isPreviewDragOver ? 'ring-4 ring-rose-300 bg-rose-50' : ''"
                @dragover.prevent="handlePreviewDragOver"
                @dragleave="handlePreviewDragLeave"
                @drop.prevent="handlePreviewDrop"
              >
                <div v-if="previewImages.length > 0" class="w-full h-full relative group">
                  <img :src="previewImages[currentImageIdx].src" class="w-full h-full object-cover" />
                  
                  <!-- Remove Image button -->
                  <button 
                    @click="removePreviewImage(currentImageIdx)" 
                    class="absolute top-2 right-2 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>

                  <!-- Navigation Dots -->
                  <div v-if="previewImages.length > 1" class="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                    <div v-for="(_, idx) in previewImages" :key="idx" 
                        class="w-2 h-2 rounded-full border border-black/20"
                        :class="idx === currentImageIdx ? 'bg-rose-500 scale-110' : 'bg-white/80'"
                    ></div>
                  </div>
                  <!-- Arrow Keys -->
                  <button v-if="previewImages.length > 1" @click="prevImage" class="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold font-sans hover:bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">&lt;</button>
                  <button v-if="previewImages.length > 1" @click="nextImage" class="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold font-sans hover:bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">&gt;</button>
                </div>
                <div v-else class="text-zinc-400 text-center p-8">
                  <div class="text-4xl mb-2">📸</div>
                  <p>Drag images from the left gallery.<br>They will appear here.</p>
                </div>
              </div>

              <!-- Content Area -->
              <div class="p-4 sm:p-5">
                <article v-if="optimizedText" class="prose prose-zinc max-w-none prose-sm sm:prose-base font-sans" v-html="optimizedHtml"></article>
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
        <div v-if="showWhiteboard" class="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-md" @click.self="showWhiteboard = false">
        <div class="bg-white w-full max-w-6xl h-[96dvh] sm:h-[92vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl border-4 border-zinc-900">
          <div class="px-4 py-3 border-b border-zinc-200 flex items-center justify-between">
            <h3 class="font-bold text-zinc-900">Whiteboard</h3>
            <button
              @click="showWhiteboard = false"
              class="w-9 h-9 bg-white border-2 border-zinc-900 rounded-full flex items-center justify-center text-2xl hover:bg-zinc-100"
              aria-label="Close whiteboard"
            >
              ×
            </button>
          </div>
          <div class="flex-1 min-h-0 overflow-hidden p-3 pt-2">
            <WhiteboardCanvas is-modal @save="handleWhiteboardSave" />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import WhiteboardCanvas from '~/components/WhiteboardCanvas.vue'
import { useGlobalOpenRouterKey } from '~/composables/useGlobalOpenRouterKey'
import { renderSafeMarkdown } from '~/utils/safeRichText'

definePageMeta({ layout: 'default' })

type ModelOption = { id: string; name: string }
type GalleryImage = { id: string; src: string; source: 'draw' | 'upload' | 'gen' | 'edit' }

const { apiKey, openGlobalSettings } = useGlobalOpenRouterKey()
const rawText = ref('')
const optimizedText = ref('')
const isOptimizing = ref(false)

const textModel = ref('google/gemini-2.0-flash-001')
const imageModel = ref('black-forest-labs/flux-schnell')

const textModels = ref<ModelOption[]>([
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat' }
])

const imageModels = ref<ModelOption[]>([
  { id: 'black-forest-labs/flux-schnell', name: 'Flux Schnell' },
  { id: 'openai/dall-e-3', name: 'DALL-E 3' },
  { id: 'google/imagen-3', name: 'Imagen 3' },
  { id: 'stabilityai/stable-diffusion-3-medium', name: 'Stable Diffusion 3' }
])

const textModelQuery = ref('')
const textModelOpen = ref(false)
const textModelComboboxRef = ref<HTMLElement | null>(null)

const galleryImages = ref<GalleryImage[]>([])
const selectedGalleryIds = ref<string[]>([])
const galleryEditPrompt = ref('')

const previewGalleryIds = ref<string[]>([])
const currentImageIdx = ref(0)
const imagePrompt = ref('')
const isGeneratingImage = ref(false)
const isMergingImages = ref(false)
const showWhiteboard = ref(false)
const draggedGalleryId = ref<string | null>(null)
const isPreviewDragOver = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const TEXT_MODELS_CACHE_KEY = 'rednote_text_models_v2'
const IMAGE_MODELS_CACHE_KEY = 'rednote_image_models_v2'
const REDNOTE_WORKSPACE_STORAGE_KEY = 'rednote_workspace_v1'

const previewImages = computed(() =>
  previewGalleryIds.value
    .map(id => galleryImages.value.find(img => img.id === id))
    .filter((img): img is GalleryImage => Boolean(img))
)

const optimizedHtml = computed(() => {
  if (!optimizedText.value) return ''
  return renderSafeMarkdown(optimizedText.value)
})

const normalize = (value: string) => value.toLowerCase().trim()

const fuzzyMatch = (query: string, target: string) => {
  if (!query) return true
  const q = normalize(query)
  const t = normalize(target)
  if (t.includes(q)) return true

  let qi = 0
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++
  }
  return qi === q.length
}

const filteredTextModels = computed(() => {
  const q = textModelQuery.value
  const models = textModels.value.filter(m => fuzzyMatch(q, `${m.name} ${m.id}`))
  if (!q) return models

  const nq = normalize(q)
  return models.sort((a, b) => {
    const aTarget = normalize(`${a.name} ${a.id}`)
    const bTarget = normalize(`${b.name} ${b.id}`)
    const aStarts = aTarget.startsWith(nq) ? 0 : 1
    const bStarts = bTarget.startsWith(nq) ? 0 : 1
    if (aStarts !== bStarts) return aStarts - bStarts
    return a.name.localeCompare(b.name)
  })
})

const parseCachedModels = (value: string | null): ModelOption[] => {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) {
      return parsed.filter((m: any) => typeof m?.id === 'string' && typeof m?.name === 'string')
    }
  } catch {
    // no-op
  }
  return []
}

const syncTextModelQuery = () => {
  const current = textModels.value.find(m => m.id === textModel.value)
  textModelQuery.value = current ? `${current.name} (${current.id})` : textModel.value
}

const selectTextModel = (model: ModelOption) => {
  textModel.value = model.id
  textModelQuery.value = `${model.name} (${model.id})`
  textModelOpen.value = false
}

const chooseFirstTextModel = () => {
  if (filteredTextModels.value.length > 0) {
    selectTextModel(filteredTextModels.value[0])
  }
}

const handleOutsideClick = (event: MouseEvent) => {
  if (!textModelComboboxRef.value) return
  const target = event.target as Node
  if (!textModelComboboxRef.value.contains(target)) {
    textModelOpen.value = false
  }
}

watch(textModel, () => {
  syncTextModelQuery()
})

watch(
  () => previewImages.value.length,
  (length) => {
    if (currentImageIdx.value >= length) {
      currentImageIdx.value = Math.max(0, length - 1)
    }
  }
)

onMounted(() => {
  restoreWorkspace()
  syncTextModelQuery()
  fetchModels()
  document.addEventListener('mousedown', handleOutsideClick)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleOutsideClick)
})

const fetchModels = async () => {
  const cachedTextModels = parseCachedModels(localStorage.getItem(TEXT_MODELS_CACHE_KEY))
  const cachedImageModels = parseCachedModels(localStorage.getItem(IMAGE_MODELS_CACHE_KEY))
  if (cachedTextModels.length > 0) {
    textModels.value = cachedTextModels
  }
  if (cachedImageModels.length > 0) {
    imageModels.value = cachedImageModels
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models')
    const data = await response.json()
    if (data.data) {
      const fetchedTextModels = data.data.map((m: any) => ({
        id: m.id,
        name: m.name
      }))

      const fetchedImageModels = data.data
        .filter((m: any) => {
          const architecture = m.architecture || {}
          const outputModalities = architecture.output_modalities || []
          return outputModalities.includes('image') ||
            m.id.includes('flux') ||
            m.id.includes('dall-e') ||
            m.id.includes('stable-diffusion') ||
            m.id.includes('imagen')
        })
        .map((m: any) => ({
          id: m.id,
          name: m.name
        }))

      if (fetchedTextModels.length > 0) {
        textModels.value = fetchedTextModels
        localStorage.setItem(TEXT_MODELS_CACHE_KEY, JSON.stringify(fetchedTextModels))
      }
      if (fetchedImageModels.length > 0) {
        imageModels.value = fetchedImageModels
        localStorage.setItem(IMAGE_MODELS_CACHE_KEY, JSON.stringify(fetchedImageModels))
      }

      if (!textModels.value.find(m => m.id === textModel.value) && textModels.value.length > 0) {
        textModel.value = textModels.value[0].id
      }
      if (!imageModels.value.find(m => m.id === imageModel.value) && imageModels.value.length > 0) {
        imageModel.value = imageModels.value[0].id
      }
      syncTextModelQuery()
    }
  } catch (error) {
    console.error('Failed to fetch models:', error)
  }
}

const saveWorkspace = () => {
  if (!import.meta.client) return

  localStorage.setItem(REDNOTE_WORKSPACE_STORAGE_KEY, JSON.stringify({
    rawText: rawText.value,
    optimizedText: optimizedText.value,
    textModel: textModel.value,
    imageModel: imageModel.value,
    textModelQuery: textModelQuery.value,
    galleryImages: galleryImages.value,
    selectedGalleryIds: selectedGalleryIds.value,
    previewGalleryIds: previewGalleryIds.value,
    currentImageIdx: currentImageIdx.value,
    imagePrompt: imagePrompt.value,
    galleryEditPrompt: galleryEditPrompt.value
  }))
}

const restoreWorkspace = () => {
  if (!import.meta.client) return

  const raw = localStorage.getItem(REDNOTE_WORKSPACE_STORAGE_KEY)
  if (!raw) return

  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed.rawText === 'string') rawText.value = parsed.rawText
    if (typeof parsed.optimizedText === 'string') optimizedText.value = parsed.optimizedText
    if (typeof parsed.textModel === 'string') textModel.value = parsed.textModel
    if (typeof parsed.imageModel === 'string') imageModel.value = parsed.imageModel
    if (typeof parsed.textModelQuery === 'string') textModelQuery.value = parsed.textModelQuery
    if (Array.isArray(parsed.galleryImages)) galleryImages.value = parsed.galleryImages
    if (Array.isArray(parsed.selectedGalleryIds)) selectedGalleryIds.value = parsed.selectedGalleryIds
    if (Array.isArray(parsed.previewGalleryIds)) previewGalleryIds.value = parsed.previewGalleryIds
    if (typeof parsed.currentImageIdx === 'number') currentImageIdx.value = parsed.currentImageIdx
    if (typeof parsed.imagePrompt === 'string') imagePrompt.value = parsed.imagePrompt
    if (typeof parsed.galleryEditPrompt === 'string') galleryEditPrompt.value = parsed.galleryEditPrompt
  } catch {
    // no-op
  }
}

const prevImage = () => {
  if (previewImages.value.length > 0) {
    currentImageIdx.value = (currentImageIdx.value - 1 + previewImages.value.length) % previewImages.value.length
  }
}

const nextImage = () => {
  if (previewImages.value.length > 0) {
    currentImageIdx.value = (currentImageIdx.value + 1) % previewImages.value.length
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

const createGalleryId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

const addToGallery = (src: string, source: GalleryImage['source']) => {
  const id = createGalleryId()
  galleryImages.value.push({ id, src, source })
  addToPreview(id)
  return id
}

const extractImageUrl = (message: any) => {
  if (Array.isArray(message?.content)) {
    const imgObj = message.content.find((c: any) => c.type === 'image_url')
    if (imgObj?.image_url?.url) return imgObj.image_url.url as string
  }

  if (message?.images && message.images.length > 0) {
    const firstImg = message.images[0]
    return typeof firstImg === 'string' ? firstImg : (firstImg.image_url?.url || '')
  }

  if (typeof message?.content === 'string') {
    if (message.content.startsWith('http') || message.content.startsWith('data:image')) {
      return message.content
    }
    const urlMatch = message.content.match(/https?:\/\/[^\s)"']+/i)
    if (urlMatch) return urlMatch[0]
  }

  return ''
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
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Rednote Optimizer',
      },
      body: JSON.stringify({
        model: imageModel.value,
        messages: [{ role: 'user', content: imagePrompt.value }],
        modalities: ['image']
      })
    })

    if (!response.ok) throw new Error('Generation failed')
    const data = await response.json()
    const message = data.choices[0].message
    const imageUrl = extractImageUrl(message)

    if (imageUrl) {
      addToGallery(imageUrl, 'gen')
      imagePrompt.value = ''
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
  addToGallery(dataUrl, 'draw')
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
          addToGallery(event.target.result as string, 'upload')
        }
      }
      reader.readAsDataURL(file)
    })
  }
  ;(e.target as HTMLInputElement).value = ''
}

const isGallerySelected = (id: string) => selectedGalleryIds.value.includes(id)

const toggleGallerySelection = (id: string) => {
  if (selectedGalleryIds.value.includes(id)) {
    selectedGalleryIds.value = selectedGalleryIds.value.filter(v => v !== id)
    return
  }
  selectedGalleryIds.value = [...selectedGalleryIds.value, id]
}

const addToPreview = (galleryId: string) => {
  if (previewGalleryIds.value.includes(galleryId)) {
    currentImageIdx.value = previewGalleryIds.value.indexOf(galleryId)
    return
  }
  previewGalleryIds.value.push(galleryId)
  currentImageIdx.value = previewGalleryIds.value.length - 1
}

const removePreviewImage = (idx: number) => {
  previewGalleryIds.value.splice(idx, 1)
  if (currentImageIdx.value >= previewGalleryIds.value.length) {
    currentImageIdx.value = Math.max(0, previewGalleryIds.value.length - 1)
  }
}

const deleteGalleryImage = (id: string) => {
  galleryImages.value = galleryImages.value.filter(img => img.id !== id)
  selectedGalleryIds.value = selectedGalleryIds.value.filter(selectedId => selectedId !== id)

  const removedPreviewIndex = previewGalleryIds.value.indexOf(id)
  previewGalleryIds.value = previewGalleryIds.value.filter(previewId => previewId !== id)
  if (removedPreviewIndex !== -1 && currentImageIdx.value >= removedPreviewIndex) {
    currentImageIdx.value = Math.max(0, currentImageIdx.value - 1)
  }

  if (draggedGalleryId.value === id) {
    draggedGalleryId.value = null
  }
}

const handleGalleryDragStart = (event: DragEvent, id: string) => {
  draggedGalleryId.value = id
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', id)
    event.dataTransfer.effectAllowed = 'copy'
  }
}

const handlePreviewDragOver = () => {
  isPreviewDragOver.value = true
}

const handlePreviewDragLeave = () => {
  isPreviewDragOver.value = false
}

const handlePreviewDrop = (event: DragEvent) => {
  isPreviewDragOver.value = false
  const droppedId = event.dataTransfer?.getData('text/plain') || draggedGalleryId.value
  if (!droppedId) return
  const exists = galleryImages.value.some(img => img.id === droppedId)
  if (!exists) return
  addToPreview(droppedId)
  draggedGalleryId.value = null
}

const generateMergedImage = async () => {
  if (!galleryEditPrompt.value || selectedGalleryIds.value.length === 0 || !apiKey.value) {
    if (!apiKey.value) alert('Please set OpenRouter API Key in global settings')
    return
  }
  if (isMergingImages.value) return

  const selectedImages = galleryImages.value.filter(img => selectedGalleryIds.value.includes(img.id))
  if (selectedImages.length === 0) return

  isMergingImages.value = true

  try {
    const content: any[] = [
      {
        type: 'text',
        text: `Create one new image by merging/editing these reference images. Follow this prompt: ${galleryEditPrompt.value}`
      }
    ]

    selectedImages.forEach(img => {
      content.push({
        type: 'image_url',
        image_url: { url: img.src }
      })
    })

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.value}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Rednote Optimizer',
      },
      body: JSON.stringify({
        model: imageModel.value,
        messages: [{ role: 'user', content }],
        modalities: ['image']
      })
    })

    if (!response.ok) throw new Error('Merge generation failed')
    const data = await response.json()
    const imageUrl = extractImageUrl(data.choices?.[0]?.message)
    if (!imageUrl) throw new Error('No image parsed from response')

    const newId = addToGallery(imageUrl, 'edit')
    selectedGalleryIds.value = [newId]
    galleryEditPrompt.value = ''
  } catch (error: any) {
    alert('Merge/edit generation failed: ' + error.message)
  } finally {
    isMergingImages.value = false
  }
}

const downloadImage = async (image: GalleryImage) => {
  const filename = `rednote-${image.id}.png`
  try {
    const response = await fetch(image.src)
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = filename
    link.href = objectUrl
    link.click()
    URL.revokeObjectURL(objectUrl)
    return
  } catch {
    const link = document.createElement('a')
    link.download = filename
    link.href = image.src
    link.target = '_blank'
    link.rel = 'noopener'
    link.click()
  }
}

const copyToClipboard = (text: string) => {
  if (!text) return
  navigator.clipboard.writeText(text)
  alert('Copied to clipboard!')
}

watch(
  [rawText, optimizedText, textModel, imageModel, textModelQuery, galleryImages, selectedGalleryIds, previewGalleryIds, currentImageIdx, imagePrompt, galleryEditPrompt],
  () => {
    saveWorkspace()
  },
  { deep: true }
)
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
