
<template>
  <Layout>
      <Article :article="$static.content.content" />
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
import Article from '@/components/markdown/Article.vue';

</script>
  

<style scoped>
</style>
