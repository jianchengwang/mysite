<template>
  <header class="site-header">
    <a class="skip-link" href="#main-content">Skip to content</a>
    <nav class="site-nav site-shell" aria-label="Main navigation">
      <NuxtLink to="/" class="site-brand">JianchengWang<span class="brand-dot">.</span></NuxtLink>
      <div class="desktop-nav">
        <NuxtLink v-for="item in navItems" :key="item.to" :to="item.to" active-class="active">{{ item.label }}</NuxtLink>
      </div>
      <button class="icon-button mobile-nav-trigger" aria-label="Open navigation menu" :aria-expanded="menuOpen" @click="openMenu">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>
    </nav>
    <dialog ref="menu" class="site-dialog" aria-labelledby="navigation-title" @click.self="closeMenu" @close="menuOpen = false">
      <div class="dialog-panel">
        <div class="dialog-heading"><div><p class="eyebrow">Explore</p><h2 id="navigation-title">Navigation</h2></div><button class="icon-button" aria-label="Close navigation menu" @click="closeMenu">×</button></div>
        <nav class="mobile-nav" aria-label="Mobile navigation">
          <NuxtLink v-for="item in navItems" :key="item.to" :to="item.to" @click="closeMenu">{{ item.label }}<span aria-hidden="true">↗</span></NuxtLink>
        </nav>
        <p class="dialog-note">To be a free coder and creator.</p>
      </div>
    </dialog>
  </header>
</template>
<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
const route = useRoute()
const menu = ref<HTMLDialogElement | null>(null)
const menuOpen = ref(false)
const navItems = [{ to: '/tech', label: 'Tech' }, { to: '/column', label: 'Column' }, { to: '/store', label: 'Store' }, { to: '/links', label: 'Links' }, { to: '/about', label: 'About' }]
const openMenu = () => { menu.value?.showModal(); menuOpen.value = true }
const closeMenu = () => { menu.value?.close(); menuOpen.value = false }
watch(() => route.fullPath, closeMenu)
watch(menuOpen, (open) => { document.body.style.overflow = open ? 'hidden' : '' })
onUnmounted(() => { if (menuOpen.value) document.body.style.overflow = '' })
</script>
