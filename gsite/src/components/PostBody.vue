<script setup>
import Toc from "@/components/Toc.vue";
import PrevNext from "@/components/PrevNext.vue";

// define links prop
const props = defineProps(["data"]);
</script>

<template>
  <main class="article-main p-4 max-w-5xl m-auto">
    <header v-if="data.title" class="article-header p-4 pb-12">
      <h1 class="heading font-extrabold text-5xl">{{ data.title }}</h1>
      <div class="supporting ont-medium text-lg">{{ data.excerpt }}</div>
      <ul
        class="article-tags flex gap-2 py-2"
        v-if="data.tags && data.tags.length"
      >
        <li
          class="
            tag
            bg-slate-100
            text-slate-700 text-sm
            p-2
            py-1
            rounded-md
            transition-all
            !py-0.5
          "
          v-for="(tag, n) in data.tags"
          :key="n"
        >
          {{ tag }}
        </li>
      </ul>
    </header>
    <hr class="article-hr" />
    <section class="article-section grid grid-cols-8">
      <aside
        class="aside col-span-full md:col-span-2 row-start-1 w-full pt-14"
        v-if="data.subtitles"
      >
        <!-- Toc Component -->
        <Toc :links="data.subtitles" class="sticky top-20" />
      </aside>
      <div
        class="
          article
          col-span-full
          md:col-span-6 md:col-start-1 md:row-start-1
          w-full
          p-4
          max-w-3xl
          m-auto
          prose
          dark:prose-invert
        "
        v-html="data.content"
      ></div>
    </section>

    <!-- PrevNext Component -->
    <PrevNext
      v-if="data.surround"
      :prev="data.surround[0]"
      :next="data.surround[1]"
    />
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