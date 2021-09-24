<template>
  <div class="main">
    <h1 class="main-title">{{ title }}</h1>
    <div id="gallery">
      <div class="page-subtitle">{{ photos.length }} photos in total</div>
      <client-only>
        <div class="photo-list" id="lightgallery" ref="lightgallery">
          <figure v-for="photo in photos" :key="photo.caption" class="photo-list-item" :data-src="photo.src">
            <img class="photo-list-cover" v-lazy="photo.src" :alt="photo.caption">
            <figcaption>{{ photo.id }}</figcaption>
          </figure>
        </div>
      </client-only>
    </div>
  </div>
</template>
<script>
export default {
  mounted() {
    setTimeout(() => {
      let el = document.getElementById("lightgallery");
      window.lightGallery(el);
    }, 1000);
  },
  async asyncData({ $content, params, error }) {
    const albumId = params.id;
    const page = await $content("albums", albumId)
      .fetch()
      .catch((err) => {
        error({ statusCode: 404, message: "Page not found", err });
      });
    return {
      title: page.title,
      photos: page.photos,
    };
  },
  head: {
    script: [
      {
        src:
          "https://cdn.jsdelivr.net/npm/lightgallery.js@latest/dist/js/lightgallery.min.js",
        mode: "client",
      },
    ],
    link: [
      {
        rel: "stylesheet",
        href:
          "https://cdn.jsdelivr.net/npm/lightgallery.js@latest/dist/css/lightgallery.min.css",
      },
    ],
  },
};
</script>
<style lang="scss" scoped>
.page-subtitle {
  text-align: center;
  color: var(--hty-secondary-text-color);
  font-size: 1rem;
  margin: 0.5rem;
}
.photo-list {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
}
.photo-list-item {
  display: inline-flex;
  position: relative;
  width: 15rem;
  margin: 1.5rem;
  cursor: pointer;
  img {
    box-sizing: border-box;
    vertical-align: bottom;
    display: inline-flex;
    border: 0.25rem solid #fff;
    box-shadow: 0 8px 10px rgba(0, 0, 0, 0.1);
    width: 100%;
    height: 10rem;
    object-fit: cover;
    background-color: #eee;
    &:hover {
      opacity: 0.9; //透明度
      transform: scale(1.2);
    }
  }
  figcaption {
    position: absolute;
    bottom: -1.8rem;
    display: block;
    text-align: center;
    width: 100%;
    font-size: 0.9rem;
  }
}
</style>
