<script setup>
import { ref, onMounted } from 'vue'

import OnThisPage from "@/components/OnThisPage.vue";
import initClipboard from "@/plugins/clipboard-use.js"

// define links prop
const props = defineProps(["data"]);

onMounted(() => {
  initClipboard()
})
  
</script>

<template>
  <section class="article-section grid grid-cols-8">
    <aside class="aside col-span-full md:col-span-2 row-start-1 w-full pt-14" v-if="data.subtitles">
      <!-- Toc Component -->
      <!-- <Toc :links="data.subtitles" class="sticky top-20" /> -->
      <OnThisPage :links="data.subtitles" class="sticky top-20" />
    </aside>
    <div class="
        article
        col-span-full
        md:col-span-6 md:col-start-1 md:row-start-1
        w-full
        p-4
        max-w-3xl
        m-auto
        prose
        dark:prose-invert
      " v-html="data.content"></div>
  </section>
</template>

<style scoped>
@import "../plugins/clipboard-use.css";
.article-section {
  @apply grid grid-cols-8;
}

.aside {
  @apply col-span-full md:col-span-2 row-start-1 w-full pt-14;
}

.aside .toc {
  @apply sticky top-20;
}

.article {
  @apply col-span-full md:col-span-6 md:col-start-1 md:row-start-1 w-full p-4 max-w-3xl m-auto prose;
}
</style>