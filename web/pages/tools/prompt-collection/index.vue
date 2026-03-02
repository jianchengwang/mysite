<template>
  <div class="min-h-screen bg-[#fcfcfc] font-hand p-4 md:p-8">
    <div class="max-w-7xl mx-auto mb-8 md:mb-10">
      <h1 class="text-4xl font-bold text-zinc-900 mb-2">Prompt Collection</h1>
      <p class="text-zinc-600 italic">A curated collection of creative prompts for AI models</p>
    </div>

    <div v-if="pending" class="flex justify-center py-20">
      <div class="animate-pulse italic">Loading prompts...</div>
    </div>

    <div v-else class="max-w-7xl mx-auto">
      <div class="mb-4 text-xs uppercase tracking-[0.2em] text-zinc-500">{{ prompts.length }} prompts</div>
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6">
        <button
          v-for="(prompt, idx) in prompts"
          :key="idx"
          type="button"
          @click="openPrompt(prompt)"
          class="sketch-card p-5 md:p-6 bg-white hover:sketch-shadow transition-all cursor-pointer group text-left min-h-[220px]"
        >
          <div class="flex justify-between items-start mb-3">
            <span class="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">{{ prompt.category }}</span>
            <span class="text-[11px] sketch-border px-2 py-0.5 bg-zinc-100 text-zinc-700 group-hover:bg-zinc-900 group-hover:text-white transition-colors">Details</span>
          </div>
          <h3 class="text-2xl font-bold text-zinc-900 mb-3 leading-tight group-hover:text-zinc-600 transition-colors">{{ prompt.title }}</h3>
          <p class="text-sm text-zinc-500 line-clamp-4 italic leading-relaxed">{{ prompt.preview }}</p>
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="selectedPrompt"
        class="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/55 backdrop-blur-sm font-hand"
        @click.self="closePrompt"
      >
        <div class="sketch-card bg-white w-full max-w-4xl max-h-[88vh] flex flex-col p-0 overflow-hidden shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
          <div class="p-5 md:p-6 border-b-2 border-zinc-900 flex justify-between items-start gap-4 bg-zinc-50">
            <div class="min-w-0">
              <span class="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">{{ selectedPrompt.category }}</span>
              <h2 class="text-3xl font-bold text-zinc-900 mt-1 leading-tight">{{ selectedPrompt.title }}</h2>
            </div>
            <button @click="closePrompt" class="text-3xl hover:text-zinc-500 leading-none">×</button>
          </div>

          <div class="flex items-center justify-between px-5 md:px-6 py-3 border-b border-zinc-200 bg-white">
            <div class="text-xs text-zinc-500 uppercase tracking-[0.14em]">Prompt Content</div>
            <button
              @click="copyPrompt"
              class="sketch-button bg-zinc-900 text-white py-1 px-4 text-sm"
              :class="copied ? 'bg-green-700 border-green-700' : ''"
            >
              {{ copied ? 'Copied' : 'Copy Prompt' }}
            </button>
          </div>

          <div class="flex-1 overflow-y-auto px-5 py-5 md:px-8 md:py-6 prompt-content" v-html="selectedPromptHtml"></div>

          <div class="p-4 bg-zinc-50 border-t-2 border-zinc-900 flex justify-end">
            <button @click="closePrompt" class="sketch-button bg-white text-zinc-900 py-1 px-6">Close</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

definePageMeta({ layout: 'default' })

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

const { data: page, pending } = await useAsyncData('prompt-collection', () => queryContent('/tools/prompt-collection').findOne())

const prompts = ref<any[]>([])
const selectedPrompt = ref<any>(null)
const copied = ref(false)

const extractText = (node: any): string => {
  if (!node) return ''
  if (typeof node.value === 'string') return node.value
  if (!Array.isArray(node.children)) return ''
  return node.children.map((child: any) => extractText(child)).join('')
}

const inferCodeLang = (text: string): string => {
  const trimmed = text.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json'
  return ''
}

onMounted(() => {
  if (page.value?.body?.children) {
    const list: any[] = []
    let currentCategory = 'General'

    page.value.body.children.forEach((node: any, nodeIdx: number) => {
      if (node.tag === 'h2') {
        currentCategory = extractText(node).trim() || 'General'
        return
      }

      if (node.tag !== 'h3') return

      const title = extractText(node).trim() || 'Untitled'
      let content = ''

      for (let i = nodeIdx + 1; i < page.value.body.children.length; i++) {
        const nextNode = page.value.body.children[i]
        if (nextNode.tag === 'h2' || nextNode.tag === 'h3') break

        if (nextNode.tag === 'pre') {
          const rawCode = nextNode.children?.[0]?.children?.[0]?.value || ''
          const langClass = nextNode.props?.className?.find((cls: string) => cls.startsWith('language-')) || ''
          const codeLang = langClass.replace('language-', '') || inferCodeLang(rawCode)
          content += `\n\`\`\`${codeLang}\n${rawCode}\n\`\`\`\n`
          continue
        }

        const plainText = extractText(nextNode).trim()
        if (plainText) {
          content += `${plainText}\n\n`
        }
      }

      const cleaned = content.trim()
      list.push({
        category: currentCategory,
        title,
        content: cleaned,
        preview: cleaned.substring(0, 180) + (cleaned.length > 180 ? '...' : '')
      })
    })

    prompts.value = list
  }
})

const selectedPromptHtml = computed(() => {
  if (!selectedPrompt.value) return ''
  return marked.parse(selectedPrompt.value.content || '') as string
})

const openPrompt = (prompt: any) => {
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
  } catch (err) {
    console.error('Failed to copy:', err)
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
