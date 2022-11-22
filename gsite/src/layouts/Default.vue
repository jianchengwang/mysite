<template>
  <div>
    <Header />
    <slot />
    <Footer />
  </div>
</template>

<script setup>
import Header from './partials/Header.vue';
import Footer from './partials/Footer.vue';
</script>