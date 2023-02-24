<script setup>
import { ref, reactive, onMounted } from 'vue'

import MarkdownBody from "@/components/MarkdownBody.vue";
import NextPrevLinks from "@/components/NextPrevLinks.vue";

import { markdownToHtml } from "@/plugins/markdown-utils.js"

// define links prop
const props = defineProps(["data"]);

const postData = reactive({
  subtitles: [],
  content: ""
})

onMounted(() => {
  let link = props.data.link
  if(props.data.link) {
    fetch(link)
    .then(response => response.text())
      .then(data => {
        let result = markdownToHtml(link, data)
        postData.subtitles = result.subtitles
        postData.content = result.content
    });
  } else {
    postData.subtitles = props.data.subtitles
    postData.content = props.data.content
  }
})
</script>

<template>
  <main class="article-main p-4 max-w-5xl m-auto">
    <header v-if="data.title" class="article-header p-4 pb-12">
      <g-link class="no-underline" v-if="data.resource" :to="'https://jianchengwang.github.io/epubjs-reader/reader/?book=' + data.resource">
        <h1 class="heading font-extrabold text-5xl">{{ data.title }}</h1>
      </g-link>
      <h1 v-else class="heading font-extrabold text-5xl">{{ data.title }}</h1>
      <div class="supporting ont-medium text-lg">{{ data.excerpt }}</div>
      <ul class="article-tags flex gap-2 py-2" v-if="data.tags && data.tags.length">
        <li class="
            tag
            bg-slate-100
            text-slate-700 text-sm
            p-2
            py-1
            rounded-md
            transition-all
            !py-0.5
          " v-for="(tag, n) in data.tags" :key="n">
          {{ tag }}
        </li>
      </ul>
      <hr class="article-hr" />
    </header>
    <div v-if="data.docLinks">docLinks</div>
    <MarkdownBody :data="postData" />
    <!-- PrevNext Component -->
    <NextPrevLinks v-if="data.surround" :prev="data.surround[0]" :next="data.surround[1]" />
    <hr class="article-hr" />
  </main>
</template>

<style scoped>
.article-main {
  @apply p-4 max-w-5xl m-auto;
}

.article-header {
  @apply p-4 pb-12;
}

.article-header .heading {
  @apply font-extrabold text-5xl;
}

.article-header .supporting {
  @apply font-medium text-lg;
}
</style>