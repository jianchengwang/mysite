<template>
  <div id="main-body" class="max-w-6xl mx-auto h-screen flex flex-col">
    <header class="mx-10">
      <AppMenu />
    </header>
    <Nuxt class="flex-1" />
    <AppFooter />
  </div>
</template>

<script>
import AppMenu from "@/components/layout/AppMenu.vue";
import AppFooter from "@/components/layout/AppFooter.vue";
export default {
  head: {
    script: [
      {
        // src:
        //   "https://cdn.jsdelivr.net/gh/jianchengwang/live2d_models@main/assets/js/live2dv3.init.js",
        // mode: "client",
      },
    ],
  },
  components: {
    AppMenu,
    AppFooter,
  },
};
</script>

<style style="scss" scoped>
</style>
