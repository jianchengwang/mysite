<script>
import PostCard from '@/components/PostCard.vue'
export default {
  components: {
    PostCard
  },
  data() {
    return {
      postType: "Post"
    }
  },
  async mounted() {
    this.postType = this.$route.params._posts
  }
}
</script>
<template>
  <Layout>
    <main>
    <header class="page-heading">
      <div class="wrapper">
        <h1 class="text-5xl font-extrabold">{{postType}} articles</h1>
        <div class="font-medium text-lg">Here's a list of all my {{postType}} articles</div>
      </div>
    </header>
    <section class="page-section">
      <ul class="article-list">
            <li v-for="edge in $page.posts.edges" :key="edge.node.id" class="article-item">
              <g-link :to="edge.node.path">
                <div class="wrapper">
                  <header>
                    <h1 class="text-2xl font-semibold">{{ edge.node.title }}</h1>
                    <p>{{ edge.node.description }}</p>
                    <ul class="article-tags">
                      <li class="tag !py-0.5" v-for="(tag, n) in edge.node.tags" :key="n">{{ tag }}</li>
                    </ul>
                  </header>
                </div>
              </g-link>
            </li>
          </ul>
    </section>
  </main>
  </Layout>
</template>

<page-query>
  query {
    posts: allPost {
      edges {
        node {
          id
          title
          path,
          description
        }
      }
    }
  }
  </page-query>