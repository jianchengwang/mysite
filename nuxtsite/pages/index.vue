<template>
  <div class="container">
    <a class="site-author-avatar" href="/about/" title="jiancheng_wang">
      <img width="96" loading="lazy" src="https://blog.res.jianchengwang.info/avatar.jpg" alt="jiancheng_wang"><span class="site-author-status" title="balabala....">😊</span>
    </a>
    <div class="sayWord">Have fun and enjoy every day.</div>
    <div>
      <ColorModePicker />
      <Reward />
    </div>
  </div>
</template>

<script>
import ColorModePicker from "@/components/plugin/ColorModePicker.vue";
import Reward from "@/components/plugin/Reward.vue";

export default {
  components: {
    ColorModePicker,
    Reward,
  },
};
</script>

<style lang="scss" scoped>
.container {
  padding: 40px;
  overflow: hidden;
  .sayWord {
    font-weight: bold;
    font-size: 4vmin;
    letter-spacing: 0.03em;
    line-height: 1;
    text-shadow: 1px 2px 4px rgba(0, 0, 0, 0.8);
    margin-bottom: 42px;
  }
  .site-author-avatar {
    display: inline-block;
    line-height: 0;
    position: relative;
    padding-bottom: 2rem;
    img {
      border-radius: 50%;
      height: 8rem;
      width: 8rem;
      padding: 4px;
      background-color: #fff;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
      transition: 0.8s;
      &:hover {
        opacity: 0.9; //透明度
        transform: rotate(360deg); //旋转
      }
    }
  }
  .site-author-status {
    position: absolute;
    height: 1.8rem;
    width: 1.8rem;
    bottom: 2rem;
    right: 0;
    line-height: 1.8rem;
    border-radius: 50%;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    background-color: #fff;
  }
}
</style>
