<!-- ./pages/_post/index.vue -->

<script setup>
import Tags from "@/components/markdown/Tags.vue"
const { 
  params
} = useRoute();

let posts = params.posts;

definePageMeta({
  key: (route) => route.fullPath,
});

// get tag query
const {
  query: { tags },
} = useRoute();

const filter = ref(tags?.split(","));

// set meta for page
useHead({
  title: "All articles",
  meta: [{ name: "description", content: "Here's a list of all my great articles" }],
});
</script>
<template>
  <main>
    <header class="page-heading">
      <div class="wrapper">
        <h1 class="text-5xl font-extrabold">{{posts}} articles</h1>
        <div class="font-medium text-lg">Here's a list of all my {{posts}} articles</div>
      </div>
    </header>
    <section class="page-section">
      <!-- <Tags :posts="posts" /> -->

      <!-- Render list of all articles in ./content/_post using `path` -->
      <!-- Provide only defined fieldsin the `:query` prop -->
      <ContentList
        :path="posts"
        :query="{
          only: ['title', 'description', 'tags', '_path'],
          where: {
            tags: {
              $contains: filter
            },
          },
          sort: {
            createdAt: -1
          },
          $sensitivity: 'base',
        }"
      >
        <!-- Default list slot -->
        <template v-slot="{ list }">
          <ul class="article-list">
            <li v-for="article in list" :key="article._path" class="article-item">
              <NuxtLink :to="article._path">
                <div class="wrapper">
                  <!-- <div class="img-cont w-32 shrink-0">
                    <img :src="`/${article.img}`" :alt="article.title" class="rounded-lg max-h-[8rem]" />
                  </div> -->
                  <header>
                    <h1 class="text-2xl font-semibold">{{ article.title }}</h1>
                    <p>{{ article.description }}</p>
                    <ul class="article-tags">
                      <li class="tag !py-0.5" v-for="(tag, n) in article.tags" :key="n">{{ tag }}</li>
                    </ul>
                  </header>
                </div>
              </NuxtLink>
            </li>
          </ul>
        </template>

        <!-- Not found slot to display message when no content us is found -->
        <template #not-found>
          <p>No articles found.</p>
        </template>
      </ContentList>
    </section>
  </main>
</template>