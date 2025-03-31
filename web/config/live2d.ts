export const LIVE2D_CONFIG = {
  // 模型基础路径
  MODEL_BASE_PATH: '/live2d/models',

  // 默认模型列表
  MODELS: [
    {
      id: 'haru',
      name: 'Haru',
      path: 'haru/haru.model.json',
      preview: 'haru/preview.png'
    },
    {
      id: 'miku',
      name: 'Miku',
      path: 'miku/miku.model.json',
      preview: 'miku/preview.png'
    },
    {
      id: 'neptune',
      name: 'Neptune',
      path: 'neptune/neptune.model.json',
      preview: 'neptune/preview.png'
    }
  ],

  // 背景设置
  BACKGROUNDS: [
    {
      id: 'default',
      name: 'Default',
      url: ''
    },
    {
      id: 'room',
      name: 'Room',
      url: '/live2d/backgrounds/room.jpg'
    },
    {
      id: 'street',
      name: 'Street',
      url: '/live2d/backgrounds/street.jpg'
    }
  ],

  // 默认设置
  DEFAULT_SETTINGS: {
    width: 800,
    height: 600,
    scale: 1,
    position: { x: 0, y: 0 },
    draggable: true,
    autoMotion: true,
    motionInterval: 5000
  }
} 