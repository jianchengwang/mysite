<template>
  <div class="flex flex-col h-screen bg-gray-50">
    <!-- ... (顶部菜单栏 - unchanged) ... -->
    <div class="border-b bg-white flex items-center px-4 py-2 space-x-6">
      <h1 class="text-xl font-bold">Markdown 转微信图文</h1>
      <div class="flex-grow"></div>
      <button @click="copyWechatFormat" class="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition" title="复制公众号格式">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
        </svg>
      </button>
      <button @click="toggleTheme" class="p-2 text-gray-600 hover:bg-gray-50 rounded-full transition" title="切换主题">
        <svg v-if="isDarkTheme" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      </button>
      <button @click="showSettings = !showSettings" class="p-2 text-gray-600 hover:bg-gray-50 rounded-full transition" title="设置">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>

    <!-- 主内容区 -->
    <div class="flex flex-1 overflow-hidden">
      <!-- 左侧 Markdown 输入区 -->
      <div class="w-1/2 h-full border-r flex flex-col">
        <div class="flex items-center justify-between px-4 py-2 border-b">
          <h2 class="text-base font-medium">Markdown 编辑</h2>
          <div class="flex space-x-2">
            <button @click="clearInput" class="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition">
              清空
            </button>
            <button @click="pasteExample" class="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition">
              示例
            </button>
          </div>
        </div>
        <textarea
          v-model="markdownInput"
          class="flex-1 w-full p-4 border-0 outline-none resize-none font-mono text-sm bg-white"
          placeholder="在此输入Markdown内容..."
          @input="debouncedRenderOutput"
        ></textarea>
      </div>

      <!-- 右侧预览区 -->
      <div class="w-1/2 h-full flex flex-1 relative">
        <!-- 微信预览区 -->
        <div class="flex-1 h-full overflow-y-auto bg-gray-100 wechat-preview-container">
           <div v-if="isRendering" class="loading-indicator">
              <div>正在渲染...</div>
           </div>
           <!-- IMPORTANT: Use v-show to keep the element in DOM for library processing -->
           <div
             v-show="!isRendering"
             ref="previewArea"
             class="wechat-preview mx-auto"
             :class="{ 'dark-theme': isDarkTheme, [codeStyle]: true }"
             v-html="htmlOutput"
           ></div>
        </div>

        <!-- 右侧样式设置面板 - 条件渲染 -->
        <div v-if="showSettings" class="absolute right-0 top-0 w-72 h-full border-l bg-white overflow-auto shadow-lg z-10">
          <!-- ... (样式设置面板 - unchanged) ... -->
           <div class="p-3 border-b">
            <div class="flex justify-between">
              <h3 class="font-medium text-sm">样式设置</h3>
              <button @click="showSettings = false" class="text-xs text-gray-500 hover:text-gray-700">✕</button>
            </div>
          </div>

          <div class="p-3 border-b">
            <h3 class="font-medium text-sm mb-2">主题色</h3>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="theme in themes"
                :key="theme.name"
                @click="setThemeColor(theme.value)"
                class="h-6 w-6 rounded-full border"
                :class="theme.value === themeColor ? 'ring-2 ring-offset-1 ring-blue-500' : ''"
                :style="{ backgroundColor: theme.value }"
                :title="theme.name"
              ></button>
            </div>
          </div>

          <div class="p-3 border-b">
            <h3 class="font-medium text-sm mb-2">字体</h3>
            <div class="grid grid-cols-2 gap-2 mb-2">
              <button
                @click="fontType = 'sans'"
                class="px-2 py-1.5 text-xs rounded text-center"
                :class="fontType === 'sans' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'"
              >
                无衬线
              </button>
              <button
                @click="fontType = 'serif'"
                class="px-2 py-1.5 text-xs rounded text-center"
                :class="fontType === 'serif' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'"
              >
                衬线
              </button>
            </div>

            <h3 class="font-medium text-sm mb-2 mt-3">字号</h3>
            <div class="grid grid-cols-3 gap-1">
              <button
                v-for="size in fontSizes"
                :key="size.value"
                @click="fontSize = size.value"
                class="px-1 py-1 text-xs rounded text-center"
                :class="fontSize === size.value ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'"
              >
                {{ size.name }}
              </button>
            </div>
          </div>

          <div class="p-3 border-b">
            <h3 class="font-medium text-sm mb-2">代码风格</h3>
            <select v-model="codeStyle" @change="updateCodeStyle" class="block w-full p-1.5 text-sm border rounded">
              <option v-for="style in codeStyles" :key="style.value" :value="style.value">
                {{ style.name }}
              </option>
            </select>
          </div>

          <!-- <div class="p-3 border-b">
            <h3 class="font-medium text-sm mb-2">公式与图表</h3>
            <div class="flex flex-col gap-2">
              <div class="flex items-center">
                <input
                  type="checkbox"
                  id="enable-latex"
                  v-model="enableLatex"
                  class="mr-2"
                  @change="debouncedRenderOutput"
                />
                <label for="enable-latex" class="text-xs">启用LaTeX公式</label>
              </div>
              <div class="flex items-center">
                <input
                  type="checkbox"
                  id="enable-mermaid"
                  v-model="enableMermaid"
                  class="mr-2"
                  @change="debouncedRenderOutput"
                />
                <label for="enable-mermaid" class="text-xs">启用Mermaid图表</label>
              </div>
            </div>
          </div> -->

          <div class="p-3 border-b">
            <h3 class="font-medium text-sm mb-2">自定义CSS</h3>
            <div class="relative mb-2">
              <textarea
                v-model="customCSS"
                class="w-full h-48 p-2 text-xs font-mono border rounded bg-white resize-vertical"
                placeholder=".wechat-preview p { /* 自定义样式 */ }"
                @input="applyCustomCSS"
                spellcheck="false"
              ></textarea>
              <div class="absolute top-2 right-2 flex space-x-1">
                <button 
                  @click="expandCSSEditor" 
                  class="p-1 text-gray-500 hover:text-gray-700 bg-gray-100 rounded text-xs"
                  title="展开编辑器"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                  </svg>
                </button>
                <button 
                  @click="clearCustomCSS" 
                  class="p-1 text-gray-500 hover:text-gray-700 bg-gray-100 rounded text-xs"
                  title="清空"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v10M9 7v4m0 0h6m-6 0h-6" />
                  </svg>
                </button>
              </div>
            </div>
            
            <details class="text-xs text-gray-500 mb-2">
              <summary class="cursor-pointer hover:text-gray-700">样式提示</summary>
              <div class="mt-1 text-xs bg-gray-50 p-2 rounded">
                <p class="mb-1">常用选择器：</p>
                <code class="block mb-1">.wechat-preview p { ... }</code>
                <code class="block mb-1">.wechat-preview h1 { ... }</code>
                <code class="block mb-1">.wechat-preview blockquote { ... }</code>
                <code class="block mb-1">.wechat-preview pre { ... }</code>
                <code class="block mb-1">.wechat-preview code { ... }</code>
                <code class="block mb-1">.wechat-preview img { ... }</code>
              </div>
            </details>
          </div>

          <div class="p-3">
            <h3 class="font-medium text-sm mb-2">预设样式</h3>
            <div class="grid grid-cols-2 gap-2">
              <button
                @click="applyPresetStyle('default')"
                class="px-2 py-1.5 text-xs rounded text-center"
                :class="currentPreset === 'default' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'"
              >
                默认
              </button>
              <button
                @click="applyPresetStyle('elegant')"
                class="px-2 py-1.5 text-xs rounded text-center"
                :class="currentPreset === 'elegant' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'"
              >
                优雅
              </button>
              <button
                @click="applyPresetStyle('clean')"
                class="px-2 py-1.5 text-xs rounded text-center"
                :class="currentPreset === 'clean' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'"
              >
                简约
              </button>
              <button
                @click="applyPresetStyle('academic')"
                class="px-2 py-1.5 text-xs rounded text-center"
                :class="currentPreset === 'academic' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'"
              >
                学术
              </button>
              <!-- 已移除现代和杂志风格按钮 -->
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick, onBeforeUnmount } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
// Import specific languages for highlight.js if needed, or load all
// import javascript from 'highlight.js/lib/languages/javascript';
// hljs.registerLanguage('javascript', javascript);
import 'highlight.js/styles/github.css'; // Default style, will be overridden by selection

// --- Load MathJax and Mermaid ---
// We will load these dynamically to avoid initial bloat
let MathJax = null;
let mermaid = null;

// 自定义简单通知函数，替代vue-toastification
const showNotification = (message, type = 'info') => {
  const notificationContainer = document.getElementById('notification-container') || (() => {
    const container = document.createElement('div');
    container.id = 'notification-container';
    container.style.position = 'fixed';
    container.style.top = '1rem';
    container.style.right = '1rem';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
    return container;
  })();

  const notification = document.createElement('div');
  notification.style.margin = '0.5rem 0';
  notification.style.padding = '0.75rem 1rem';
  notification.style.borderRadius = '0.375rem';
  notification.style.maxWidth = '320px';
  notification.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
  notification.style.display = 'flex';
  notification.style.alignItems = 'center';
  notification.style.animation = 'fadeIn 0.3s ease-out';
  notification.style.transition = 'all 0.3s ease';
  notification.style.fontWeight = '500';

  // 设置不同类型的样式
  if (type === 'success') {
    notification.style.backgroundColor = '#07C160';
    notification.style.color = 'white';
  } else if (type === 'error') {
    notification.style.backgroundColor = '#FF4949';
    notification.style.color = 'white';
  } else {
    notification.style.backgroundColor = '#1677ff';
    notification.style.color = 'white';
  }

  notification.textContent = message;
  notificationContainer.appendChild(notification);

  // 添加动画样式
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeOut {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(-20px); }
    }
  `;
  document.head.appendChild(style);

  // 3秒后移除通知
  setTimeout(() => {
    notification.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => {
      notificationContainer.removeChild(notification);
      if (notificationContainer.childNodes.length === 0) {
        document.body.removeChild(notificationContainer);
      }
    }, 300);
  }, 3000);
};

// Debounce function
function debounce(fn, delay = 300) {
  let timer = null
  return function(...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

// State
const markdownInput = ref('')
const htmlOutput = ref('')
const previewArea = ref(null)
const isDarkTheme = ref(false)
const themeColor = ref('#0f4c81')  // Default theme color
const codeStyle = ref('github') // Default code style class name
const fontSize = ref('16px')
const lineHeight = ref('1.6')
const fontType = ref('sans')
const showSettings = ref(false)
const enableLatex = ref(true)
const enableMermaid = ref(true)
const isRendering = ref(false)
const customCSS = ref('')
const customStyleId = 'md-to-wechat-custom-styles'
const currentPreset = ref('default')

// Computed font family
const fontFamily = computed(() => {
  return fontType.value === 'serif'
    ? 'Georgia, Cambria, "Times New Roman", Times, serif'
    : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
});

// Font size options
const fontSizes = [
  { name: '极小', value: '14px' }, { name: '小', value: '15px' }, { name: '中', value: '16px' },
  { name: '大', value: '17px' }, { name: '极大', value: '18px' }, { name: '超大', value: '19px' },
];

// Theme color options
const themes = [
  { name: '经典蓝', value: '#0f4c81' }, 
  { name: '翡翠绿', value: '#009874' }, 
  { name: '活力橙', value: '#fa5151' },
  { name: '柠檬黄', value: '#fece00' }, 
  { name: '熏衣紫', value: '#92617e' }, 
  { name: '天空蓝', value: '#55c9ea' },
  { name: '玫瑰金', value: '#b76e79' }, 
  { name: '橄榄绿', value: '#556b2f' }, 
  { name: '石墨黑', value: '#333333' },
  { name: '雾烟灰', value: '#a9a9a9' }, 
  { name: '樱花粉', value: '#ffb7c5' }
];

// Code style options and corresponding CSS file names (ensure these files are available)
// Using highlight.js style names directly. Ensure you have the CSS files.
const codeStyles = [
  { name: 'GitHub', value: 'github' }, // 亮色主题
  { name: 'GitHub Dark', value: 'github-dark' } // 暗色主题
];
const codeStyleLink = ref(null); // To manage the dynamically loaded CSS

// Style presets collection
const stylePresets = {
  default: '',
  elegant: `.wechat-preview { font-family: "Palatino Linotype", Palatino, Palladio, "URW Palladio L", "Book Antiqua", Baskerville, "Bookman Old Style", "Bitstream Charter", "Nimbus Roman No9 L", Garamond, "Apple Garamond", "ITC Garamond Narrow", "New Century Schoolbook", "Century Schoolbook", "Century Schoolbook L", Georgia, serif; } .wechat-preview h1 { font-weight: 700; text-align: center; border-bottom: 2px solid #eee; padding-bottom: 0.7em; margin-bottom: 1.4em; } .wechat-preview h2 { border-bottom: 1px solid #eee; padding-bottom: 0.2em; margin-top: 1.8em; } .wechat-preview p { line-height: 1.8; margin-bottom: 1.5em; } .wechat-preview blockquote { border-left: 4px solid currentColor; background-color: #f4ecf7; font-style: italic; } .wechat-preview code:not(pre code) { background-color: #f9f2f4; }`,
  
  clean: `.wechat-preview { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.75; } .wechat-preview h1 { text-align: center; border-bottom: none; font-size: 1.7em; font-weight: 500; } .wechat-preview h2 { font-size: 1.4em; font-weight: 500; border-bottom: none; } .wechat-preview p { margin-bottom: 1.2em; } .wechat-preview blockquote { border-left: 3px solid currentColor; background-color: #fafafa; font-size: 0.95em; } .wechat-preview code:not(pre code) { background-color: #f5f5f5; color: inherit; } .wechat-preview pre { box-shadow: none; border: 1px solid #eee; }`,
  
  academic: `.wechat-preview { font-family: Georgia, Cambria, "Times New Roman", Times, serif; line-height: 1.7; } .wechat-preview h1 { font-size: 1.9em; text-align: center; font-weight: 700; } .wechat-preview h2 { font-size: 1.5em; font-weight: 700; } .wechat-preview h3 { font-size: 1.3em; font-weight: 600; } .wechat-preview p { text-align: justify; margin-bottom: 1.2em; } .wechat-preview blockquote { font-style: italic; border-left: 3px solid currentColor; background-color: #eaf2f8; } .wechat-preview .math-display { overflow-x: auto; padding: 0.5em 0; } .wechat-preview table { font-size: 0.9em; } .wechat-preview table th { background-color: #eee; }`
  
  // 已移除modern和magazine预设
};

// Example Markdown
const exampleMarkdown = `# Markdown 转微信图文示例\n\n这是一个**Markdown**转*微信图文*的工具示例。\n\n## 功能特性\n\n- 支持标准 Markdown 语法\n- 代码高亮显示\n- 表格渲染\n- LaTeX 公式\n- Mermaid 流程图\n- 自定义CSS样式\n\n## 代码示例\n\n\`\`\`javascript\nfunction greeting(name) {\n  return "Hello, " + name + "!";\n}\n\nconsole.log(greeting('World'));\n\`\`\`\n\n## 表格示例\n\n| 特性 | 支持情况 |\n|------|----------|\n| 标题 | ✅ |\n| 列表 | ✅ |\n| 代码块 | ✅ |\n| 表格 | ✅ |\n| LaTeX | ✅ |\n| Mermaid | ✅ |\n| 自定义CSS | ✅ |\n\n## LaTeX 公式示例\n\n行内公式：$E=mc^2$ 渲染效果。 $a^2+b^2=c^2$ \n\n块级公式：\n\n$$\n\\begin{aligned}\n\\frac{\\partial u}{\\partial t} &= h^2 \\left( \\frac{\\partial^2 u}{\\partial x^2} + \\frac{\\partial^2 u}{\\partial y^2} + \\frac{\\partial^2 u}{\\partial z^2} \\right) \\\\\n&= h^2 \\nabla^2 u\n\\end{aligned}\n$$\n\n## Mermaid 流程图示例\n\n\`\`\`mermaid\ngraph TD;\n    A[开始] -->|输入| B(处理);\n    B --> C{判断};\n    C -->|是| D[输出1];\n    C -->|否| E[输出2];\n    D --> F[结束];\n    E --> F;\n\`\`\`\n\n> 这是一个引用块。\n\n更多详情请访问 [GitHub](https://github.com)。`;


// --- Helper Functions ---

const loadScript = (url) => {
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${url}"]`);
    if (existingScript) {
      // Handle case where script might be loading but not finished
      if (existingScript.dataset.loaded === 'true') {
        resolve();
      } else {
        existingScript.addEventListener('load', resolve);
        existingScript.addEventListener('error', reject);
      }
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.dataset.loaded = 'false'; // Mark as not loaded yet
    script.onload = () => {
      script.dataset.loaded = 'true'; // Mark as loaded
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const loadMathJax = async () => {
  if (MathJax) return MathJax;
  try {
    // Configure MathJax before loading
    window.MathJax = {
      tex: {
        inlineMath: [['$', '$']], // Default inline math delimiters
        displayMath: [['$$', '$$']], // Default display math delimiters
        processEscapes: true
      },
      svg: {
        fontCache: 'global'
      },
      options: {
        skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'], // Don't process math in these tags
        ignoreHtmlClass: 'tex2jax_ignore',
        processHtmlClass: 'tex2jax_process'
      },
      startup: {
        ready: () => {
          console.log('MathJax Startup Ready.');
          MathJax = window.MathJax;
          MathJax.startup.defaultReady();
          // Ensure typeset call happens after ready if needed elsewhere
        }
      }
    };

    // Use a reliable CDN
    await loadScript('https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js');
    console.log('MathJax loaded successfully.');
    return window.MathJax;
  } catch (error) {
    console.error('Failed to load MathJax:', error);
    showNotification('加载数学公式库失败', 'error');
    throw error; // Re-throw to indicate failure
  }
};

const loadMermaid = async () => {
    // 如果已加载，确保正确初始化（避免重复加载）
    if (window.mermaid) {
        try {
            await window.mermaid.initialize({
                startOnLoad: false,
                theme: isDarkTheme.value ? 'dark' : 'default',
                securityLevel: 'loose',
            });
            console.log('Mermaid已加载，重新初始化完成');
            mermaid = window.mermaid;
            return window.mermaid;
        } catch (initError) {
            console.error("重新初始化Mermaid失败:", initError);
        }
    }

    console.log("开始加载Mermaid库...");
    try {
        // 直接使用可靠的CDN
        const mermaidUrl = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
        
        console.log(`从 ${mermaidUrl} 加载Mermaid...`);
        await loadScript(mermaidUrl);
        
        if (!window.mermaid) {
            throw new Error("Mermaid加载后未正确初始化");
        }

        mermaid = window.mermaid;
        console.log('Mermaid库加载成功');

        // 初始化Mermaid配置
        await mermaid.initialize({
            startOnLoad: false,
            theme: isDarkTheme.value ? 'dark' : 'default',
            securityLevel: 'loose',
            fontFamily: fontType.value === 'serif' ? 'Georgia, serif' : 'sans-serif'
        });
        console.log('Mermaid初始化完成');

        return mermaid;
    } catch (error) {
        console.error('加载或初始化Mermaid失败:', error);
        showNotification('加载图表库失败: ' + error.message, 'error');
        mermaid = null;
        throw error;
    }
};


// --- Core Rendering Logic ---

// Configure Marked
marked.setOptions({
  gfm: true,
  breaks: true, // Render line breaks as <br>
  highlight: function(code, lang) {
    if (lang === 'mermaid') {
      return code; // Mermaid代码不需要高亮
    }
    
    try {
      // 明确指定语言时使用该语言高亮
      if (hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
      }
      // 如果没有指定语言，尝试自动检测
      return hljs.highlightAuto(code).value;
    } catch (error) {
      console.error('代码高亮错误:', error);
      return code; // 出错时返回原始代码
    }
  },
  langPrefix: 'hljs language-' // 添加css类前缀
});


const renderOutput = async () => {
  if (isRendering.value) return; // Prevent concurrent renders
  isRendering.value = true;
  console.log('Starting render...');

  try {
    // 1. Load dependencies if needed (do this early)
    const loadPromises = [];
    if (enableLatex.value && !MathJax) {
        loadPromises.push(loadMathJax().catch(e => { 
          console.error('Failed to load MathJax:', e);
          showNotification('加载数学公式库失败', 'error');
        }));
    }
    if (enableMermaid.value && !mermaid) {
        loadPromises.push(loadMermaid().catch(e => { 
          console.error('Failed to load Mermaid:', e);
          showNotification('加载图表库失败', 'error');
        }));
    }
    // Wait for libraries critical for this render cycle to load
    await Promise.all(loadPromises);

    // 2. Basic Markdown to HTML conversion
    // Use a renderer override for mermaid blocks
    const renderer = new marked.Renderer();
    const originalCodeRenderer = renderer.code;
    renderer.code = (code, language) => {
      if (language === 'mermaid' && enableMermaid.value) {
        // 确保有唯一ID用于渲染
        const id = `mermaid-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        // 直接返回标准格式的mermaid容器，不转义内容
        console.log('正在创建Mermaid块，ID:', id);
        return `<div id="${id}" class="mermaid" style="text-align:center; overflow-x:auto;">${code}</div>`;
      }
      // 用默认渲染器处理其他语言
      return originalCodeRenderer.call(renderer, code, language);
    };

    // 确保Marked不处理LaTeX分隔符，尤其是对于块级公式
    // 通过使用自定义的smartypants规则来保护数学公式
    marked.use({
      gfm: true,
      breaks: true,
      smartypants: false, // 关闭smartypants以避免处理引号和破折号
    });

    // Note: Marked doesn't have a direct way to ignore inline/block math.
    // MathJax is designed to find its delimiters ($...$, $$...$$) in the final HTML.
    let rawHtml = marked.parse(markdownInput.value || '', { renderer });
    
    // 特殊处理: 保护块级公式不被包裹在<p>标签内 (这可能导致MathJax无法识别)
    rawHtml = rawHtml.replace(/<p>\s*(\$\$[\s\S]*?\$\$)\s*<\/p>/g, '$1');
    
    htmlOutput.value = rawHtml;

    // 3. Wait for Vue to update the DOM
    await nextTick();
    console.log('DOM updated with base HTML.');

    // Ensure previewArea is available
    if (!previewArea.value) {
      console.error("Preview area ref not found after nextTick.");
      isRendering.value = false;
      return;
    }

    // 4. Process LaTeX with MathJax
    if (enableLatex.value && MathJax) {
      console.log('Processing LaTeX with MathJax...');
      try {
         // 预处理公式以确保更好的渲染
         // 将块级公式包裹在特殊div中以确保渲染
         let content = previewArea.value.innerHTML;
         
         // 1. 首先，清理掉可能影响公式解析的HTML标签
         content = content.replace(/<p>\s*(\$\$[\s\S]*?\$\$)\s*<\/p>/g, '<div class="math-display">$1</div>');
         
         // 2. 确保所有的块级公式都在正确的div中
         content = content.replace(/([^$]|^)\$\$([\s\S]*?)\$\$([^$]|$)/g, '$1<div class="math-display">$$' + '$2' + '$$</div>$3');
         
         // 3. 修复可能存在的嵌套问题
         content = content.replace(/<div class="math-display">\s*<div class="math-display">/g, '<div class="math-display">');
         content = content.replace(/<\/div>\s*<\/div>/g, '</div>');
         
         // 更新DOM
         previewArea.value.innerHTML = content;
         
         // Clear previous typesetting results
         MathJax.startup.document.reset();
         
         // Find and render math in the specific preview area
         console.log('执行MathJax排版...');
         await MathJax.typesetPromise([previewArea.value]);
         console.log('MathJax typesetting complete.');
         
         // 验证渲染结果
         const mathJaxElements = previewArea.value.querySelectorAll('mjx-container');
         console.log(`找到 ${mathJaxElements.length} 个已渲染的MathJax元素`);
         
         // 如果没有找到任何渲染元素，但有公式存在，尝试额外方法
         if (mathJaxElements.length === 0 && previewArea.value.textContent.includes('$$')) {
           console.warn('未发现渲染后的公式元素，尝试替代方法');
           
           // 尝试直接替换为MathJax能识别的特殊标记形式
           const mathRegex = /\$\$([\s\S]*?)\$\$/g;
           let mathContent = previewArea.value.innerHTML;
           let matches = [...mathContent.matchAll(mathRegex)];
           
           console.log(`找到 ${matches.length} 个未渲染的公式`);
           
           if (matches.length > 0) {
             // 手动创建更清晰的公式容器
             let newContent = mathContent;
             matches.forEach((match, index) => {
               const formula = match[1];
               const id = `math-${Date.now()}-${index}`;
               const replacement = `<div id="${id}" class="math-display" style="text-align:center;margin:1em 0;overflow-x:auto;">$$${formula}$$</div>`;
               newContent = newContent.replace(match[0], replacement);
             });
             
             previewArea.value.innerHTML = newContent;
             await MathJax.typesetPromise([previewArea.value]);
             console.log('完成替代方法渲染');
           }
         }
      } catch (error) {
        console.error('MathJax typesetting failed:', error);
        showNotification('渲染数学公式失败', 'error');
        
        // 尝试更简单的方式重新渲染
        try {
          console.log('尝试紧急兜底方案渲染公式...');
          // 使用最简单的替换方式
          const rawText = markdownInput.value || '';
          const mathBlocks = rawText.match(/\$\$([\s\S]*?)\$\$/g) || [];
          
          if (mathBlocks.length > 0) {
            console.log(`找到 ${mathBlocks.length} 个原始公式块，尝试单独渲染`);
            
            // 创建一个临时容器单独用于渲染公式
            const tempMathContainer = document.createElement('div');
            tempMathContainer.style.display = 'none';
            document.body.appendChild(tempMathContainer);
            
            // 只渲染公式部分
            let mathHtml = '';
            mathBlocks.forEach((block, index) => {
              mathHtml += `<div id="math-emergency-${index}" class="math-display">${block}</div>`;
            });
            
            tempMathContainer.innerHTML = mathHtml;
            await MathJax.typesetPromise([tempMathContainer]);
            
            // 将渲染好的公式插回原内容
            const renderedBlocks = tempMathContainer.querySelectorAll('.math-display');
            const contentParts = rawText.split(/\$\$([\s\S]*?)\$\$/g);
            
            let finalHtml = '';
            let blockIndex = 0;
            
            for (let i = 0; i < contentParts.length; i++) {
              if (i % 2 === 0) {
                // 普通文本部分，使用marked解析
                finalHtml += marked.parse(contentParts[i]);
              } else {
                // 公式部分，使用渲染好的HTML
                if (blockIndex < renderedBlocks.length) {
                  finalHtml += renderedBlocks[blockIndex].innerHTML;
                  blockIndex++;
                }
              }
            }
            
            if (finalHtml) {
              previewArea.value.innerHTML = finalHtml;
            }
            
            // 清理临时元素
            document.body.removeChild(tempMathContainer);
          }
        } catch (fallbackError) {
          console.error('所有公式渲染方法均失败:', fallbackError);
        }
      }
    } else if (enableLatex.value && !MathJax) {
        console.warn('LaTeX enabled but MathJax library not loaded.');
    }

    // 5. Process Mermaid diagrams
    if (enableMermaid.value && mermaid) {
        console.log('Processing Mermaid diagrams...');
        await processMermaidDiagrams();
    } else if (enableMermaid.value && !mermaid) {
         console.warn('Mermaid enabled but Mermaid library not loaded.');
    }

    // 6. Apply code block styling (after hljs has run)
    updateCodeStyleClasses();

    // 7. Post-processing (e.g., open links in new tab)
     if (previewArea.value) {
        const links = previewArea.value.querySelectorAll('a');
        links.forEach(link => {
          // Only add target="_blank" to external links
          if (link.hostname !== window.location.hostname) {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
          }
        });
     }

  } catch (error) {
    console.error('Rendering failed:', error);
    htmlOutput.value = `<div class="error-message">渲染出错: ${error.message}</div>`;
    showNotification('渲染过程中断', 'error');
  } finally {
    isRendering.value = false;
    console.log('Render finished.');
  }
};

const debouncedRenderOutput = debounce(renderOutput, 500);


// --- Style Management ---

const applyCustomCSS = debounce(() => {
  try {
    let styleEl = document.getElementById(customStyleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = customStyleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = customCSS.value || ''; // Set or clear content
  } catch (error) {
    console.error('应用自定义CSS错误:', error);
    showNotification('自定义CSS格式错误', 'error');
  }
}, 500);

watch(customCSS, applyCustomCSS); // Apply when customCSS changes

const applyPresetStyle = (presetName) => {
  // 清除之前的样式
  if (currentPreset.value !== presetName) {
    // 先清空现有样式
    let styleEl = document.getElementById(customStyleId);
    if (styleEl) {
      styleEl.textContent = '';
    }
  }
  
  // 设置新的预设
  currentPreset.value = presetName;
  customCSS.value = stylePresets[presetName] || '';
  
  // 确保样式立即生效
  nextTick(() => {
    applyCustomCSS();
  });
};


// Function to load highlight.js theme CSS
const loadCodeStyleCSS = () => {
  // 移除现有样式
  if (codeStyleLink.value) {
    codeStyleLink.value.remove();
    codeStyleLink.value = null;
  }

  // 根据当前主题选择样式文件
  if (codeStyle.value !== 'github') {
    themeName = codeStyle.value; // 如果明确选择了不同于默认的样式
  }

  // 使用CDN加载样式文件
  const cssPath = `https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/${themeName}.min.css`;
  console.log(`加载代码高亮样式: ${cssPath}`);

  // 创建并添加样式链接
  const link = document.createElement('link');
  link.id = 'hljs-theme-link';
  link.rel = 'stylesheet';
  link.href = cssPath;
  link.onload = () => {
    console.log(`代码样式已加载: ${themeName}`);
    // 强制刷新代码块样式
    if (previewArea.value) {
      const codeBlocks = previewArea.value.querySelectorAll('pre code');
      if (codeBlocks.length > 0) {
        console.log(`应用样式到 ${codeBlocks.length} 个代码块`);
        codeBlocks.forEach(block => {
          // 确保代码块有正确的类名
          if (!block.classList.contains('hljs')) {
            block.classList.add('hljs');
          }
        });
      }
    }
  };
  link.onerror = () => {
    console.error(`加载代码样式失败: ${cssPath}`);
    showNotification(`无法加载代码样式: ${themeName}`, 'error');
  };

  document.head.appendChild(link);
  codeStyleLink.value = link;
};

// Update class on preview area AND load CSS
const updateCodeStyle = () => {
  loadCodeStyleCSS();
  updateCodeStyleClasses(); // Update classes immediately for structure
};
const debouncedUpdateCodeStyle = debounce(updateCodeStyle, 100); // Debounce CSS loading/class updates

// Update only the classes on the preview area (used after render)
const updateCodeStyleClasses = () => {
  if (!previewArea.value) return;
  
  const codeBlocks = previewArea.value.querySelectorAll('pre code');
  if (codeBlocks.length === 0) {
    console.log('没有找到代码块');
    return;
  }
  
  console.log(`找到 ${codeBlocks.length} 个代码块，应用高亮`);
  
  codeBlocks.forEach(block => {
    if (!block.classList.contains('hljs')) {
      // 如果没有hljs类，需要手动应用高亮
      const language = [...block.classList]
        .find(cls => cls.startsWith('language-'))
        ?.replace('language-', '');
      
      if (language && language !== 'mermaid') {
        try {
          if (hljs.getLanguage(language)) {
            const highlightedCode = hljs.highlight(block.textContent, { 
              language, 
              ignoreIllegals: true 
            }).value;
            block.innerHTML = highlightedCode;
          } else {
            // 使用自动检测
            block.innerHTML = hljs.highlightAuto(block.textContent).value;
          }
          // 添加hljs类
          block.classList.add('hljs');
        } catch (error) {
          console.error(`高亮代码块失败:`, error);
        }
      }
    }
  });
};

watch(codeStyle, () => {
  // Update style CSS and re-render if needed (hljs applies classes during render)
  loadCodeStyleCSS(); // Load the new CSS
});

watch(isDarkTheme, () => {
  // Reload code style CSS for potential dark variant and re-render
  loadCodeStyleCSS();
});

watch(fontSize, (newSize) => {
  document.documentElement.style.setProperty('--font-size', newSize);
});
watch(lineHeight, (newHeight) => {
  document.documentElement.style.setProperty('--line-height', newHeight);
});

// --- UI Actions ---

const copyWechatFormat = () => {
  if (!previewArea.value) return;

  try {
    // 获取要复制的内容
    const clonedNode = previewArea.value.cloneNode(true);
    // 清理不需要复制的元素
    clonedNode.querySelectorAll('.error-message').forEach(el => el.remove());
    const htmlToCopy = clonedNode.innerHTML;

    // 创建临时元素用于复制
    const tempElement = document.createElement('div');
    tempElement.innerHTML = htmlToCopy;
    tempElement.style.position = 'absolute';
    tempElement.style.left = '-9999px';
    document.body.appendChild(tempElement);

    // 选择临时元素
    const range = document.createRange();
    range.selectNode(tempElement);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    // 尝试复制
    let copySuccess = false;
    try {
      copySuccess = document.execCommand('copy');
    } catch (err) {
      console.error('execCommand复制失败:', err);
    }

    // 尝试使用新的Clipboard API
    if (!copySuccess && navigator.clipboard) {
      navigator.clipboard.writeText(tempElement.innerText || tempElement.textContent)
        .then(() => {
          showNotification('已复制公众号格式', 'success');
        })
        .catch(err => {
          console.error('Clipboard API复制失败:', err);
          showNotification('复制失败，请手动复制', 'error');
        });
    } else if (copySuccess) {
      showNotification('已复制公众号格式', 'success');
    } else {
      showNotification('复制失败，请手动复制', 'error');
    }

    // 清理
    selection.removeAllRanges();
    document.body.removeChild(tempElement);
  } catch (error) {
    console.error('复制过程中发生错误:', error);
    showNotification('复制失败，请手动复制', 'error');
  }
};

const clearInput = () => {
  markdownInput.value = '';
  htmlOutput.value = ''; // Clear output immediately
};

const pasteExample = () => {
  markdownInput.value = exampleMarkdown;
  renderOutput(); // Trigger immediate render for example
};

const toggleTheme = () => {
  isDarkTheme.value = !isDarkTheme.value;
  // updateCodeStyle handles CSS loading. Render handles mermaid theme.
};

const setThemeColor = (color) => {
  themeColor.value = color;
  document.documentElement.style.setProperty('--theme-color', color);
};


// --- Lifecycle Hooks ---

onMounted(async () => {
  // Set initial CSS variables
  document.documentElement.style.setProperty('--theme-color', themeColor.value);
  document.documentElement.style.setProperty('--font-size', fontSize.value);
  document.documentElement.style.setProperty('--line-height', lineHeight.value);

  // Load initial code style CSS
  loadCodeStyleCSS();

  // Apply initial custom CSS if any
  applyCustomCSS();

  // Preload libraries in the background after mount for faster first render
  // Don't await here, let them load async. Render logic will await if needed.
  if (enableLatex.value) loadMathJax().catch(e => console.error("Preload MathJax failed", e));
  if (enableMermaid.value) loadMermaid().catch(e => console.error("Preload Mermaid failed", e));

  // Optionally render the example on load
   pasteExample(); // Load and render example initially
});

onBeforeUnmount(() => {
  // Clean up custom style element
  const styleEl = document.getElementById(customStyleId);
  if (styleEl) {
    styleEl.remove();
  }
  // Clean up hljs theme link
   if (codeStyleLink.value) {
        codeStyleLink.value.remove();
   }
   // Clean up MathJax globals? Usually not necessary.
});

// 处理Mermaid图表渲染
const processMermaidDiagrams = async () => {
  if (!enableMermaid.value || !mermaid || !previewArea.value) {
    console.log('条件不满足: enableMermaid=', enableMermaid.value, 'mermaid=', !!mermaid, 'previewArea=', !!previewArea.value);
    return;
  }
  
  console.log('Processing Mermaid diagrams...');
  try {
    // 找到所有Mermaid元素
    const mermaidElements = previewArea.value.querySelectorAll('div.mermaid');
    console.log('找到的所有Mermaid元素:', mermaidElements.length);
    
    if (mermaidElements.length > 0) {
      console.log(`找到 ${mermaidElements.length} 个Mermaid图表`);
      
      // 优化Mermaid配置 - 使尺寸更紧凑
      mermaid.initialize({
        startOnLoad: false,
        theme: isDarkTheme.value ? 'dark' : 'neutral',
        securityLevel: 'loose',
        fontFamily: fontType.value === 'serif' ? 'Georgia, serif' : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        themeVariables: {
          primaryColor: themeColor.value,
          primaryTextColor: '#333',
          primaryBorderColor: themeColor.value,
          lineColor: '#666',
          secondaryColor: '#f4f4f4',
          tertiaryColor: '#fff',
          // 优化节点样式
          nodeBorder: themeColor.value,
          mainBkg: '#fff',
          nodeBkg: '#fff',
          fontSize: '14px',
          // 加强连线样式
          edgeLabelBackground: '#fff',
          labelBackground: '#fff',
          // 更多美化变量
          titleColor: themeColor.value,
          activationBorderColor: themeColor.value,
          classText: '#333',
          loopTextColor: '#333'
        },
        flowchart: {
          htmlLabels: true,
          curve: 'natural', // 使用更优雅的曲线
          useMaxWidth: true, 
          padding: 8, // 轻微增加节点内部填充，更美观
          diagramPadding: 6, // 优化图表整体内边距
          rankSpacing: 40, // 层级间距
          nodeSpacing: 30, // 同层节点间距
          bottomMarginAdj: 2 // 底部边距调整
        },
        sequence: {
          // 序列图特殊设置
          actorMargin: 50, // 角色之间的间距
          boxMargin: 10,
          noteMargin: 10,
          messageMargin: 35, // 消息间距 
          mirrorActors: true,
          bottomMarginAdj: 10,
          useMaxWidth: true
        },
        // 更多图表配置
        htmlLabels: true,
        nodeSpacing: 25, // 减小节点间距
        rankSpacing: 40, // 优化层级间距
        padding: 8 // 美化节点内边距
      });
      
      // 对每个图表单独处理
      for (const element of mermaidElements) {
        try {
          // 获取原始代码并去除空格
          const graphCode = element.textContent.trim();
          console.log(`处理图表代码: ${graphCode.substring(0, 50)}${graphCode.length > 50 ? '...' : ''}`);
          
          if (!graphCode) {
            console.warn(`图表内容为空, 跳过渲染`);
            continue;
          }
          
          // 创建一个临时容器处理图表
          const tempId = `temp-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
          const tempContainer = document.createElement('div');
          tempContainer.id = tempId;
          tempContainer.style.display = 'none';
          document.body.appendChild(tempContainer);
          
          // 渲染到临时容器
          console.log(`渲染到临时容器 ${tempId}`);
          const { svg } = await mermaid.render(tempId, graphCode);
          
          // 将SVG内容插入到原始元素
          element.innerHTML = svg;
          console.log('SVG插入完成');
          
          // 确保SVG可见并优化样式 - 减小尺寸
          const svgElement = element.querySelector('svg');
          if (svgElement) {
            svgElement.style.display = 'block';
            svgElement.style.margin = '0 auto';
            svgElement.style.maxWidth = '100%';
            svgElement.style.borderRadius = '8px';
            svgElement.style.backgroundColor = '#fff';
            svgElement.style.padding = '8px'; // 统一内边距
            
            // 优化整体大小 - 使用更优雅的尺寸控制
            const targetHeight = 350; // 目标高度：既不太大也不太小
            
            if (svgElement.height.baseVal.value > targetHeight) {
              const aspectRatio = svgElement.width.baseVal.value / svgElement.height.baseVal.value;
              const newHeight = targetHeight;
              const newWidth = Math.round(newHeight * aspectRatio);
              svgElement.setAttribute('height', newHeight);
              svgElement.setAttribute('width', newWidth);
              
              // 确保宽度不超过容器
              if (newWidth > element.offsetWidth - 20) {
                const adjustedWidth = element.offsetWidth - 20;
                const adjustedHeight = Math.round(adjustedWidth / aspectRatio);
                svgElement.setAttribute('width', adjustedWidth);
                svgElement.setAttribute('height', adjustedHeight);
              }
            }
            
            // 优化SVG内部样式 - 统一风格
            svgElement.querySelectorAll('.node rect, .node circle, .node ellipse, .node polygon').forEach(el => {
              // 设置节点样式
              const fill = '#ffffff';
              const stroke = themeColor.value;
              
              el.setAttribute('fill', fill);
              el.setAttribute('stroke', stroke);
              el.setAttribute('stroke-width', '1.5');
              el.setAttribute('rx', '6'); // 圆角半径
              el.setAttribute('ry', '6');
              
              // 添加精美阴影效果
              const filterId = `shadow-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
              const existingDefs = svgElement.querySelector('defs') || svgElement.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'defs'));
              
              // 如果没有阴影滤镜，创建一个
              if (!existingDefs.querySelector(`#${filterId}`)) {
                const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
                filter.setAttribute('id', filterId);
                filter.setAttribute('x', '-10%');
                filter.setAttribute('y', '-10%');
                filter.setAttribute('width', '120%');
                filter.setAttribute('height', '120%');
                
                const feDropShadow = document.createElementNS('http://www.w3.org/2000/svg', 'feDropShadow');
                feDropShadow.setAttribute('dx', '0');
                feDropShadow.setAttribute('dy', '1');
                feDropShadow.setAttribute('stdDeviation', '1');
                feDropShadow.setAttribute('flood-color', 'rgba(0, 0, 0, 0.15)');
                feDropShadow.setAttribute('flood-opacity', '0.5');
                
                filter.appendChild(feDropShadow);
                existingDefs.appendChild(filter);
              }
              
              el.setAttribute('filter', `url(#${filterId})`);
            });
            
            // 确保文本样式统一美观
            svgElement.querySelectorAll('.nodeLabel, .edgeLabel, .label').forEach(el => {
              el.style.fontFamily = fontType.value === 'serif' ? 'Georgia, serif' : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
              el.style.fontSize = '13px';
              el.style.fontWeight = '500';
              el.style.fill = '#333';
            });
            
            // 优化箭头和连线
            svgElement.querySelectorAll('.edgePath path.path, .flowchart-link').forEach(el => {
              el.setAttribute('stroke', '#aaa');
              el.setAttribute('stroke-width', '1.5');
            });
            
            // 美化箭头
            svgElement.querySelectorAll('marker path').forEach(el => {
              el.setAttribute('fill', themeColor.value);
              el.setAttribute('stroke', 'none');
            });
            
            console.log('已优化SVG样式和尺寸');
          }
          
          // 移除临时容器
          tempContainer.remove();
        } catch (diagramError) {
          console.error('图表渲染失败:', diagramError);
          element.innerHTML = `<div class="mermaid-error">
            <div class="error-title">图表渲染失败: ${diagramError.message}</div>
            <pre class="error-code">${element.textContent}</pre>
          </div>`;
        }
      }
      console.log('Mermaid图表处理完成');
    } else {
      console.warn('未找到Mermaid图表元素');
      
      // 尝试查找不正确的选择器匹配的元素
      const potentialMermaid = previewArea.value.querySelectorAll('pre code.language-mermaid');
      if (potentialMermaid.length > 0) {
        console.log('找到可能的Mermaid代码块，但格式不正确:', potentialMermaid.length, '个元素');
        potentialMermaid.forEach((el, index) => {
          const id = `mermaid-fixed-${Date.now()}-${index}`;
          const code = el.textContent.trim();
          const parent = el.closest('pre');
          if (parent && code) {
            console.log(`尝试修复 Mermaid 块 #${index}`);
            const div = document.createElement('div');
            div.id = id;
            div.className = 'mermaid';
            div.textContent = code;
            div.style.textAlign = 'center';
            div.style.overflow = 'auto';
            div.style.margin = '2em auto';
            parent.replaceWith(div);
            console.log(`已修复 Mermaid 块 #${index}，ID=${id}`);
          }
        });
        
        // 递归调用自身处理新创建的元素
        setTimeout(() => processMermaidDiagrams(), 0);
        return;
      }
      
      // 检查是否有带mermaid类但内容格式不完整的元素
      const incompleteElements = previewArea.value.querySelectorAll('div:not([class="mermaid"]) pre code');
      incompleteElements.forEach((el) => {
        const text = el.textContent || '';
        if (text.includes('graph') || text.includes('sequenceDiagram') || text.includes('gantt')) {
          console.log('发现可能的Mermaid代码:', text.substring(0, 30));
          const parent = el.closest('pre');
          if (parent) {
            const id = `mermaid-detected-${Date.now()}`;
            const div = document.createElement('div');
            div.id = id;
            div.className = 'mermaid';
            div.textContent = text;
            div.style.textAlign = 'center';
            div.style.overflow = 'auto';
            div.style.margin = '2em auto';
            parent.replaceWith(div);
            console.log(`转换了可能的Mermaid代码块，ID=${id}`);
          }
        }
      });
      
      // 如果发现了新的元素，再次调用
      const newMermaidElements = previewArea.value.querySelectorAll('div.mermaid');
      if (newMermaidElements.length > 0) {
        console.log(`发现 ${newMermaidElements.length} 个新的Mermaid元素，重新处理`);
        setTimeout(() => processMermaidDiagrams(), 0);
      }
    }
  } catch (error) {
    console.error('Mermaid渲染过程失败:', error);
    showNotification(`Mermaid渲染失败: ${error.message}`, 'error');
  }
};

// 添加CSS编辑器相关函数
const expandCSSEditor = () => {
  const textarea = document.querySelector('.resize-vertical');
  if (textarea) {
    textarea.style.height = (textarea.offsetHeight * 1.5) + 'px';
  }
};

const clearCustomCSS = () => {
  customCSS.value = '';
  applyCustomCSS();
};

</script>

<style>
/* Base Styles (Keep these) */
:root {
  --theme-color: #07C160;
  --heading-color: #2c3e50;
  --text-color: #333;
  --bg-color: #fff;
  --border-color: #eaeaea;
  --code-bg: #f5f5f5;
  --blockquote-bg: #f9f9f9;
  --blockquote-border: #ccc;
  --font-size: 16px;
  --line-height: 1.7;
  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --border-radius: 8px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.05);
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
}

/* Wechat Preview Container */
.wechat-preview-container {
  background-color: #f9f9f9;
  padding: 2rem;
  overflow-y: auto;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

/* Wechat Preview Box */
.wechat-preview {
  width: 100%;
  max-width: 720px;
  background-color: var(--bg-color);
  box-shadow: var(--shadow-md);
  border-radius: var(--border-radius);
  padding: 2.5rem 3rem;
  margin-bottom: 2rem;
  font-size: var(--font-size);
  line-height: var(--line-height);
  color: var(--text-color);
  word-wrap: break-word;
  overflow-wrap: break-word;
  -webkit-font-smoothing: antialiased;
  transition: all 0.3s ease;
}

/* Headings */
.wechat-preview h1,
.wechat-preview h2,
.wechat-preview h3,
.wechat-preview h4,
.wechat-preview h5,
.wechat-preview h6 {
  color: var(--heading-color);
  font-weight: 600;
  margin-top: 2em;
  margin-bottom: 1em;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

.wechat-preview h1 {
  font-size: 2em;
  font-weight: 700;
  text-align: center;
  margin: 1.5em 0 1.8em;
  line-height: 1.4;
  position: relative;
  padding-bottom: 0.8em;
  color: var(--theme-color);
}

.wechat-preview h1::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 3px;
  background-color: var(--theme-color);
  border-radius: 3px;
}

.wechat-preview h2 {
  font-size: 1.5em;
  font-weight: 600;
  margin-top: 2.2em;
  margin-bottom: 1em;
  padding-bottom: 0.5em;
  border-bottom: 1px solid #f0f0f0;
  position: relative;
  color: var(--theme-color);
}

.wechat-preview h2::before {
  content: "";
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 40px;
  height: 3px;
  background-color: var(--theme-color);
}

.wechat-preview h3 {
  font-size: 1.25em;
  margin-top: 1.8em;
  color: var(--theme-color);
}

.wechat-preview h4 {
  font-size: 1.1em;
  margin-top: 1.6em;
}

/* Paragraphs */
.wechat-preview p {
  margin-bottom: 1.4em;
  line-height: var(--line-height);
  color: var(--text-color);
}

/* Links */
.wechat-preview a {
  color: var(--theme-color);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: all 0.2s ease-in-out;
  font-weight: 500;
}

.wechat-preview a:hover {
  border-bottom-color: var(--theme-color);
  opacity: 0.9;
}

/* Strong / Em / Del */
.wechat-preview strong {
  font-weight: 600;
  color: inherit;
}

.wechat-preview em {
  font-style: italic;
}

.wechat-preview del {
  text-decoration: line-through;
  color: #999;
}

/* Images */
.wechat-preview img {
  max-width: 100%;
  height: auto;
  margin: 2em auto;
  display: block;
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-sm);
}

/* Blockquotes */
.wechat-preview blockquote {
  background-color: var(--blockquote-bg);
  border-left: 4px solid var(--theme-color);
  padding: 1.2em 1.5em;
  margin: 1.8em 0;
  color: #555;
  border-radius: 0 var(--border-radius) var(--border-radius) 0;
  font-style: italic;
}

.wechat-preview blockquote p:last-child {
  margin-bottom: 0;
}

/* Inline Code */
.wechat-preview code:not(pre code) {
  background-color: var(--code-bg);
  padding: 0.2em 0.45em;
  border-radius: 4px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
  font-size: 0.9em;
  color: #d63384;
  word-break: break-word;
}

/* Code Blocks (Container) */
.wechat-preview pre {
  background-color: #f8f9fa;
  border-radius: var(--border-radius);
  padding: 1.2em;
  overflow-x: auto;
  margin: 1.8em 0;
  border: 1px solid var(--border-color);
  position: relative;
  line-height: 1.5;
}

/* Code within Blocks */
.wechat-preview pre code.hljs {
  display: block;
  overflow-x: auto;
  padding: 0;
  background: transparent;
  color: inherit;
  font-size: 0.9em;
  line-height: 1.6;
}

/* Tables */
.wechat-preview table {
  border-collapse: collapse;
  width: 100%;
  margin: 1.8em 0;
  display: block;
  overflow-x: auto;
  border-spacing: 0;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
}

.wechat-preview table th,
.wechat-preview table td {
  border: 1px solid var(--border-color);
  padding: 0.8em 1em;
  text-align: left;
  line-height: 1.4;
}

.wechat-preview table th {
  background-color: rgba(0, 0, 0, 0.03);
  font-weight: 600;
  color: var(--theme-color);
}

.wechat-preview table tr:nth-child(2n) {
  background-color: rgba(0, 0, 0, 0.01);
}

/* Lists */
.wechat-preview ul,
.wechat-preview ol {
  padding-left: 1.8em;
  margin-bottom: 1.5em;
}

.wechat-preview li {
  margin-bottom: 0.6em;
  line-height: 1.6;
}

.wechat-preview ul li ul,
.wechat-preview ol li ol,
.wechat-preview ul li ol,
.wechat-preview ol li ul {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}

/* Horizontal Rule */
.wechat-preview hr {
  height: 1px;
  background-color: var(--border-color);
  border: none;
  margin: 2.5em auto;
  width: 80%;
}

/* LaTeX Math Styles (via MathJax SVG output) */
.wechat-preview mjx-container {
  display: inline-block !important;
  margin: 0.2em 0 !important;
  line-height: 0 !important;
  text-align: center !important;
  border: 0 !important;
  padding: 1px 0 !important;
  overflow-x: auto !important;
  overflow-y: hidden !important;
  max-width: 100% !important;
  vertical-align: middle !important;
}

.wechat-preview mjx-container[display="true"] {
  display: block !important;
  margin: 1.5em auto !important;
  padding: 0.5em 0 !important;
  background: rgba(0, 0, 0, 0.01) !important;
  border-radius: var(--border-radius) !important;
}

.math-display {
  display: block !important;
  margin: 1.5em auto !important;
  overflow-x: auto !important;
  text-align: center !important;
  background: rgba(0, 0, 0, 0.01) !important;
  border-radius: var(--border-radius) !important;
  padding: 1em 0.5em !important;
}

.wechat-preview .MathJax {
  display: inline-block !important;
}

.wechat-preview .MathJax_SVG_Display {
  margin: 1.2em 0 !important;
  text-align: center !important;
}

.wechat-preview mjx-container svg,
.wechat-preview .MathJax_SVG svg {
  max-width: 100% !important;
  display: inline-block !important;
}

/* Mermaid Diagram Styles */
.wechat-preview div.mermaid {
  text-align: center !important;
  margin: 2em auto !important;
  padding: 1em !important;
  background-color: #fafbfc !important;
  border-radius: var(--border-radius) !important;
  box-shadow: var(--shadow-sm) !important;
  max-width: 95% !important;
  overflow-x: auto !important;
  min-height: 50px !important;
  border: 1px solid #f0f2f5 !important;
  transition: all 0.3s ease !important;
}

.wechat-preview div.mermaid:hover {
  box-shadow: var(--shadow-md) !important;
}

.wechat-preview div.mermaid svg {
  max-width: 100% !important;
  height: auto !important;
  display: block !important;
  margin: 0 auto !important;
  overflow: visible !important;
  font-size: 14px !important;
}

/* 优化Mermaid节点样式 */
.wechat-preview div.mermaid .node rect, 
.wechat-preview div.mermaid .node circle, 
.wechat-preview div.mermaid .node ellipse, 
.wechat-preview div.mermaid .node polygon, 
.wechat-preview div.mermaid .node path {
  fill: #fafeff !important;
  stroke-width: 1.5px !important;
  rx: 6px !important;
  ry: 6px !important;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.07)) !important;
}

/* 优化Mermaid连线样式 */
.wechat-preview div.mermaid .edgeLabel {
  background-color: #ffffff !important;
  padding: 2px 4px !important;
  border-radius: 4px !important;
  font-size: 12px !important;
  color: #333 !important;
  font-weight: 500 !important;
}

.wechat-preview div.mermaid .edgePath .path {
  stroke-width: 1.5px !important;
  stroke: #aaa !important;
}

.wechat-preview div.mermaid .flowchart-link {
  stroke: #aaa !important;
  stroke-width: 1.5px !important;
}

/* Loading Indicator */
.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  z-index: 10;
  color: #555;
  font-size: 1.1em;
  flex-direction: column;
}

.loading-indicator::after {
  content: "";
  display: block;
  width: 35px;
  height: 35px;
  margin-top: 15px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top-color: var(--theme-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Error Message Style */
.wechat-preview .error-message {
  color: #D8000C;
  background-color: #FFD2D2;
  border: 1px solid #D8000C;
  padding: 12px 15px;
  margin: 1.2em 0;
  border-radius: var(--border-radius);
  font-size: 0.95em;
}

/* Dark Theme Adjustments */
.wechat-preview.dark-theme {
  --heading-color: #e2e8f0;
  --text-color: #cbd5e1;
  --bg-color: #1a202c;
  --border-color: #4a5568;
  --code-bg: #2d3748;
  --blockquote-bg: #2d3748;
  --blockquote-border: #4a5568;
}

.wechat-preview.dark-theme code:not(pre code) {
  background-color: var(--code-bg);
  color: #fab38e;
}

.wechat-preview.dark-theme pre {
  background-color: #282c34;
  border-color: var(--border-color);
}

.wechat-preview.dark-theme h1,
.wechat-preview.dark-theme h2,
.wechat-preview.dark-theme h3 {
  color: #63b3ed;
}

.wechat-preview.dark-theme table th { 
  background-color: rgba(255, 255, 255, 0.08);
  color: #63b3ed;
}

.wechat-preview.dark-theme table tr:nth-child(2n) { 
  background-color: rgba(255, 255, 255, 0.04);
}

.wechat-preview.dark-theme a { 
  color: #63b3ed;
}

.wechat-preview.dark-theme a:hover { 
  border-bottom-color: #63b3ed;
}

.wechat-preview.dark-theme blockquote { 
  color: #a0aec0;
  background-color: rgba(255, 255, 255, 0.05);
}

.wechat-preview.dark-theme mjx-container svg { 
  fill: var(--text-color);
}

.wechat-preview.dark-theme div.mermaid {
  background-color: #282c34 !important;
  border-color: #4a5568 !important;
}

.wechat-preview.dark-theme div.mermaid .node rect, 
.wechat-preview.dark-theme div.mermaid .node circle, 
.wechat-preview.dark-theme div.mermaid .node ellipse, 
.wechat-preview.dark-theme div.mermaid .node polygon {
  fill: #2d3748 !important;
  stroke: #63b3ed !important;
}

.wechat-preview.dark-theme div.mermaid .edgeLabel {
  background-color: #2d3748 !important;
  color: #cbd5e1 !important;
}

.wechat-preview.dark-theme div.mermaid .edgePath .path {
  stroke: #718096 !important;
}

/* Fix flexbox overflow issue */
.flex-1 { min-width: 0; min-height: 0; }
.h-screen { height: 100vh; }
.overflow-hidden { overflow: hidden; }

/* 优化textarea样式 */
textarea {
  background-color: #fff;
  border-radius: 4px;
  transition: all 0.2s ease;
  resize: none;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
}

textarea:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(7, 193, 96, 0.2);
}

.dark-theme textarea {
  background-color: var(--code-bg);
  color: var(--text-color);
}

/* 修改自定义CSS编辑器部分 */
.resize-vertical {
  height: 100px;
  overflow-y: auto;
}
</style>