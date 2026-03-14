export type ToolTagColor = 'indigo' | 'green'

export type ToolTag = {
  label: string
  color: ToolTagColor
}

export type ToolItem = {
  to: string
  title: string
  description: string
  tags: ToolTag[]
}

export const toolsCatalog: ToolItem[] = [
  {
    to: '/tools/english-chunk',
    title: 'English Chunk Generator',
    description: 'Generate common English chunks with example sentences for daily routines, work life, and more.',
    tags: [
      { label: 'AI-Powered', color: 'indigo' },
      { label: 'Free', color: 'green' }
    ]
  },
  {
    to: '/tools/prompt-collection',
    title: 'Prompt Collection',
    description: 'A collection of useful prompts for AI.',
    tags: [
      { label: 'Templates', color: 'indigo' },
      { label: 'Free', color: 'green' }
    ]
  },
  {
    to: '/tools/md-to-wechat',
    title: 'Markdown To WeChat',
    description: 'Convert Markdown documents to beautiful WeChat articles, with code highlighting, tables, and customizable themes.',
    tags: [
      { label: 'Format Conversion', color: 'indigo' },
      { label: 'Free', color: 'green' }
    ]
  },
  {
    to: '/tools/qwerty',
    title: 'Qwerty',
    description: 'Practice your typing skills with Qwerty.',
    tags: [
      { label: 'Typing Practice', color: 'indigo' },
      { label: 'Free', color: 'green' }
    ]
  },
  {
    to: '/tools/typing',
    title: 'Typing Story Lab',
    description: 'Generate or paste English passages, clean the text, and practice with live typing stats.',
    tags: [
      { label: 'Typing Practice', color: 'indigo' },
      { label: 'AI-Powered', color: 'green' }
    ]
  },
  {
    to: '/tools/modbus',
    title: 'Modbus',
    description: 'Parse Modbus data.',
    tags: [
      { label: 'Modbus', color: 'indigo' },
      { label: 'Free', color: 'green' }
    ]
  },
  {
    to: '/tools/paper-split',
    title: 'Paper Split',
    description: 'Split a paper into multiple questions.',
    tags: [
      { label: 'Paper Split', color: 'indigo' },
      { label: 'Free', color: 'green' }
    ]
  },
  {
    to: '/tools/yuki',
    title: 'Yuki AI',
    description: 'A minimalist hand-drawn AI chat assistant powered by OpenRouter.',
    tags: [
      { label: 'AI Chat', color: 'indigo' },
      { label: 'Hand-drawn', color: 'green' }
    ]
  },
  {
    to: '/tools/whiteboard',
    title: 'Whiteboard',
    description: 'A sketchy, hand-drawn whiteboard for your ideas and sketches.',
    tags: [
      { label: 'Tool', color: 'indigo' },
      { label: 'Drawing', color: 'green' }
    ]
  },
  {
    to: '/tools/rednote',
    title: 'Rednote Optimizer',
    description: 'AI-powered Xiaohongshu (Rednote) copy optimizer with built-in whiteboard and image generation.',
    tags: [
      { label: 'AI Copy', color: 'indigo' },
      { label: 'Social Media', color: 'green' }
    ]
  },
  {
    to: '/tools/storyboard',
    title: 'Storyboard Generator',
    description: 'Generate storyboard panels, editable comic-style image prompts, and per-panel reference-based renders.',
    tags: [
      { label: 'Storyboard', color: 'indigo' },
      { label: 'AI Visuals', color: 'green' }
    ]
  },
  {
    to: '/tools/lobster-workshop',
    title: 'Lobster Workshop',
    description: 'Connect to an OpenClaw gateway over WebSocket, chat with the boss lobster, and monitor minion activity in one hand-drawn dashboard.',
    tags: [
      { label: 'OpenClaw', color: 'indigo' },
      { label: 'Agent Ops', color: 'green' }
    ]
  }
]
