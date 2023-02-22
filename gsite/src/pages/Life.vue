
<template>
  <Layout>
    <PostList :title="title" :description="description" :path="path" :posts="$page.posts" />
  </Layout>
</template>

<script>
import { Pager } from "gridsome";
import PostList from "@/components/PostList.vue";
export default {
  components: {
    Pager,
    PostList,
  },
  data() {
    return {
      title: "Life",
      description: "Here's a list of all my write life posts",
      path: "life"
    };
  },
  async mounted() {},
};
</script>

<page-query>
  query($page: Int) {
    posts: allLifePost(perPage: 10, page: $page, filter: { draft: { eq: false } }) @paginate {
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
        }
      }
    }
  }
  </page-query>