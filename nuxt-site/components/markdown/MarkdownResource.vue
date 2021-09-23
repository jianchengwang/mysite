<template>
  <div>
    <div class="grid grid-cols-3 gap-2 place-items-auto">
      <a target="_blank" :href="'https://jianchengwang.github.io/epubjs-reader/reader/?book=' + resource+ ''">在线阅读</a>
      <a target="_blank" :href="resource">下载</a>
      <a v-if="douban" target="_blank" :href="'https://book.douban.com/subject/' + douban+ ''">豆瓣</a>
      <!-- <span><input style="padding: 1px;margin-right: 2px;" v-model="mailTo" /><a href="javascript:void(0)" @click="kindlepush">推送到Kindle</a></span> -->
    </div>
    <hr />
  </div>
</template>

<script>
export default {
  props: ["resource", "douban"],
  data() {
    return {
      mailTo: "jianchengwang80@gmail.com",
    };
  },
  methods: {
    kindlepush: async function () {
      if (
        this.resource &&
        this.mailTo &&
        this.resource.startsWith("https://books.jianchengwang.info/")
      ) {
        this.$toast.show("Loading...");
        let mailTo = this.mailTo;
        let book = this.resource.replace(
          "https://books.jianchengwang.info/",
          ""
        );
        let response = await fetch(
          `/api/kindlepush?mailTo=${mailTo}&book=${book}`
        );
        let responseText = await response.text();
        this.$toast.show({
          type: "success",
          title: "Success",
          message: responseText,
        });
      } else {
        this.$toast.show({
          type: "danger",
          title: "Error",
          message: "book resource none",
        });
      }
    },
  },
};
</script>

<style lang="scss" scoped>
</style>