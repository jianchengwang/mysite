<script setup>
// define prev and next props
defineProps(["prev", "next"]);

</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row justify-between items-center">
      <g-link
        v-if="prev"
        :to="prev.path"
        class="mb-4 sm:mb-0 flex items-center mr-auto text-ui-primary font-bold px-4 py-2 border border-ui-border rounded-lg hover:bg-ui-primary hover:text-white transition-colors"
      >
        {{ prev.title }}
      </g-link>

      <g-link
        v-if="next"
        :to="next.path"
        class="flex items-center ml-auto text-ui-primary font-bold px-4 py-2 border border-ui-border rounded-lg hover:bg-ui-primary hover:text-white transition-colors"
      >
        {{ next.title }}
      </g-link>
    </div>
  </div>
</template>