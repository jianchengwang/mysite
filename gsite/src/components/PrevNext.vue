<script setup>
// define prev and next props
defineProps(["prev", "next"]);
</script>

<template>
  <ul class="prev-next-cont">
    <li class="link-item prev">
      <g-link v-if="prev" :to="prev._path">
        <span> {{ prev.title }} </span>
      </g-link>
    </li>
    <li class="link-item next">
      <g-link v-if="next" :to="next._path">
        <span> {{ next.title }} </span>
      </g-link>
    </li>
  </ul>
</template>

<style scoped>
.prev-next-cont {
  @apply flex gap-4 justify-between p-4 border border-slate-200 rounded-lg;
}

.link-item a {
  @apply flex gap-2;
}
</style>