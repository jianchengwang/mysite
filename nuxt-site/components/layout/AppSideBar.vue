<template>
  <div id='sidebar' class="sidebar">
    <slot />
  </div>
</template>

<script>
export default {
  components: {
  }
};
</script>

<style lang="scss" scoped>
.sidebar {
  position: fixed;
  overflow-y: auto;
  top: 0;
  bottom: 0;
  left: 0;
  width: 15%;
  // background-image: url(https://cdn.jsdelivr.net/gh/YunYouJun/cdn@master/img/bg/alpha-stars-timing-1.webp);
  background-size: contain;
  background-repeat: no-repeat;
  background-position: bottom 1rem center;
  text-align: center;
  z-index: 10;
  transition-property: all;
  transition-duration: 0.2s;
  transition-delay: 0s;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.2);
}
</style>
