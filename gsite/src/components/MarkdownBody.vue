<script setup>
import { ref, onMounted, onUpdated, nextTick } from 'vue'

import OnThisPage from "@/components/OnThisPage.vue";
import initClipboard from "@/plugins/clipboard-use.js"

// define links prop
const props = defineProps(["data"]);

onMounted(() => {
})

onUpdated(() => {
  if (window.location.href.indexOf("/tech/") != -1
    || window.location.href.indexOf("/column/") != -1
    ) {
    prismCode()
  }
})

const prismCode = async () => {
  await nextTick()
  Prism.highlightAll()
  initClipboard()
}
  
</script>

<template>
  <section v-if="data.content" class="article-section grid grid-cols-8">
    <aside class="aside col-span-full md:col-span-2 row-start-1 w-full pt-14" v-if="data.subtitles">
      <OnThisPage v-if="data.subtitles" :links="data.subtitles" class="sticky top-20" />
    </aside>
    <div id="lightgallery" class="
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
  <div v-else class="flex items-center justify-center p-8">
    <div
      class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
      role="status">
      <span
        class="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]"
        >Loading...</span
      >
    </div>
</div>
</template>

<style scoped>
@import "../plugins/clipboard-use.css";

Sidebar {
  position: absolute;
}

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