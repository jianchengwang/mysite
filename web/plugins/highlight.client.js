// Import the highlight.js styles
import 'highlight.js/styles/github.css';
import 'highlight.js/styles/atom-one-dark.css';

// 如果上面的导入路径不正确，可能需要使用如下替代路径
// import 'highlight.js/lib/styles/github.css';
// import 'highlight.js/lib/styles/atom-one-dark.css';
// import 'highlight.js/lib/styles/vs2015.css';
// import 'highlight.js/lib/styles/monokai.css';
// import 'highlight.js/lib/styles/solarized-light.css';

// 代码高亮插件
import hljs from 'highlight.js'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('page:finish', () => {
    // 高亮所有代码块
    document.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block)
    })
    // 添加复制按钮
    document.querySelectorAll('pre').forEach((pre) => {
      // 避免重复添加
      if (pre.querySelector('.code-copy-btn')) return
      const btn = document.createElement('button')
      btn.className = 'code-copy-btn'
      btn.innerText = 'Copy'
      btn.style.position = 'absolute'
      btn.style.top = '8px'
      btn.style.right = '8px'
      btn.style.zIndex = '10'
      btn.style.padding = '2px 10px'
      btn.style.fontSize = '12px'
      btn.style.background = '#f3f4f6'
      btn.style.border = '1px solid #d1d5db'
      btn.style.borderRadius = '4px'
      btn.style.cursor = 'pointer'
      btn.style.display = 'none'
      btn.onmouseenter = () => btn.style.opacity = '1'
      btn.onmouseleave = () => btn.style.opacity = '1'
      btn.onclick = async (e) => {
        e.stopPropagation()
        const code = pre.querySelector('code')
        if (!code) return
        try {
          await navigator.clipboard.writeText(code.innerText)
          btn.innerText = 'Copied!'
          setTimeout(() => { btn.innerText = 'Copy' }, 1200)
        } catch {
          btn.innerText = 'Failed!'
          setTimeout(() => { btn.innerText = 'Copy' }, 1200)
        }
      }
      pre.style.position = 'relative'
      pre.appendChild(btn)
      // 只在 hover pre 时显示按钮
      pre.addEventListener('mouseenter', () => {
        btn.style.display = 'block'
      })
      pre.addEventListener('mouseleave', () => {
        btn.style.display = 'none'
      })
    })
  })
}) 