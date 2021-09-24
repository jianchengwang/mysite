<template>
  <div>
    <AppSideBar v-show="showToc">
      <MarkdownToc :toc="doc.toc" />
    </AppSideBar>
    <div>
      <MarkdownHeader :doc="doc" />
      <MarkdownBody :doc="doc" />
      <MarkdownResource v-if="doc.resource" :resource="doc.resource" :douban="doc.douban" />
      <MarkdownNav :prev="prev" :next="next" />
    </div>
  </div>
</template>

<script>
import AppSideBar from "@/components/layout/AppSideBar.vue";
import MarkdownHeader from "@/components/markdown/MarkdownHeader.vue";
import MarkdownBody from "@/components/markdown/MarkdownBody.vue";
import MarkdownToc from "@/components/markdown/MarkdownToc.vue";
import MarkdownResource from "@/components/markdown/MarkdownResource.vue";
import MarkdownNav from "@/components/markdown/MarkdownNav.vue";

export default {
  components: {
    AppSideBar,
    MarkdownHeader,
    MarkdownBody,
    MarkdownToc,
    MarkdownResource,
    MarkdownNav,
  },
  props: ["doc", "prev", "next"],
  data () {
    return {
      showToc: true
    }
  },
  mounted() {
  },
  destroyed() {
  },
};
</script>
<style lang="scss" scoped>
</style>
