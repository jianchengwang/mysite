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
  posts: bookPost (id: $id) {
    title
    excerpt
    tags
    content
    resource
    douban
    tags
    slug
  }
}
</page-query>

<script setup>
</script>