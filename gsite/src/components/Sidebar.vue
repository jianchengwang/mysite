<script setup>
import { ref, defineEmits } from "vue";

// define links prop
defineProps(["docLinks"]);

const emit = defineEmits(["navigate"])

const currentLink = ref("")

const sectionItemClick = (link) => {
  currentLink.value = link
  emit('navigate', currentLink.value)
}
</script>

<template>
  <div
    class="px-4 pt-8 lg:pt-12"
  >
    <div
      v-for="(section, index) in docLinks"
      :key="section.title"
      class="pb-4 mb-4 border-ui-border"
      :class="{ 'border-b': index < docLinks.length -1 }"
    >
      <h3 class="pt-0 mt-0 mb-1 text-sm tracking-tight uppercase border-none">
        {{ section.title }}
      </h3>

      <ul class="max-w-full pl-2 mb-0">
        <li
          v-for="item in section.items"
          :id="item.link"
          :key="item.link"
          @mousedown="sectionItemClick(item.link)"
        >
          <g-link
            class="flex items-center py-1 font-semibold"
          >
           <span
              class="absolute w-2 h-2 -ml-3 rounded-full opacity-0 bg-ui-primary transition transform scale-0 origin-center"
              :class="{
                'opacity-100 scale-100': currentLink.value === item.link
              }"
            ></span>
            {{ item.title }}
          </g-link>
        </li>
      </ul>
    </div>
  </div>
</template>