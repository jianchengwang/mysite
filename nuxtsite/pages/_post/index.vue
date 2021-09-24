<template>
  <div class="main">
    <div v-if="!tags">
      <PostList :postPath="postPath" :docs="docs" :listTitle="listTitle" />
    </div>
    <div v-if="tags">
      <PostTags :tags="tags" />
    </div>
  </div>
</template>
<script>
import PostList from "@/components/post/PostList.vue";
import PostTags from "@/components/post/PostTags.vue";

export default {
  components: {
    PostList,
    PostTags,
  },
  async asyncData({ $content, params }) {
    let postPath = params.post;

    if (postPath === "tag") {
      let tagMap = new Map();
      const docs = await $content("", { deep: true }).only(["tags"]).fetch();
      docs.forEach((doc) => {
        if (doc.tags) {
          for (let i = 0; i < doc.tags.length; i++) {
            if (tagMap.has(doc.tags[i])) {
              tagMap.set(doc.tags[i], tagMap.get(doc.tags[i]) + 1);
            } else {
              tagMap.set(doc.tags[i], 1);
            }
          }
        }
      });
      let tags = [];
      tagMap.forEach((v, k) => {
        tags.push({ name: k, cnt: v });
      });
      return {
        tags,
      };
    } else {
      const docs = await $content(postPath)
        // .only([
        //   "title",
        //   "description",
        //   "img",
        //   "slug",
        //   "author",
        //   "createdAt",
        //   "path",
        //   "type",
        //   "url",
        //   "draft",
        // ])
        .sortBy("createdAt", "desc")
        .fetch();
      return {
        tags: undefined,
        docs,
        listTitle:
          postPath.slice(0, 1).toUpperCase() + postPath.slice(1).toLowerCase(),
        postPath: postPath,
      };
    }
  },
};
</script>
