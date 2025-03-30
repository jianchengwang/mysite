<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <Header />

    <!-- Main Content -->
    <div class="flex pt-16">
      <!-- Left Sidebar -->
      <aside class="fixed inset-y-0 left-0 pt-16 hidden md:flex md:flex-col w-72 bg-white border-r border-gray-200">
        <div class="flex-1 overflow-y-auto">
          <nav class="p-6 space-y-1">
            <div v-if="navigation[0].children && navigation[0].children[0].children" class="space-y-4">
              <!-- Iterate over items directly under the current section (like 'docker.md', 'k8s' dir) -->
              <template v-for="topLevelItem in navigation[0].children[0].children"
                :key="topLevelItem.path || topLevelItem.title">
                <div class="space-y-2">
                  <!-- Directory with children -->
                  <div v-if="topLevelItem.children?.length > 0"
                    class="flex items-center justify-between px-3 py-2 cursor-pointer group"
                    @click="toggleExpand(topLevelItem.path || topLevelItem.title)">
                    <span class="text-sm font-semibold text-gray-500">
                      {{ topLevelItem.title }}
                    </span>
                    <svg
                      class="w-4 h-4 text-gray-400 transition-transform duration-200 transform group-hover:text-gray-500"
                      :class="{ 'rotate-90': isExpanded(topLevelItem.path || topLevelItem.title) }" viewBox="0 0 20 20"
                      fill="currentColor">
                      <path fill-rule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clip-rule="evenodd" />
                    </svg>
                  </div>

                  <!-- Single page link -->
                  <NuxtLink v-else-if="topLevelItem.path" :to="topLevelItem.path"
                    class="block px-3 py-2 text-sm font-semibold text-gray-900 rounded-md hover:bg-gray-50"
                    :class="{ 'bg-indigo-50 text-indigo-600': isSectionActive(topLevelItem.path) }">
                    {{ topLevelItem.title }}
                  </NuxtLink>

                  <!-- Children items with transition -->
                  <transition enter-active-class="transition duration-100 ease-out"
                    enter-from-class="transform scale-95 opacity-0" enter-to-class="transform scale-100 opacity-100"
                    leave-active-class="transition duration-75 ease-in"
                    leave-from-class="transform scale-100 opacity-100" leave-to-class="transform scale-95 opacity-0">
                    <div v-if="topLevelItem.children?.length > 0 && isExpanded(topLevelItem.path || topLevelItem.title)"
                      class="ml-4 space-y-1 border-l border-gray-200 pl-3">
                      <NuxtLink v-for="childItem in topLevelItem.children" :key="childItem.path" :to="childItem.path"
                        class="block px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
                        :class="{ 'bg-indigo-50 text-indigo-600 font-semibold': isActive(childItem.path) }">
                        {{ childItem.title }}
                      </NuxtLink>
                    </div>
                  </transition>
                </div>
              </template>
            </div>
            <div v-else>
              <p class="text-sm text-gray-500 px-3 py-2">No content found in this section.</p>
            </div>
          </nav>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="flex-1 md:ml-72">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="py-8">
            <slot />
          </div>
        </div>
      </main>
    </div>

    <Footer />
  </div>
</template>

<script setup lang="ts">
import Header from '~/components/Header.vue'
import Footer from '~/components/Footer.vue'

import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
// Add a Map to track expanded state of each directory
const expandedItems = ref(new Map());

// Toggle function for directory expansion
const toggleExpand = (itemPath: string) => {
  expandedItems.value.set(itemPath, !expandedItems.value.get(itemPath));
};

// Check if an item is expanded
const isExpanded = (itemPath: string) => {
  // If not in map, default to true for better UX
  return expandedItems.value.get(itemPath) !== false;
};

const sectionRootPath = computed(() => {
  const pathParts = route.path.split('/').filter(p => p !== ''); // e.g., ['column', 'cloudnative', 'k8s']
  // Check if the path starts with 'column' and has at least one segment after it
  if (pathParts.length >= 2 && pathParts[0] === 'column') {
    // Construct the path for the current section (e.g., /column/cloudnative)
    return `/column/${pathParts[1]}`;
  }
  // Return null if the path structure doesn't match (e.g., not under /column/something)
  return null;
});

const { data: navigation } = await useAsyncData(() => {
  if (sectionRootPath.value) {
    // If we have a valid section path, create the query builder instance
    return queryCollectionNavigation('column')
      .where('path', 'LIKE', sectionRootPath.value + "/%")
  }
  // Otherwise, return null (ContentNavigation won't render)
  return null;
})

// Helper function to determine if a link is active (exact match)
// You could extend this to highlight parent if a child is active if needed
const isActive = (path) => {
  return route.path === path;
};

// Helper function to highlight parent/section links when a child is active
const isSectionActive = (sectionPath) => {
  // Check if sectionPath is valid and if the current route starts with it
  return sectionPath && route.path.startsWith(sectionPath);
}
</script>

<style scoped>
.rotate-90 {
  transform: rotate(90deg);
}
</style>