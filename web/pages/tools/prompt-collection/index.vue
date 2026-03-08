<template>
  <div class="min-h-screen bg-[#fcfcfc] font-hand p-4 md:p-8">
    <div class="max-w-7xl mx-auto mb-8 md:mb-10">
      <h1 class="text-4xl font-bold text-zinc-900 mb-2">Prompt Collection</h1>
      <p class="text-sm sm:text-base text-zinc-600 italic">A curated collection of creative prompts for AI models</p>
    </div>

    <div class="max-w-7xl mx-auto">
      <div class="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div class="text-xs uppercase tracking-[0.2em] text-zinc-500">{{ filteredPrompts.length }} / {{ prompts.length }} prompts</div>
        <div class="flex w-full flex-col gap-3 md:w-auto md:flex-row">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search title, category, or content..."
            class="w-full bg-white px-4 py-2 sketch-border outline-none md:w-80"
          />
          <select
            v-model="selectedCategory"
            class="w-full bg-white px-4 py-2 sketch-border outline-none md:w-auto"
          >
            <option value="all">All Categories</option>
            <option v-for="category in categories" :key="category" :value="category">{{ category }}</option>
          </select>
        </div>
      </div>
      <div class="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
        <button
          v-for="(prompt, idx) in filteredPrompts"
          :key="idx"
          type="button"
          class="sketch-card group min-h-[200px] cursor-pointer bg-white p-5 text-left transition-all hover:sketch-shadow md:min-h-[220px] md:p-6"
          @click="openPrompt(prompt)"
        >
          <div class="mb-3 flex items-start justify-between">
            <span class="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">{{ prompt.category }}</span>
            <span class="bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-700 sketch-border transition-colors group-hover:bg-zinc-900 group-hover:text-white">Details</span>
          </div>
          <h3 class="mb-3 text-xl md:text-2xl font-bold leading-tight text-zinc-900 transition-colors group-hover:text-zinc-600">{{ prompt.title }}</h3>
          <p class="line-clamp-4 text-sm italic leading-relaxed text-zinc-500">{{ prompt.preview }}</p>
        </button>
      </div>
      <div v-if="filteredPrompts.length === 0" class="sketch-card mt-6 bg-white px-6 py-10 text-center text-zinc-500">
        No prompts match the current search.
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="selectedPrompt"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 font-hand backdrop-blur-sm md:p-4"
        @click.self="closePrompt"
      >
        <div class="sketch-card flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden bg-white p-0 shadow-[10px_10px_0_0_rgba(0,0,0,1)] md:max-h-[88vh]">
          <div class="flex items-start justify-between gap-4 border-b-2 border-zinc-900 bg-zinc-50 p-4 md:p-6">
            <div class="min-w-0">
              <span class="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">{{ selectedPrompt.category }}</span>
              <h2 class="mt-1 text-2xl md:text-3xl font-bold leading-tight text-zinc-900">{{ selectedPrompt.title }}</h2>
            </div>
            <button class="text-3xl leading-none hover:text-zinc-500" @click="closePrompt">×</button>
          </div>

          <div class="flex flex-col gap-3 border-b border-zinc-200 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
            <div class="text-xs uppercase tracking-[0.14em] text-zinc-500">Prompt Content</div>
            <button
              class="sketch-button w-full py-1 px-4 text-sm !bg-zinc-900 !text-white md:w-auto"
              :class="copied ? 'bg-green-700 border-green-700' : ''"
              @click="copyPrompt"
            >
              {{ copied ? 'Copied' : 'Copy Prompt' }}
            </button>
          </div>

          <div class="flex-1 overflow-y-auto">
            <div class="border-b border-zinc-200 bg-zinc-50/60 px-4 py-4 md:px-6">
              <div class="flex flex-col gap-4">
                <div class="flex flex-col gap-4 xl:flex-row xl:items-end">
                  <div ref="testModelSelectorRef" class="relative flex-1">
                    <label class="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">OpenRouter Model</label>
                    <input
                      v-model="modelSearch"
                      type="text"
                      placeholder="Search model name or id..."
                      class="w-full bg-white px-4 py-2 pr-10 sketch-border outline-none"
                      @focus="showModelDropdown = true"
                      @keydown.enter.prevent="chooseFirstModel"
                    />
                    <button
                      type="button"
                      class="absolute right-3 top-[38px] text-xs text-zinc-500"
                      @click.prevent="showModelDropdown = !showModelDropdown"
                    >
                      ▼
                    </button>
                    <div
                      v-if="showModelDropdown"
                      class="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-64 overflow-y-auto bg-white sketch-border shadow-xl"
                    >
                      <button
                        v-for="model in filteredModels"
                        :key="model.id"
                        type="button"
                        class="w-full border-b border-zinc-100 px-3 py-2 text-left last:border-b-0 hover:bg-zinc-100"
                        @mousedown.prevent="selectModel(model)"
                      >
                        <div class="text-sm font-bold text-zinc-900">{{ model.name || model.id }}</div>
                        <div class="text-[10px] text-zinc-500">{{ model.id }}</div>
                      </button>
                      <div v-if="filteredModels.length === 0" class="px-3 py-3 text-sm italic text-zinc-500">
                        No matching models.
                      </div>
                    </div>
                  </div>

                  <div class="w-full xl:w-44">
                    <label class="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Capability</label>
                    <select v-model="modelCapabilityFilter" class="w-full bg-white px-4 py-2 sketch-border outline-none">
                      <option value="all">All Models</option>
                      <option value="text">Text Models</option>
                      <option value="image">Image Models</option>
                    </select>
                  </div>

                  <button
                    class="sketch-button w-full py-2 text-sm !bg-zinc-900 !text-white xl:w-auto xl:px-6"
                    :disabled="testLoading || !selectedPrompt || !apiKey"
                    @click="runPromptTest"
                  >
                    {{ testLoading ? 'Testing...' : 'Run Prompt Test' }}
                  </button>
                </div>

                <div v-if="!apiKey" class="sketch-border bg-red-50 px-4 py-3 text-sm text-red-700">
                  Prompt testing needs your global OpenRouter key.
                  <button class="ml-2 underline underline-offset-2" @click="openGlobalSettings">Open Settings</button>
                </div>

                <div>
                  <label class="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Optional Test Input</label>
                  <textarea
                    v-model="testInstruction"
                    rows="3"
                    class="w-full resize-none bg-white px-4 py-3 sketch-border outline-none"
                    placeholder="Add extra context or an example request for this prompt test..."
                  ></textarea>
                </div>
              </div>
            </div>

            <div class="prompt-content border-b border-zinc-200 px-4 py-5 md:px-8 md:py-6" v-html="selectedPromptHtml"></div>

            <div class="px-4 py-5 md:px-8 md:py-6">
              <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div class="text-xs uppercase tracking-[0.14em] text-zinc-500">Test Output</div>
                  <div v-if="testResponseModel" class="text-sm text-zinc-500">{{ testResponseModel }}</div>
                </div>
                <button
                  v-if="testResultText"
                  class="sketch-button w-full py-1 px-4 text-sm md:w-auto"
                  @click="copyTestResult"
                >
                  Copy Output
                </button>
              </div>

              <div v-if="testLoading" class="sketch-border bg-zinc-50 px-4 py-8 text-center text-sm italic text-zinc-500">
                Waiting for the model response...
              </div>

              <div v-else-if="testError" class="sketch-border bg-red-50 px-4 py-4 text-sm text-red-700">
                {{ testError }}
              </div>

              <div v-else-if="!testResultText && testResultImages.length === 0" class="sketch-border bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
                Run a prompt test to preview the selected model output here.
              </div>

              <div v-else class="space-y-4">
                <div v-if="testResultImages.length" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    v-for="(image, index) in testResultImages"
                    :key="`${image}-${index}`"
                    type="button"
                    class="overflow-hidden rounded-2xl border-2 border-zinc-200 bg-zinc-50 text-left"
                    @click="openExternalImage(image)"
                  >
                    <img :src="image" class="aspect-square w-full object-cover" />
                    <div class="border-t border-zinc-200 px-3 py-2 text-xs text-zinc-500">Open image</div>
                  </button>
                </div>

                <div
                  v-if="testResultText"
                  class="prompt-content sketch-border bg-white px-4 py-4"
                  v-html="testResultHtml"
                ></div>
              </div>
            </div>
          </div>

          <div class="flex justify-end border-t-2 border-zinc-900 bg-zinc-50 p-4">
            <button class="sketch-button bg-white py-1 px-6 text-zinc-900" @click="closePrompt">Close</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Marked } from 'marked'
import { highlightCode } from '~/utils/codeHighlight'
import { useGlobalOpenRouterKey } from '~/composables/useGlobalOpenRouterKey'
import { renderSafeMarkdown } from '~/utils/safeRichText'
import promptCollectionSource from '~/content/tools/prompt-collection.md?raw'

definePageMeta({ layout: 'default' })

type PromptItem = {
  category: string
  title: string
  content: string
  preview: string
}

type ModelOption = {
  id: string
  name: string
  outputModalities: string[]
}

const MODEL_STORAGE_KEY = 'prompt_collection_test_model'
const MODEL_CACHE_KEY = 'prompt_collection_model_cache_v1'
const DEFAULT_MODEL = 'google/gemini-2.0-flash-001'

const markdownRenderer = new Marked({
  gfm: true,
  breaks: true,
  highlight: (code, lang) => {
    return highlightCode(code, lang)
  }
})

const { apiKey, openGlobalSettings } = useGlobalOpenRouterKey()
const selectedPrompt = ref<PromptItem | null>(null)
const copied = ref(false)
const searchQuery = ref('')
const selectedCategory = ref('all')
const availableModels = ref<ModelOption[]>([])
const selectedTestModel = ref(DEFAULT_MODEL)
const modelSearch = ref('')
const showModelDropdown = ref(false)
const modelCapabilityFilter = ref<'all' | 'text' | 'image'>('all')
const testInstruction = ref('')
const testLoading = ref(false)
const testError = ref('')
const testResultText = ref('')
const testResultImages = ref<string[]>([])
const testResponseModel = ref('')
const testModelSelectorRef = ref<HTMLElement | null>(null)

const stripFrontmatter = (source: string) => {
  if (!source.startsWith('---')) return source
  const parts = source.split('\n')
  const endIndex = parts.findIndex((line, index) => index > 0 && line.trim() === '---')
  return endIndex === -1 ? source : parts.slice(endIndex + 1).join('\n')
}

const buildPreview = (content: string) => {
  const previewText = content
    .replace(/```[\s\S]*?```/g, '[code block]')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()

  if (!previewText) return 'No preview available.'
  return previewText.length > 180 ? `${previewText.slice(0, 180)}...` : previewText
}

const parsePromptMarkdown = (source: string): PromptItem[] => {
  const lines = stripFrontmatter(source).replace(/\r\n/g, '\n').split('\n')
  const list: PromptItem[] = []
  let currentCategory = 'General'
  let currentTitle = ''
  let currentLines: string[] = []

  const flushPrompt = () => {
    if (!currentTitle) return
    const content = currentLines.join('\n').trim()
    list.push({
      category: currentCategory,
      title: currentTitle,
      content,
      preview: buildPreview(content)
    })
    currentTitle = ''
    currentLines = []
  }

  lines.forEach(line => {
    if (/^##\s+/.test(line)) {
      flushPrompt()
      currentCategory = line.replace(/^##\s+/, '').trim() || 'General'
      return
    }

    if (/^###\s+/.test(line)) {
      flushPrompt()
      currentTitle = line.replace(/^###\s+/, '').trim() || 'Untitled'
      return
    }

    if (currentTitle) {
      currentLines.push(line)
    }
  })

  flushPrompt()
  return list
}

const prompts = parsePromptMarkdown(promptCollectionSource)

const categories = computed(() =>
  [...new Set(prompts.map(prompt => prompt.category))].sort((a, b) => a.localeCompare(b))
)

const filteredPrompts = computed(() => {
  const category = selectedCategory.value
  const query = searchQuery.value.trim().toLowerCase()

  return prompts.filter(prompt => {
    const categoryMatch = category === 'all' || prompt.category === category
    if (!categoryMatch) return false
    if (!query) return true

    const haystack = `${prompt.category}\n${prompt.title}\n${prompt.content}`.toLowerCase()
    return haystack.includes(query)
  })
})

const selectedPromptHtml = computed(() => {
  if (!selectedPrompt.value) return ''
  return markdownRenderer.parse(selectedPrompt.value.content || '') as string
})

const filteredModels = computed(() => {
  const capability = modelCapabilityFilter.value
  const query = modelSearch.value.trim().toLowerCase()

  return availableModels.value.filter((model) => {
    const supportsImage = model.outputModalities.includes('image') || /flux|dall-e|imagen|stable-diffusion/i.test(model.id)
    const supportsText = model.outputModalities.length === 0 || model.outputModalities.includes('text')

    if (capability === 'image' && !supportsImage) return false
    if (capability === 'text' && !supportsText) return false
    if (!query) return true

    return `${model.name}\n${model.id}`.toLowerCase().includes(query)
  })
})

const testResultHtml = computed(() => renderSafeMarkdown(testResultText.value))

const parseCachedModels = (value: string | null): ModelOption[] => {
  if (!value) return []

  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is ModelOption =>
      typeof item?.id === 'string' &&
      typeof item?.name === 'string' &&
      Array.isArray(item?.outputModalities)
    )
  } catch {
    return []
  }
}

const ensureSelectedModel = () => {
  if (availableModels.value.length === 0) return
  if (!availableModels.value.find((model) => model.id === selectedTestModel.value)) {
    selectedTestModel.value = availableModels.value[0].id
  }
}

const syncModelSearch = () => {
  const activeModel = availableModels.value.find((model) => model.id === selectedTestModel.value)
  modelSearch.value = activeModel?.name || selectedTestModel.value
}

const selectModel = (model: ModelOption) => {
  selectedTestModel.value = model.id
  modelSearch.value = model.name || model.id
  showModelDropdown.value = false
}

const chooseFirstModel = () => {
  const [firstModel] = filteredModels.value
  if (firstModel) {
    selectModel(firstModel)
  }
}

const handleOutsideClick = (event: MouseEvent) => {
  if (!testModelSelectorRef.value) return
  if (!testModelSelectorRef.value.contains(event.target as Node)) {
    showModelDropdown.value = false
    syncModelSearch()
  }
}

const fetchModels = async () => {
  const cachedModels = parseCachedModels(localStorage.getItem(MODEL_CACHE_KEY))
  if (cachedModels.length > 0) {
    availableModels.value = cachedModels
    ensureSelectedModel()
    syncModelSearch()
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models')
    const data = await response.json()

    if (!Array.isArray(data.data)) return

    const fetchedModels = data.data
      .map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        outputModalities: Array.isArray(model.architecture?.output_modalities)
          ? model.architecture.output_modalities.filter((value: unknown): value is string => typeof value === 'string')
          : []
      }))
      .filter((model: ModelOption) => typeof model.id === 'string' && model.id.length > 0)

    if (fetchedModels.length > 0) {
      availableModels.value = fetchedModels
      localStorage.setItem(MODEL_CACHE_KEY, JSON.stringify(fetchedModels))
      ensureSelectedModel()
      syncModelSearch()
    }
  } catch (error) {
    console.error('Failed to fetch prompt models:', error)
    if (availableModels.value.length === 0) {
      availableModels.value = [
        { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', outputModalities: ['text'] },
        { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', outputModalities: ['text'] },
        { id: 'black-forest-labs/flux-schnell', name: 'Flux Schnell', outputModalities: ['image'] }
      ]
      ensureSelectedModel()
      syncModelSearch()
    }
  }
}

const extractResponseText = (message: any) => {
  if (Array.isArray(message?.content)) {
    return message.content
      .filter((entry: any) => entry?.type === 'text' && typeof entry.text === 'string')
      .map((entry: any) => entry.text)
      .join('')
      .trim()
  }

  return typeof message?.content === 'string' ? message.content.trim() : ''
}

const extractResponseImages = (message: any) => {
  const urls: string[] = []
  const pushUrl = (value?: string) => {
    if (!value) return
    const clean = value.trim().split(')')[0].split('"')[0].split("'")[0]
    if (clean && !urls.includes(clean)) {
      urls.push(clean)
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
    const markdownMatches = message.content.matchAll(/!\[[^\]]*]\(([^)\s]+)[^)]*\)/g)
    for (const match of markdownMatches) {
      pushUrl(match[1])
    }

    const urlMatches = message.content.match(/(?:https?:\/\/|data:image\/)[^\s)"']+/gi) || []
    urlMatches.forEach((match: string) => pushUrl(match))
  }

  return urls
}

const resetTestResult = () => {
  testLoading.value = false
  testError.value = ''
  testResultText.value = ''
  testResultImages.value = []
  testResponseModel.value = ''
}

const openPrompt = (prompt: PromptItem) => {
  copied.value = false
  selectedPrompt.value = prompt
  resetTestResult()
}

const closePrompt = () => {
  copied.value = false
  selectedPrompt.value = null
  resetTestResult()
}

const copyPrompt = async () => {
  if (!selectedPrompt.value) return
  try {
    await navigator.clipboard.writeText(selectedPrompt.value.content || '')
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 1600)
  } catch (error) {
    console.error('Failed to copy:', error)
  }
}

const copyTestResult = async () => {
  if (!testResultText.value.trim()) return
  try {
    await navigator.clipboard.writeText(testResultText.value)
  } catch (error) {
    console.error('Failed to copy test result:', error)
  }
}

const openExternalImage = (imageUrl: string) => {
  if (!imageUrl || !import.meta.client) return
  window.open(imageUrl, '_blank', 'noopener')
}

const runPromptTest = async () => {
  if (!selectedPrompt.value || !apiKey.value) return

  const selectedModelConfig = availableModels.value.find((model) => model.id === selectedTestModel.value)
  const outputModalities = selectedModelConfig?.outputModalities || []
  const supportsImage = outputModalities.includes('image') || /flux|dall-e|imagen|stable-diffusion/i.test(selectedTestModel.value)
  const supportsText = outputModalities.length === 0 || outputModalities.includes('text')

  testLoading.value = true
  testError.value = ''
  testResultText.value = ''
  testResultImages.value = []
  testResponseModel.value = selectedModelConfig?.name || selectedTestModel.value

  const userPrompt = [
    'Use the following prompt exactly as the main instruction.',
    selectedPrompt.value.content.trim(),
    testInstruction.value.trim()
      ? `Additional request or context:\n${testInstruction.value.trim()}`
      : ''
  ].filter(Boolean).join('\n\n')

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.value}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Prompt Collection'
      },
      body: JSON.stringify({
        model: selectedTestModel.value,
        messages: [{ role: 'user', content: userPrompt }],
        ...(supportsImage
          ? { modalities: supportsText ? ['text', 'image'] : ['image'] }
          : {})
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Prompt test failed')
    }

    const data = await response.json()
    const message = data.choices?.[0]?.message
    const responseText = extractResponseText(message)
    const responseImages = extractResponseImages(message)

    testResultText.value = responseText
    testResultImages.value = responseImages

    if (!responseText && responseImages.length === 0) {
      testError.value = 'The model returned no previewable text or image output.'
    }
  } catch (error: any) {
    testError.value = error.message || 'Prompt test failed.'
  } finally {
    testLoading.value = false
  }
}

watch(selectedTestModel, (value) => {
  if (!process.client) return
  localStorage.setItem(MODEL_STORAGE_KEY, value)
  syncModelSearch()
})

onMounted(() => {
  selectedTestModel.value = localStorage.getItem(MODEL_STORAGE_KEY) || DEFAULT_MODEL
  syncModelSearch()
  fetchModels()
  document.addEventListener('mousedown', handleOutsideClick)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleOutsideClick)
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Indie+Flower&display=swap');

.font-hand {
  font-family: 'Patrick Hand', cursive;
}

h1, h2, h3 {
  font-family: 'Indie Flower', cursive;
}

:deep(.prompt-content) {
  color: #262626;
  line-height: 1.75;
  font-size: 1.05rem;
}

:deep(.prompt-content h1),
:deep(.prompt-content h2),
:deep(.prompt-content h3) {
  font-family: 'Indie Flower', cursive;
  margin-bottom: 0.75rem;
}

:deep(.prompt-content p) {
  margin: 0.75rem 0;
}

:deep(.prompt-content pre) {
  background: #111827;
  color: #f9fafb;
  border: 2px solid #111827;
  border-radius: 18px 8px 15px 10px / 10px 15px 8px 18px;
  padding: 1rem;
  overflow-x: auto;
  margin: 1rem 0;
}

:deep(.prompt-content code) {
  font-size: 0.88em;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

:deep(.prompt-content :not(pre) > code) {
  background: #f4f4f5;
  border: 1px solid #d4d4d8;
  border-radius: 7px;
  padding: 0.1rem 0.35rem;
}
</style>
