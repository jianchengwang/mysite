<template>
  <div class="main">
    <h1 class="main-title">
      DownGit
    </h1>
    <div class="main-body">
      <input v-model="gitRep" placeholder="GitHub 文件 或者文件夹 链接">
      <div class="button-group">
        <a href="javascript:void(0);" @click="download">Download</a>
      </div>
    </div>
  </div>
</template>
<script>
export default {
  name: "TDownGit",
  components: {},
  data() {
    return {
      gitRep: "",
    };
  },
  methods: {
    async download() {
      if (this.gitRep && this.gitRep.startsWith("https://github.com/")) {
        this.$toast.show("Loading...");
        const response = await this.$axios.$get(
          `/tools/downGit?gitRep=${this.gitRep}`
        );
        let zipFileName = await response.data;
        this.$toast.show({
          type: "success",
          title: "Success",
          message: "已生成下载文件：" + zipFileName,
        });
        window.open("https://tmp.jianchengwang.info/" + zipFileName);
      } else {
        this.$toast.show({
          type: "danger",
          title: "Error",
          message: "请输入github文件地址",
        });
      }
    },
  },
};
</script>
<style lang="scss" scoped>
input {
  padding-left: 0.5rem;
  width: 40rem;
}
.button-group {
  margin-top: 1rem;
}
</style>
