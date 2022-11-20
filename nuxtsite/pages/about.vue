
<script setup>
import MarkdownBody from '@/components/markdown/MarkdownBody.vue';
const { path } = useRoute();
const { data } = await useAsyncData(`content-${path}`, async () => {
  // fetch document where the document path matches with the cuurent route
  let article = queryContent("/mysite").where({ _path: path }).findOne();
  return {
    article: await article
  };
});
console.log(data);
</script>
<template>
  <MarkdownBody :article="data.article" />
</template>

<style scoped>
</style>