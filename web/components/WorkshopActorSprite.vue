<template>
  <div class="sprite-shell" :class="[sizeClass, shellMotionClass]">
    <div class="sprite-frame" :style="frameStyle"></div>
    <div v-if="variant === 'boss'" class="boss-crown" aria-hidden="true"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type ActorVariant = 'boss' | 'worker' | 'codex' | 'claude' | 'gemini'
type ActorStatus = 'queued' | 'idle' | 'working' | 'done' | 'error' | 'armed' | 'online'

const props = withDefaults(defineProps<{
  variant: ActorVariant
  status?: ActorStatus
  scale?: number
  size?: 'chip' | 'card' | 'stage'
}>(), {
  status: 'idle',
  scale: 2.5,
  size: 'card'
})

const FRAME_WIDTH = 32

const variantMap: Record<ActorVariant, { idle: string; run: string; filter?: string }> = {
  boss: {
    idle: '/tools/lobster-workshop/limezu/fish-idle.png',
    run: '/tools/lobster-workshop/limezu/fish-run.png'
  },
  worker: {
    idle: '/tools/lobster-workshop/limezu/white-idle.png',
    run: '/tools/lobster-workshop/limezu/white-run.png'
  },
  codex: {
    idle: '/tools/lobster-workshop/limezu/white-idle.png',
    run: '/tools/lobster-workshop/limezu/white-run.png'
  },
  claude: {
    idle: '/tools/lobster-workshop/limezu/yellow-idle.png',
    run: '/tools/lobster-workshop/limezu/yellow-run.png'
  },
  gemini: {
    idle: '/tools/lobster-workshop/limezu/fish-idle.png',
    run: '/tools/lobster-workshop/limezu/fish-run.png',
    filter: 'hue-rotate(160deg) saturate(1.15)'
  }
}

const usesRunCycle = computed(() => props.status === 'working')
const currentConfig = computed(() => variantMap[props.variant] || variantMap.worker)
const frameCount = computed(() => usesRunCycle.value ? 6 : 4)

const sizeClass = computed(() => `sprite-${props.size}`)

const shellMotionClass = computed(() => {
  if (props.status === 'working') return 'shell-working'
  if (props.status === 'error') return 'shell-error'
  if (props.status === 'armed') return 'shell-ready'
  if (props.status === 'done' || props.status === 'online') return 'shell-done'
  return 'shell-idle'
})

const frameStyle = computed(() => {
  const spriteSheet = usesRunCycle.value ? currentConfig.value.run : currentConfig.value.idle
  const filter = currentConfig.value.filter
    ? `${currentConfig.value.filter} drop-shadow(0 4px 0 rgba(34, 34, 34, 0.18))`
    : 'drop-shadow(0 4px 0 rgba(34, 34, 34, 0.18))'
  const scale = String(props.scale)

  return {
    '--sprite-image': `url(${spriteSheet})`,
    '--sprite-scale': scale,
    '--sprite-sheet-width': `${FRAME_WIDTH * frameCount.value}px`,
    '--sprite-last-x': `${FRAME_WIDTH * (frameCount.value - 1) * -1}px`,
    filter,
    animationName: usesRunCycle.value ? 'sprite-run-cycle' : 'sprite-idle-cycle',
    animationTimingFunction: `steps(${frameCount.value})`
  }
})
</script>

<style scoped>
.sprite-shell {
  position: relative;
  display: inline-flex;
  align-items: flex-end;
  justify-content: center;
}

.sprite-frame {
  width: calc(32px * var(--sprite-scale));
  height: calc(32px * var(--sprite-scale));
  background-image: var(--sprite-image);
  background-repeat: no-repeat;
  background-position: 0 0;
  background-size: calc(var(--sprite-sheet-width) * var(--sprite-scale)) calc(64px * var(--sprite-scale));
  image-rendering: pixelated;
  animation-duration: 0.75s;
  animation-iteration-count: infinite;
}

.sprite-chip .sprite-frame {
  filter: inherit;
}

.sprite-stage .sprite-frame {
  filter: inherit;
}

.boss-crown {
  position: absolute;
  top: -10px;
  left: 50%;
  width: 26px;
  height: 14px;
  transform: translateX(-50%);
  border: 2px solid #222222;
  clip-path: polygon(0 100%, 12% 36%, 32% 58%, 50% 0, 68% 58%, 88% 36%, 100% 100%);
  background: linear-gradient(180deg, #fde68a 0%, #f59e0b 100%);
}

.shell-idle {
  animation: shell-idle 3.2s ease-in-out infinite;
}

.shell-ready {
  animation: shell-ready 2.2s ease-in-out infinite;
}

.shell-working {
  animation: shell-working 0.9s ease-in-out infinite;
}

.shell-done {
  animation: shell-done 2s ease-in-out infinite;
}

.shell-error {
  animation: shell-error 0.65s ease-in-out infinite;
}

@keyframes sprite-idle-cycle {
  from {
    background-position: 0 0;
  }

  to {
    background-position: calc(var(--sprite-last-x) * var(--sprite-scale)) 0;
  }
}

@keyframes sprite-run-cycle {
  from {
    background-position: 0 0;
  }

  to {
    background-position: calc(var(--sprite-last-x) * var(--sprite-scale)) 0;
  }
}

@keyframes shell-idle {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-3px);
  }
}

@keyframes shell-ready {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }

  50% {
    transform: translateY(-4px) scale(1.04);
  }
}

@keyframes shell-working {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }

  50% {
    transform: translateY(-6px) scale(1.05);
  }
}

@keyframes shell-done {
  0%,
  100% {
    transform: translateY(0);
  }

  35% {
    transform: translateY(-5px);
  }

  70% {
    transform: translateY(-2px);
  }
}

@keyframes shell-error {
  0%,
  100% {
    transform: translateX(0);
  }

  25% {
    transform: translateX(-2px);
  }

  75% {
    transform: translateX(2px);
  }
}
</style>
