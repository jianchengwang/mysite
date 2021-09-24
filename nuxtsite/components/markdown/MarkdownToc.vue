<template>
  <div class="post-toc">
    <ul>
      <li v-for="toc1 of tocItems" :key="toc1.id" :id="'toc-' + toc1.id" class="toc1">
        <NuxtLink :to="`#${toc1.id}`">{{ toc1.no }}.{{ toc1.text }}</NuxtLink>
        <ul v-if="toc1.children.length">
          <li v-for="toc2 of toc1.children" :key="toc2.id" :id="'toc-' + toc2.id" class="toc2">
            <NuxtLink :to="`#${toc2.id}`">{{ toc2.no }}.{{ toc2.text }}</NuxtLink>
            <ul v-if="toc2.children.length">
              <li v-for="toc3 of toc2.children" :key="toc3.id" :id="'toc-' + toc3.id" class="toc3">
                <NuxtLink :to="`#${toc3.id}`">{{ toc3.no }}.{{ toc3.text }}</NuxtLink>
              </li>
            </ul>
          </li>
        </ul>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  props: ["toc"],
  data() {
    return {
      tocItems: [],
      tocIdMap: {},
      currentlyActiveToc: "",
    };
  },
  computed: {},
  mounted() {
    this.buildTocItems();
  },
  methods: {
    buildTocItems() {
      let result = [];
      let idMap = {};
      if (this.toc.length) {
        const level1_depth = this.toc[0].depth;
        let level1_toc;
        let level2_toc;
        let level3_toc;
        for (let i = 0; i < this.toc.length; i++) {
          let tocItem = this.toc[i];
          if (
            tocItem.depth < level1_depth ||
            tocItem.depth > level1_depth + 2
          ) {
            continue;
          }
          switch (tocItem.depth - level1_depth) {
            case 0:
              level1_toc = tocItem;
              level1_toc.level = 1;
              level1_toc.no = result.length + 1;
              level1_toc.children = [];
              result.push(level1_toc);
              idMap[level1_toc.id] = level1_toc;
              break;
            case 1:
              level2_toc = tocItem;
              level2_toc.level = 2;
              level2_toc.children = [];
              level2_toc.no = `${level1_toc.no}.${
                level1_toc.children.length + 1
              }`;
              level1_toc.children.push(level2_toc);
              idMap[level2_toc.id] = level2_toc;
              break;
            case 2:
              level3_toc = tocItem;
              level3_toc.level = 3;
              level3_toc.children = [];
              level3_toc.no = `${level2_toc.no}.${
                level2_toc.children.length + 1
              }`;
              level2_toc.children.push(level3_toc);
              idMap[level3_toc.id] = level3_toc;
              break;
            default:
              break;
          }
        }
      }
      this.tocItems = result;
      this.tocIdMap = idMap;
    },
  },
};
</script>

<style lang="scss" scoped>
.post-toc {
  margin-top: 2rem;
  margin-left: 1rem;
  padding-bottom: 2rem;
  ul {
    text-align: left;
  }
}
.toc1 {
  font-size: 0.9rem;
  font-weight: 800;
}
.toc2 {
  font-size: 0.8rem;
  font-weight: 600;
  // display: none;
}
.toc3 {
  font-size: 0.7rem;
  font-weight: 400;
  // display: hidden;
}
.activeToc {
  color: #dd4a68 !important;
}
</style>
