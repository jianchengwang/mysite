<template>
  <div class="post-nav">
    <div class="post-nav-item">
      <a v-if="prev && !prev.draft" class="post-nav-prev" :href="prev.path + '/'" rel="prev" :title="prev.title">
        <span class="post-nav-text">{{ prev.title }}</span>
      </a>
      <span v-else class="post-nav-text">无</span>
    </div>
    <div class="post-nav-item">
      <a v-if="next && !next.draft" class="post-nav-prev" :href="next.path + '/'" rel="prev" :title="next.title">
        <span class="post-nav-text">{{ next.title }}</span>
      </a>
      <span v-else class="post-nav-text">无</span>
    </div>
  </div>
</template>

<script>
export default {
  props: ["prev", "next"],
};
</script>

<style lang="scss" scoped>
.post-nav {
  display: flex;
  justify-content: space-between;
  margin: 0 1rem;
}
.post-nav-item {
  display: inline-block;
  outline: none;
  font-size: 0.9rem;
  font-weight: bold;
  text-transform: uppercase;
  height: 3rem;
  line-height: 2.9rem;
  transition: 0.4s;
}
.post-nav-text {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
