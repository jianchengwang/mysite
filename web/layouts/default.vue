<template><div class="site-layout"><Header /><main id="main-content" class="site-main"><slot /></main><Footer /></div></template>
<script setup lang="ts">
import Header from '~/components/Header.vue'
import Footer from '~/components/Footer.vue'
</script>
