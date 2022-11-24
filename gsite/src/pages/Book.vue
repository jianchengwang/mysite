
<template>
  <Layout>
    <main>
      <header class="page-heading p-12">
        <div class="wrapper max-w-3xl m-auto">
          <h1 class="text-5xl font-extrabold">Book</h1>
          <div class="font-medium text-lg">
            Here's a list of all my read book
          </div>
        </div>
      </header>
      <section class="page-section m-auto max-w-3xl mb-6">
        <ul class="article-list flex flex-col gap-6">
          <li v-for="edge in $page.posts.edges" :key="edge.node.id" class="article-item pt-3 border-t border-slate-200">
            <g-link :to="'/book/' + edge.node.slug">
              <div class="wrapper flex items-start gap-4">
                <header>
                  <h1 class="text-2xl font-semibold">{{ edge.node.title }}</h1>
                  <p class="prose">{{ edge.node.excerpt }}</p>
                </header>
              </div>
            </g-link>
          </li>
        </ul>
      </section>
      <Pager :info="$page.posts.pageInfo" class="flex m-auto max-w-3xl mt-6 pager-container" linkClass="pager-container__link" />
    </main>
  </Layout>
</template>

<script>
import { Pager } from "gridsome";
import PostCard from "@/components/PostCard.vue";
export default {
  components: {
    Pager,
    PostCard,
  },
  data() {
    return {};
  },
  async mounted() {},
};
</script>

<page-query>
  query($page: Int) {
    posts: allBookPost(perPage: 10, page: $page, filter: { draft: { eq: false } }) @paginate {
      pageInfo {
        totalPages
        currentPage
      }
      edges {
        node {
          id
          title
          slug
          path
          excerpt
          tags
          resource
          douban
        }
      }
    }
  }
  </page-query>

<style scoped>
.page-heading {
  @apply p-12 bg-slate-50;
}

.page-heading > .wrapper {
  @apply max-w-3xl m-auto;
}

.page-section {
  @apply p-4 py-8 m-auto max-w-3xl;
}

.article-list {
  @apply flex flex-col gap-6;
}

.article-item {
  @apply: pt-6 first-of-type: border-none border-t border-slate-200;
}

.article-item a {
  @apply no-underline;
  text-decoration: none;
}

.article-item > * > .wrapper {
  @apply flex items-start gap-4;
}

.article-tags {
  @apply flex gap-2 py-2;
}

.article-tags .tag {
  @apply bg-slate-100 text-slate-700 text-sm p-2 py-1 rounded-md;
  @apply transition-all !py-0.5;
}
</style>