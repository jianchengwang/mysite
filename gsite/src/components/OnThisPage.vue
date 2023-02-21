<template>
  <div v-if="links" class="mt-8 sm:pl-4 md:pl-6 md:pt-12 lg:pl-8 sm:pb-16 sm:border-l border-ui-border md:mt-0       
      p-4
      bg-slate-50
      border border-slate-200
      rounded-lg
      max-h-[calc(100vh-6rem)]
      overflow-auto">
    <h3 class="pt-0 mt-0 text-sm tracking-wide uppercase border-none">On this page</h3>
    <div>
      <ul>
        <li
          v-for="(link, index) in flattenLinks(links)"
          :key="link.value"
          :class="{
            'border-t border-dashed border-ui-border pt-2 mt-2': index > 0 && link.depth === 2,
            'font-semibold': link.depth === 2,
            [`depth-${link.depth}`]: true,
          }"
        >
          <a
            :href="`${link.anchor}`"
            class="relative flex items-center py-1 text-sm transition transform hover:translate-x-1"
            :class="{
              'pl-2': link.depth === 3,
              'pl-3': link.depth === 4,
              'pl-4': link.depth === 5,
              'pl-5': link.depth === 6,
              'font-bold text-ui-primary': activeAnchor === link.anchor
            }"
          >
            <span
              class="absolute w-2 h-2 -ml-3 rounded-full opacity-0 bg-ui-primary transition transform scale-0 origin-center"
              :class="{
                'opacity-100 scale-100': activeAnchor === link.anchor
              }"
            ></span>
            {{ link.value }}
            </a>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

// define links prop
defineProps(["links"]);

const activeAnchor = ref("");

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
