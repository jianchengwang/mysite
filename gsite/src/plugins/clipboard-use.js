const initClipboard = function() {
  var snippets = document.querySelectorAll('pre');
  var htmlCopyButton = `
      <button class="codecopy-btn" aria-label="Copy to clipboard">
        Copy
      </button>`;

  snippets.forEach(snippet => {
    var parent = snippet.parentNode;
    var wrapper = document.createElement('div');

    parent.replaceChild(wrapper, snippet);
    wrapper.appendChild(snippet);

    wrapper.classList.add('code-highlight');
    wrapper.firstChild.insertAdjacentHTML('beforebegin', htmlCopyButton);

    var lang = (snippet.classList[0] || 'code').toUpperCase();
    wrapper.setAttribute('data-lang', lang);
  });

  // Add copy to clipboard functionality and user feedback
  var clipboard = new ClipboardJS('.codecopy-btn', {
    target: trigger => {
      return trigger.nextSibling;
    },
  });

  clipboard.on('success', e => {
    e.trigger.setAttribute('aria-label', 'Copied!');
    e.trigger.textContent = "Copied!";
    e.clearSelection();
  });

  // Replace tooltip message when mouse leaves button
  // and prevent page refresh after click button
  var btns = document.querySelectorAll('.codecopy-btn');

  btns.forEach(btn => {
    btn.addEventListener('mouseleave', e => {
      e.target.setAttribute('aria-label', 'Copy to clipboard');
      e.trigger.textContent = "Copy";
      e.target.blur();
    });

    btn.addEventListener('click', e => {
      e.preventDefault();
    });
  });
}

export default initClipboard