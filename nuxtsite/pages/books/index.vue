<template>
  <div class="main">
    <h1 class="main-title">{{ title }}</h1>
    <div class="book-list">
      <ul>
        <li v-for="book in books" :key="book.title">
          {{ book.title }}
        </li>
      </ul>
    </div>
    ....
  </div>
</template>

<script>
export default {
  async asyncData({ $content, params, error }) {
    const page = await $content("books", "index")
      .fetch()
      .catch((err) => {
        error({ statusCode: 404, message: "Page not found", err });
      });
    return {
      title: page.title ? page.title : "Books",
      books: page.books,
    };
  },
};
</script>

<style lang="scss" scoped>
.book-list {
  margin: 1rem auto;
}
ul {
  margin: 1rem auto;
  text-align: center;
  font-size: 1.1rem;
  li {
    padding: 0.1rem;
  }
}
</style>
