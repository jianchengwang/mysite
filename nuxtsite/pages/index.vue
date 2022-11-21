<template>
  <div class="container">
    <NuxtLink class="site-author-avatar" to="/about">
      <img width="96" loading="lazy" src="https://blog.res.jianchengwang.info/avatar.jpg" alt="jiancheng_wang"><span class="site-author-status" title="balabala....">😊</span>
    </NuxtLink>
    <p class="sayWord">Have fun and enjoy every day.</p>
    <div>
      <ColorModePicker />
    </div>
  </div>
</template>

<script setup>
import ColorModePicker from "@/components/color-mode/ColorModePicker.vue";
</script>

<style scoped>
</style>
