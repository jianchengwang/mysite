
<template>
  <Layout>
      <PostBody :content="$static.content.content" />
  </Layout>
</template>

<static-query>
query {
  content(id: "about") {
    id,
    content
  }
}
</static-query>

<script setup>
import PostBody from '@/components/PostBody.vue';

</script>
  

<style scoped>
</style>
