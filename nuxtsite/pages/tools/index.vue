<template>
  <div class="main">
    <h1 class="main-title">Tools</h1>
    <MarkdownBody :doc="page" />
  </div>
</template>
<script>
import MarkdownBody from "@/components/markdown/MarkdownBody.vue";
export default {
  name: "Tools",
  components: {
    MarkdownBody,
  },
  async asyncData({ $content, params, error }) {
    const page = await $content("tools", "index")
      .fetch()
      .catch((err) => {
        error({ statusCode: 404, message: "Page not found", err });
      });
    return {
      page,
    };
  },
};
</script>
