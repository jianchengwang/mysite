<template>
  <Layout>
    <Section container="md" dots="true" >

      <div class="post-header container-md text-center mb-x2">
        <h1 v-html="$page.posts.title"/>
      </div>

      <div class="post-content post mb-x2">

        <PostBody :content="$page.posts.content" />

      </div>

      <Newsletter />
    </Section>
  </Layout>
</template>

<script>
import PostBody from '@/components/PostBody.vue';

export default {
  components: [
    PostBody
  ]
}
</script>

<page-query>
query ($id: ID!) {
  posts: post (id: $id) {
    title
    content
  }
}
</page-query>

<script setup>
</script>