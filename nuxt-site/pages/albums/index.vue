<template>
  <div class="main">
    <h1 class="main-title">Albums</h1>
    <div class="page-subtitle">{{ albums.length }} albums in total</div>
    <div class="album-list">
      <a v-for="album in albums" :key="album.caption" class="album-list-item" :href="album.url">
        <figure :title="album.desc"><img class="album-list-cover" v-lazy="album.cover" :alt="album.caption">
          <figcaption>「{{ album.caption }}」</figcaption>
        </figure>
      </a>
    </div>
  </div>
</template>
<script>
export default {
  name: "Albums",
  async asyncData({ $content, params, error }) {
    const page = await $content("albums", "index")
      .fetch()
      .catch((err) => {
        error({ statusCode: 404, message: "Page not found", err });
      });
    return {
      albums: page.albums,
    };
  },
};
</script>
<style lang="scss" scoped>
.album-list {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  figure {
    position: relative;
    width: 15rem;
    margin: 2rem;
  }
}
.album-list-item {
  display: inline-flex;
  figure {
    position: relative;
    width: 15rem;
    margin: 2rem;
    img {
      vertical-align: bottom;
      display: inline-flex;
      border: 0.25rem solid #fff;
      box-shadow: 0 8px 10px rgba(0, 0, 0, 0.3);
      padding: 0;
      transform: rotate(2deg);
      width: 100%;
      height: 10rem;
      object-fit: cover;
      background-color: #eee;
      &:hover {
        opacity: 0.9; //透明度
        transform: rotate(-2deg) scale(1);
      }
    }
    figcaption {
      position: absolute;
      bottom: -2.5rem;
      display: block;
      text-align: center;
      width: 100%;
    }
  }
  figure::before {
    content: "";
    position: absolute;
    top: 1%;
    left: 0.5%;
    width: 100%;
    height: 96%;
    border: 0.25rem solid #fff;
    background-color: #666;
    box-shadow: 0 5px 10px rgba(0, 0, 0, 0.3);
    transform: rotate(-3deg);
  }
}
</style>
