<template>
  <div :class="['flex flex-col font-hand', isModal ? 'h-full' : 'h-screen max-w-7xl mx-auto px-4 py-8']">
    <div v-if="!isModal" class="mb-6 flex justify-between items-center">
      <div>
        <h1 class="text-4xl font-bold text-zinc-900 font-hand">Whiteboard</h1>
        <p class="text-zinc-600 font-hand italic">Draw your sketchy ideas here</p>
      </div>

      <div class="flex gap-2">
        <button @click="undo" :disabled="!canUndo" class="sketch-button py-1 px-3 text-sm disabled:opacity-30">Undo</button>
        <button @click="redo" :disabled="!canRedo" class="sketch-button py-1 px-3 text-sm disabled:opacity-30">Redo</button>
        <button @click="clear" class="sketch-button py-1 px-3 text-sm border-red-200 text-red-600">Clear</button>
        <button
          @click="saveCroppedArea"
          :disabled="!hasCropSelection"
          class="sketch-button py-1 px-3 text-sm disabled:opacity-30"
        >
          Crop Area & Save
        </button>
        <button @click="saveFullCanvas" class="sketch-button py-1 px-3 text-sm !bg-zinc-900 !text-white">Save</button>
      </div>
    </div>

    <div v-else class="mb-4 flex justify-between items-center px-2">
      <h2 class="text-xl font-bold">Whiteboard Canvas</h2>
      <div class="flex gap-2">
        <button @click="undo" :disabled="!canUndo" class="sketch-button py-1 px-2 text-xs disabled:opacity-30">Undo</button>
        <button @click="clear" class="sketch-button py-1 px-2 text-xs border-red-200 text-red-600">Clear</button>
        <button
          @click="confirmModalSave"
          :disabled="currentTool === 'crop' && !hasCropSelection"
          class="sketch-button py-1 px-3 text-xs !bg-zinc-900 !text-white disabled:opacity-30"
        >
          {{ currentTool === 'crop' ? 'Crop Area & Save' : 'Done' }}
        </button>
      </div>
    </div>

    <div class="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
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

          <div class="pt-4" v-if="!['eraser', 'select', 'image', 'crop'].includes(currentTool)">
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

          <p v-if="currentTool === 'crop'" class="text-xs text-zinc-500 italic">
            Drag on the canvas to define the crop area, then save only that selection.
          </p>
          <p v-else-if="currentTool === 'arrow'" class="text-xs text-zinc-500 italic">
            Drag from one shape or image to another to connect them with arrows.
          </p>
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
              {{ selectedObjectIds.length }} elements selected
            </p>
          </div>
        </div>

        <div class="mt-auto sketch-card p-4 text-xs italic text-zinc-500 hidden md:block">
          Tip: Ctrl+Click to multi-select. <br>
          Use Arrow mode to connect elements. <br>
          Mouse wheel zooms selected images.
        </div>
      </div>

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
              Selected images will be used as references when possible.
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
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  isModal: { type: Boolean, default: false }
})

const emit = defineEmits(['save', 'close'])

type Point = { x: number; y: number }
type CropRect = { x: number; y: number; width: number; height: number }
type AlignmentGuide = { orientation: 'vertical' | 'horizontal'; position: number }

type PathObject = {
  type: 'path'
  id: string
  points: Point[]
  color: string
  size: number
  isEraser?: boolean
}

type ShapeObject = {
  type: 'rect' | 'circle' | 'diamond'
  id: string
  start: Point
  end: Point
  color: string
  size: number
}

type ImageObject = {
  type: 'image'
  id: string
  pos: Point
  img: HTMLImageElement
  width: number
  height: number
  prompt?: string
  sourceIds?: string[]
}

type LinkObject = {
  type: 'link'
  id: string
  fromId: string
  toId: string
  color: string
}

type WbObject = PathObject | ShapeObject | ImageObject | LinkObject
type ConnectableObject = ShapeObject | ImageObject
type ToolId = 'pencil' | 'rect' | 'circle' | 'diamond' | 'arrow' | 'eraser' | 'image' | 'select' | 'crop'

const GUIDE_THRESHOLD = 10
const MIN_IMAGE_DIMENSION = 24
const MAX_IMAGE_DIMENSION = 4096

const canvas = ref<HTMLCanvasElement | null>(null)
const canvasWrapper = ref<HTMLElement | null>(null)
const ctx = ref<CanvasRenderingContext2D | null>(null)

const currentTool = ref<ToolId>('pencil')
const currentColor = ref('#000000')
const currentSize = ref(3)

const tools = [
  { id: 'pencil', name: 'Pencil', icon: '✎' },
  { id: 'rect', name: 'Rectangle', icon: '▭' },
  { id: 'circle', name: 'Circle', icon: '◯' },
  { id: 'diamond', name: 'Diamond', icon: '♢' },
  { id: 'arrow', name: 'Arrow', icon: '➜' },
  { id: 'image', name: 'Add Image', icon: '🖼' },
  { id: 'eraser', name: 'Eraser', icon: '⌫' },
  { id: 'select', name: 'Select', icon: '🖱' },
  { id: 'crop', name: 'Crop Area', icon: '▣' },
]

const colors = ['#000000', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b']

const apiKey = ref('')
const aiModel = ref('black-forest-labs/flux-schnell')
const aiPrompt = ref('')
const isGenerating = ref(false)
const showGenerateModal = ref(false)
const aiModels = ref<any[]>([])
let wheelHistoryCommitTimer: ReturnType<typeof setTimeout> | null = null
let wheelHistoryDirty = false

const selectedObjectIds = ref<string[]>([])
const objects = ref<WbObject[]>([])
const history = ref<WbObject[][]>([[]])
const historySignatures = ref<string[]>(['[]'])
const historyIndex = ref(0)

const canUndo = computed(() => historyIndex.value > 0)
const canRedo = computed(() => historyIndex.value < history.value.length - 1)

const isDrawing = ref(false)
const isDragging = ref(false)
const currentPoints = ref<Point[]>([])
const startPoint = ref<Point | null>(null)
const cropSelection = ref<CropRect | null>(null)
const activeLink = ref<{ fromId: string; current: Point } | null>(null)
const alignmentGuides = ref<AlignmentGuide[]>([])
const dragStartPoint = ref<Point | null>(null)
const dragPrimaryId = ref<string | null>(null)
const dragObjectIds = ref<string[]>([])
const dragOrigins = ref<Record<string, ShapeObject | ImageObject>>({})

const hasCropSelection = computed(() =>
  Boolean(cropSelection.value && cropSelection.value.width > 0 && cropSelection.value.height > 0)
)

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

const clonePoint = (point: Point): Point => ({ x: point.x, y: point.y })

const cloneObject = (obj: WbObject): WbObject => {
  if (obj.type === 'path') {
    return {
      ...obj,
      points: obj.points.map(clonePoint)
    }
  }
  if (obj.type === 'image') {
    return {
      ...obj,
      pos: clonePoint(obj.pos),
      sourceIds: obj.sourceIds ? [...obj.sourceIds] : undefined
    }
  }
  if (obj.type === 'link') {
    return { ...obj }
  }
  return {
    ...obj,
    start: clonePoint(obj.start),
    end: clonePoint(obj.end)
  }
}

const cloneObjects = (source: WbObject[]) => source.map(cloneObject)

const roundHistoryNumber = (value: number) => Math.round(value * 100) / 100

const buildHistorySignature = (source: WbObject[]) => JSON.stringify(source.map((obj) => {
  if (obj.type === 'path') {
    return {
      type: obj.type,
      id: obj.id,
      color: obj.color,
      size: obj.size,
      isEraser: obj.isEraser,
      points: obj.points.map(point => ({
        x: roundHistoryNumber(point.x),
        y: roundHistoryNumber(point.y)
      }))
    }
  }

  if (obj.type === 'image') {
    return {
      type: obj.type,
      id: obj.id,
      x: roundHistoryNumber(obj.pos.x),
      y: roundHistoryNumber(obj.pos.y),
      width: roundHistoryNumber(obj.width),
      height: roundHistoryNumber(obj.height),
      prompt: obj.prompt || '',
      sourceIds: obj.sourceIds || [],
      src: obj.img?.src || ''
    }
  }

  if (obj.type === 'link') {
    return {
      type: obj.type,
      id: obj.id,
      fromId: obj.fromId,
      toId: obj.toId,
      color: obj.color
    }
  }

  return {
    type: obj.type,
    id: obj.id,
    color: obj.color,
    size: obj.size,
    start: {
      x: roundHistoryNumber(obj.start.x),
      y: roundHistoryNumber(obj.start.y)
    },
    end: {
      x: roundHistoryNumber(obj.end.x),
      y: roundHistoryNumber(obj.end.y)
    }
  }
}))

const isConnectableObject = (obj: WbObject): obj is ConnectableObject =>
  obj.type === 'image' || obj.type === 'rect' || obj.type === 'circle' || obj.type === 'diamond'

const getObjectById = (id: string) => objects.value.find(obj => obj.id === id)

const fetchModels = async () => {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models')
    const data = await response.json()
    if (data.data) {
      aiModels.value = data.data
        .filter((m: any) => {
          const architecture = m.architecture || {}
          const outputModalities = architecture.output_modalities || []
          return outputModalities.includes('image') ||
            m.id.includes('flux') ||
            m.id.includes('dall-e') ||
            m.id.includes('stable-diffusion') ||
            m.id.includes('imagen')
        })
        .map((m: any) => ({ id: m.id, name: m.name }))

      if (aiModels.value.length > 0 && !aiModels.value.find((m: any) => m.id === aiModel.value)) {
        aiModel.value = aiModels.value[0].id
      }
    }
  } catch {
    aiModels.value = [
      { id: 'black-forest-labs/flux-schnell', name: 'Flux Schnell' },
      { id: 'openai/dall-e-3', name: 'DALL-E 3' }
    ]
  }
}

watch(selectedObjectIds, (newIds) => {
  if (newIds.length !== 1) return
  const obj = objects.value.find(o => o.id === newIds[0])
  if (obj?.type === 'image' && obj.prompt) {
    aiPrompt.value = obj.prompt
  }
}, { deep: true })

const syncApiKey = () => {
  apiKey.value = localStorage.getItem('global_openrouter_key') || ''
}

onMounted(() => {
  if (!canvas.value || !canvasWrapper.value) return

  const rect = canvasWrapper.value.getBoundingClientRect()
  canvas.value.width = rect.width
  canvas.value.height = rect.height
  ctx.value = canvas.value.getContext('2d')

  syncApiKey()
  window.addEventListener('storage', syncApiKey)
  window.addEventListener('resize', handleResize)
  canvas.value.addEventListener('wheel', handleWheel, { passive: false })

  fetchModels()
  render()
})

onUnmounted(() => {
  flushPendingWheelHistoryCommit()
  window.removeEventListener('storage', syncApiKey)
  window.removeEventListener('resize', handleResize)
  if (canvas.value) {
    canvas.value.removeEventListener('wheel', handleWheel)
  }
})

const handleResize = () => {
  if (!canvas.value || !canvasWrapper.value) return
  const rect = canvasWrapper.value.getBoundingClientRect()
  canvas.value.width = rect.width
  canvas.value.height = rect.height
  render()
}

const handleWheel = (e: WheelEvent) => {
  if (selectedObjectIds.value.length !== 1) return
  const obj = objects.value.find(o => o.id === selectedObjectIds.value[0])
  if (obj?.type !== 'image') return

  e.preventDefault()
  const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05
  const oldWidth = obj.width
  const oldHeight = obj.height
  const nextWidth = Math.min(MAX_IMAGE_DIMENSION, Math.max(MIN_IMAGE_DIMENSION, obj.width * zoomFactor))
  const nextHeight = Math.min(MAX_IMAGE_DIMENSION, Math.max(MIN_IMAGE_DIMENSION, obj.height * zoomFactor))

  if (Math.abs(nextWidth - oldWidth) < 0.01 && Math.abs(nextHeight - oldHeight) < 0.01) {
    return
  }

  obj.width = nextWidth
  obj.height = nextHeight
  obj.pos.x -= (obj.width - oldWidth) / 2
  obj.pos.y -= (obj.height - oldHeight) / 2
  wheelHistoryDirty = true
  scheduleWheelHistoryCommit()
  render()
}

const getMousePos = (e: MouseEvent | Touch): Point => {
  if (!canvas.value) return { x: 0, y: 0 }
  const rect = canvas.value.getBoundingClientRect()
  return {
    x: (e.clientX - rect.left) * (canvas.value.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.value.height / rect.height)
  }
}

const normalizeRect = (start: Point, end: Point): CropRect => ({
  x: Math.min(start.x, end.x),
  y: Math.min(start.y, end.y),
  width: Math.abs(end.x - start.x),
  height: Math.abs(end.y - start.y)
})

const getObjectBounds = (obj: ConnectableObject): CropRect => {
  if (obj.type === 'image') {
    return {
      x: obj.pos.x,
      y: obj.pos.y,
      width: obj.width,
      height: obj.height
    }
  }
  return normalizeRect(obj.start, obj.end)
}

const getObjectCenter = (obj: ConnectableObject) => {
  const bounds = getObjectBounds(obj)
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2
  }
}

const pointInRect = (point: Point, rect: CropRect) =>
  point.x >= rect.x &&
  point.x <= rect.x + rect.width &&
  point.y >= rect.y &&
  point.y <= rect.y + rect.height

const findSelectableObjectAt = (pos: Point) =>
  [...objects.value]
    .reverse()
    .find((obj): obj is ConnectableObject => isConnectableObject(obj) && pointInRect(pos, getObjectBounds(obj)))

const getGuideValues = (rect: CropRect) => ({
  x: [rect.x, rect.x + rect.width / 2, rect.x + rect.width],
  y: [rect.y, rect.y + rect.height / 2, rect.y + rect.height]
})

const computeAlignmentGuides = (targetRect: CropRect, excludeIds: string[] = []) => {
  let bestVertical: { position: number; distance: number } | null = null
  let bestHorizontal: { position: number; distance: number } | null = null

  const targetValues = getGuideValues(targetRect)

  objects.value.forEach((obj) => {
    if (!isConnectableObject(obj) || excludeIds.includes(obj.id)) return

    const guideValues = getGuideValues(getObjectBounds(obj))

    targetValues.x.forEach((targetX) => {
      guideValues.x.forEach((candidateX) => {
        const distance = Math.abs(targetX - candidateX)
        if (distance <= GUIDE_THRESHOLD && (!bestVertical || distance < bestVertical.distance)) {
          bestVertical = { position: candidateX, distance }
        }
      })
    })

    targetValues.y.forEach((targetY) => {
      guideValues.y.forEach((candidateY) => {
        const distance = Math.abs(targetY - candidateY)
        if (distance <= GUIDE_THRESHOLD && (!bestHorizontal || distance < bestHorizontal.distance)) {
          bestHorizontal = { position: candidateY, distance }
        }
      })
    })
  })

  return [
    ...(bestVertical ? [{ orientation: 'vertical' as const, position: bestVertical.position }] : []),
    ...(bestHorizontal ? [{ orientation: 'horizontal' as const, position: bestHorizontal.position }] : [])
  ]
}

const resetTransientState = () => {
  alignmentGuides.value = []
  activeLink.value = null
  dragStartPoint.value = null
  dragPrimaryId.value = null
  dragObjectIds.value = []
  dragOrigins.value = {}
}

const snapshotSelectionForDrag = (ids: string[]) => {
  dragObjectIds.value = [...ids]
  dragOrigins.value = ids.reduce<Record<string, ShapeObject | ImageObject>>((acc, id) => {
    const obj = getObjectById(id)
    if (obj && isConnectableObject(obj)) {
      acc[id] = cloneObject(obj) as ShapeObject | ImageObject
    }
    return acc
  }, {})
}

const moveObjectFromOrigin = (origin: ShapeObject | ImageObject, target: ShapeObject | ImageObject, delta: Point) => {
  if (target.type === 'image' && origin.type === 'image') {
    target.pos.x = origin.pos.x + delta.x
    target.pos.y = origin.pos.y + delta.y
    return
  }

  if (origin.type !== 'image' && target.type !== 'image') {
    target.start.x = origin.start.x + delta.x
    target.start.y = origin.start.y + delta.y
    target.end.x = origin.end.x + delta.x
    target.end.y = origin.end.y + delta.y
  }
}

const handleMouseDown = (e: MouseEvent) => {
  flushPendingWheelHistoryCommit()
  const pos = getMousePos(e)

  if (currentTool.value === 'select') {
    const clicked = findSelectableObjectAt(pos)
    if (!clicked) {
      if (!e.ctrlKey && !e.metaKey) {
        selectedObjectIds.value = []
      }
      alignmentGuides.value = []
      render()
      return
    }

    if (e.ctrlKey || e.metaKey) {
      if (selectedObjectIds.value.includes(clicked.id)) {
        selectedObjectIds.value = selectedObjectIds.value.filter(id => id !== clicked.id)
      } else {
        selectedObjectIds.value = [...selectedObjectIds.value, clicked.id]
      }
      render()
      return
    }

    if (!selectedObjectIds.value.includes(clicked.id)) {
      selectedObjectIds.value = [clicked.id]
    }

    isDragging.value = true
    dragStartPoint.value = pos
    dragPrimaryId.value = clicked.id
    snapshotSelectionForDrag(selectedObjectIds.value)
    alignmentGuides.value = computeAlignmentGuides(getObjectBounds(clicked), dragObjectIds.value)
    render()
    return
  }

  if (currentTool.value === 'arrow') {
    const clicked = findSelectableObjectAt(pos)
    selectedObjectIds.value = clicked ? [clicked.id] : []
    activeLink.value = clicked ? { fromId: clicked.id, current: pos } : null
    isDrawing.value = Boolean(clicked)
    render()
    return
  }

  if (currentTool.value === 'image') {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (loadEvent) => {
        const img = new Image()
        img.src = loadEvent.target?.result as string
        img.onload = () => {
          const id = createId()
          objects.value.push({
            type: 'image',
            id,
            pos: { x: pos.x - 100, y: pos.y - 100 },
            img,
            width: 200,
            height: (200 / img.width) * img.height
          })
          selectedObjectIds.value = [id]
          commitToHistory()
          render()
        }
      }
      reader.readAsDataURL(file)
    }
    input.click()
    currentTool.value = 'select'
    return
  }

  if (currentTool.value === 'crop') {
    isDrawing.value = true
    startPoint.value = pos
    cropSelection.value = { x: pos.x, y: pos.y, width: 0, height: 0 }
    render()
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

  if (isDragging.value && dragStartPoint.value) {
    const delta = {
      x: pos.x - dragStartPoint.value.x,
      y: pos.y - dragStartPoint.value.y
    }

    dragObjectIds.value.forEach((id) => {
      const obj = getObjectById(id)
      const origin = dragOrigins.value[id]
      if (!obj || !origin || !isConnectableObject(obj)) return
      moveObjectFromOrigin(origin, obj, delta)
    })

    const primary = dragPrimaryId.value ? getObjectById(dragPrimaryId.value) : null
    alignmentGuides.value = primary && isConnectableObject(primary)
      ? computeAlignmentGuides(getObjectBounds(primary), dragObjectIds.value)
      : []
    render()
    return
  }

  if (activeLink.value) {
    activeLink.value = { ...activeLink.value, current: pos }
    render()
    return
  }

  if (!isDrawing.value || !ctx.value) return

  if (currentTool.value === 'crop') {
    if (startPoint.value) {
      cropSelection.value = normalizeRect(startPoint.value, pos)
      render()
    }
    return
  }

  if (currentTool.value === 'pencil' || currentTool.value === 'eraser') {
    currentPoints.value.push(pos)
    alignmentGuides.value = []
    render()
    drawPath(ctx.value, {
      type: 'path',
      id: 'draft',
      points: currentPoints.value,
      color: currentTool.value === 'eraser' ? '#ffffff' : currentColor.value,
      size: currentTool.value === 'eraser' ? currentSize.value * 5 : currentSize.value,
      isEraser: currentTool.value === 'eraser'
    })
    return
  }

  if (!startPoint.value) return
  const draftRect = normalizeRect(startPoint.value, pos)
  alignmentGuides.value = computeAlignmentGuides(draftRect)
  render()
  drawShape(ctx.value, {
    type: currentTool.value as ShapeObject['type'],
    id: 'draft',
    start: startPoint.value,
    end: pos,
    color: currentColor.value,
    size: currentSize.value
  })
}

const finishDrag = (pos?: Point) => {
  if (!isDragging.value) return
  const delta = dragStartPoint.value && pos ? {
    x: pos.x - dragStartPoint.value.x,
    y: pos.y - dragStartPoint.value.y
  } : { x: 0, y: 0 }

  isDragging.value = false
  alignmentGuides.value = []
  const moved = Math.abs(delta.x) > 0.5 || Math.abs(delta.y) > 0.5
  resetTransientState()
  if (moved) {
    commitToHistory()
  }
  render()
}

const handleMouseUp = (e?: MouseEvent | Touch) => {
  const pos = e ? getMousePos(e) : startPoint.value
  if (isDragging.value) {
    finishDrag(pos || undefined)
    return
  }

  if (activeLink.value) {
    const linkStart = activeLink.value
    const target = pos ? findSelectableObjectAt(pos) : null
    if (target && target.id !== linkStart.fromId) {
      const exists = objects.value.some(obj =>
        obj.type === 'link' &&
        obj.fromId === linkStart.fromId &&
        obj.toId === target.id
      )

      if (!exists) {
        objects.value.push({
          type: 'link',
          id: createId(),
          fromId: linkStart.fromId,
          toId: target.id,
          color: currentColor.value
        })
        selectedObjectIds.value = [target.id]
        commitToHistory()
      }
    }

    isDrawing.value = false
    resetTransientState()
    render()
    return
  }

  if (!isDrawing.value || !pos) return
  isDrawing.value = false

  if (currentTool.value === 'crop') {
    cropSelection.value = startPoint.value ? normalizeRect(startPoint.value, pos) : cropSelection.value
    if (cropSelection.value && (cropSelection.value.width < 8 || cropSelection.value.height < 8)) {
      cropSelection.value = null
    }
    startPoint.value = null
    alignmentGuides.value = []
    render()
    return
  }

  if (currentTool.value === 'pencil' || currentTool.value === 'eraser') {
    if (currentPoints.value.length > 1) {
      objects.value.push({
        type: 'path',
        id: createId(),
        points: [...currentPoints.value],
        color: currentTool.value === 'eraser' ? '#ffffff' : currentColor.value,
        size: currentTool.value === 'eraser' ? currentSize.value * 5 : currentSize.value,
        isEraser: currentTool.value === 'eraser'
      })
      commitToHistory()
    }
  } else if (startPoint.value && ['rect', 'circle', 'diamond'].includes(currentTool.value)) {
    const id = createId()
    objects.value.push({
      type: currentTool.value as ShapeObject['type'],
      id,
      start: startPoint.value,
      end: pos,
      color: currentColor.value,
      size: currentSize.value
    })
    selectedObjectIds.value = [id]
    commitToHistory()
  }

  currentPoints.value = []
  startPoint.value = null
  alignmentGuides.value = []
  render()
}

const handleContextMenu = (e: MouseEvent) => {
  const pos = getMousePos(e)
  const clickedImage = [...objects.value].reverse().find(obj =>
    obj.type === 'image' &&
    pointInRect(pos, getObjectBounds(obj))
  )

  if (!clickedImage || clickedImage.type !== 'image') return
  const link = document.createElement('a')
  link.download = `image-${clickedImage.id}.png`
  link.href = clickedImage.img.src
  link.click()
}

const handleTouchStart = (e: TouchEvent) => handleMouseDown(e.touches[0] as any)
const handleTouchMove = (e: TouchEvent) => handleMouseMove(e.touches[0] as any)
const handleTouchEnd = (e: TouchEvent) => handleMouseUp(e.changedTouches[0])

const extractImageUrl = (message: any) => {
  if (Array.isArray(message?.content)) {
    const imageEntry = message.content.find((entry: any) => entry.type === 'image_url')
    if (imageEntry?.image_url?.url) {
      return imageEntry.image_url.url as string
    }
  }

  if (message?.images && message.images.length > 0) {
    const firstImage = message.images[0]
    return typeof firstImage === 'string' ? firstImage : (firstImage.image_url?.url || '')
  }

  if (typeof message?.content === 'string') {
    if (message.content.startsWith('http') || message.content.startsWith('data:image')) {
      return message.content
    }
    const match = message.content.match(/https?:\/\/[^\s)"']+/i)
    if (match) {
      return match[0]
    }
  }

  return ''
}

const generateAIImage = async () => {
  if (!aiPrompt.value || isGenerating.value) return
  if (!apiKey.value) {
    alert('Please set your OpenRouter API key first.')
    return
  }

  flushPendingWheelHistoryCommit()
  isGenerating.value = true
  showGenerateModal.value = false

  try {
    const selectedImages = objects.value.filter(
      (obj): obj is ImageObject => obj.type === 'image' && selectedObjectIds.value.includes(obj.id)
    )

    let requestContent: any = `Please generate an image based on this description: ${aiPrompt.value}`
    if (selectedImages.length > 0) {
      requestContent = [
        { type: 'text', text: requestContent },
        ...selectedImages
          .filter(imageObj => Boolean(imageObj.img?.src))
          .map(imageObj => ({
            type: 'image_url',
            image_url: { url: imageObj.img.src }
          }))
      ]
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
        modalities: ['image']
      })
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error?.message || 'Failed to fetch response')
    }

    const data = await response.json()
    const imageUrl = extractImageUrl(data.choices?.[0]?.message)
    if (!imageUrl) {
      throw new Error('No image URL found in response')
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = imageUrl
    img.onload = () => {
      const id = createId()
      const newImage: ImageObject = {
        type: 'image',
        id,
        pos: { x: 50, y: 50 },
        img,
        width: 300,
        height: (300 / img.width) * img.height,
        prompt: aiPrompt.value,
        sourceIds: selectedImages.map(imageObj => imageObj.id)
      }

      selectedImages.forEach((sourceImage) => {
        objects.value.push({
          type: 'link',
          id: createId(),
          fromId: sourceImage.id,
          toId: id,
          color: '#94a3b8'
        })
      })

      objects.value.push(newImage)
      selectedObjectIds.value = [id]
      commitToHistory()
      render()
    }
  } catch (error: any) {
    alert('AI generation failed: ' + error.message)
  } finally {
    isGenerating.value = false
  }
}

const renderScene = (
  targetCtx: CanvasRenderingContext2D,
  targetCanvas: HTMLCanvasElement,
  options: { includeCropOverlay?: boolean; clearCanvas?: boolean } = {}
) => {
  if (options.clearCanvas !== false) {
    targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height)
  }

  objects.value.forEach((obj) => {
    if (obj.type === 'link') drawLink(targetCtx, obj)
  })

  objects.value.forEach((obj) => {
    if (obj.type === 'path') drawPath(targetCtx, obj)
    if (obj.type === 'rect' || obj.type === 'circle' || obj.type === 'diamond') drawShape(targetCtx, obj)
  })

  objects.value.forEach((obj) => {
    if (obj.type === 'image') drawImage(targetCtx, obj)
  })

  drawAlignmentGuides(targetCtx, targetCanvas)

  if (activeLink.value) {
    drawPreviewLink(targetCtx, activeLink.value.fromId, activeLink.value.current)
  }

  if (options.includeCropOverlay && cropSelection.value) {
    drawCropSelection(targetCtx, targetCanvas, cropSelection.value)
  }
}

const render = () => {
  if (!ctx.value || !canvas.value) return
  renderScene(ctx.value, canvas.value, { includeCropOverlay: true, clearCanvas: true })
}

const getConnectionPoint = (obj: ConnectableObject, toward: Point) => {
  const bounds = getObjectBounds(obj)
  const center = getObjectCenter(obj)
  const dx = toward.x - center.x
  const dy = toward.y - center.y
  const halfWidth = Math.max(bounds.width / 2, 1)
  const halfHeight = Math.max(bounds.height / 2, 1)
  const scale = 1 / Math.max(Math.abs(dx) / halfWidth || 0, Math.abs(dy) / halfHeight || 0, 1)

  return {
    x: center.x + dx * scale,
    y: center.y + dy * scale
  }
}

const drawArrowHead = (ctx: CanvasRenderingContext2D, from: Point, to: Point, color: string) => {
  const angle = Math.atan2(to.y - from.y, to.x - from.x)
  const length = 12
  const spread = Math.PI / 7

  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  drawRoughLine(ctx, to.x, to.y, to.x - length * Math.cos(angle - spread), to.y - length * Math.sin(angle - spread))
  drawRoughLine(ctx, to.x, to.y, to.x - length * Math.cos(angle + spread), to.y - length * Math.sin(angle + spread))
  ctx.restore()
}

const drawLink = (ctx: CanvasRenderingContext2D, obj: LinkObject) => {
  const fromObj = getObjectById(obj.fromId)
  const toObj = getObjectById(obj.toId)
  if (!fromObj || !toObj || !isConnectableObject(fromObj) || !isConnectableObject(toObj)) return

  const start = getConnectionPoint(fromObj, getObjectCenter(toObj))
  const end = getConnectionPoint(toObj, getObjectCenter(fromObj))

  ctx.save()
  ctx.strokeStyle = obj.color || '#94a3b8'
  ctx.lineWidth = 2
  drawRoughLine(ctx, start.x, start.y, end.x, end.y)
  drawArrowHead(ctx, start, end, obj.color || '#94a3b8')
  ctx.restore()
}

const drawPreviewLink = (ctx: CanvasRenderingContext2D, fromId: string, current: Point) => {
  const fromObj = getObjectById(fromId)
  if (!fromObj || !isConnectableObject(fromObj)) return

  const start = getConnectionPoint(fromObj, current)
  ctx.save()
  ctx.strokeStyle = currentColor.value
  ctx.lineWidth = 2
  drawRoughLine(ctx, start.x, start.y, current.x, current.y)
  drawArrowHead(ctx, start, current, currentColor.value)
  ctx.restore()
}

const drawSelectionBounds = (ctx: CanvasRenderingContext2D, bounds: CropRect) => {
  ctx.save()
  ctx.setLineDash([8, 6])
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 2
  ctx.strokeRect(bounds.x - 4, bounds.y - 4, bounds.width + 8, bounds.height + 8)
  ctx.restore()
}

const drawImage = (ctx: CanvasRenderingContext2D, obj: ImageObject) => {
  const { pos, img, width, height, id } = obj

  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 1
  drawRoughLine(ctx, pos.x - 2, pos.y - 2, pos.x + width + 2, pos.y - 2)
  drawRoughLine(ctx, pos.x + width + 2, pos.y - 2, pos.x + width + 2, pos.y + height + 2)
  drawRoughLine(ctx, pos.x + width + 2, pos.y + height + 2, pos.x - 2, pos.y + height + 2)
  drawRoughLine(ctx, pos.x - 2, pos.y + height + 2, pos.x - 2, pos.y - 2)

  ctx.drawImage(img, pos.x, pos.y, width, height)

  if (selectedObjectIds.value.includes(id)) {
    drawSelectionBounds(ctx, getObjectBounds(obj))
  }
}

const drawPath = (ctx: CanvasRenderingContext2D, obj: PathObject) => {
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

const drawShape = (ctx: CanvasRenderingContext2D, obj: ShapeObject) => {
  ctx.save()
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
    drawHandDrawnCircle(ctx, x + w / 2, y + h / 2, Math.abs(w / 2), Math.abs(h / 2))
  } else if (obj.type === 'diamond') {
    const cx = x + w / 2
    const cy = y + h / 2
    drawRoughLine(ctx, cx, y, x + w, cy)
    drawRoughLine(ctx, x + w, cy, cx, y + h)
    drawRoughLine(ctx, cx, y + h, x, cy)
    drawRoughLine(ctx, x, cy, cx, y)
  }

  if (selectedObjectIds.value.includes(obj.id)) {
    drawSelectionBounds(ctx, getObjectBounds(obj))
  }
  ctx.restore()
}

const drawAlignmentGuides = (ctx: CanvasRenderingContext2D, targetCanvas: HTMLCanvasElement) => {
  if (alignmentGuides.value.length === 0) return
  ctx.save()
  ctx.setLineDash([6, 6])
  ctx.lineWidth = 1.5
  ctx.strokeStyle = '#38bdf8'

  alignmentGuides.value.forEach((guide) => {
    ctx.beginPath()
    if (guide.orientation === 'vertical') {
      ctx.moveTo(guide.position, 0)
      ctx.lineTo(guide.position, targetCanvas.height)
    } else {
      ctx.moveTo(0, guide.position)
      ctx.lineTo(targetCanvas.width, guide.position)
    }
    ctx.stroke()
  })
  ctx.restore()
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

const drawCropSelection = (ctx: CanvasRenderingContext2D, targetCanvas: HTMLCanvasElement, rect: CropRect) => {
  ctx.save()
  ctx.fillStyle = 'rgba(17, 24, 39, 0.18)'
  ctx.fillRect(0, 0, targetCanvas.width, rect.y)
  ctx.fillRect(0, rect.y, rect.x, rect.height)
  ctx.fillRect(rect.x + rect.width, rect.y, targetCanvas.width - rect.x - rect.width, rect.height)
  ctx.fillRect(0, rect.y + rect.height, targetCanvas.width, targetCanvas.height - rect.y - rect.height)
  ctx.setLineDash([10, 6])
  ctx.strokeStyle = '#2563eb'
  ctx.lineWidth = 2
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
  ctx.restore()
}

const commitSnapshot = () => {
  const currentSnapshot = cloneObjects(objects.value)
  const currentSignature = buildHistorySignature(currentSnapshot)
  const previousSignature = historySignatures.value[historyIndex.value]

  if (previousSignature === currentSignature) {
    return
  }

  const nextHistory = history.value.slice(0, historyIndex.value + 1)
  const nextSignatures = historySignatures.value.slice(0, historyIndex.value + 1)
  nextHistory.push(currentSnapshot)
  nextSignatures.push(currentSignature)
  history.value = nextHistory
  historySignatures.value = nextSignatures
  historyIndex.value = history.value.length - 1
}

const scheduleWheelHistoryCommit = () => {
  if (!wheelHistoryDirty) return

  if (wheelHistoryCommitTimer) {
    clearTimeout(wheelHistoryCommitTimer)
  }

  wheelHistoryCommitTimer = window.setTimeout(() => {
    wheelHistoryCommitTimer = null
    if (!wheelHistoryDirty) return
    wheelHistoryDirty = false
    commitSnapshot()
  }, 180)
}

const flushPendingWheelHistoryCommit = () => {
  if (wheelHistoryCommitTimer) {
    clearTimeout(wheelHistoryCommitTimer)
    wheelHistoryCommitTimer = null
  }

  if (!wheelHistoryDirty) return
  wheelHistoryDirty = false
  commitSnapshot()
}

const commitToHistory = () => {
  flushPendingWheelHistoryCommit()
  commitSnapshot()
}

const undo = () => {
  flushPendingWheelHistoryCommit()
  if (!canUndo.value) return
  historyIndex.value--
  objects.value = cloneObjects(history.value[historyIndex.value])
  render()
}

const redo = () => {
  flushPendingWheelHistoryCommit()
  if (!canRedo.value) return
  historyIndex.value++
  objects.value = cloneObjects(history.value[historyIndex.value])
  render()
}

const clear = () => {
  if (!confirm('Clear everything?')) return
  flushPendingWheelHistoryCommit()
  objects.value = []
  cropSelection.value = null
  selectedObjectIds.value = []
  resetTransientState()
  commitToHistory()
  render()
}

const buildExportCanvas = () => {
  if (!canvas.value) return null
  const exportCanvas = document.createElement('canvas')
  exportCanvas.width = canvas.value.width
  exportCanvas.height = canvas.value.height
  const exportCtx = exportCanvas.getContext('2d')
  if (!exportCtx) return null

  exportCtx.fillStyle = '#ffffff'
  exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
  renderScene(exportCtx, exportCanvas, { includeCropOverlay: false, clearCanvas: false })
  return exportCanvas
}

const downloadDataUrl = (filename: string, dataUrl: string) => {
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

const saveFullCanvas = () => {
  const exportCanvas = buildExportCanvas()
  if (!exportCanvas) return

  const dataUrl = exportCanvas.toDataURL('image/png')
  if (props.isModal) {
    emit('save', dataUrl)
  } else {
    downloadDataUrl('whiteboard-sketch.png', dataUrl)
  }
}

const saveCroppedArea = () => {
  if (!cropSelection.value) return
  const exportCanvas = buildExportCanvas()
  if (!exportCanvas) return

  const { x, y, width, height } = cropSelection.value
  const cropCanvas = document.createElement('canvas')
  cropCanvas.width = Math.round(width)
  cropCanvas.height = Math.round(height)
  const cropCtx = cropCanvas.getContext('2d')
  if (!cropCtx) return

  cropCtx.fillStyle = '#ffffff'
  cropCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height)
  cropCtx.drawImage(exportCanvas, x, y, width, height, 0, 0, cropCanvas.width, cropCanvas.height)

  const dataUrl = cropCanvas.toDataURL('image/png')
  if (props.isModal) {
    emit('save', dataUrl)
  } else {
    downloadDataUrl('whiteboard-crop.png', dataUrl)
  }
}

const confirmModalSave = () => {
  if (currentTool.value === 'crop' && hasCropSelection.value) {
    saveCroppedArea()
    return
  }
  saveFullCanvas()
}
</script>

<style scoped>
.font-hand { font-family: 'Patrick Hand', cursive; }
h1, h2, h3 { font-family: 'Indie Flower', cursive; }
</style>
