<template>
  <div :class="['flex flex-col font-hand', isModal ? 'h-full' : 'h-screen max-w-7xl mx-auto px-4 py-8']">
    <!-- Header (Only show if not in modal or explicitly requested) -->
    <div v-if="!isModal" class="mb-6 flex justify-between items-center">
      <div>
        <h1 class="text-4xl font-bold text-zinc-900 font-hand">Whiteboard</h1>
        <p class="text-zinc-600 font-hand italic">Draw your sketchy ideas here</p>
      </div>
      
      <div class="flex gap-2">
        <button @click="undo" :disabled="!canUndo" class="sketch-button py-1 px-3 text-sm disabled:opacity-30">Undo</button>
        <button @click="redo" :disabled="!canRedo" class="sketch-button py-1 px-3 text-sm disabled:opacity-30">Redo</button>
        <button @click="clear" class="sketch-button py-1 px-3 text-sm border-red-200 text-red-600">Clear</button>
        <button @click="saveFullCanvas" class="sketch-button py-1 px-3 text-sm !bg-zinc-900 !text-white">Save</button>
      </div>
    </div>

    <!-- Modal Header -->
    <div v-else class="mb-4 flex justify-between items-center px-2">
      <h2 class="text-xl font-bold">Whiteboard Canvas</h2>
      <div class="flex gap-2">
        <button @click="undo" :disabled="!canUndo" class="sketch-button py-1 px-2 text-xs disabled:opacity-30">Undo</button>
        <button @click="clear" class="sketch-button py-1 px-2 text-xs border-red-200 text-red-600">Clear</button>
        <button @click="confirmModalSave" class="sketch-button py-1 px-3 text-xs !bg-zinc-900 !text-white">Done</button>
      </div>
    </div>

    <!-- Toolbar & Canvas Area -->
    <div class="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
      <!-- Sidebar Toolbar -->
      <div class="w-full md:w-48 flex flex-col gap-4">
        <div class="sketch-card p-4 space-y-4">
          <h3 class="font-bold border-b border-zinc-200 pb-2 mb-2">Tools</h3>
          <div class="grid grid-cols-2 gap-2">
            <button 
              v-for="tool in tools" 
              :key="tool.id"
              @click="currentTool = tool.id as any"
              :class="['p-2 sketch-border text-center transition-all', currentTool === tool.id ? 'bg-zinc-200 shadow-sm translate-x-0.5 translate-y-0.5' : 'bg-white hover:bg-zinc-50']"
              :title="tool.name"
            >
              <span class="text-xl">{{ tool.icon }}</span>
            </button>
          </div>
          
          <div class="pt-4" v-if="currentTool !== 'eraser' && currentTool !== 'select'">
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
          <h3 class="font-bold border-b border-zinc-200 pb-2 mb-2">AI Generation</h3>
          <div class="space-y-2">
            <button 
              @click="showGenerateModal = true" 
              :disabled="isGenerating || !apiKey"
              class="w-full sketch-button py-2 text-sm !bg-zinc-900 !text-white disabled:opacity-50"
            >
              {{ isGenerating ? '✨ Working...' : '✨ AI Generate' }}
            </button>
            <p v-if="selectedObjectIds.length > 1" class="text-[10px] text-zinc-500 italic">
              {{ selectedObjectIds.length }} images selected for merging
            </p>
          </div>
        </div>

        <div class="mt-auto sketch-card p-4 text-xs italic text-zinc-500 hidden md:block">
          Tip: Ctrl+Click to multi-select. <br>
          Right-click image to save. <br>
          Mouse wheel to zoom image.
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
          @contextmenu.prevent="handleContextMenu"
          class="w-full h-full cursor-crosshair bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]"
        ></canvas>
      </div>
    </div>

    <!-- Generate Modal -->
    <Teleport to="body">
      <div v-if="showGenerateModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm font-hand">
        <div class="sketch-card bg-white w-full max-w-md p-6 space-y-4">
          <div class="flex justify-between items-center mb-2">
            <h2 class="text-2xl font-bold">AI Image Generation</h2>
            <button @click="showGenerateModal = false" class="text-2xl hover:text-zinc-500">×</button>
          </div>
          
          <div class="space-y-2">
            <label class="block font-bold text-sm">AI Model</label>
            <select v-model="aiModel" class="w-full p-2 sketch-border bg-white text-sm">
              <option v-for="m in aiModels" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </div>
          
          <div class="space-y-2">
            <label class="block font-bold text-sm">Prompt</label>
            <textarea 
              v-model="aiPrompt" 
              placeholder="Describe what you want to see..." 
              class="w-full p-3 sketch-border bg-white h-32 resize-none font-hand text-sm"
            ></textarea>
            <p v-if="selectedObjectIds.length > 1" class="text-[10px] text-blue-600">
              Selected {{ selectedObjectIds.length }} images will be used as reference.
            </p>
          </div>
          
          <div class="flex gap-4 pt-2">
            <button @click="showGenerateModal = false" class="flex-1 sketch-button py-2 bg-white text-zinc-900">Cancel</button>
            <button @click="generateAIImage" :disabled="isGenerating || !aiPrompt" class="flex-1 sketch-button py-2 !bg-zinc-900 !text-white disabled:opacity-50">
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

const props = defineProps({
  isModal: { type: Boolean, default: false }
})

const emit = defineEmits(['save', 'close'])

// Types
type Point = { x: number; y: number }
type WbObject = 
  | { type: 'path'; points: Point[]; color: string; size: number; isEraser?: boolean }
  | { type: 'rect' | 'circle' | 'diamond'; start: Point; end: Point; color: string; size: number }
  | { type: 'image'; pos: Point; img: HTMLImageElement; width: number; height: number; id: string; prompt?: string; sourceIds?: string[] }
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
      aiModels.value = data.data
        .filter((m: any) => {
          const architecture = m.architecture || {}
          const output_modalities = architecture.output_modalities || []
          return output_modalities.includes('image') || 
                 m.id.includes('flux') || 
                 m.id.includes('dall-e') || 
                 m.id.includes('stable-diffusion')
        })
        .map((m: any) => ({ id: m.id, name: m.name }))
      
      if (aiModels.value.length > 0 && !aiModels.value.find(m => m.id === aiModel.value)) {
        aiModel.value = aiModels.value[0].id
      }
    }
  } catch (error) {
    aiModels.value = [
      { id: 'black-forest-labs/flux-schnell', name: 'Flux Schnell' },
      { id: 'openai/dall-e-3', name: 'DALL-E 3' }
    ]
  }
}

// Selection state
const selectedObjectIds = ref<string[]>([])

watch(selectedObjectIds, (newIds) => {
  if (newIds.length === 1) {
    const obj = objects.value.find(o => (o as any).id === newIds[0]) as any
    if (obj && obj.prompt) {
      aiPrompt.value = obj.prompt
    }
  }
}, { deep: true })

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
    const rect = canvasWrapper.value.getBoundingClientRect()
    canvas.value.width = rect.width
    canvas.value.height = rect.height
    render()
  }
}

const handleWheel = (e: WheelEvent) => {
  if (selectedObjectIds.value.length === 1) {
    const obj = objects.value.find(o => (o as any).id === selectedObjectIds.value[0]) as any
    if (obj && obj.type === 'image') {
      e.preventDefault()
      const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05
      const oldWidth = obj.width
      const oldHeight = obj.height
      obj.width *= zoomFactor
      obj.height *= zoomFactor
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
    const clickedImage = [...objects.value].reverse().find(obj => 
      obj.type === 'image' && 
      pos.x >= obj.pos.x && pos.x <= obj.pos.x + obj.width &&
      pos.y >= obj.pos.y && pos.y <= obj.pos.y + obj.height
    ) as any
    
    if (clickedImage) {
      if (e.ctrlKey || e.metaKey) {
        if (selectedObjectIds.value.includes(clickedImage.id)) {
          selectedObjectIds.value = selectedObjectIds.value.filter(id => id !== clickedImage.id)
        } else {
          selectedObjectIds.value.push(clickedImage.id)
        }
      } else {
        selectedObjectIds.value = [clickedImage.id]
      }
      isDragging.value = true
      dragOffset.value = { x: pos.x - clickedImage.pos.x, y: pos.y - clickedImage.pos.y }
    } else {
      if (!e.ctrlKey && !e.metaKey) {
        selectedObjectIds.value = []
      }
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

  if (isDragging.value && selectedObjectIds.value.length > 0) {
    // For now, only drag the last selected one or all? 
    // Let's just drag the one we initially clicked on
    const primaryId = selectedObjectIds.value[selectedObjectIds.value.length - 1]
    const obj = objects.value.find(o => (o as any).id === primaryId) as any
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
      size: currentTool.value === 'eraser' ? currentSize.value * 5 : currentSize.value,
      isEraser: currentTool.value === 'eraser'
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
        color: currentColor.value,
        size: currentTool.value === 'eraser' ? currentSize.value * 5 : currentSize.value,
        isEraser: currentTool.value === 'eraser'
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

const handleContextMenu = (e: MouseEvent) => {
  const pos = getMousePos(e)
  const clickedImage = [...objects.value].reverse().find(obj => 
    obj.type === 'image' && 
    pos.x >= obj.pos.x && pos.x <= obj.pos.x + obj.width &&
    pos.y >= obj.pos.y && pos.y <= obj.pos.y + obj.height
  ) as any

  if (clickedImage) {
    const link = document.createElement('a')
    link.download = `image-${clickedImage.id}.png`
    link.href = clickedImage.img.src
    link.click()
  }
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
    let requestContent: any = `Please generate an image based on this description: ${aiPrompt.value}`
    
    if (selectedObjectIds.value.length > 0) {
      const selectedImgs = objects.value.filter(o => o.type === 'image' && selectedObjectIds.value.includes(o.id)) as any[]
      if (selectedImgs.length > 0) {
        const content: any[] = [{ type: 'text', text: requestContent }]
        selectedImgs.forEach(imgObj => {
          if (imgObj.img?.src) {
            content.push({ type: 'image_url', image_url: { url: imgObj.img.src } })
          }
        })
        requestContent = content
      }
    }

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
        messages: [{ role: 'user', content: requestContent }],
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
      imageUrl = typeof firstImg === 'string' ? firstImg : (firstImg.image_url?.url || '')
    }

    if (imageUrl) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = imageUrl
      img.onload = () => {
        const id = Math.random().toString(36).substr(2, 9)
        const pos = { x: 50, y: 50 }
        
        const newImgObj: any = {
          type: 'image',
          id,
          pos,
          img,
          width: 300,
          height: (300 / img.width) * img.height,
          prompt: aiPrompt.value,
          sourceIds: [...selectedObjectIds.value]
        }

        // Add links for all source images
        selectedObjectIds.value.forEach(sourceId => {
          const sourceObj = objects.value.find(o => (o as any).id === sourceId) as any
          if (sourceObj && sourceObj.pos) {
            objects.value.push({
              type: 'link',
              fromId: sourceId,
              toId: id,
              start: { x: sourceObj.pos.x + sourceObj.width/2, y: sourceObj.pos.y + sourceObj.height/2 },
              end: { x: pos.x + 150, y: pos.y + newImgObj.height / 2 }
            })
          }
        })

        objects.value.push(newImgObj)
        selectedObjectIds.value = [id]
        commitToHistory()
        render()
      }
    } else {
      throw new Error('No image URL found in response')
    }
  } catch (error: any) {
    alert('AI generation failed: ' + error.message)
  } finally {
    isGenerating.value = false
  }
}

const render = () => {
  if (!ctx.value || !canvas.value) return
  ctx.value.clearRect(0, 0, canvas.value.width, canvas.value.height)
  
  // 1. Draw links (bottom layer)
  objects.value.forEach(obj => {
    if (obj.type === 'link') drawLink(ctx.value!, obj)
  })

  // 2. Draw paths and shapes (brush layer)
  // We use a separate pass so erasers only affect this layer if we wanted to be strict,
  // but for now, drawing images AFTER paths ensures they aren't erased.
  objects.value.forEach(obj => {
    if (obj.type === 'path') drawPath(ctx.value!, obj)
    else if (obj.type === 'rect' || obj.type === 'circle' || obj.type === 'diamond') drawShape(ctx.value!, obj)
  })

  // 3. Draw images (top layer)
  objects.value.forEach(obj => {
    if (obj.type === 'image') drawImage(ctx.value!, obj)
  })
}

const drawLink = (ctx: CanvasRenderingContext2D, obj: any) => {
  const fromObj = objects.value.find(o => (o as any).id === obj.fromId) as any
  const toObj = objects.value.find(o => (o as any).id === obj.toId) as any
  
  if (fromObj && toObj) {
    const start = { x: fromObj.pos.x + fromObj.width/2, y: fromObj.pos.y + fromObj.height/2 }
    const end = { x: toObj.pos.x + toObj.width/2, y: toObj.pos.y + toObj.height/2 }
    
    ctx.save()
    ctx.beginPath()
    ctx.setLineDash([5, 5])
    ctx.strokeStyle = '#94a3b8'
    ctx.lineWidth = 2
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.stroke()
    ctx.restore()
  }
}

const drawImage = (ctx: CanvasRenderingContext2D, obj: any) => {
  const { pos, img, width, height, id } = obj
  
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 1
  drawRoughLine(ctx, pos.x - 2, pos.y - 2, pos.x + width + 2, pos.y - 2)
  drawRoughLine(ctx, pos.x + width + 2, pos.y - 2, pos.x + width + 2, pos.y + height + 2)
  drawRoughLine(ctx, pos.x + width + 2, pos.y + height + 2, pos.x - 2, pos.y + height + 2)
  drawRoughLine(ctx, pos.x - 2, pos.y + height + 2, pos.x - 2, pos.y - 2)
  
  ctx.drawImage(img, pos.x, pos.y, width, height)
  
  if (selectedObjectIds.value.includes(id)) {
    ctx.save()
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.strokeRect(pos.x - 4, pos.y - 4, width + 8, height + 8)
    ctx.restore()
  }
}

const drawPath = (ctx: CanvasRenderingContext2D, obj: any) => {
  if (obj.points.length < 2) return
  ctx.save()
  if (obj.isEraser) {
    ctx.globalCompositeOperation = 'destination-out'
  }
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
  ctx.restore()
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

const commitToHistory = () => {
  const nextHistory = history.value.slice(0, historyIndex.value + 1)
  nextHistory.push([...objects.value.map(o => ({...o}))])
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

const saveFullCanvas = () => {
  if (!canvas.value) return
  const saveCanvas = document.createElement('canvas')
  saveCanvas.width = canvas.value.width
  saveCanvas.height = canvas.value.height
  const saveCtx = saveCanvas.getContext('2d')
  if (!saveCtx) return
  
  saveCtx.fillStyle = '#ffffff'
  saveCtx.fillRect(0, 0, saveCanvas.width, saveCanvas.height)
  saveCtx.drawImage(canvas.value, 0, 0)
  
  const dataUrl = saveCanvas.toDataURL('image/png')
  if (props.isModal) {
    emit('save', dataUrl)
  } else {
    const link = document.createElement('a')
    link.download = 'whiteboard-sketch.png'
    link.href = dataUrl
    link.click()
  }
}

const confirmModalSave = () => {
  saveFullCanvas()
}
</script>

<style scoped>
.font-hand { font-family: 'Patrick Hand', cursive; }
h1, h2, h3 { font-family: 'Indie Flower', cursive; }
</style>
