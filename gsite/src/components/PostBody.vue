<script setup>
import Toc from "@/components/Toc.vue"
import PrevNext from "@/components/PrevNext.vue"

// define links prop
const props = defineProps(["content", "surround", "showToc"]);

</script>

<template>
  <main id="main" class="article-main">
    <header v-if="content" class="article-header">
      <h1 class="heading">{{ content.title }}</h1>
      <div class="supporting">{{ content.description }}</div>
      <ul class="article-tags" v-if="content.tags && content.tags.length">
        <li class="tag" v-for="(tag, n) in content.tags" :key="n">{{ tag }}</li>
      </ul>
    </header>
    <hr class="article-hr" />
    <section class="article-section">
      <aside class="aside" v-if="showToc">
        <!-- Toc Component -->
        <Toc :links="content.body.toc.links" />
      </aside>
      <div class="article col-span-full md:col-span-6 md:col-start-1 md:row-start-1 w-full p-4 max-w-3xl m-auto prose dark:prose-invert" v-html="content">
      </div>
    </section>

    <!-- PrevNext Component -->
    <PrevNext v-if="props.surround" :prev="props.surround[0]" :next="props.surround[1]" />
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