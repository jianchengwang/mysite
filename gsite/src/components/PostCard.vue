<template>
  <Card class="blog-posts__post" :link="post.path">
    <h3 v-html="post.title"/>
    <p v-html="post.excerpt"/>
  </Card>
</template>

<script>

export default {
  components: {
  },
  props: {
    post: { type: Object, required: true }
  }
}
</script>

<style lang="scss">
.blog-posts {
  &__post {
    position: relative;
    margin-bottom: 2rem;
    .card__inner {
      padding: var(--space-x2);
    }
  }
}
</style>