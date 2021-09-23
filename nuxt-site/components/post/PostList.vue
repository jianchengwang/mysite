<template>
  <div class="post-list">
    <h1 class="main-title">{{ listTitle }}</h1>
    <input class="list-search" type="text" placeholder="Search..." v-model="searchKey" />
    <div v-if="docsYear.length">
      <div class="list-group" v-for="dy in filterDocs" :key="dy.year">
        <h2 class="list-year">{{ dy.year }}</h2>
        <ul class="list-part">
          <li class="list-item" v-for="doc in dy.docs" :key="doc.title"><a :class="{'linkColor': isLink(doc)}" @click="visitDoc(doc)" href="javascript:void(0);">
              <div>
                <span :datetime="doc.createdAt" class="list-item-time">{{ doc.createdAtMD }}</span>
                <span class="list-item-title">
                  {{ doc.title }}
                </span>
              </div>
            </a></li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  created() {
    this.docsYear = [];
    let postDocs = this.docs.filter(
      (doc) =>
        // 过滤草稿文章
        !doc.draft
    );
    if (postDocs.length) {
      let yearTmp = this.utils.formatDate(postDocs[0].createdAt, "YY");
      let item = postDocs[0];
      item.createdAtMD = this.utils.formatDate(item.createdAt, "MM-DD");
      this.docsYear.push({ year: yearTmp, docs: [item] });
      for (let i = 1; i < postDocs.length; i++) {
        item = postDocs[i];
        let itemYear = this.utils.formatDate(postDocs[i].createdAt, "YY");
        item.createdAtMD = this.utils.formatDate(item.createdAt, "MM-DD");
        if (itemYear != yearTmp) {
          yearTmp = itemYear;
          this.docsYear.push({ year: yearTmp, docs: [item] });
        } else {
          this.docsYear[this.docsYear.length - 1].docs.push(item);
        }
      }
    }
  },
  props: ["postPath", "docs", "listTitle"],
  data() {
    return {
      searchKey: "",
      docsYear: [],
    };
  },
  computed: {
    filterDocs: function () {
      let result = [];
      for (var i = 0; i < this.docsYear.length; i++) {
        let yearDoc = { year: this.docsYear[i].year };
        yearDoc.docs = this.docsYear[i].docs.filter((doc) =>
          doc.title.toLowerCase().includes(this.searchKey.toLowerCase())
        );
        if (yearDoc.docs.length) {
          result.push(yearDoc);
        }
      }
      return result;
    },
  },
  methods: {
    isLink: function (doc) {
      return doc.type && doc.type === "link" && doc.url;
    },
    visitDoc: function (doc) {
      if (this.isLink(doc)) {
        window.open(doc.url);
      } else {
        window.location.href = doc.path + "/";
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.main-title {
  text-align: center;
  font-size: 2rem;
}
.list-group {
  padding: 0.5rem;
}
.list-search {
  padding: 0.2rem;
  color: darkgray;
}
.list-year {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 1.8rem;
  font-weight: bold;
}
.list-part {
  min-width: 60rem;
}
.list-item {
  line-height: 2rem;
  position: relative;
  transition: border 0.5s;
  border-bottom: 1px dashed darkgray;
  margin-top: 1em;
  padding-bottom: 0.5em;
  display: flex;
  align-items: baseline;
}
.list-item-title {
  font-size: 1.25em;
  line-height: 2rem;
}
.list-item-time {
  margin-right: 1rem;
  line-height: 2rem;
}
.linkColor {
  color: blue;
}
</style>
