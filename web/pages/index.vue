<template>
  <div class="site-shell home-page">
    <section class="home-hero">
      <div class="hero-copy"><p class="eyebrow">Personal notes & everyday life</p><h1>Jiancheng<br />Wang<span class="brand-dot">.</span></h1><p class="hero-intro">👋🏻 To be a free coder and creator ✨</p><div class="hero-actions"><NuxtLink to="/tech" class="primary-link">Explore the notebook <span aria-hidden="true">↗</span></NuxtLink><NuxtLink to="/about" class="text-link">A little about me</NuxtLink></div></div>
      <div class="portrait-group">
        <button class="portrait-main" aria-label="Open portrait photograph" @click="openImage(1)"><img src="/we.png" alt="Jiancheng and family" width="640" height="640" /><span>A little corner of my world</span></button>
        <div class="portrait-pets"><button aria-label="Open Hei photograph" @click="openImage(0)"><img src="/cat_hei.png" alt="Hei" width="240" height="240" /><span>Hei</span></button><button aria-label="Open Xia photograph" @click="openImage(2)"><img src="/cat_xia.png" alt="Xia" width="240" height="240" /><span>Xia</span></button></div>
      </div>
    </section>
    <section class="home-notebook"><div class="section-heading"><div><p class="eyebrow">From the notebook</p><h2>Notes worth keeping.</h2></div><NuxtLink to="/tech" class="text-link">All Tech notes ↗</NuxtLink></div>
      <div class="home-entries"><NuxtLink v-for="note in selectedNotes" :key="note.path" :to="note.path" class="home-entry"><span class="entry-date">{{ contentDate(note) || 'Tech' }}</span><h3>{{ displayTitle(note.title) }}</h3><p>{{ note.description }}</p><span class="entry-action">Read note ↗</span></NuxtLink></div>
    </section>
    <section class="home-interests"><div><p class="eyebrow">Beyond the notebook</p><h2>Things I enjoy.</h2><p>Small moments, familiar faces.</p></div><div class="interest-grid"><div v-for="hobby in hobbies" :key="hobby.label"><img :src="'/images/' + hobby.image + '.svg'" :alt="hobby.label" width="64" height="64" loading="lazy" /><span>{{ hobby.label }}</span></div></div></section>
    <section class="column-invitation"><div><p class="eyebrow">One subject, a longer read</p><h2>Explore the columns.</h2></div><NuxtLink to="/column" class="primary-link">Browse Column <span aria-hidden="true">↗</span></NuxtLink></section>
  </div>
  <ImageLightbox v-model="showLightbox" :images="images" :start-index="imageIndex" />
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { contentDate, displayTitle } from '~/utils/contentPresentation'
definePageMeta({ layout: 'default' })
const { data: notes } = await useAsyncData('home-tech-notes', () => queryCollection('tech').all())
const selectedNotes = computed(() => (notes.value || []).slice(0, 3))
const hobbies = [{ image: 'typing', label: 'Typing' }, { image: 'cycling', label: 'Cycling' }, { image: 'watching', label: 'Watching' }, { image: 'sketching', label: 'Sketching' }, { image: 'reading', label: 'Reading' }, { image: 'yoga', label: 'Yoga' }, { image: 'listening', label: 'Listening' }, { image: 'walking', label: 'Walking' }]
const images = ['/cat_hei.png', '/we.png', '/cat_xia.png']
const showLightbox = ref(false)
const imageIndex = ref(1)
const openImage = (index: number) => { imageIndex.value = index; showLightbox.value = true }
</script>
