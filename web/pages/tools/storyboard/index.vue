<template>
  <div class="min-h-screen bg-[#fff9f1] font-hand py-8 px-4">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8 text-center">
        <h1 class="text-5xl font-bold text-zinc-900 mb-2">Storyboard Generator</h1>
        <p class="text-zinc-600 italic">Cinematic storyboard scripts with panel-by-panel image generation</p>
      </div>

      <div v-if="!apiKey" class="max-w-xl mx-auto sketch-card mt-16 text-center bg-white">
        <h2 class="text-xl font-bold mb-3 text-red-600">Missing API Key</h2>
        <p class="mb-5 text-zinc-600">Please set your OpenRouter API Key in global settings (top right gear icon).</p>
        <button class="sketch-button !bg-zinc-900 !text-white" @click="openGlobalSettings">
          Open Global Settings
        </button>
      </div>

      <div v-else class="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        <div class="xl:col-span-5 space-y-6">
          <section class="sketch-card bg-white p-5 space-y-4">
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-2xl font-bold">Story Setup</h2>
              <span class="text-xs uppercase tracking-wide text-zinc-500">OpenRouter</span>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div ref="textModelComboboxRef" class="space-y-2 relative">
                <label class="block text-sm font-bold text-zinc-700">Text Model</label>
                <input
                  v-model="textModelQuery"
                  placeholder="Search text model..."
                  class="w-full p-3 pr-10 sketch-border bg-white text-sm outline-none"
                  @focus="textModelOpen = true"
                  @keydown.enter.prevent="chooseFirstTextModel"
                />
                <button
                  class="absolute right-3 top-[46px] text-zinc-500 text-xs"
                  type="button"
                  @click.prevent="textModelOpen = !textModelOpen"
                >
                  ▼
                </button>
                <div
                  v-if="textModelOpen"
                  class="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-60 overflow-y-auto rounded-xl border-2 border-zinc-900 bg-white shadow-lg"
                >
                  <button
                    v-for="model in filteredTextModels"
                    :key="model.id"
                    class="w-full border-b border-zinc-100 px-3 py-2 text-left last:border-b-0 hover:bg-zinc-100"
                    @mousedown.prevent="selectTextModel(model)"
                  >
                    <p class="text-sm text-zinc-900 truncate">{{ model.name }}</p>
                    <p class="text-[11px] text-zinc-500 truncate">{{ model.id }}</p>
                  </button>
                  <div v-if="filteredTextModels.length === 0" class="px-3 py-3 text-sm text-zinc-500">
                    No matching text model.
                  </div>
                </div>
              </div>

              <div ref="imageModelComboboxRef" class="space-y-2 relative">
                <label class="block text-sm font-bold text-zinc-700">Image Model</label>
                <input
                  v-model="imageModelQuery"
                  placeholder="Search image model..."
                  class="w-full p-3 pr-10 sketch-border bg-white text-sm outline-none"
                  @focus="imageModelOpen = true"
                  @keydown.enter.prevent="chooseFirstImageModel"
                />
                <button
                  class="absolute right-3 top-[46px] text-zinc-500 text-xs"
                  type="button"
                  @click.prevent="imageModelOpen = !imageModelOpen"
                >
                  ▼
                </button>
                <div
                  v-if="imageModelOpen"
                  class="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-60 overflow-y-auto rounded-xl border-2 border-zinc-900 bg-white shadow-lg"
                >
                  <button
                    v-for="model in filteredImageModels"
                    :key="model.id"
                    class="w-full border-b border-zinc-100 px-3 py-2 text-left last:border-b-0 hover:bg-zinc-100"
                    @mousedown.prevent="selectImageModel(model)"
                  >
                    <p class="text-sm text-zinc-900 truncate">{{ model.name }}</p>
                    <p class="text-[11px] text-zinc-500 truncate">{{ model.id }}</p>
                  </button>
                  <div v-if="filteredImageModels.length === 0" class="px-3 py-3 text-sm text-zinc-500">
                    No matching image model.
                  </div>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div class="space-y-2">
                <label class="block text-sm font-bold text-zinc-700">Script Language</label>
                <select v-model="storyLanguage" class="w-full p-3 sketch-border bg-white text-sm outline-none">
                  <option v-for="option in languageOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
              </div>
              <div class="space-y-2">
                <label class="block text-sm font-bold text-zinc-700">Scene Format</label>
                <select v-model="sceneFormat" class="w-full p-3 sketch-border bg-white text-sm outline-none">
                  <option v-for="option in sceneFormatOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
              </div>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-bold text-zinc-700">Story Plot</label>
              <textarea
                v-model="storyPlot"
                rows="7"
                class="w-full p-4 sketch-border bg-white resize-none outline-none"
                placeholder="Describe the story premise, characters, setting, and emotional arc..."
              ></textarea>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                  max="16"
                  class="w-full p-3 sketch-border bg-white outline-none"
                />
              </div>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-bold text-zinc-700">Style Direction</label>
              <input
                v-model="styleName"
                class="w-full p-3 sketch-border bg-white outline-none"
                placeholder='e.g. "Crayon Shin-chan", "cinematic anime", "graphic novel noir"'
              />
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-bold text-zinc-700">Character Notes</label>
              <textarea
                v-model="characterNotes"
                rows="3"
                class="w-full p-3 sketch-border bg-white resize-none outline-none"
                placeholder="Describe recurring characters, costumes, age, hairstyle, and identity markers..."
              ></textarea>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-bold text-zinc-700">Style Instructions</label>
              <textarea
                v-model="styleInstructions"
                rows="3"
                class="w-full p-3 sketch-border bg-white resize-none outline-none"
                placeholder="Describe the rendering style, texture, color palette, and framing rules..."
              ></textarea>
            </div>

            <button
              @click="generateStoryboard"
              :disabled="isGeneratingStoryboard || !storyPlot.trim()"
              class="w-full sketch-button py-3 !bg-zinc-900 !text-white disabled:opacity-50"
            >
              {{ isGeneratingStoryboard ? 'Generating Storyboard...' : 'Generate Storyboard' }}
            </button>
          </section>

          <section class="sketch-card bg-white p-5 space-y-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="text-2xl font-bold">Character Consistency</h2>
                <p class="text-sm text-zinc-500">These images are attached to every image generation request.</p>
              </div>
              <button @click="triggerUpload('character')" class="sketch-button py-2 px-3 text-sm">Upload</button>
            </div>

            <div v-if="characterImages.length" class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div
                v-for="(image, index) in characterImages"
                :key="image.id"
                class="group relative overflow-hidden rounded-2xl border-2 border-zinc-200 bg-zinc-50"
              >
                <img
                  :src="image.src"
                  class="w-full aspect-square object-cover cursor-zoom-in"
                  @click="openImagePreview(characterImageUrls, index)"
                />
                <button
                  class="absolute right-1 top-1 h-8 w-8 rounded-full bg-black/65 text-white text-sm opacity-0 transition-opacity group-hover:opacity-100"
                  @click="deleteAsset('character', image.id)"
                  title="Delete"
                >
                  ×
                </button>
                <div class="absolute bottom-0 inset-x-0 bg-black/55 px-2 py-1 text-[10px] uppercase tracking-wide text-white">
                  Character Ref
                </div>
              </div>
            </div>
            <div v-else class="rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
              Upload one or more character images to keep the same subject across panels.
            </div>
          </section>

          <section class="sketch-card bg-white p-5 space-y-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="text-2xl font-bold">Scene Reference Library</h2>
                <p class="text-sm text-zinc-500">Optional environment, prop, and composition references.</p>
              </div>
              <button @click="triggerUpload('scene')" class="sketch-button py-2 px-3 text-sm">Upload</button>
            </div>

            <div v-if="sceneReferenceImages.length" class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div
                v-for="(image, index) in sceneReferenceImages"
                :key="image.id"
                class="group relative overflow-hidden rounded-2xl border-2 border-zinc-200 bg-zinc-50"
              >
                <img
                  :src="image.src"
                  class="w-full aspect-square object-cover cursor-zoom-in"
                  @click="openImagePreview(sceneReferenceUrls, index)"
                />
                <button
                  class="absolute right-1 top-1 h-8 w-8 rounded-full bg-black/65 text-white text-sm opacity-0 transition-opacity group-hover:opacity-100"
                  @click="deleteAsset('scene', image.id)"
                  title="Delete"
                >
                  ×
                </button>
                <div class="absolute bottom-0 inset-x-0 bg-black/55 px-2 py-1 text-[10px] uppercase tracking-wide text-white">
                  Scene Ref
                </div>
              </div>
            </div>
            <div v-else class="rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
              Upload optional setting or composition references for specific panels.
            </div>
          </section>
        </div>

        <div class="xl:col-span-7 space-y-6">
          <section class="sketch-card bg-white p-5">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div class="space-y-2">
                <h2 class="text-2xl font-bold">Storyboard Output</h2>
                <p class="text-sm text-zinc-500">
                  {{ sceneFormatLabel }} in {{ storyLanguageLabel }}. Image prompts are normalized to English to avoid mixed-language generations.
                </p>
              </div>

              <div class="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                <div class="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <p class="text-[11px] uppercase tracking-wide text-zinc-500">Panels</p>
                  <p class="font-bold text-zinc-900">{{ panels.length || panelCount }}</p>
                </div>
                <div class="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <p class="text-[11px] uppercase tracking-wide text-zinc-500">Character Refs</p>
                  <p class="font-bold text-zinc-900">{{ characterImages.length }}</p>
                </div>
                <div class="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <p class="text-[11px] uppercase tracking-wide text-zinc-500">Scene Refs</p>
                  <p class="font-bold text-zinc-900">{{ sceneReferenceImages.length }}</p>
                </div>
                <div class="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <p class="text-[11px] uppercase tracking-wide text-zinc-500">Style</p>
                  <p class="font-bold text-zinc-900 truncate">{{ styleName || 'Default' }}</p>
                </div>
              </div>
            </div>

            <div v-if="storyboard.title || storyboard.summary" class="mt-5 rounded-3xl border-2 border-zinc-900 bg-zinc-50 px-5 py-4">
              <p class="text-xs uppercase tracking-[0.2em] text-zinc-500">Project Overview</p>
              <h3 class="mt-1 text-3xl font-bold text-zinc-900">{{ storyboard.title || 'Untitled Storyboard' }}</h3>
              <p class="mt-2 text-sm leading-relaxed text-zinc-600">{{ storyboard.summary }}</p>
            </div>

            <div v-if="generatedPanels.length" class="mt-5 space-y-3">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h3 class="text-xl font-bold text-zinc-900">Generated Frames</h3>
                  <p class="text-sm text-zinc-500">{{ generatedPanels.length }} rendered panels ready for preview or download.</p>
                </div>
                <button class="sketch-button py-2 px-3 text-sm" @click="openImagePreview(generatedPanelUrls, 0)">
                  Preview All
                </button>
              </div>

              <div class="grid grid-cols-3 gap-3 md:grid-cols-4 xl:grid-cols-6">
                <button
                  v-for="rendered in generatedPanels"
                  :key="rendered.id"
                  type="button"
                  class="group overflow-hidden rounded-2xl border-2 border-zinc-200 bg-zinc-50 text-left"
                  @click="openImagePreview(generatedPanelUrls, generatedPanelUrls.indexOf(rendered.imageSrc || ''))"
                >
                  <img :src="rendered.imageSrc" class="aspect-[3/4] w-full object-cover transition-transform group-hover:scale-[1.02]" />
                  <div class="border-t border-zinc-200 px-2 py-2 text-[11px] font-bold text-zinc-700">
                    {{ rendered.title }}
                  </div>
                </button>
              </div>
            </div>
          </section>

          <section v-if="panels.length" class="space-y-6">
            <article
              v-for="(panel, index) in panels"
              :key="panel.id"
              class="sketch-card bg-white p-5 space-y-4"
            >
              <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p class="text-xs uppercase tracking-[0.2em] text-zinc-500">Panel {{ index + 1 }}</p>
                  <h3 class="text-2xl font-bold text-zinc-900">{{ panel.title }}</h3>
                </div>
                <div class="flex flex-wrap gap-2 text-xs">
                  <span class="rounded-full border border-amber-200 bg-amber-100 px-2 py-1 text-amber-800">{{ panel.durationSeconds }}s</span>
                  <span class="rounded-full border border-sky-200 bg-sky-100 px-2 py-1 text-sky-800">{{ panel.camera }}</span>
                  <span class="rounded-full border border-emerald-200 bg-emerald-100 px-2 py-1 text-emerald-800">{{ sceneFormatLabel }}</span>
                </div>
              </div>

              <div class="grid grid-cols-1 gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
                <div class="space-y-3">
                  <div class="relative overflow-hidden rounded-3xl border-2 border-zinc-200 bg-zinc-50 aspect-[3/4] flex items-center justify-center">
                    <img
                      v-if="panel.imageSrc"
                      :src="panel.imageSrc"
                      class="h-full w-full object-cover cursor-zoom-in"
                      @click="openImagePreview([panel.imageSrc], 0)"
                    />
                    <div v-else class="px-8 text-center text-zinc-400">
                      <div class="text-4xl mb-2">🎬</div>
                      <p>Generate an image for this panel.</p>
                    </div>
                    <div v-if="panel.isGenerating" class="absolute inset-0 flex items-center justify-center bg-white/75 text-sm font-bold text-zinc-700">
                      Rendering...
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-2">
                    <button
                      @click="generatePanelImage(panel.id)"
                      :disabled="panel.isGenerating || !panel.imagePrompt.trim()"
                      class="sketch-button py-2 !bg-zinc-900 !text-white text-sm disabled:opacity-50"
                    >
                      {{ panel.isGenerating ? 'Rendering...' : 'Generate Image' }}
                    </button>
                    <button @click="resetPanelPrompt(panel.id)" class="sketch-button py-2 text-sm">
                      Reset Prompt
                    </button>
                  </div>

                  <div class="grid grid-cols-2 gap-2">
                    <button @click="copyText(panel.imagePrompt, 'Prompt copied')" class="sketch-button py-2 text-sm">
                      Copy Prompt
                    </button>
                    <button
                      @click="downloadImage(panel.imageSrc, `storyboard-panel-${index + 1}.png`)"
                      :disabled="!panel.imageSrc"
                      class="sketch-button py-2 text-sm disabled:opacity-50"
                    >
                      Download Image
                    </button>
                  </div>

                  <div class="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-600 space-y-2">
                    <p><span class="font-bold text-zinc-900">Character refs:</span> {{ characterImages.length }} attached automatically</p>
                    <p><span class="font-bold text-zinc-900">Scene refs:</span> {{ panel.referenceIds.length }} selected for this panel</p>
                    <button @click="triggerUpload('scene', panel.id)" class="text-sm font-bold text-zinc-700 underline underline-offset-2">
                      Upload scene refs for this panel
                    </button>
                  </div>
                </div>

                <div class="space-y-4">
                  <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div class="rounded-2xl border-2 border-zinc-200 bg-zinc-50 p-3 text-sm">
                      <p class="text-[11px] uppercase tracking-wide text-zinc-500">Action</p>
                      <p class="mt-1 text-zinc-800 leading-relaxed">{{ panel.action }}</p>
                    </div>
                    <div class="rounded-2xl border-2 border-zinc-200 bg-zinc-50 p-3 text-sm">
                      <p class="text-[11px] uppercase tracking-wide text-zinc-500">Dialogue</p>
                      <p class="mt-1 text-zinc-800 leading-relaxed">{{ panel.dialogue || 'No dialogue' }}</p>
                    </div>
                    <div class="rounded-2xl border-2 border-zinc-200 bg-zinc-50 p-3 text-sm">
                      <p class="text-[11px] uppercase tracking-wide text-zinc-500">Mood</p>
                      <p class="mt-1 text-zinc-800 leading-relaxed">{{ panel.mood }}</p>
                    </div>
                  </div>

                  <div class="space-y-2">
                    <div class="flex items-center justify-between gap-3">
                      <label class="block text-sm font-bold text-zinc-700">Image Prompt (English only)</label>
                      <span class="text-xs text-zinc-500">Normalized for consistent image generation</span>
                    </div>
                    <textarea
                      v-model="panel.imagePrompt"
                      rows="9"
                      class="w-full p-3 sketch-border bg-white resize-none outline-none text-sm"
                    ></textarea>
                  </div>

                  <div class="space-y-3">
                    <div class="flex items-center justify-between gap-3">
                      <div>
                        <h4 class="font-bold text-zinc-900">Scene References</h4>
                        <p class="text-xs text-zinc-500">These are optional and panel-specific. Generated panel images are no longer mixed into this library.</p>
                      </div>
                    </div>

                    <div v-if="sceneReferenceImages.length" class="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      <button
                        v-for="image in sceneReferenceImages"
                        :key="`${panel.id}-${image.id}`"
                        type="button"
                        :class="[
                          'relative overflow-hidden rounded-2xl border-2 transition-all',
                          panel.referenceIds.includes(image.id) ? 'border-rose-500 ring-2 ring-rose-200' : 'border-zinc-200 hover:border-zinc-400'
                        ]"
                        @click="togglePanelReference(panel.id, image.id)"
                      >
                        <img
                          :src="image.src"
                          class="w-full aspect-square object-cover"
                        />
                        <span class="absolute left-1 top-1 rounded bg-white/90 px-1 py-0.5 text-[10px] text-zinc-700">
                          {{ panel.referenceIds.includes(image.id) ? 'Selected' : 'Scene Ref' }}
                        </span>
                        <span
                          class="absolute right-1 bottom-1 rounded bg-black/65 px-1 py-0.5 text-[10px] text-white"
                          @click.stop="openImagePreview(sceneReferenceUrls, sceneReferenceImages.findIndex(item => item.id === image.id))"
                        >
                          Preview
                        </span>
                      </button>
                    </div>
                    <div v-else class="rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
                      Upload optional scene references first.
                    </div>
                  </div>
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

    <ImageLightbox v-model="previewOpen" :images="previewImages" :start-index="previewStartIndex" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import ImageLightbox from '~/components/ImageLightbox.vue'

definePageMeta({ layout: 'default' })

type ModelOption = { id: string; name: string }
type AssetKind = 'character' | 'scene'
type AssetImage = { id: string; src: string; kind: AssetKind }
type StoryLanguage = 'en' | 'zh'
type SceneFormat = 'video' | 'comic'
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
  { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat' }
])

const imageModels = ref<ModelOption[]>([
  { id: 'black-forest-labs/flux-schnell', name: 'Flux Schnell' },
  { id: 'openai/dall-e-3', name: 'DALL-E 3' },
  { id: 'google/imagen-3', name: 'Imagen 3' }
])

const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' }
] as const

const sceneFormatOptions = [
  { value: 'video', label: 'Video Storyboard' },
  { value: 'comic', label: 'Comic Storyboard' }
] as const

const storyLanguage = ref<StoryLanguage>('en')
const sceneFormat = ref<SceneFormat>('video')
const storyPlot = ref('')
const storyLength = ref('60-second short')
const panelCount = ref(4)
const styleName = ref('Crayon Shin-chan')
const characterNotes = ref('')
const styleInstructions = ref('rough crayon hand-drawn, high saturation, simple backgrounds, clean subject silhouette.')
const isGeneratingStoryboard = ref(false)
const storyboard = ref<StoryboardMeta>({ title: '', summary: '' })
const panels = ref<StoryboardPanel[]>([])

const characterImages = ref<AssetImage[]>([])
const sceneReferenceImages = ref<AssetImage[]>([])
const uploadTarget = ref<{ kind: AssetKind; panelId: string | null }>({ kind: 'scene', panelId: null })
const fileInput = ref<HTMLInputElement | null>(null)

const textModelQuery = ref('')
const imageModelQuery = ref('')
const textModelOpen = ref(false)
const imageModelOpen = ref(false)
const textModelComboboxRef = ref<HTMLElement | null>(null)
const imageModelComboboxRef = ref<HTMLElement | null>(null)

const previewOpen = ref(false)
const previewImages = ref<string[]>([])
const previewStartIndex = ref(0)

const TEXT_MODELS_CACHE_KEY = 'storyboard_text_models_v2'
const IMAGE_MODELS_CACHE_KEY = 'storyboard_image_models_v2'
const STORYBOARD_SETUP_STORAGE_KEY = 'storyboard_setup_v1'

const storyLanguageLabel = computed(() =>
  languageOptions.find(option => option.value === storyLanguage.value)?.label || 'English'
)

const sceneFormatLabel = computed(() =>
  sceneFormatOptions.find(option => option.value === sceneFormat.value)?.label || 'Video Storyboard'
)

const characterImageUrls = computed(() => characterImages.value.map(image => image.src))
const sceneReferenceUrls = computed(() => sceneReferenceImages.value.map(image => image.src))
const generatedPanels = computed(() => panels.value.filter((panel): panel is StoryboardPanel & { imageSrc: string } => Boolean(panel.imageSrc)))
const generatedPanelUrls = computed(() => generatedPanels.value.map(panel => panel.imageSrc))
const normalize = (value: string) => value.toLowerCase().trim()

const fuzzyMatch = (query: string, target: string) => {
  if (!query) return true
  const q = normalize(query)
  const t = normalize(target)
  if (t.includes(q)) return true

  let queryIndex = 0
  for (let i = 0; i < t.length && queryIndex < q.length; i++) {
    if (t[i] === q[queryIndex]) queryIndex++
  }
  return queryIndex === q.length
}

const sortModelMatches = (models: ModelOption[], query: string) => {
  if (!query) return models
  const normalizedQuery = normalize(query)
  return [...models].sort((a, b) => {
    const aTarget = normalize(`${a.name} ${a.id}`)
    const bTarget = normalize(`${b.name} ${b.id}`)
    const aStarts = aTarget.startsWith(normalizedQuery) ? 0 : 1
    const bStarts = bTarget.startsWith(normalizedQuery) ? 0 : 1
    if (aStarts !== bStarts) return aStarts - bStarts
    return a.name.localeCompare(b.name)
  })
}

const filteredTextModels = computed(() =>
  sortModelMatches(
    textModels.value.filter(model => fuzzyMatch(textModelQuery.value, `${model.name} ${model.id}`)),
    textModelQuery.value
  )
)

const filteredImageModels = computed(() =>
  sortModelMatches(
    imageModels.value.filter(model => fuzzyMatch(imageModelQuery.value, `${model.name} ${model.id}`)),
    imageModelQuery.value
  )
)

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

const openGlobalSettings = () => {
  window.dispatchEvent(new Event('open-global-settings'))
}

const syncApiKey = () => {
  apiKey.value = localStorage.getItem('global_openrouter_key') || ''
}

const saveStoryboardSetup = () => {
  if (typeof window === 'undefined') return

  localStorage.setItem(STORYBOARD_SETUP_STORAGE_KEY, JSON.stringify({
    textModel: textModel.value,
    imageModel: imageModel.value,
    storyLanguage: storyLanguage.value,
    sceneFormat: sceneFormat.value,
    storyPlot: storyPlot.value,
    storyLength: storyLength.value,
    panelCount: panelCount.value,
    styleName: styleName.value,
    characterNotes: characterNotes.value,
    styleInstructions: styleInstructions.value
  }))
}

const restoreStoryboardSetup = () => {
  if (typeof window === 'undefined') return

  const raw = localStorage.getItem(STORYBOARD_SETUP_STORAGE_KEY)
  if (!raw) return

  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed.textModel === 'string') textModel.value = parsed.textModel
    if (typeof parsed.imageModel === 'string') imageModel.value = parsed.imageModel
    if (parsed.storyLanguage === 'en' || parsed.storyLanguage === 'zh') storyLanguage.value = parsed.storyLanguage
    if (parsed.sceneFormat === 'video' || parsed.sceneFormat === 'comic') sceneFormat.value = parsed.sceneFormat
    if (typeof parsed.storyPlot === 'string') storyPlot.value = parsed.storyPlot
    if (typeof parsed.storyLength === 'string') storyLength.value = parsed.storyLength
    if (typeof parsed.panelCount === 'number') panelCount.value = Math.min(16, Math.max(2, parsed.panelCount))
    if (typeof parsed.styleName === 'string') styleName.value = parsed.styleName
    if (typeof parsed.characterNotes === 'string') characterNotes.value = parsed.characterNotes
    if (typeof parsed.styleInstructions === 'string') styleInstructions.value = parsed.styleInstructions
  } catch {
    // no-op
  }
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

const syncTextModelQuery = () => {
  const model = textModels.value.find(item => item.id === textModel.value)
  textModelQuery.value = model ? `${model.name} (${model.id})` : textModel.value
}

const syncImageModelQuery = () => {
  const model = imageModels.value.find(item => item.id === imageModel.value)
  imageModelQuery.value = model ? `${model.name} (${model.id})` : imageModel.value
}

const selectTextModel = (model: ModelOption) => {
  textModel.value = model.id
  syncTextModelQuery()
  textModelOpen.value = false
}

const selectImageModel = (model: ModelOption) => {
  imageModel.value = model.id
  syncImageModelQuery()
  imageModelOpen.value = false
}

const chooseFirstTextModel = () => {
  if (filteredTextModels.value.length > 0) {
    selectTextModel(filteredTextModels.value[0])
  }
}

const chooseFirstImageModel = () => {
  if (filteredImageModels.value.length > 0) {
    selectImageModel(filteredImageModels.value[0])
  }
}

const handleOutsideClick = (event: MouseEvent) => {
  const target = event.target as Node
  if (textModelComboboxRef.value && !textModelComboboxRef.value.contains(target)) {
    textModelOpen.value = false
  }
  if (imageModelComboboxRef.value && !imageModelComboboxRef.value.contains(target)) {
    imageModelOpen.value = false
  }
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
  } catch (error) {
    console.error('Failed to fetch storyboard models:', error)
  } finally {
    if (!textModels.value.find(model => model.id === textModel.value) && textModels.value.length) {
      textModel.value = textModels.value[0].id
    }
    if (!imageModels.value.find(model => model.id === imageModel.value) && imageModels.value.length) {
      imageModel.value = imageModels.value[0].id
    }
    syncTextModelQuery()
    syncImageModelQuery()
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

const buildFallbackPanelPrompt = (panel: Pick<StoryboardPanel, 'action' | 'dialogue' | 'camera' | 'mood'>, index: number, total: number) => {
  const formatLine = sceneFormat.value === 'comic'
    ? 'Create a polished comic storyboard panel.'
    : 'Create a cinematic storyboard frame for a video sequence.'

  const lines = [
    formatLine,
    `Style direction: ${styleName.value}.`,
    `Story context: ${storyPlot.value}.`,
    `Panel ${index + 1} of ${total}: ${panel.action}.`,
    `Camera: ${panel.camera}. Mood: ${panel.mood}.`,
    `Dialogue context: ${panel.dialogue || 'No dialogue.'}`,
    `Visual instructions: ${styleInstructions.value || 'Keep the composition clear and readable.'}`,
    'Use English only in this prompt.',
    'Do not render any visible text, subtitles, speech bubbles, watermarks, or random characters.',
    'Aspect ratio: 3:4.'
  ]

  if (characterNotes.value.trim()) {
    lines.push(`Character consistency notes: ${characterNotes.value.trim()}.`)
  }

  return lines.join(' ')
}

const resetPanelPrompt = (panelId: string) => {
  const currentIndex = panels.value.findIndex(panel => panel.id === panelId)
  if (currentIndex === -1) return
  const panel = panels.value[currentIndex]
  panel.imagePrompt = buildFallbackPanelPrompt(panel, currentIndex, panels.value.length)
}

const triggerUpload = (kind: AssetKind, panelId: string | null = null) => {
  uploadTarget.value = { kind, panelId }
  fileInput.value?.click()
}

const handleUpload = (event: Event) => {
  const files = (event.target as HTMLInputElement).files
  if (!files?.length) return

  Array.from(files).forEach(file => {
    const reader = new FileReader()
    reader.onload = loadEvent => {
      if (!loadEvent.target?.result) return
      const image = {
        id: createId(),
        src: loadEvent.target.result as string,
        kind: uploadTarget.value.kind
      } satisfies AssetImage

      if (uploadTarget.value.kind === 'character') {
        characterImages.value.push(image)
      } else {
        sceneReferenceImages.value.push(image)
        if (uploadTarget.value.panelId) {
          togglePanelReference(uploadTarget.value.panelId, image.id, true)
        }
      }
    }
    reader.readAsDataURL(file)
  })

  uploadTarget.value = { kind: 'scene', panelId: null }
  ;(event.target as HTMLInputElement).value = ''
}

const deleteAsset = (kind: AssetKind, imageId: string) => {
  if (kind === 'character') {
    characterImages.value = characterImages.value.filter(image => image.id !== imageId)
    return
  }

  sceneReferenceImages.value = sceneReferenceImages.value.filter(image => image.id !== imageId)
  panels.value.forEach(panel => {
    panel.referenceIds = panel.referenceIds.filter(id => id !== imageId)
  })
}

const togglePanelReference = (panelId: string, imageId: string, forceSelect = false) => {
  const panel = panels.value.find(item => item.id === panelId)
  if (!panel) return

  if (forceSelect && !panel.referenceIds.includes(imageId)) {
    panel.referenceIds = [...panel.referenceIds, imageId]
    return
  }

  if (panel.referenceIds.includes(imageId)) {
    panel.referenceIds = panel.referenceIds.filter(id => id !== imageId)
  } else {
    panel.referenceIds = [...panel.referenceIds, imageId]
  }
}

const openImagePreview = (images: string[], startIndex = 0) => {
  if (!images.length) return
  previewImages.value = images
  previewStartIndex.value = Math.max(0, startIndex)
  previewOpen.value = true
}

const copyText = async (text: string, successMessage = 'Copied') => {
  if (!text?.trim()) return
  try {
    await navigator.clipboard.writeText(text)
    alert(successMessage)
  } catch (error) {
    console.error('Failed to copy text:', error)
  }
}

const downloadImage = async (src?: string, filename = 'storyboard-image.png') => {
  if (!src) return

  try {
    const response = await fetch(src)
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
    link.href = src
    link.target = '_blank'
    link.rel = 'noopener'
    link.click()
  }
}

const buildStoryboardPrompt = () => {
  const languageInstruction = storyLanguage.value === 'zh'
    ? 'Return title, summary, action, dialogue, camera, and mood in Simplified Chinese.'
    : 'Return title, summary, action, dialogue, camera, and mood in English.'

  const formatInstruction = sceneFormat.value === 'comic'
    ? 'Plan this as a comic storyboard with clear panel-to-panel visual storytelling.'
    : 'Plan this as a video storyboard with cinematic continuity between shots.'

  return [
    'Create a storyboard for the following project.',
    `Story plot: ${storyPlot.value}`,
    `Target duration/length: ${storyLength.value}`,
    `Target panel count: ${panelCount.value}`,
    `Scene format: ${sceneFormatLabel.value}`,
    `Preferred style direction: ${styleName.value}`,
    characterNotes.value.trim() ? `Character notes: ${characterNotes.value.trim()}` : '',
    styleInstructions.value.trim() ? `Style instructions: ${styleInstructions.value.trim()}` : '',
    languageInstruction,
    formatInstruction,
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
    '      "mood": "string",',
    '      "image_prompt_en": "string"',
    '    }',
    '  ]',
    '}',
    'Rules:',
    `- Create exactly ${panelCount.value} panels.`,
    '- Keep every panel vivid, practical to draw, and strongly connected to the full story arc.',
    '- Dialogue should be short enough for a speech bubble or subtitle card.',
    '- Duration seconds should roughly add up to the requested length.',
    '- image_prompt_en must be English only.',
    '- image_prompt_en must never contain Chinese, Japanese, or mixed-language wording.',
    '- image_prompt_en must avoid visible text, subtitles, captions, speech bubbles, logos, and watermarks in the generated image.',
    '- image_prompt_en should mention composition, subject, motion, camera framing, environment, and style.',
    '- Keep character appearance consistent across all panels.'
  ].filter(Boolean).join('\n')
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
            content: 'You are a senior storyboard writer and visual planner. Return valid JSON only. Do not include markdown fences unless absolutely necessary.'
          },
          {
            role: 'user',
            content: buildStoryboardPrompt()
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
      imagePrompt: typeof panel.image_prompt_en === 'string' && panel.image_prompt_en.trim()
        ? panel.image_prompt_en.trim()
        : '',
      referenceIds: []
    })) as StoryboardPanel[]

    mappedPanels.forEach((panel, index) => {
      if (!panel.imagePrompt) {
        panel.imagePrompt = buildFallbackPanelPrompt(panel, index, mappedPanels.length)
      }
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

const buildImageGenerationText = (panel: StoryboardPanel) => {
  const notes: string[] = [panel.imagePrompt]

  if (characterImages.value.length > 0) {
    notes.push('Use all attached character reference images to preserve identity, hairstyle, face shape, outfit language, and overall subject consistency.')
  }

  if (panel.referenceIds.length > 0) {
    notes.push('Use the attached scene reference images only for environment, composition, props, or mood cues.')
  }

  notes.push('Do not generate visible text, subtitles, speech bubbles, logos, watermarks, or random characters.')
  return notes.join('\n')
}

const generatePanelImage = async (panelId: string) => {
  const panel = panels.value.find(item => item.id === panelId)
  if (!panel || !panel.imagePrompt.trim() || !apiKey.value || panel.isGenerating) return

  panel.isGenerating = true

  try {
    const content: any[] = [
      {
        type: 'text',
        text: buildImageGenerationText(panel)
      }
    ]

    characterImages.value.forEach(image => {
      content.push({
        type: 'image_url',
        image_url: { url: image.src }
      })
    })

    panel.referenceIds
      .map(id => sceneReferenceImages.value.find(image => image.id === id))
      .filter((image): image is AssetImage => Boolean(image))
      .forEach(image => {
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
  } catch (error: any) {
    alert(`Panel image generation failed: ${error.message}`)
  } finally {
    panel.isGenerating = false
  }
}

watch(textModel, () => {
  syncTextModelQuery()
})

watch(imageModel, () => {
  syncImageModelQuery()
})

watch(
  [textModel, imageModel, storyLanguage, sceneFormat, storyPlot, storyLength, panelCount, styleName, characterNotes, styleInstructions],
  () => {
    saveStoryboardSetup()
  }
)

onMounted(() => {
  restoreStoryboardSetup()
  syncApiKey()
  fetchModels()
  window.addEventListener('storage', syncApiKey)
  window.addEventListener('global-openrouter-key-updated', syncApiKey as EventListener)
  document.addEventListener('mousedown', handleOutsideClick)
})

onUnmounted(() => {
  window.removeEventListener('storage', syncApiKey)
  window.removeEventListener('global-openrouter-key-updated', syncApiKey as EventListener)
  document.removeEventListener('mousedown', handleOutsideClick)
})
</script>

<style scoped>
.font-hand { font-family: 'Patrick Hand', cursive; }
h1, h2, h3, h4 { font-family: 'Indie Flower', cursive; }
</style>
