<template>
  <div class="min-h-screen bg-[#fff9f1] font-hand py-8 px-4">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8 text-center">
        <h1 class="text-5xl font-bold text-zinc-900 mb-2">Storyboard Generator</h1>
        <p class="text-zinc-600 italic">剧场分镜脚本 + panel-by-panel image generation</p>
      </div>

      <div v-if="!apiKey" class="max-w-xl mx-auto sketch-card mt-16 text-center bg-white">
        <h2 class="text-xl font-bold mb-3 text-red-600">Missing API Key</h2>
        <p class="mb-5 text-zinc-600">Please set your OpenRouter API Key in global settings (top right gear icon).</p>
        <button class="sketch-button !bg-zinc-900 !text-white" @click="openGlobalSettings">
          Open Global Settings
        </button>
      </div>

      <div v-else class="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div class="xl:col-span-4 space-y-6">
          <section class="sketch-card bg-white p-5 space-y-4">
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-2xl font-bold">Story Setup</h2>
              <span class="text-xs uppercase tracking-wide text-zinc-500">OpenRouter</span>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-bold text-zinc-700">Text Model</label>
              <select v-model="textModel" class="w-full p-3 sketch-border bg-white text-sm outline-none">
                <option v-for="model in textModels" :key="model.id" :value="model.id">{{ model.name }}</option>
              </select>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-bold text-zinc-700">Image Model</label>
              <select v-model="imageModel" class="w-full p-3 sketch-border bg-white text-sm outline-none">
                <option v-for="model in imageModels" :key="model.id" :value="model.id">{{ model.name }}</option>
              </select>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-bold text-zinc-700">Story Plot</label>
              <textarea
                v-model="storyPlot"
                rows="7"
                class="w-full p-4 sketch-border bg-white resize-none outline-none"
                placeholder="Describe the story, characters, and the emotional arc..."
              ></textarea>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="space-y-2">
                <label class="block text-sm font-bold text-zinc-700">Duration / Length</label>
                <input
                  v-model="storyLength"
                  class="w-full p-3 sketch-border bg-white outline-none"
                  placeholder="e.g. 60-second short"
                />
              </div>
              <div class="space-y-2">
                <label class="block text-sm font-bold text-zinc-700">Target Panels</label>
                <input
                  v-model.number="panelCount"
                  type="number"
                  min="2"
                  max="12"
                  class="w-full p-3 sketch-border bg-white outline-none"
                />
              </div>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-bold text-zinc-700">Character / Style</label>
              <input
                v-model="styleName"
                class="w-full p-3 sketch-border bg-white outline-none"
                placeholder='e.g. "Crayon Shin-chan" style'
              />
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-bold text-zinc-700">Character Notes</label>
              <textarea
                v-model="characterNotes"
                rows="3"
                class="w-full p-3 sketch-border bg-white resize-none outline-none"
                placeholder="Describe recurring characters, costumes, or visual consistency notes..."
              ></textarea>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-bold text-zinc-700">Style Instructions</label>
              <textarea
                v-model="styleInstructions"
                rows="3"
                class="w-full p-3 sketch-border bg-white resize-none outline-none"
              ></textarea>
            </div>

            <button
              @click="generateStoryboard"
              :disabled="isGeneratingStoryboard || !storyPlot.trim()"
              class="w-full sketch-button py-3 !bg-zinc-900 !text-white disabled:opacity-50"
            >
              {{ isGeneratingStoryboard ? 'Generating Panels...' : 'Generate Storyboard' }}
            </button>
          </section>

          <section class="sketch-card bg-white p-5 space-y-4">
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-2xl font-bold">Reference Gallery</h2>
              <button @click="triggerUpload()" class="sketch-button py-2 px-3 text-sm">Upload</button>
            </div>

            <p class="text-sm text-zinc-500">
              Upload character sheets, style refs, or generated stills. Each panel can select any gallery image as an image-to-image reference.
            </p>

            <div v-if="galleryImages.length" class="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[360px] overflow-y-auto pr-1">
              <div
                v-for="image in galleryImages"
                :key="image.id"
                class="relative rounded-xl overflow-hidden border-2 border-zinc-200 bg-zinc-50 group"
              >
                <img :src="image.src" class="w-full aspect-square object-cover" />
                <button
                  class="absolute right-1 top-1 w-7 h-7 rounded bg-black/65 text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  @click="deleteGalleryImage(image.id)"
                  title="Delete"
                >
                  ×
                </button>
                <div class="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] uppercase tracking-wide px-2 py-1">
                  {{ image.source }}
                </div>
              </div>
            </div>
            <div v-else class="rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500">
              No reference images yet.
            </div>
          </section>
        </div>

        <div class="xl:col-span-8 space-y-6">
          <section class="sketch-card bg-white p-5">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 class="text-2xl font-bold">Storyboard Panels</h2>
                <p class="text-sm text-zinc-500">Each panel gets a generated prompt based on the comic-template structure, then you can refine or render it panel by panel.</p>
              </div>
              <div v-if="storyboard.title || storyboard.summary" class="text-sm text-zinc-600 md:max-w-md">
                <p class="font-bold text-zinc-900">{{ storyboard.title || 'Untitled Story' }}</p>
                <p>{{ storyboard.summary }}</p>
              </div>
            </div>
          </section>

          <section v-if="panels.length" class="grid grid-cols-1 2xl:grid-cols-2 gap-6">
            <article v-for="(panel, index) in panels" :key="panel.id" class="sketch-card bg-white p-5 space-y-4">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-xs uppercase tracking-[0.2em] text-zinc-500">Panel {{ index + 1 }}</p>
                  <h3 class="text-2xl font-bold text-zinc-900">{{ panel.title }}</h3>
                </div>
                <div class="flex flex-wrap justify-end gap-2 text-xs">
                  <span class="px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">{{ panel.durationSeconds }}s</span>
                  <span class="px-2 py-1 rounded-full bg-sky-100 text-sky-800 border border-sky-200">{{ panel.camera }}</span>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-3">
                  <div class="rounded-2xl border-2 border-zinc-200 bg-zinc-50 aspect-[3/4] overflow-hidden flex items-center justify-center">
                    <img v-if="panel.imageSrc" :src="panel.imageSrc" class="w-full h-full object-cover" />
                    <div v-else class="text-center text-zinc-400 px-6">
                      <div class="text-4xl mb-2">🎬</div>
                      <p>Generate an image for this panel.</p>
                    </div>
                  </div>

                  <div class="flex gap-2">
                    <button
                      @click="generatePanelImage(panel.id)"
                      :disabled="panel.isGenerating || !panel.imagePrompt.trim()"
                      class="flex-1 sketch-button py-2 !bg-zinc-900 !text-white text-sm disabled:opacity-50"
                    >
                      {{ panel.isGenerating ? 'Rendering...' : 'Generate Image' }}
                    </button>
                    <button @click="resetPanelPrompt(panel.id)" class="sketch-button py-2 px-3 text-sm">
                      Reset Prompt
                    </button>
                  </div>
                </div>

                <div class="space-y-3">
                  <div class="rounded-2xl border-2 border-zinc-200 bg-zinc-50 p-3 space-y-2 text-sm">
                    <div>
                      <p class="text-[11px] uppercase tracking-wide text-zinc-500">Action</p>
                      <p class="text-zinc-800">{{ panel.action }}</p>
                    </div>
                    <div>
                      <p class="text-[11px] uppercase tracking-wide text-zinc-500">Text Bubble</p>
                      <p class="text-zinc-800">{{ panel.dialogue || 'No dialogue' }}</p>
                    </div>
                    <div>
                      <p class="text-[11px] uppercase tracking-wide text-zinc-500">Mood</p>
                      <p class="text-zinc-800">{{ panel.mood }}</p>
                    </div>
                  </div>

                  <div class="space-y-2">
                    <label class="block text-sm font-bold text-zinc-700">Image Prompt</label>
                    <textarea
                      v-model="panel.imagePrompt"
                      rows="9"
                      class="w-full p-3 sketch-border bg-white resize-none outline-none text-sm"
                    ></textarea>
                  </div>
                </div>
              </div>

              <div class="space-y-3">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <h4 class="font-bold text-zinc-900">Reference Images</h4>
                    <p class="text-xs text-zinc-500">Pick gallery images or upload new ones for image-to-image generation.</p>
                  </div>
                  <button @click="triggerUpload(panel.id)" class="sketch-button py-2 px-3 text-sm">Upload for Panel</button>
                </div>

                <div v-if="galleryImages.length" class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                  <button
                    v-for="image in galleryImages"
                    :key="`${panel.id}-${image.id}`"
                    type="button"
                    @click="togglePanelReference(panel.id, image.id)"
                    :class="[
                      'relative overflow-hidden rounded-xl border-2 transition-all',
                      panel.referenceIds.includes(image.id) ? 'border-rose-500 ring-2 ring-rose-200' : 'border-zinc-200 hover:border-zinc-400'
                    ]"
                  >
                    <img :src="image.src" class="w-full aspect-square object-cover" />
                    <span class="absolute left-1 top-1 bg-white/85 rounded px-1 py-0.5 text-[10px] text-zinc-700">
                      {{ panel.referenceIds.includes(image.id) ? 'Picked' : image.source }}
                    </span>
                  </button>
                </div>
                <div v-else class="rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
                  Upload or generate gallery images first.
                </div>
              </div>
            </article>
          </section>

          <section v-else class="sketch-card bg-white p-12 text-center text-zinc-500">
            <div class="text-5xl mb-4">📝</div>
            <p class="text-lg">Enter a story plot and generate the storyboard first.</p>
          </section>
        </div>
      </div>

      <input ref="fileInput" type="file" class="hidden" accept="image/*" multiple @change="handleUpload" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

definePageMeta({ layout: 'default' })

type ModelOption = { id: string; name: string }
type GalleryImage = { id: string; src: string; source: 'upload' | 'panel' }
type StoryboardMeta = { title: string; summary: string }
type StoryboardPanel = {
  id: string
  title: string
  durationSeconds: number
  action: string
  dialogue: string
  camera: string
  mood: string
  imagePrompt: string
  imageSrc?: string
  isGenerating?: boolean
  referenceIds: string[]
}

const apiKey = ref('')
const textModel = ref('google/gemini-2.0-flash-001')
const imageModel = ref('black-forest-labs/flux-schnell')
const textModels = ref<ModelOption[]>([
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku' }
])
const imageModels = ref<ModelOption[]>([
  { id: 'black-forest-labs/flux-schnell', name: 'Flux Schnell' },
  { id: 'openai/dall-e-3', name: 'DALL-E 3' },
  { id: 'google/imagen-3', name: 'Imagen 3' }
])

const storyPlot = ref('')
const storyLength = ref('60-second short')
const panelCount = ref(4)
const styleName = ref('Crayon Shin-chan')
const characterNotes = ref('')
const styleInstructions = ref('rough crayon hand-drawn, high saturation, simple backgrounds.')
const isGeneratingStoryboard = ref(false)
const storyboard = ref<StoryboardMeta>({ title: '', summary: '' })
const panels = ref<StoryboardPanel[]>([])
const galleryImages = ref<GalleryImage[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const uploadTargetPanelId = ref<string | null>(null)

const TEXT_MODELS_CACHE_KEY = 'storyboard_text_models_v1'
const IMAGE_MODELS_CACHE_KEY = 'storyboard_image_models_v1'

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

const openGlobalSettings = () => {
  window.dispatchEvent(new Event('open-global-settings'))
}

const syncApiKey = () => {
  apiKey.value = localStorage.getItem('global_openrouter_key') || ''
}

const parseCachedModels = (value: string | null): ModelOption[] => {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) {
      return parsed.filter((item: any) => typeof item?.id === 'string' && typeof item?.name === 'string')
    }
  } catch {
    // no-op
  }
  return []
}

const fetchModels = async () => {
  const cachedTextModels = parseCachedModels(localStorage.getItem(TEXT_MODELS_CACHE_KEY))
  const cachedImageModels = parseCachedModels(localStorage.getItem(IMAGE_MODELS_CACHE_KEY))
  if (cachedTextModels.length) textModels.value = cachedTextModels
  if (cachedImageModels.length) imageModels.value = cachedImageModels

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models')
    const data = await response.json()
    if (!data.data) return

    const fetchedTextModels = data.data.map((model: any) => ({
      id: model.id,
      name: model.name
    }))

    const fetchedImageModels = data.data
      .filter((model: any) => {
        const outputModalities = model.architecture?.output_modalities || []
        return outputModalities.includes('image') ||
          model.id.includes('flux') ||
          model.id.includes('dall-e') ||
          model.id.includes('stable-diffusion') ||
          model.id.includes('imagen')
      })
      .map((model: any) => ({
        id: model.id,
        name: model.name
      }))

    if (fetchedTextModels.length) {
      textModels.value = fetchedTextModels
      localStorage.setItem(TEXT_MODELS_CACHE_KEY, JSON.stringify(fetchedTextModels))
    }
    if (fetchedImageModels.length) {
      imageModels.value = fetchedImageModels
      localStorage.setItem(IMAGE_MODELS_CACHE_KEY, JSON.stringify(fetchedImageModels))
    }

    if (!textModels.value.find((model) => model.id === textModel.value) && textModels.value.length) {
      textModel.value = textModels.value[0].id
    }
    if (!imageModels.value.find((model) => model.id === imageModel.value) && imageModels.value.length) {
      imageModel.value = imageModels.value[0].id
    }
  } catch (error) {
    console.error('Failed to fetch storyboard models:', error)
  }
}

const extractAssistantText = (message: any) => {
  if (Array.isArray(message?.content)) {
    return message.content
      .filter((entry: any) => entry?.type === 'text' && typeof entry.text === 'string')
      .map((entry: any) => entry.text)
      .join('')
  }
  return typeof message?.content === 'string' ? message.content : ''
}

const extractJsonBlock = (text: string) => {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i)
  if (fencedMatch) return fencedMatch[1].trim()

  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1)
  }

  throw new Error('Model response did not include valid JSON.')
}

const extractImageUrl = (message: any) => {
  if (Array.isArray(message?.content)) {
    const imageEntry = message.content.find((entry: any) => entry.type === 'image_url')
    if (imageEntry?.image_url?.url) return imageEntry.image_url.url as string
  }

  if (Array.isArray(message?.images) && message.images.length > 0) {
    const firstImage = message.images[0]
    return typeof firstImage === 'string' ? firstImage : (firstImage.image_url?.url || '')
  }

  if (typeof message?.content === 'string') {
    if (message.content.startsWith('http') || message.content.startsWith('data:image')) {
      return message.content
    }
    const match = message.content.match(/https?:\/\/[^\s)"']+/i)
    if (match) return match[0]
  }

  return ''
}

const buildPanelPrompt = (panel: Pick<StoryboardPanel, 'action' | 'dialogue' | 'camera' | 'mood'>, index: number, total: number) => {
  const lines = [
    `Role: Expert manga artist of "${styleName.value}" style.`,
    `Context: User needs a ${total}-panel comic based on: ${storyPlot.value}`,
    `Instructions: Style must be ${styleInstructions.value}`,
    `Panel ${index + 1}: ${panel.action}, Text bubble: ${panel.dialogue || 'No dialogue.'}`,
    `Camera: ${panel.camera}. Mood: ${panel.mood}.`,
  ]

  if (characterNotes.value.trim()) {
    lines.push(`Character notes: ${characterNotes.value.trim()}.`)
  }

  lines.push('Text must be accurate.')
  lines.push('Output: 3:4 ratio complete single storyboard panel image.')
  return lines.join('\n')
}

const resetPanelPrompt = (panelId: string) => {
  const currentIndex = panels.value.findIndex((panel) => panel.id === panelId)
  if (currentIndex === -1) return
  const panel = panels.value[currentIndex]
  panel.imagePrompt = buildPanelPrompt(panel, currentIndex, panels.value.length)
}

const addToGallery = (src: string, source: GalleryImage['source']) => {
  const id = createId()
  galleryImages.value.push({ id, src, source })
  return id
}

const triggerUpload = (panelId: string | null = null) => {
  uploadTargetPanelId.value = panelId
  fileInput.value?.click()
}

const handleUpload = (event: Event) => {
  const files = (event.target as HTMLInputElement).files
  if (!files?.length) return

  Array.from(files).forEach((file) => {
    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      if (!loadEvent.target?.result) return
      const galleryId = addToGallery(loadEvent.target.result as string, 'upload')
      if (uploadTargetPanelId.value) {
        togglePanelReference(uploadTargetPanelId.value, galleryId, true)
      }
    }
    reader.readAsDataURL(file)
  })

  uploadTargetPanelId.value = null
  ;(event.target as HTMLInputElement).value = ''
}

const deleteGalleryImage = (imageId: string) => {
  galleryImages.value = galleryImages.value.filter((image) => image.id !== imageId)
  panels.value.forEach((panel) => {
    panel.referenceIds = panel.referenceIds.filter((id) => id !== imageId)
  })
}

const togglePanelReference = (panelId: string, imageId: string, forceSelect = false) => {
  const panel = panels.value.find((item) => item.id === panelId)
  if (!panel) return

  if (forceSelect && !panel.referenceIds.includes(imageId)) {
    panel.referenceIds = [...panel.referenceIds, imageId]
    return
  }

  if (panel.referenceIds.includes(imageId)) {
    panel.referenceIds = panel.referenceIds.filter((id) => id !== imageId)
  } else {
    panel.referenceIds = [...panel.referenceIds, imageId]
  }
}

const generateStoryboard = async () => {
  if (!storyPlot.value.trim() || !apiKey.value) {
    if (!apiKey.value) alert('Please set OpenRouter API Key in global settings')
    return
  }

  isGeneratingStoryboard.value = true

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.value}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Storyboard Generator'
      },
      body: JSON.stringify({
        model: textModel.value,
        messages: [
          {
            role: 'system',
            content: 'You are a senior storyboard writer and comic planner. Return valid JSON only. Do not include markdown fences unless absolutely necessary.'
          },
          {
            role: 'user',
            content: [
              'Create a storyboard for the following project.',
              `Story plot: ${storyPlot.value}`,
              `Target duration/length: ${storyLength.value}`,
              `Target panel count: ${panelCount.value}`,
              `Character/style direction: ${styleName.value}`,
              characterNotes.value.trim() ? `Character notes: ${characterNotes.value.trim()}` : '',
              'Return JSON with this exact schema:',
              '{',
              '  "title": "string",',
              '  "summary": "string",',
              '  "panels": [',
              '    {',
              '      "title": "string",',
              '      "duration_seconds": 8,',
              '      "action": "string",',
              '      "dialogue": "string",',
              '      "camera": "string",',
              '      "mood": "string"',
              '    }',
              '  ]',
              '}',
              'Rules:',
              `- Create exactly ${panelCount.value} panels.`,
              '- Keep each panel vivid, cinematic, and easy to illustrate.',
              '- Dialogue should be short enough for a speech bubble.',
              '- Duration seconds should roughly add up to the requested length.',
              '- Make camera descriptions practical for storyboard artists.'
            ].filter(Boolean).join('\n')
          }
        ]
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Failed to generate storyboard')
    }

    const data = await response.json()
    const text = extractAssistantText(data.choices?.[0]?.message)
    const parsed = JSON.parse(extractJsonBlock(text))
    const rawPanels = Array.isArray(parsed.panels) ? parsed.panels : []

    const mappedPanels = rawPanels.slice(0, panelCount.value).map((panel: any, index: number) => ({
      id: createId(),
      title: panel.title || `Panel ${index + 1}`,
      durationSeconds: Number(panel.duration_seconds) || Math.max(3, Math.round(60 / panelCount.value)),
      action: panel.action || 'Describe the action.',
      dialogue: panel.dialogue || '',
      camera: panel.camera || 'Medium shot',
      mood: panel.mood || 'Warm and lively',
      imagePrompt: '',
      referenceIds: []
    })) as StoryboardPanel[]

    mappedPanels.forEach((panel, index) => {
      panel.imagePrompt = buildPanelPrompt(panel, index, mappedPanels.length)
    })

    storyboard.value = {
      title: parsed.title || 'Untitled Storyboard',
      summary: parsed.summary || ''
    }
    panels.value = mappedPanels
  } catch (error: any) {
    alert(`Storyboard generation failed: ${error.message}`)
  } finally {
    isGeneratingStoryboard.value = false
  }
}

const generatePanelImage = async (panelId: string) => {
  const panel = panels.value.find((item) => item.id === panelId)
  if (!panel || !panel.imagePrompt.trim() || !apiKey.value || panel.isGenerating) return

  panel.isGenerating = true

  try {
    const content: any[] = [
      {
        type: 'text',
        text: panel.imagePrompt
      }
    ]

    panel.referenceIds
      .map((id) => galleryImages.value.find((image) => image.id === id))
      .filter((image): image is GalleryImage => Boolean(image))
      .forEach((image) => {
        content.push({
          type: 'image_url',
          image_url: { url: image.src }
        })
      })

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.value}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Storyboard Generator'
      },
      body: JSON.stringify({
        model: imageModel.value,
        messages: [{ role: 'user', content }],
        modalities: ['image']
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Failed to generate panel image')
    }

    const data = await response.json()
    const imageUrl = extractImageUrl(data.choices?.[0]?.message)
    if (!imageUrl) {
      throw new Error('No image URL found in model response')
    }

    panel.imageSrc = imageUrl
    addToGallery(imageUrl, 'panel')
  } catch (error: any) {
    alert(`Panel image generation failed: ${error.message}`)
  } finally {
    panel.isGenerating = false
  }
}

onMounted(() => {
  syncApiKey()
  fetchModels()
  window.addEventListener('storage', syncApiKey)
  window.addEventListener('global-openrouter-key-updated', syncApiKey as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('storage', syncApiKey)
  window.removeEventListener('global-openrouter-key-updated', syncApiKey as EventListener)
})
</script>

<style scoped>
.font-hand { font-family: 'Patrick Hand', cursive; }
h1, h2, h3, h4 { font-family: 'Indie Flower', cursive; }
</style>
