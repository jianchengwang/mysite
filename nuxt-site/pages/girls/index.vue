<template>
  <div class="main">
    <h1 class="main-title">{{ title }}</h1>
    <div id="girls">
      <div class="girls-number">{{ girls.length }}</div>
      <div class="girl-banner" v-html="banner"></div>
      <ul class="girl-items">
        <li v-for="girl in girls" :key="girl.name" class="girl-item" :id="girl.name">
          <a class="girl-url" :href="'https://zh.moegirl.org/' + girl.name + ''" :title="girl.reason" alt="portrait" target="_blank" rel="noopener">
            <figure class="girl-info">
              <img class="girl-avatar" loading="lazy" :src="girl.avatar" :alt="girl.name" onerror="this.src=CONFIG.anonymous_image">
              <figcaption class="girl-name">{{ girl.name }}</figcaption>
              <figcaption class="girl-from">「{{ girl.from }}」</figcaption>
            </figure>
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>
<script>
export default {
  name: "Girls",
  async asyncData({ $content, params, error }) {
    const page = await $content("girls", "index")
      .fetch()
      .catch((err) => {
        error({ statusCode: 404, message: "Page not found", err });
      });
    return {
      title: page.title ? page.title : "Girls",
      banner: page.banner ? page.banner : "大家都是我的天使！",
      girls: page.girls,
    };
  },
};
</script>
<style lang="scss" scoped>
.girls-number {
  color: darkgray;
  padding: 0.5rem;
}
.girl-banner {
  color: darkgray;
  font-size: 0.9rem;
  padding-bottom: 0.5rem;
}
.girl-items {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  padding-left: 0;
  .girl-info {
    width: 100%;
    padding: 0;
    margin: 0;
  }
}
.girl-info {
  width: 100%;
  padding: 0;
  margin: 0;
}
.girl-item {
  display: inline-flex;
  text-align: center;
  justify-content: center;
  align-items: center;
  display: flex;
  flex-direction: column;

  width: 8rem;
  margin: 1rem;
  img {
    opacity: 0.9; //透明度
    &:hover {
      opacity: 1;
      transform: rotate(360deg) scale(3); //旋转
    }
  }
  .girl-avatar {
    object-fit: cover;
    object-position: center top;
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    padding: 0.2rem;
    background-color: #fff;
    box-shadow: 0 0 1rem rgba(0, 0, 0, 0.12);
    transition: 0.5s;
    margin: 0 auto;
  }
  .girl-name {
    font-size: 0.9rem;
  }
  .girl-from {
    font-size: 12px;
    font-weight: bold;
    color: darkgray;
  }
}
</style>
