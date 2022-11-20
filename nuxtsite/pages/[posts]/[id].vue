<!-- ./pages/blog/[…slug.vue] -->

<script setup>
import MarkdownBody from '@/components/markdown/MarkdownBody.vue';

const { path } = useRoute();
const { 
  params
} = useRoute();
let posts = params.posts;
const { data } = await useAsyncData(`content-${path}`, async () => {
  // fetch document where the document path matches with the cuurent route
  let article = queryContent(posts).where({ _path: path }).findOne();
  // get the surround information,
  // which is an array of documeents that come before and after the current document
  let surround = queryContent(posts).only(["_path", "title", "description"]).sort({ date: 1 }).findSurround(path);

  return {
    article: await article,
    surround: await surround,
  };
});

// set the meta
useHead({
  title: data.value.article.title,
  meta: [
    { name: "description", content: data.value.article.description },
    {
      hid: "og:image",
      property: "og:image",
      content: `https://site.com/${data.value.article.img}`,
    },
  ],
});
</script>
<template>
  <MarkdownBody :article="data.article" :surround="data.surround" showToc="true" />
</template>

<style scoped>
</style>