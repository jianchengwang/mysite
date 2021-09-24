<template>
  <section class="masthead" role="img" aria-label="Image Description">
    <h1>猫九大大のBlog</h1>
    <button>See restaurants ></button>
  </section>
</template>

<script>
export default {};
</script>

<style lang="scss" scoped>
.masthead {
  width: 100%;
  height: 80vh;
  padding: 40px;
  overflow: hidden;
  background-size: cover !important;
  background: radial-gradient(
      ellipse at center,
      rgba(0, 0, 0, 0) 0%,
      rgba(0, 0, 0, 0) 34%,
      rgba(0, 0, 0, 0.65) 100%
    ),
    url(https://blog.res.jianchengwang.info/blog-bg.jpg) no-repeat center center
      scroll;
  opacity: 0.8;
  text-align: center;
}
h1 {
  font-style: normal;
  font-weight: bold;
  color: #eee;
  font-size: 8vmin;
  letter-spacing: 0.03em;
  line-height: 1;
  text-shadow: 1px 2px 4px rgba(0, 0, 0, 0.8);
  margin: 0 auto;
  margin-bottom: 42px;
}
</style>