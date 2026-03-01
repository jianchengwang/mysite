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
        <button @click="save" class="sketch-button py-1 px-3 text-sm bg-zinc-900 text-white">Save</button>
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
        
        <div class="mt-auto sketch-card p-4 text-xs italic text-zinc-500">
          Tip: Drag to draw. <br>
          Use shapes for clean sketches.
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

const canvas = ref<HTMLCanvasElement | null>(null)
const canvasWrapper = ref<HTMLElement | null>(null)
const ctx = ref<CanvasRenderingContext2D | null>(null)

const currentTool = ref<'pencil' | 'rect' | 'circle' | 'diamond' | 'eraser'>('pencil')
const currentColor = ref('#000000')
const currentSize = ref(3)

const tools = [
  { id: 'pencil', name: 'Pencil', icon: '✎' },
  { id: 'rect', name: 'Rectangle', icon: '▭' },
  { id: 'circle', name: 'Circle', icon: '◯' },
  { id: 'diamond', name: 'Diamond', icon: '♢' },
  { id: 'eraser', name: 'Eraser', icon: '⌫' },
]

const colors = ['#000000', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b']

// History state
const objects = ref<WbObject[]>([])
const history = ref<WbObject[][]>([[]])
const historyIndex = ref(0)

const canUndo = computed(() => historyIndex.value > 0)
const canRedo = computed(() => historyIndex.value < history.value.length - 1)

// Drawing state
const isDrawing = ref(false)
const currentPoints = ref<Point[]>([])
const startPoint = ref<Point | null>(null)

onMounted(() => {
  if (canvas.value && canvasWrapper.value) {
    const rect = canvasWrapper.value.getBoundingClientRect()
    canvas.value.width = rect.width
    canvas.value.height = rect.height
    ctx.value = canvas.value.getContext('2d')
    
    window.addEventListener('resize', handleResize)
    render()
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

const handleResize = () => {
  if (canvas.value && canvasWrapper.value) {
    // Save current content
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = canvas.value.width
    tempCanvas.height = canvas.value.height
    tempCanvas.getContext('2d')?.drawImage(canvas.value, 0, 0)
    
    const rect = canvasWrapper.value.getBoundingClientRect()
    canvas.value.width = rect.width
    canvas.value.height = rect.height
    
    // Restore or re-render
    render()
  }
}

const getMousePos = (e: MouseEvent | Touch): Point => {
  if (!canvas.value) return { x: 0, y: 0 }
  const rect = canvas.value.getBoundingClientRect()
  return {
    x: (e.clientX - rect.left),
    y: (e.clientY - rect.top)
  }
}

const handleMouseDown = (e: MouseEvent) => {
  isDrawing.value = true
  const pos = getMousePos(e)
  startPoint.value = pos
  if (currentTool.value === 'pencil' || currentTool.value === 'eraser') {
    currentPoints.value = [pos]
  }
}

const handleMouseMove = (e: MouseEvent) => {
  if (!isDrawing.value || !ctx.value) return
  const pos = getMousePos(e)
  
  if (currentTool.value === 'pencil' || currentTool.value === 'eraser') {
    currentPoints.value.push(pos)
    render()
    // Preview current path
    drawPath(ctx.value, { 
      type: 'path', 
      points: currentPoints.value, 
      color: currentTool.value === 'eraser' ? '#ffffff' : currentColor.value, 
      size: currentTool.value === 'eraser' ? currentSize.value * 5 : currentSize.value 
    })
  } else {
    render()
    // Preview current shape
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
  } else if (startPoint.value) {
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

const render = () => {
  if (!ctx.value || !canvas.value) return
  ctx.value.clearRect(0, 0, canvas.value.width, canvas.value.height)
  
  objects.value.forEach(obj => {
    if (obj.type === 'path') drawPath(ctx.value!, obj)
    else drawShape(ctx.value!, obj)
  })
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
