<script>
import Sidebar from "@/components/Sidebar.vue";
import MarkdownBody from "@/components/MarkdownBody.vue";
import NextPrevLinks from "@/components/NextPrevLinks.vue";

import { markdownToHtml } from "@/plugins/markdown-utils.js"

export default {
  components: {Sidebar, MarkdownBody, NextPrevLinks},
  data: function() {
    return {
      headerHeight: 0,
      postData: {
        subtitles: [],
        content: ""
      },
    }
  },
  computed: {
    sidebarStyle() {
      return {
        top: this.headerHeight + 'px',
        height: `calc(100vh - ${this.headerHeight}px)`
      }
    },
  },
  methods: {
    fetchMarkdown(item) {
      fetch(item.link)
      .then(response => response.text())
        .then(data => {
          this.postData = markdownToHtml(item.link, data)
      });
    }
  },
  mounted: function () {
    if (this.$page.posts.docLinks) {
      this.fetchMarkdown(this.$page.posts.docLinks[0].items[0])
    }
  }
};
</script>

<page-query>
query ($id: ID!) {
  posts: columnPost (id: $id) {
    slug
    docLinks: docLinks {
      title
      items: items {
        title
        link
      }
    }
  }
}
</page-query>

<template>
  <Layout>
    <div class="container relative flex flex-wrap justify-start flex-1 w-full bg-ui-background">
      <aside
        v-if="$page.posts.docLinks"
      >
        <div class="bg-ui-background">
          <Sidebar :docLinks="$page.posts.docLinks" @navigate="fetchMarkdown" />
        </div>
      </aside>
      <main class="article-main p-4 max-w-5xl m-auto">
        <MarkdownBody :data="postData" />
        <!-- PrevNext Component -->
        <NextPrevLinks v-if="postData.surround" :prev="postData.surround[0]" :next="postData.surround[1]" />
        <hr class="article-hr" />
      </main>
    </div>
  </Layout>
</template>

<style lang="scss" scoped>
</style>