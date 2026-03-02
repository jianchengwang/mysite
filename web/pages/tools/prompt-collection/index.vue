<template>
  <div class="min-h-screen bg-[#fcfcfc] font-hand p-4 md:p-8">
    <div class="max-w-7xl mx-auto mb-10">
      <h1 class="text-4xl font-bold text-zinc-900 mb-2 font-hand">Prompt Collection</h1>
      <p class="text-zinc-600 italic">A curated collection of creative prompts for AI models</p>
    </div>

    <div v-if="pending" class="flex justify-center py-20">
      <div class="animate-pulse italic">Loading prompts...</div>
    </div>

    <div v-else class="max-w-7xl mx-auto">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div 
          v-for="(prompt, idx) in prompts" 
          :key="idx"
          @click="openPrompt(prompt)"
          class="sketch-card p-6 bg-white hover:sketch-shadow transition-all cursor-pointer group"
        >
          <div class="flex justify-between items-start mb-4">
            <span class="text-xs font-bold uppercase tracking-widest text-zinc-400">{{ prompt.category }}</span>
            <span class="text-[10px] bg-zinc-100 px-2 py-0.5 rounded-full text-zinc-500 group-hover:bg-zinc-900 group-hover:text-white transition-colors">Click to View</span>
          </div>
          <h3 class="text-xl font-bold text-zinc-900 mb-3 group-hover:text-zinc-600 transition-colors">{{ prompt.title }}</h3>
          <p class="text-sm text-zinc-500 line-clamp-3 italic">{{ prompt.preview }}</p>
        </div>
      </div>
    </div>

    <!-- Prompt Modal -->
    <Teleport to="body">
      <div v-if="selectedPrompt" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm font-hand" @click.self="selectedPrompt = null">
        <div class="sketch-card bg-white w-full max-w-2xl max-h-[80vh] flex flex-col p-0 overflow-hidden shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
          <div class="p-6 border-b-2 border-zinc-900 flex justify-between items-center bg-zinc-50">
            <div>
              <span class="text-xs font-bold uppercase tracking-widest text-zinc-400">{{ selectedPrompt.category }}</span>
              <h2 class="text-2xl font-bold text-zinc-900">{{ selectedPrompt.title }}</h2>
            </div>
            <button @click="selectedPrompt = null" class="text-3xl hover:text-zinc-500 leading-none">×</button>
          </div>
          
          <div class="flex-1 overflow-y-auto p-8 prose prose-zinc max-w-none">
            <div class="relative group">
              <button 
                @click="copyPrompt(selectedPrompt.content)" 
                class="absolute top-0 right-0 p-2 bg-zinc-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {{ copied ? 'Copied!' : 'Copy Prompt' }}
              </button>
              <pre class="bg-zinc-50 p-4 sketch-border overflow-x-auto whitespace-pre-wrap font-mono text-sm">{{ selectedPrompt.content }}</pre>
            </div>
          </div>
          
          <div class="p-4 bg-zinc-50 border-t-2 border-zinc-900 flex justify-end">
            <button @click="selectedPrompt = null" class="sketch-button bg-white text-zinc-900 py-1 px-6">Close</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({ layout: 'default' })

const { data: page, pending } = await useAsyncData('prompt-collection', () => queryContent('tools', 'prompt-collection').findOne())

const prompts = ref<any[]>([])
const selectedPrompt = ref<any>(null)
const copied = ref(false)

onMounted(() => {
  if (page.value && page.value.body && page.value.body.children) {
    const list: any[] = []
    let currentCategory = 'General'
    
    page.value.body.children.forEach((node: any) => {
      if (node.tag === 'h2') {
        currentCategory = node.children?.[0]?.value || 'General'
      } else if (node.tag === 'h3') {
        const title = node.children?.[0]?.value || 'Untitled'
        // Find next content
        const nodeIdx = page.value.body.children.indexOf(node)
        let content = ''
        for (let i = nodeIdx + 1; i < page.value.body.children.length; i++) {
          const nextNode = page.value.body.children[i]
          if (nextNode.tag === 'h2' || nextNode.tag === 'h3') break
          
          if (nextNode.tag === 'pre') {
            content += nextNode.children?.[0]?.children?.[0]?.value || ''
          } else if (nextNode.tag === 'p') {
            content += nextNode.children?.map((c: any) => c.value || '').join('') + '\n'
          }
        }
        
        list.push({
          category: currentCategory,
          title: title,
          content: content.trim(),
          preview: content.trim().substring(0, 150) + '...'
        })
      }
    })
    
    prompts.value = list
  }
})

const openPrompt = (prompt: any) => {
  selectedPrompt.value = prompt
}

const copyPrompt = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
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

.prose pre {
  @apply border-2 border-zinc-900 shadow-sm;
}
</style>
