<template>
  <div class="main">
    <h1 class="main-title">
      PortScan
    </h1>
    <div class="main-body">
      <input v-model="ip" placeholder="输入域名或者ip"><br />
      <textarea rows="3" v-model="ports"></textarea><br />
      <span>多个以","隔开，支持范围书写，例如:1,2,3,10-20,6,100-105,33</span>
      <div class="button-group">
        <a href="javascript:void(0);" @click="portScanner">端口扫描</a>
      </div>
      <textarea rows="3" v-model="openPorts"></textarea><br />
      <span>开放的端口号</span>
    </div>
  </div>
</template>
<script>
export default {
  name: "TPortScan",
  components: {},
  data() {
    return {
      ip: "",
      ports:
        "80,21,22,23,25,53,110,443,1433,1863,2289,3306,5631,5632,5000,8080,9090",
      openPorts: "",
    };
  },
  methods: {
    async portScanner() {
      if (this.ip && this.ports) {
        this.$toast.show("Loading...");
        const response = await this.$axios.$get(
          `/tools/portScan?ip=${this.ip}&ports=${this.ports}`
        );
        this.openPorts = await response.data;
      } else {
        this.$toast.show({
          type: "danger",
          title: "Error",
          message: "请输入IP地址跟端口列表",
        });
      }
    },
  },
};
</script>
<style lang="scss" scoped>
input,
textarea {
  margin-top: 1rem;
  padding-left: 0.5rem;
  width: 40rem;
}
.button-group {
  margin-top: 1rem;
}
</style>
