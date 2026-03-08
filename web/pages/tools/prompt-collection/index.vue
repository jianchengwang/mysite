<template>
  <div class="min-h-screen bg-[#fcfcfc] font-hand p-4 md:p-8">
    <div class="max-w-7xl mx-auto mb-8 md:mb-10">
      <h1 class="text-4xl font-bold text-zinc-900 mb-2">Prompt Collection</h1>
      <p class="text-zinc-600 italic">A curated collection of creative prompts for AI models</p>
    </div>

    <div class="max-w-7xl mx-auto">
      <div class="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div class="text-xs uppercase tracking-[0.2em] text-zinc-500">{{ filteredPrompts.length }} / {{ prompts.length }} prompts</div>
        <div class="flex w-full flex-col gap-3 md:w-auto md:flex-row">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search title, category, or content..."
            class="w-full min-w-[280px] bg-white px-4 py-2 sketch-border outline-none md:w-80"
          />
          <select
            v-model="selectedCategory"
            class="bg-white px-4 py-2 sketch-border outline-none"
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
          class="sketch-card group min-h-[220px] cursor-pointer bg-white p-5 text-left transition-all hover:sketch-shadow md:p-6"
          @click="openPrompt(prompt)"
        >
          <div class="mb-3 flex items-start justify-between">
            <span class="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">{{ prompt.category }}</span>
            <span class="bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-700 sketch-border transition-colors group-hover:bg-zinc-900 group-hover:text-white">Details</span>
          </div>
          <h3 class="mb-3 text-2xl font-bold leading-tight text-zinc-900 transition-colors group-hover:text-zinc-600">{{ prompt.title }}</h3>
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
        <div class="sketch-card flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden bg-white p-0 shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
          <div class="flex items-start justify-between gap-4 border-b-2 border-zinc-900 bg-zinc-50 p-5 md:p-6">
            <div class="min-w-0">
              <span class="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">{{ selectedPrompt.category }}</span>
              <h2 class="mt-1 text-3xl font-bold leading-tight text-zinc-900">{{ selectedPrompt.title }}</h2>
            </div>
            <button class="text-3xl leading-none hover:text-zinc-500" @click="closePrompt">×</button>
          </div>

          <div class="flex items-center justify-between border-b border-zinc-200 bg-white px-5 py-3 md:px-6">
            <div class="text-xs uppercase tracking-[0.14em] text-zinc-500">Prompt Content</div>
            <button
              class="sketch-button py-1 px-4 text-sm !bg-zinc-900 !text-white"
              :class="copied ? 'bg-green-700 border-green-700' : ''"
              @click="copyPrompt"
            >
              {{ copied ? 'Copied' : 'Copy Prompt' }}
            </button>
          </div>

          <div class="prompt-content flex-1 overflow-y-auto px-5 py-5 md:px-8 md:py-6" v-html="selectedPromptHtml"></div>

          <div class="flex justify-end border-t-2 border-zinc-900 bg-zinc-50 p-4">
            <button class="sketch-button bg-white py-1 px-6 text-zinc-900" @click="closePrompt">Close</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import promptCollectionSource from '~/content/tools/prompt-collection.md?raw'
import 'highlight.js/styles/github.css'

definePageMeta({ layout: 'default' })

type PromptItem = {
  category: string
  title: string
  content: string
  preview: string
}

marked.setOptions({
  gfm: true,
  breaks: true,
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value
    }
    return hljs.highlightAuto(code).value
  }
})

const selectedPrompt = ref<PromptItem | null>(null)
const copied = ref(false)
const searchQuery = ref('')
const selectedCategory = ref('all')

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
  return marked.parse(selectedPrompt.value.content || '') as string
})

const openPrompt = (prompt: PromptItem) => {
  copied.value = false
  selectedPrompt.value = prompt
}

const closePrompt = () => {
  copied.value = false
  selectedPrompt.value = null
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
