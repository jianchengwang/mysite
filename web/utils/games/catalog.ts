export type GameTagTone = 'green' | 'blue' | 'amber' | 'rose'

export type GameTag = {
  label: string
  tone: GameTagTone
}

export type GameCatalogItem = {
  slug: string
  title: string
  subtitle: string
  description: string
  detail: string
  tags: GameTag[]
}

export const gamesCatalog: GameCatalogItem[] = [
  {
    slug: 'gomoku',
    title: 'Gomoku',
    subtitle: 'Board Duel',
    description: 'A minimalist 15x15 board with human vs AI play, side switching, and difficulty levels.',
    detail: 'Front-end alpha-beta search focused on shape building, threat blocking, and local fights.',
    tags: [
      { label: 'AI Battle', tone: 'blue' },
      { label: 'Alpha-Beta', tone: 'green' }
    ]
  },
  {
    slug: 'chinese-chess',
    title: 'Xiangqi',
    subtitle: 'Classic Table',
    description: 'Full river, palace, cannon, and check rules with human vs AI play and search levels.',
    detail: 'Legal-move generation and alpha-beta evaluation run directly in the browser.',
    tags: [
      { label: 'Classic Board', tone: 'amber' },
      { label: 'AI Battle', tone: 'blue' }
    ]
  },
  {
    slug: 'fish-pond',
    title: 'Fish Pond',
    subtitle: 'Doodle Pond',
    description: 'Draw a fish on the whiteboard, save it, and watch it drift through the pond.',
    detail: 'Layered pond motion, local persistence, and repeatable doodle drop-ins for slow moments.',
    tags: [
      { label: 'Whiteboard', tone: 'green' },
      { label: 'Relax', tone: 'rose' }
    ]
  },
  {
    slug: 'rubiks-cube',
    title: '3D Cube',
    subtitle: 'Cube Studio',
    description: 'A 3D cube you can scramble, turn, inspect, and practice with guided next-step hints.',
    detail: 'Built around a real cubie state with beginner-friendly guidance and rewind suggestions.',
    tags: [
      { label: '3D', tone: 'blue' },
      { label: 'Tutorial', tone: 'green' }
    ]
  },
  {
    slug: 'huarongdao',
    title: 'Huarongdao',
    subtitle: 'Sliding Strategy',
    description: 'A multi-level sliding-block puzzle with reliable hints, move tracking, and restarts.',
    detail: 'Preset positions and board-aware guidance help you keep the exit route in view.',
    tags: [
      { label: 'Puzzle', tone: 'amber' },
      { label: 'Multi-Level', tone: 'green' }
    ]
  },
  {
    slug: 'huarongdao/digital',
    title: 'Digital Huarongdao',
    subtitle: 'Number Slide',
    description: 'A classic 15-puzzle where you slide numbered tiles to reach the sorted order.',
    detail: 'Dynamic grid sizes and move tracking let you practice speed and strategy.',
    tags: [
      { label: 'Puzzle', tone: 'amber' },
      { label: 'Classic', tone: 'blue' }
    ]
  }
]

export const gamePath = (slug: string) => `/games/${slug}`

export const getGameBySlug = (slug: string) => gamesCatalog.find((game) => game.slug === slug)
