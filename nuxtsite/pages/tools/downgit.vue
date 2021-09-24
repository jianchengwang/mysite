<template>
  <div class="main">
    <h1 class="main-title">DownGit</h1>
    <div class="main-body">
      <input placeholder="GitHub 文件 或者文件夹 链接" v-model="gitrep" />
      <div class="button-group">
        <a href="javascript:void(0);" @click="download">Download</a>
      </div>
    </div>
  </div>
</template>
<script>
export default {
  name: "T-DownGit",
  components: {},
  data() {
    return {
      gitrep: "",
    };
  },
  methods: {
    download: async function () {
      if (this.gitrep && this.gitrep.startsWith("https://github.com/")) {
        this.$toast.show("Loading...");
        let response = await fetch(`/api/downgit?gitrep=${this.gitrep}`);
        let downloadLink = await response.text();
        downloadLink = downloadLink.replace(/\"/g, "");
        downloadLink = downloadLink.substring(0, downloadLink.length - 2);
        if (downloadLink && downloadLink.length>0) {
          this.$toast.show({
            type: "success",
            title: "Success",
            message: "已生成下载链接，即将下载",
          });
          window.open(downloadLink);
        } else {
          this.$toast.show({
            type: "danger",
            title: "Error",
            message: "下载出现错误，请稍后再试",
          });
        }
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
