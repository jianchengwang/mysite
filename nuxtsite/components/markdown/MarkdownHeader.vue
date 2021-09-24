<template>
  <header class="post-header">
    <h1 class="post-title">
      <a class="post-edit-link" :href="editLink" target="_blank" rel="noopener">
        {{ doc.title }}
      </a>
    </h1>
    <div class="post-meta">
      <a href="/tag"><span>Tags &gt; </span> </a>
      <a v-for="(tag, index) in doc.tags" :key="tag" class="tag" :href="'/tag/' + tag + '/'"><span class="tag-name">#{{ tag }}</span>
        <span v-if="index < doc.tags.length-1"> </span>
      </a>
    </div>
    <div v-if="doc.img" class="post-img">
    </div>
  </header>
</template>

<script>
export default {
  props: ["doc"],
  computed: {
    editLink: function () {
      return (
        "https://github.com/jianchengwang/my-site/tree/main/content" +
        this.doc.path +
        ".md"
      );
    },
  },
};
</script>

<style lang="scss" scoped>
.post-header {
  position: relative;
  text-align: center;
  .post-title {
    margin: 0;
    padding: 10px;
    font-size: 2rem;
    font-weight: 900;
    a {
      color: #dd4a68 !important;
    }
  }
  .post-meta {
    font-size: 14px;
    font-style: italic;
    color: var(--hty-secondary-text-color);
  }
}
</style>