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

<style lang="scss">
  // @font-face {
  //   font-family: SmileySans-Oblique;
  //   src: url('../assets/fonts/SmileySans-Oblique.ttf.woff2');
  //   font-weight: normal;
  // }
</style>