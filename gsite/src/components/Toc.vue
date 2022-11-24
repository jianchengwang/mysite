<script setup>
// define links prop
defineProps(["links"]);

// flatten TOC links nested arrays to one array
const flattenLinks = (links) => {
  let _links = links
    .map((link) => {
      let _link = [link];
      if (link.children) {
        let flattened = flattenLinks(link.children);
        _link = [link, ...flattened];
      }
      return _link;
    })
    .flat(1);

  return _links;
};
</script>

<template>
  <div
    class="
      toc
      p-4
      bg-slate-50
      border border-slate-200
      rounded-lg
      max-h-[calc(100vh-6rem)]
      overflow-auto
    "
  >
    <header v-if="links" class="toc-header pb-2 mb-2 border-b border-slate-200">
      <h3 class="text-xl font-bold">Table of contents</h3>
    </header>
    <ul class="toc-links lex flex-col gap-2 px-2">
      <!-- render each link with depth class -->
      <li
        v-for="link of flattenLinks(links)"
        :key="link.value"
        :class="`toc-link _${link.depth}`"
      >
        <a :href="`${link.anchor}`">
          {{ link.value }}
        </a>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.toc {
  @apply p-4 bg-slate-50 border border-slate-200 rounded-lg;
  @apply max-h-[calc(100vh-6rem)] overflow-auto;
}

.toc-header {
  @apply pb-2 mb-2 border-b border-slate-200;
}

.toc-links {
  @apply flex flex-col gap-2 px-2;
}

.toc-link {
  @apply text-slate-500;
}

.toc-link._3 {
  @apply pl-3;
  padding-left: 3px;
}

.toc-link._4 {
  @apply pl-6;
  padding-left: 6px;
}

.toc-link._undefined {
  @apply pl-8;
  padding-left: 8px;
}
</style>