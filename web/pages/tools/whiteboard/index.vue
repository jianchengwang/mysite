<template>
  <div class="max-w-7xl mx-auto px-4 py-8 h-screen flex flex-col font-hand">
    <!-- Header -->
    <div class="mb-6 flex justify-between items-center">
      <div>
        <h1 class="text-4xl font-bold text-zinc-900 font-hand">Whiteboard</h1>
        <p class="text-zinc-600 font-hand italic">Draw your sketchy ideas here</p>
      </div>
      
      <div class="flex gap-2">
        <button @click="undo" :disabled="!canUndo" class="sketch-button py-1 px-3 text-sm disabled:opacity-30">Undo</button>
        <button @click="redo" :disabled="!canRedo" class="sketch-button py-1 px-3 text-sm disabled:opacity-30">Redo</button>
        <button @click="clear" class="sketch-button py-1 px-3 text-sm border-red-200 text-red-600">Clear</button>
        <button @click="save" class="sketch-button py-1 px-3 text-sm !bg-zinc-900 !text-white">Save</button>
      </div>
    </div>

    <!-- Toolbar & Canvas Area -->
    <div class="flex-1 flex gap-6 min-h-0">
      <!-- Sidebar Toolbar -->
      <div class="w-48 flex flex-col gap-4">
        <div class="sketch-card p-4 space-y-4">
          <h3 class="font-bold border-b border-zinc-200 pb-2 mb-2">Tools</h3>
          <div class="grid grid-cols-2 gap-2">
            <button 
              v-for="tool in tools" 
              :key="tool.id"
              @click="currentTool = tool.id"
              :class="['p-2 sketch-border text-center transition-all', currentTool === tool.id ? 'bg-zinc-200 shadow-sm translate-x-0.5 translate-y-0.5' : 'bg-white hover:bg-zinc-50']"
              :title="tool.name"
            >
              <span class="text-xl">{{ tool.icon }}</span>
            </button>
          </div>
          
          <div class="pt-4">
            <h3 class="font-bold border-b border-zinc-200 pb-2 mb-2">Color</h3>
            <div class="grid grid-cols-4 gap-1">
              <button 
                v-for="c in colors" 
                :key="c"
                @click="currentColor = c"
                class="w-6 h-6 rounded-full border border-zinc-300"
                :style="{ backgroundColor: c }"
                :class="{ 'ring-2 ring-zinc-500 ring-offset-2': currentColor === c }"
              ></button>
            </div>
          </div>

          <div class="pt-4">
            <h3 class="font-bold border-b border-zinc-200 pb-2 mb-2">Size</h3>
            <input type="range" v-model.number="currentSize" min="1" max="20" class="w-full accent-zinc-700" />
          </div>
        </div>
        
        <div class="sketch-card p-4 space-y-4">
          <h3 class="font-bold border-b border-zinc-200 pb-2 mb-2">OpenRouter AI</h3>
          <div class="space-y-2">
            <p v-if="!apiKey" class="text-xs text-red-500 mb-2 font-hand">Please set API Key in Global Settings (top right)</p>
            <button 
              @click="showGenerateModal = true" 
              :disabled="isGenerating || !apiKey"
              class="w-full sketch-button py-2 text-sm !bg-zinc-900 !text-white disabled:opacity-50"
              :title="!apiKey ? 'API Key required' : ''"
            >
              {{ isGenerating ? '✨ Generating...' : '✨ Generate Image' }}
            </button>
          </div>
        </div>

        <div class="mt-auto sketch-card p-4 text-xs italic text-zinc-500">
          Tip: Drag to draw. <br>
          Use shapes for clean sketches. <br>
          Mouse wheel to zoom selected image.
        </div>
      </div>

      <!-- Main Canvas -->
      <div class="flex-1 sketch-card bg-white p-0 overflow-hidden relative" ref="canvasWrapper">
        <canvas 
          ref="canvas" 
          @mousedown="handleMouseDown"
          @mousemove="handleMouseMove"
          @mouseup="handleMouseUp"
          @mouseleave="handleMouseUp"
          @touchstart.prevent="handleTouchStart"
          @touchmove.prevent="handleTouchMove"
          @touchend.prevent="handleTouchEnd"
          class="w-full h-full cursor-crosshair bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]"
        ></canvas>
      </div>
    </div>

    <!-- Generate Modal -->
    <Teleport to="body">
      <div v-if="showGenerateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm font-hand">
        <div class="sketch-card bg-white w-full max-w-md p-6 space-y-4">
          <div class="flex justify-between items-center mb-2">
            <h2 class="text-2xl font-bold">Generate Image</h2>
            <button @click="showGenerateModal = false" class="text-2xl hover:text-zinc-500">×</button>
          </div>
          
          <div class="space-y-2">
            <label class="block font-bold">AI Model</label>
            <select v-model="aiModel" class="w-full p-2 sketch-border bg-white text-sm">
              <option v-for="m in aiModels" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </div>
          
          <div class="space-y-2">
            <label class="block font-bold">Prompt</label>
            <textarea 
              v-model="aiPrompt" 
              placeholder="Describe what you want to see..." 
              class="w-full p-3 sketch-border bg-white h-32 resize-none font-hand"
            ></textarea>
          </div>
          
          <div class="flex gap-4 pt-2">
            <button 
              @click="showGenerateModal = false" 
              class="flex-1 sketch-button py-2 bg-white text-zinc-900"
            >
              Cancel
            </button>
            <button 
              @click="generateAIImage" 
              :disabled="isGenerating || !aiPrompt"
              class="flex-1 sketch-button py-2 !bg-zinc-900 !text-white disabled:opacity-50"
            >
              {{ isGenerating ? 'Generating...' : '✨ Generate' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'

definePageMeta({ layout: 'default' })

// Types
type Point = { x: number; y: number }
type WbObject = 
  | { type: 'path'; points: Point[]; color: string; size: number }
  | { type: 'rect' | 'circle' | 'diamond'; start: Point; end: Point; color: string; size: number }
  | { type: 'image'; pos: Point; img: HTMLImageElement; width: number; height: number; id: string; prompt?: string; sourceId?: string }
  | { type: 'link'; start: Point; end: Point; fromId: string; toId: string }

const canvas = ref<HTMLCanvasElement | null>(null)
const canvasWrapper = ref<HTMLElement | null>(null)
const ctx = ref<CanvasRenderingContext2D | null>(null)

const currentTool = ref<'pencil' | 'rect' | 'circle' | 'diamond' | 'eraser' | 'image' | 'select'>('pencil')
const currentColor = ref('#000000')
const currentSize = ref(3)

const tools = [
  { id: 'pencil', name: 'Pencil', icon: '✎' },
  { id: 'rect', name: 'Rectangle', icon: '▭' },
  { id: 'circle', name: 'Circle', icon: '◯' },
  { id: 'diamond', name: 'Diamond', icon: '♢' },
  { id: 'image', name: 'Add Image', icon: '🖼' },
  { id: 'eraser', name: 'Eraser', icon: '⌫' },
  { id: 'select', name: 'Select', icon: '🖱' },
]

const colors = ['#000000', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b']

// AI State
const apiKey = ref('')
const aiModel = ref('black-forest-labs/flux-schnell')
const aiPrompt = ref('')
const isGenerating = ref(false)
const showGenerateModal = ref(false)
const aiModels = ref<any[]>([])

const fetchModels = async () => {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models')
    const data = await response.json()
    if (data.data) {
      // Filter models that have image output or are known image models
      aiModels.value = data.data
        .filter((m: any) => {
          const architecture = m.architecture || {}
          const output_modalities = architecture.output_modalities || []
          return output_modalities.includes('image') || 
                 m.id.includes('flux') || 
                 m.id.includes('dall-e') || 
                 m.id.includes('stable-diffusion') ||
                 m.id.includes('midjourney')
        })
        .map((m: any) => ({
          id: m.id,
          name: m.name
        }))
      
      if (aiModels.value.length > 0 && !aiModels.value.find(m => m.id === aiModel.value)) {
        aiModel.value = aiModels.value[0].id
      }
    }
  } catch (error) {
    console.error('Failed to fetch models:', error)
    // Fallback models
    aiModels.value = [
      { id: 'black-forest-labs/flux-schnell', name: 'Flux Schnell' },
      { id: 'openai/dall-e-3', name: 'DALL-E 3' }
    ]
  }
}

// Selection state
const selectedObjectId = ref<string | null>(null)

watch(selectedObjectId, (newId) => {
  if (newId) {
    const obj = objects.value.find(o => (o as any).id === newId) as any
    if (obj && obj.prompt) {
      aiPrompt.value = obj.prompt
    }
  }
})

// Watch apiKey to persist it (Removed for global key)

// History state
const objects = ref<WbObject[]>([])
const history = ref<WbObject[][]>([[]])
const historyIndex = ref(0)

const canUndo = computed(() => historyIndex.value > 0)
const canRedo = computed(() => historyIndex.value < history.value.length - 1)

// Drawing state
const isDrawing = ref(false)
const isDragging = ref(false)
const dragOffset = ref<Point>({ x: 0, y: 0 })
const currentPoints = ref<Point[]>([])
const startPoint = ref<Point | null>(null)

onMounted(() => {
  if (canvas.value && canvasWrapper.value) {
    const rect = canvasWrapper.value.getBoundingClientRect()
    canvas.value.width = rect.width
    canvas.value.height = rect.height
    ctx.value = canvas.value.getContext('2d')
    
    apiKey.value = localStorage.getItem('global_openrouter_key') || ''
    window.addEventListener('storage', () => {
      apiKey.value = localStorage.getItem('global_openrouter_key') || ''
    })
    
    window.addEventListener('resize', handleResize)
    canvas.value.addEventListener('wheel', handleWheel, { passive: false })
    
    fetchModels()
    render()
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (canvas.value) {
    canvas.value.removeEventListener('wheel', handleWheel)
  }
})

const handleResize = () => {
  if (canvas.value && canvasWrapper.value) {
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = canvas.value.width
    tempCanvas.height = canvas.value.height
    tempCanvas.getContext('2d')?.drawImage(canvas.value, 0, 0)
    
    const rect = canvasWrapper.value.getBoundingClientRect()
    canvas.value.width = rect.width
    canvas.value.height = rect.height
    render()
  }
}

const handleWheel = (e: WheelEvent) => {
  if (selectedObjectId.value) {
    const obj = objects.value.find(o => (o as any).id === selectedObjectId.value) as any
    if (obj && obj.type === 'image') {
      e.preventDefault()
      const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05
      const oldWidth = obj.width
      const oldHeight = obj.height
      obj.width *= zoomFactor
      obj.height *= zoomFactor
      
      // Keep center point stable
      obj.pos.x -= (obj.width - oldWidth) / 2
      obj.pos.y -= (obj.height - oldHeight) / 2
      
      render()
    }
  }
}

const getMousePos = (e: MouseEvent | Touch): Point => {
  if (!canvas.value) return { x: 0, y: 0 }
  const rect = canvas.value.getBoundingClientRect()
  return {
    x: (e.clientX - rect.left) * (canvas.value.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.value.height / rect.height)
  }
}

const handleMouseDown = (e: MouseEvent) => {
  const pos = getMousePos(e)
  
  if (currentTool.value === 'select') {
    // Check if clicked on an image
    const clickedImage = [...objects.value].reverse().find(obj => 
      obj.type === 'image' && 
      pos.x >= obj.pos.x && pos.x <= obj.pos.x + obj.width &&
      pos.y >= obj.pos.y && pos.y <= obj.pos.y + obj.height
    ) as any
    
    if (clickedImage) {
      selectedObjectId.value = clickedImage.id
      isDragging.value = true
      dragOffset.value = { x: pos.x - clickedImage.pos.x, y: pos.y - clickedImage.pos.y }
    } else {
      selectedObjectId.value = null
    }
    render()
    return
  }

  if (currentTool.value === 'image') {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e: any) => {
      const file = e.target.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event: any) => {
          const img = new Image()
          img.src = event.target.result
          img.onload = () => {
            const id = Math.random().toString(36).substr(2, 9)
            objects.value.push({
              type: 'image',
              id,
              pos: { x: pos.x - 100, y: pos.y - 100 },
              img,
              width: 200,
              height: (200 / img.width) * img.height
            })
            commitToHistory()
            render()
          }
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
    currentTool.value = 'select'
    return
  }

  isDrawing.value = true
  startPoint.value = pos
  if (currentTool.value === 'pencil' || currentTool.value === 'eraser') {
    currentPoints.value = [pos]
  }
}

const handleMouseMove = (e: MouseEvent) => {
  const pos = getMousePos(e)

  if (isDragging.value && selectedObjectId.value) {
    const obj = objects.value.find(o => (o as any).id === selectedObjectId.value) as any
    if (obj) {
      obj.pos.x = pos.x - dragOffset.value.x
      obj.pos.y = pos.y - dragOffset.value.y
      render()
    }
    return
  }

  if (!isDrawing.value || !ctx.value) return
  
  if (currentTool.value === 'pencil' || currentTool.value === 'eraser') {
    currentPoints.value.push(pos)
    render()
    drawPath(ctx.value, { 
      type: 'path', 
      points: currentPoints.value, 
      color: currentTool.value === 'eraser' ? '#ffffff' : currentColor.value, 
      size: currentTool.value === 'eraser' ? currentSize.value * 5 : currentSize.value 
    })
  } else {
    render()
    if (startPoint.value) {
      drawShape(ctx.value, {
        type: currentTool.value as any,
        start: startPoint.value,
        end: pos,
        color: currentColor.value,
        size: currentSize.value
      })
    }
  }
}

const handleMouseUp = (e: MouseEvent) => {
  isDragging.value = false
  if (!isDrawing.value) return
  isDrawing.value = false
  const pos = getMousePos(e)
  
  if (currentTool.value === 'pencil' || currentTool.value === 'eraser') {
    if (currentPoints.value.length > 1) {
      objects.value.push({
        type: 'path',
        points: [...currentPoints.value],
        color: currentTool.value === 'eraser' ? '#ffffff' : currentColor.value,
        size: currentTool.value === 'eraser' ? currentSize.value * 5 : currentSize.value
      })
      commitToHistory()
    }
  } else if (startPoint.value && ['rect', 'circle', 'diamond'].includes(currentTool.value)) {
    objects.value.push({
      type: currentTool.value as any,
      start: startPoint.value,
      end: pos,
      color: currentColor.value,
      size: currentSize.value
    })
    commitToHistory()
  }
  
  currentPoints.value = []
  startPoint.value = null
  render()
}

// Touch support
const handleTouchStart = (e: TouchEvent) => handleMouseDown(e.touches[0] as any)
const handleTouchMove = (e: TouchEvent) => handleMouseMove(e.touches[0] as any)
const handleTouchEnd = () => handleMouseUp({} as any)

const generateAIImage = async () => {
  if (!aiPrompt.value || isGenerating.value) return
  if (!apiKey.value) {
    alert('Please set your OpenRouter API key first.')
    return
  }
  isGenerating.value = true
  showGenerateModal.value = false
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.value}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Gemini Whiteboard'
      },
      body: JSON.stringify({
        model: aiModel.value,
        messages: [{ role: 'user', content: `Please generate an image based on this description: ${aiPrompt.value}` }],
        modalities: ["image"]
      })
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error?.message || 'Failed to fetch response')
    }
    
    const data = await response.json()
    const message = data.choices[0].message
    let imageUrl = ''

    if (Array.isArray(message.content)) {
      const imgObj = message.content.find((c: any) => c.type === 'image_url')
      if (imgObj) imageUrl = imgObj.image_url.url
    } else if (typeof message.content === 'string') {
      const urlRegex = /https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp)(?:\?\S+)?/gi
      const matches = message.content.match(urlRegex)
      if (matches) imageUrl = matches[0]
    }

    if (!imageUrl && message.images && message.images.length > 0) {
      const firstImg = message.images[0]
      if (typeof firstImg === 'string') {
        imageUrl = firstImg
      } else if (firstImg.image_url && firstImg.image_url.url) {
        imageUrl = firstImg.image_url.url
      }
    }

    if (imageUrl) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = imageUrl
      img.onload = () => {
        const id = Math.random().toString(36).substr(2, 9)
        const pos = { x: Math.random() * (canvas.value?.width || 800) * 0.5, y: Math.random() * (canvas.value?.height || 600) * 0.5 }
        
        const newImgObj: any = {
          type: 'image',
          id,
          pos,
          img,
          width: 300,
          height: (300 / img.width) * img.height,
          prompt: aiPrompt.value
        }

        // If something was selected, link it
        if (selectedObjectId.value) {
          const sourceObj = objects.value.find(o => (o as any).id === selectedObjectId.value) as any
          if (sourceObj && sourceObj.pos) {
            newImgObj.sourceId = selectedObjectId.value
            objects.value.push({
              type: 'link',
              fromId: selectedObjectId.value,
              toId: id,
              start: { x: sourceObj.pos.x + sourceObj.width/2, y: sourceObj.pos.y + sourceObj.height/2 },
              end: { x: pos.x + 150, y: pos.y + (150 / img.width) * img.height / 2 }
            })
          }
        }

        objects.value.push(newImgObj)
        commitToHistory()
        render()
      }
    } else {
      throw new Error('No image URL found in response')
    }
  } catch (error: any) {
    console.error('Failed to generate image:', error)
    alert('AI generation failed: ' + error.message)
  } finally {
    isGenerating.value = false
  }
}

const render = () => {
  if (!ctx.value || !canvas.value) return
  ctx.value.clearRect(0, 0, canvas.value.width, canvas.value.height)
  
  // First draw links (so they go under images)
  objects.value.forEach(obj => {
    if (obj.type === 'link') drawLink(ctx.value!, obj)
  })

  // Then draw other objects
  objects.value.forEach(obj => {
    if (obj.type === 'path') drawPath(ctx.value!, obj)
    else if (obj.type === 'image') drawImage(ctx.value!, obj)
    else if (obj.type !== 'link') drawShape(ctx.value!, obj)
  })
}

const drawLink = (ctx: CanvasRenderingContext2D, obj: any) => {
  // Find objects by ID to update positions if they moved
  const fromObj = objects.value.find(o => (o as any).id === obj.fromId) as any
  const toObj = objects.value.find(o => (o as any).id === obj.toId) as any
  
  if (fromObj && toObj) {
    const start = { x: fromObj.pos.x + fromObj.width/2, y: fromObj.pos.y + fromObj.height/2 }
    const end = { x: toObj.pos.x + toObj.width/2, y: toObj.pos.y + toObj.height/2 }
    
    ctx.beginPath()
    ctx.setLineDash([5, 5])
    ctx.strokeStyle = '#94a3b8'
    ctx.lineWidth = 2
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.stroke()
    ctx.setLineDash([])
  }
}

const drawImage = (ctx: CanvasRenderingContext2D, obj: any) => {
  const { pos, img, width, height, id } = obj
  
  // Draw sketchy frame
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 1
  drawRoughLine(ctx, pos.x - 2, pos.y - 2, pos.x + width + 2, pos.y - 2)
  drawRoughLine(ctx, pos.x + width + 2, pos.y - 2, pos.x + width + 2, pos.y + height + 2)
  drawRoughLine(ctx, pos.x + width + 2, pos.y + height + 2, pos.x - 2, pos.y + height + 2)
  drawRoughLine(ctx, pos.x - 2, pos.y + height + 2, pos.x - 2, pos.y - 2)
  
  ctx.drawImage(img, pos.x, pos.y, width, height)
  
  if (selectedObjectId.value === id) {
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.strokeRect(pos.x - 4, pos.y - 4, width + 8, height + 8)
  }
}

const drawPath = (ctx: CanvasRenderingContext2D, obj: any) => {
  if (obj.points.length < 2) return
  ctx.beginPath()
  ctx.strokeStyle = obj.color
  ctx.lineWidth = obj.size
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.moveTo(obj.points[0].x, obj.points[0].y)
  for (let i = 1; i < obj.points.length; i++) {
    ctx.lineTo(obj.points[i].x, obj.points[i].y)
  }
  ctx.stroke()
}

const drawShape = (ctx: CanvasRenderingContext2D, obj: any) => {
  ctx.strokeStyle = obj.color
  ctx.lineWidth = obj.size
  const x = obj.start.x
  const y = obj.start.y
  const w = obj.end.x - x
  const h = obj.end.y - y
  
  if (obj.type === 'rect') {
    drawRoughLine(ctx, x, y, x + w, y)
    drawRoughLine(ctx, x + w, y, x + w, y + h)
    drawRoughLine(ctx, x + w, y + h, x, y + h)
    drawRoughLine(ctx, x, y + h, x, y)
  } else if (obj.type === 'circle') {
    drawHandDrawnCircle(ctx, x + w/2, y + h/2, Math.abs(w/2), Math.abs(h/2))
  } else if (obj.type === 'diamond') {
    const cx = x + w/2, cy = y + h/2
    drawRoughLine(ctx, cx, y, x + w, cy)
    drawRoughLine(ctx, x + w, cy, cx, y + h)
    drawRoughLine(ctx, cx, y + h, x, cy)
    drawRoughLine(ctx, x, cy, cx, y)
  }
}

// Sketchy drawing helpers
const drawRoughLine = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
  const offset = () => (Math.random() - 0.5) * 2
  ctx.beginPath()
  ctx.moveTo(x1 + offset(), y1 + offset())
  ctx.lineTo(x2 + offset(), y2 + offset())
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x1 + offset(), y1 + offset())
  ctx.lineTo(x2 + offset(), y2 + offset())
  ctx.stroke()
}

const drawHandDrawnCircle = (ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number) => {
  const steps = 32
  const drawIteration = (offset: number) => {
    ctx.beginPath()
    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * Math.PI * 2
      const x = cx + rx * Math.cos(theta) + (Math.random() - 0.5) * offset
      const y = cy + ry * Math.sin(theta) + (Math.random() - 0.5) * offset
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  drawIteration(1.5)
  drawIteration(1.2)
}

// History management
const commitToHistory = () => {
  const nextHistory = history.value.slice(0, historyIndex.value + 1)
  nextHistory.push([...objects.value])
  history.value = nextHistory
  historyIndex.value = history.value.length - 1
}

const undo = () => {
  if (canUndo.value) {
    historyIndex.value--
    objects.value = [...history.value[historyIndex.value]]
    render()
  }
}

const redo = () => {
  if (canRedo.value) {
    historyIndex.value++
    objects.value = [...history.value[historyIndex.value]]
    render()
  }
}

const clear = () => {
  if (confirm('Clear everything?')) {
    objects.value = []
    commitToHistory()
    render()
  }
}

const save = () => {
  if (!canvas.value) return
  // Create a white background canvas for saving
  const saveCanvas = document.createElement('canvas')
  saveCanvas.width = canvas.value.width
  saveCanvas.height = canvas.value.height
  const saveCtx = saveCanvas.getContext('2d')
  if (!saveCtx) return
  
  saveCtx.fillStyle = '#ffffff'
  saveCtx.fillRect(0, 0, saveCanvas.width, saveCanvas.height)
  saveCtx.drawImage(canvas.value, 0, 0)
  
  const link = document.createElement('a')
  link.download = 'sketch.png'
  link.href = saveCanvas.toDataURL('image/png')
  link.click()
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Indie+Flower&display=swap');

.font-hand {
  font-family: 'Patrick Hand', cursive;
}

h1, h3 {
  font-family: 'Indie Flower', cursive;
}
</style>
