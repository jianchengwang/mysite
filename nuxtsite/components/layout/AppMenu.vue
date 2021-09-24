<template>
  <div class="max-w-3xl my-12 ml-auto mr-auto">
    <nav class="flex mb-5 justify-center mx-auto" role="navigation">
      <nuxt-link :class="navClass('/')" to="/">
        Home
      </nuxt-link>
      <nuxt-link :class="navClass('/tech')" to="/tech">
        Tech
      </nuxt-link>
      <nuxt-link :class="navClass('/life')" to="/life">
        Life
      </nuxt-link>
      <nuxt-link :class="navClass('/store')" to="/store">
        Store
      </nuxt-link>
      <nuxt-link :class="navClass('/book')" to="/book">
        Book
      </nuxt-link>
      <nuxt-link :class="navClass('/project')" to="/project">
        Project
      </nuxt-link>
      <nuxt-link :class="navClass('/about')" to="/about">
        About
      </nuxt-link>
      <nuxt-link :class="navClass('/girls')" to="/girls">
        Girls
      </nuxt-link>
      <nuxt-link :class="navClass('/albums')" to="/albums">
        Albums
      </nuxt-link>
      <nuxt-link :class="navClass('/tools')" to="/tools">
        Tools
      </nuxt-link>
      <a :class="navClass('/other')" target="_blank" href="https://files.jianchengwang.info">
        Files
      </a>
    </nav>
  </div>
</template>
<script>
export default {
  computed: {
    currentPath() {
      return this.$route.path;
    },
  },
  methods: {
    navClass(name) {
      const isTech = this.currentPath.startsWith("/tech/");
      const isLife = this.currentPath.startsWith("/life/");
      const isStore = this.currentPath.startsWith("/store/");
      const isBook = this.currentPath.startsWith("/book/");
      const isAbout = this.currentPath.startsWith("/about");
      const isGirls = this.currentPath.startsWith("/girls");
      const isAlbums = this.currentPath.startsWith("/albums");
      const isTools = this.currentPath.startsWith("/tools");

      return `uppercase no-underline mx-3 ${
        this.currentPath === name ||
        (isTech && name === "/tech") ||
        (isLife && name === "/life") ||
        (isStore && name === "/store") ||
        (isAbout && name === "/about") ||
        (isGirls && name === "/girls") ||
        (isAlbums && name === "/albums") ||
        (isBook && name === "/book") ||
        (isTools && name === "/tools")
          ? "text font-semibold"
          : "text-900"
      }`;
    },
  },
};
</script>
<style lang="scss" scoped>
</style>