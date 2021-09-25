<template>
  <div class="main">
    <h1 class="main-title">
      TencentOcr
    </h1>
    <div class="main-body">
      <input class="btn-upload" type="file" name="file" @change="handleFileChange" accept="image/jpeg,image/png,image/gif,image/bmp,image/svg+xml" />
      <div class="button-group">
        <a href="javascript:void(0);" @click="tencentOcr">识别</a>
      </div>
      <div class="orcResult">
        <div v-for="item, index in ocrResults" :key="index">
          {{ item }}
        </div>
      </div>
    </div>
  </div>
</template>
<script>
export default {
  name: "TTencentOcr",
  components: {},
  data() {
    return {
      file: null,
      ocrResults: [],
    };
  },
  methods: {
    handleFileChange(e) {
      this.file = e.target.files[0];
    },
    async tencentOcr() {
      if (!this.file) {
        return;
      }
      const formData = new FormData();
      formData.append("file", this.file);
      this.$toast.show("Loading...");
      const response = await this.$axios.$post("/tools/tencentOcr", formData);
      let resutData = JSON.parse(await response.data);
      if (resutData.Response && resutData.Response.TextDetections) {
        this.ocrResults = resutData.Response.TextDetections.map(
          (item) => item.DetectedText
        );
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
.btn-upload {
  width: 100%;
  border: 2px solid silver;
  cursor: pointer;
  color: #797979;
  font-weight: 500;
  -webkit-box-pack: center;
  -webkit-justify-content: center;
  -ms-flex-pack: center;
  justify-content: center;
}
.orcResult {
  margin-top: 1rem;
  text-align: left;
}
</style>
