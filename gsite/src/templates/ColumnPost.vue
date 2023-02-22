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
        subTitles: [],
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
    fetchMarkdown(link) {
      fetch(link)
      .then(response => response.text())
      .then(data => {
        this.postData.content = markdownToHtml(link, data)
      });
    }
  },
  mounted: function () {
  }
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
      class="sidebar open"
      :style="sidebarStyle"
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
h1,
h2,
h3,
h4 {
  @apply leading-snug font-black mb-4 text-ui-typo;

  &:hover {
    a::before {
      @apply opacity-100;
    }
  }

  a {
    &::before {
      content: "#";
      margin-left: -1em;
      padding-right: 1em;
      @apply text-ui-primary absolute opacity-0 float-left;
    }
  }
}

h1 {
  @apply text-4xl;
}

h2 {
  @apply text-2xl;
}

h3 {
  @apply text-xl;
}

h4 {
  @apply text-lg;
}

a:not(.active):not(.text-ui-primary):not(.text-white) { @apply text-ui-typo }

p,
ol,
ul,
pre,
strong,
blockquote {
  @apply mb-4 text-base text-ui-typo;
}

.content {
  a {
    @apply text-ui-primary underline;
  }

  h1, h2, h3, h4, h5, h6 {
    @apply -mt-12 pt-20;
  }
    
  h2 + h3,
  h2 + h2,
  h3 + h3 {
    @apply border-none -mt-20;
  }

  h2,
  h3 {
    @apply border-b border-ui-border pb-1 mb-3;
  }

  ul {
    @apply list-disc;

    ul {
      list-style: circle;
    }
  }

  ol {
    @apply list-decimal;
  }

  ol,
  ul {
    @apply pl-5 py-1;

    li {
      @apply mb-2;

      p {
        @apply mb-0;
      }

      &:last-child {
        @apply mb-0;
      }
    }
  }
}

blockquote {
  @apply border-l-4 border-ui-border py-2 pl-4;

  p:last-child {
    @apply mb-0;
  }
}

pre[class*="language-"] {
  @apply max-w-full overflow-x-auto rounded;

  & + p {
    @apply mt-4;
  }

  & > code[class*="language-"] {
    @apply border-none leading-relaxed;
  }
}

header {
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
}

table {
  @apply text-left mb-6;

  td, th {
    @apply py-3 px-4;
    &:first-child {
      @apply pl-0;
    }
    &:last-child {
      @apply pr-0;
    }
  }

  tr {
    @apply border-b border-ui-border;
    &:last-child {
      @apply border-b-0;
    }
  }
}

.sidebar {
  @apply fixed bg-ui-background px-4 inset-x-0 bottom-0 w-full border-r border-ui-border overflow-y-auto transition-all z-40;
  transform: translateX(-100%);

  &.open {
    transform: translateX(0);
  }

  @screen lg {
    @apply w-1/4 px-0 bg-transparent top-0 bottom-auto inset-x-auto sticky z-0;
    transform: translateX(0);
  }
}
</style>