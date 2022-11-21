
<script setup>
import MarkdownBody from '@/components/markdown/MarkdownBody.vue';
const { path } = useRoute();
const { data } = await useAsyncData(`content-${path}`, async () => {
  // fetch document where the document path matches with the cuurent route
  let article = queryContent(path).findOne();
  return {
    article: await article
  };
});
</script>
<template>
  <MarkdownBody :article="data.article" />
</template>

<style scoped>
</style>