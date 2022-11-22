<template>
  <header class="sticky top-0 w-full p-4 bg-slate-100 bg-opacity-40 border-b-2 border-white border-opacity-30 backdrop-blur-lg z-20">
      <div class="flex items-center justify-between max-w-6xl m-auto">
          <g-link to="/" class="no-underline">
              <figure class="font-black text-lg">
              <h1>JianchengwangのSite</h1>
              </figure>
          </g-link>

          <Nav class="flex-fit"/>
          <nav class="header-actions flex">
            <ToggleTheme />

            <a
            aria-label="Twitter"
            href="//twitter.com/wang_jiancheng"
            rel="noopener noreferrer"
            target="_blank"
            title="Follow me on Twitter"
            >
            <twitter-logo/>
            </a>
            <a
                aria-label="GitHub"
                href="//github.com/jianchengwang"
                rel="noopener noreferrer"
                target="_blank"
                title="Jianchengwang @ GitHub"
            >
                <github-logo
                height="20px"
                width="20px"
                />
            </a>
      </nav>
      </div>
  </header>
</template>

<script setup name="Header">
import Nav from './Nav.vue'
import ToggleTheme from '@/components/ToggleTheme.vue';
import GithubLogo from '@/assets/images/github-logo.svg'
import TwitterLogo from '@/assets/images/twitter-logo.svg'
</script>

<style lang="scss">
header {
  z-index: 20;
  position: relative;
  top: 0;
  background-color: var(--bg-transparent);
  border-bottom: 1px solid var(--border-color);
  flex-wrap: nowrap;
  position: sticky;
  transition: background-color .3s, border-color, .3s;
  .header-bar {
    background: linear-gradient(90deg, var(--primary-color) 0%,  #8ED6FB 50%, #D32E9D 100%);
    padding: 2px;
    text-align: center;
    color:#FFF;
    font-size: 1rem;
    a {
      color: currentColor;
    }
  }
  .header-inner {
    padding: 0 var(--space);
    min-height: var(--header-height);
  }
  @media screen and (min-width: 992px) and (max-resolution: 1) {
    backdrop-filter: blur(4px);
  }
  @media screen and (min-width: 992px) and (-webkit-max-device-pixel-ratio: 1) {
    backdrop-filter: blur(4px);
  }
}
</style>