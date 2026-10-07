<template>
  <footer class="site-footer">
    <div class="site-shell footer-inner">
      <div><NuxtLink to="/" class="footer-brand">JianchengWang.</NuxtLink><p>To be a free coder and creator.</p></div>
      <div class="footer-links">
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">闽ICP备16000680号-2</a>
        <a href="https://www.upyun.com/?utm_source=lianmeng&amp;utm_medium=referral" target="_blank" rel="noopener noreferrer" aria-label="Visit UpYun" title="又拍云" class="upyun-attribution">
          <svg width="20" height="16" viewBox="0 0 24 18" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M6 16a5 5 0 0 1-1-10 7 7 0 0 1 13-1 5.5 5.5 0 0 1 0 11Z" /></svg>又拍云 <span>UpYun</span>
        </a>
        <span>© {{ new Date().getFullYear() }} JianchengWang</span>
      </div>
    </div>
  </footer>
</template>
