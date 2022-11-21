<script setup>
import Toc from "@/components/markdown/Toc.vue"
import PrevNext from "@/components/markdown/PrevNext.vue"

// define links prop
const props = defineProps(["article", "surround", "showToc"]);

// set the meta
useHead({
  title: props.article.title,
  meta: [
    { name: "description", content: props.article.description },
    {
      hid: "og:image",
      property: "og:image",
      content: `https://site.com/${props.article.img}`,
    },
  ],
});
</script>

<template>
  <main id="main" class="article-main">
    <header v-if="article" class="article-header">
      <!-- <div class="img-cont h-72 mb-12">
        <img :src="`/${data.article.img}`" :alt="data.article.title" class=" rounded-2xl" />
      </div> -->
      <h1 class="heading">{{ article.title }}</h1>
      <div class="supporting">{{ article.description }}</div>
      <ul class="article-tags" v-if="article.tags && article.tags.length">
        <li class="tag" v-for="(tag, n) in article.tags" :key="n">{{ tag }}</li>
      </ul>
    </header>
    <hr class="article-hr" />
    <section class="article-section">
      <aside class="aside" v-if="showToc">
        <!-- Toc Component -->
        <Toc :links="article.body.toc.links" />
      </aside>
      <article class="article">
        <!-- render document coming from query -->
        <ContentRenderer :value="article">
          <!-- render rich text from document -->
          <!-- display if document content is empty -->
          <template #empty>
            <p>No content found.</p>
          </template>
        </ContentRenderer>
      </article>
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