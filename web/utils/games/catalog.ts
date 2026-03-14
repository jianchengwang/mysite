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
    title: '五子棋',
    subtitle: 'Gomoku Duel',
    description: '15x15 极简棋盘，支持人机对战、先后手切换与难度选择。',
    detail: '前端 alpha-beta 剪枝，强调开局布局、连珠封堵与局部攻防。',
    tags: [
      { label: 'AI Battle', tone: 'blue' },
      { label: 'Alpha-Beta', tone: 'green' }
    ]
  },
  {
    slug: 'chinese-chess',
    title: '中国象棋',
    subtitle: 'Xiangqi Table',
    description: '完整九宫与河界规则，支持人机对战和三档搜索强度。',
    detail: '前端走法生成 + alpha-beta 剪枝评估，适合轻量对弈体验。',
    tags: [
      { label: 'Classic Board', tone: 'amber' },
      { label: 'AI Battle', tone: 'blue' }
    ]
  },
  {
    slug: 'fish-pond',
    title: '摸鱼池',
    subtitle: 'Doodle Fish Pond',
    description: '调起白板画一条鱼，保存后就会在池塘里慢悠悠游动。',
    detail: '支持反复新增、漂浮动画与本地保存，适合放空和展示手绘涂鸦。',
    tags: [
      { label: 'Whiteboard', tone: 'green' },
      { label: 'Relax', tone: 'rose' }
    ]
  },
  {
    slug: 'rubiks-cube',
    title: '3D 魔方',
    subtitle: 'Cube Studio',
    description: '立体 3D 魔方，可旋转、打乱、单步操作，并给出下一步建议。',
    detail: '内置新手玩法说明与撤销路径提示，帮助你边玩边理解复原思路。',
    tags: [
      { label: '3D', tone: 'blue' },
      { label: 'Tutorial', tone: 'green' }
    ]
  },
  {
    slug: 'huarongdao',
    title: '华容道',
    subtitle: 'Sliding Strategy',
    description: '多关卡经典益智推盘，支持提示、步数统计和复盘。',
    detail: '预置多组局面，并可用搜索算法给出下一步最佳建议。',
    tags: [
      { label: 'Puzzle', tone: 'amber' },
      { label: 'Multi-Level', tone: 'green' }
    ]
  }
]

export const gamePath = (slug: string) => `/games/${slug}`

export const getGameBySlug = (slug: string) => gamesCatalog.find((game) => game.slug === slug)
