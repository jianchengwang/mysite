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
  posts: columnPost (id: $id) {
    title
    content
    excerpt
    tags,
    docLinks: docLinks {
      title
      link
      items: items {
        title
        link
      }
    }
  }
}
</page-query>

<script setup>
</script>