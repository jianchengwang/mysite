<template>
  <Layout>
    <PostBody :data="$page.posts" />
  </Layout>
</template>

<script>
import PostBody from "@/components/PostBody.vue";

export default {
  components: [PostBody],
};
</script>

<page-query>
query ($id: ID!) {
  posts: techPost (id: $id) {
    title
    content
    excerpt
    tags
    headings (depth: h1) {
      value
    }
    subtitles: headings {
      depth
      value
      anchor
    }
  }
}
</page-query>

<script setup>
</script>