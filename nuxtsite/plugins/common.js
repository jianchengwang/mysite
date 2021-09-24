import Vue from 'vue'
var utils = {
  install(Vue) {
    Vue.prototype.utils = {
      formatDate: function (time, format = 'YY-MM-DD') {
        var date = new Date(time)

        var year = date.getFullYear(),
          month = date.getMonth() + 1, //月份是从0开始的
          day = date.getDate(),
          hour = date.getHours(),
          min = date.getMinutes(),
          sec = date.getSeconds()
        var preArr = Array.apply(null, Array(10)).map(function (elem, index) {
          return '0' + index
        }) ////开个长度为10的数组 格式为 00 01 02 03

        var newTime = format
          .replace(/YY/g, year)
          .replace(/MM/g, preArr[month] || month)
          .replace(/DD/g, preArr[day] || day)
          .replace(/hh/g, preArr[hour] || hour)
          .replace(/mm/g, preArr[min] || min)
          .replace(/ss/g, preArr[sec] || sec)

        return newTime
      },
      initClipboard: function () {
        var snippets = document.querySelectorAll('.nuxt-content-highlight');
        var htmlCopyButton = `
            <a href="javascript:void(0)" class="codecopy-btn" aria-label="Copy to clipboard">
              Copy
            </a>`;

        snippets.forEach(snippet => {
          var parent = snippet.parentNode;
          var wrapper = document.createElement('div');

          parent.replaceChild(wrapper, snippet);
          wrapper.appendChild(snippet);

          wrapper.classList.add('code-highlight');
          wrapper.firstChild.insertAdjacentHTML('beforebegin', htmlCopyButton);

          var preSnippet = snippet.firstChild;
          var lang = 'CODE'
          for (let i = 0; i < preSnippet.classList.length; i++) {
            if (preSnippet.classList[i].startsWith('language-')) {
              lang = preSnippet.classList[i].replace('language-', '').toUpperCase();
              break;
            }
          }
          snippet.setAttribute('data-lang', lang);
        });

        // Add copy to clipboard functionality and user feedback
        var clipboard = new ClipboardJS('.codecopy-btn', {
          target: trigger => {
            return trigger.nextSibling;
          },
        });

        clipboard.on('success', e => {
          e.trigger.setAttribute('aria-label', 'Copied!');
          e.clearSelection();
        });

        // Replace tooltip message when mouse leaves button
        // and prevent page refresh after click button
        var btns = document.querySelectorAll('.codecopy-btn');

        btns.forEach(btn => {
          btn.addEventListener('mouseleave', e => {
            e.target.setAttribute('aria-label', 'Copy to clipboard');
            e.target.blur();
          });

          btn.addEventListener('click', e => {
            e.preventDefault();
          });
        });
      }
    }
  }
}
Vue.use(utils)
