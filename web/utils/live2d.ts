import { LIVE2D_CONFIG } from '../config/live2d'

export class Live2DViewer {
  private canvas: HTMLCanvasElement
  private model: any = null
  private currentMotions: Map<string, any> = new Map()
  private autoMotionTimer: number | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.initialize()
  }

  private async initialize() {
    try {
      // TODO: Initialize Live2D core library
      console.log('Initializing Live2D viewer...')
    } catch (error) {
      console.error('Failed to initialize Live2D viewer:', error)
    }
  }

  public async loadModel(modelId: string) {
    try {
      const modelConfig = LIVE2D_CONFIG.MODELS.find(m => m.id === modelId)
      if (!modelConfig) throw new Error(`Model ${modelId} not found`)

      // TODO: Load model using Live2D core library
      console.log('Loading model:', modelConfig.path)

      // Start auto motion if enabled
      if (LIVE2D_CONFIG.DEFAULT_SETTINGS.autoMotion) {
        this.startAutoMotion()
      }
    } catch (error) {
      console.error('Failed to load model:', error)
    }
  }

  public async playMotion(motionName: string) {
    if (!this.model) return

    try {
      const motion = this.currentMotions.get(motionName)
      if (motion) {
        // TODO: Play motion using Live2D core library
        console.log('Playing motion:', motionName)
      }
    } catch (error) {
      console.error('Failed to play motion:', error)
    }
  }

  public setBackground(backgroundUrl: string) {
    try {
      if (!backgroundUrl) {
        this.canvas.style.background = 'none'
        return
      }

      this.canvas.style.background = `url(${backgroundUrl}) center/cover no-repeat`
    } catch (error) {
      console.error('Failed to set background:', error)
    }
  }

  public updatePosition(x: number, y: number) {
    if (!this.model) return

    try {
      // TODO: Update model position using Live2D core library
      console.log('Updating position:', x, y)
    } catch (error) {
      console.error('Failed to update position:', error)
    }
  }

  private startAutoMotion() {
    if (this.autoMotionTimer) {
      clearInterval(this.autoMotionTimer)
    }

    this.autoMotionTimer = window.setInterval(() => {
      const motions = Array.from(this.currentMotions.keys())
      if (motions.length > 0) {
        const randomMotion = motions[Math.floor(Math.random() * motions.length)]
        this.playMotion(randomMotion)
      }
    }, LIVE2D_CONFIG.DEFAULT_SETTINGS.motionInterval)
  }

  public dispose() {
    if (this.autoMotionTimer) {
      clearInterval(this.autoMotionTimer)
      this.autoMotionTimer = null
    }

    // TODO: Cleanup Live2D resources
    this.model = null
    this.currentMotions.clear()
  }
} 