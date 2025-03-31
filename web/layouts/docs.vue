<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <Header />

    <!-- Main Content -->
    <div class="flex pt-16">
      <!-- Mobile Menu Button -->
      <button @click="isSidebarOpen = !isSidebarOpen" class="md:hidden fixed top-4 left-4 z-50 p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path v-if="!isSidebarOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <!-- Left Sidebar -->
      <aside 
        :class="[
          'fixed inset-y-0 left-0 pt-16 w-72 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out z-40',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        ]"
      >
        <div class="flex-1 overflow-y-auto h-full">
          <nav class="p-6 space-y-1">
            <div v-if="navigation && navigation[0]?.children && navigation[0].children[0]?.children" class="space-y-4">
              <!-- Iterate over items directly under the current section -->
              <template v-for="topLevelItem in navigation[0].children[0].children"
                :key="topLevelItem.path || topLevelItem.title">
                <div class="space-y-2">
                  <!-- Directory with children -->
                  <div v-if="topLevelItem.children && topLevelItem.children.length > 0"
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
                    :class="{ 'bg-indigo-50 text-indigo-600': isSectionActive(topLevelItem.path || '') }">
                    {{ topLevelItem.title }}
                  </NuxtLink>

                  <!-- Children items with transition -->
                  <transition enter-active-class="transition duration-100 ease-out"
                    enter-from-class="transform scale-95 opacity-0" enter-to-class="transform scale-100 opacity-100"
                    leave-active-class="transition duration-75 ease-in"
                    leave-from-class="transform scale-100 opacity-100" leave-to-class="transform scale-95 opacity-0">
                    <div v-if="topLevelItem.children && topLevelItem.children.length > 0 && isExpanded(topLevelItem.path || topLevelItem.title)"
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

import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

interface ContentNavigationItem {
  title: string;
  path?: string;
  children?: ContentNavigationItem[];
}

const route = useRoute();
const isSidebarOpen = ref(false);

// Add a Map to track expanded state of each directory
const expandedItems = ref(new Map<string, boolean>());

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

const { data: navigation } = await useAsyncData<ContentNavigationItem[]>('navigation', () => {
  if (sectionRootPath.value) {
    // If we have a valid section path, create the query builder instance
    return queryCollectionNavigation('column')
      .where('path', 'LIKE', sectionRootPath.value + "/%")
  }
  // Return empty array if no valid section path
  return Promise.resolve([]);
})

// Helper function to determine if a link is active (exact match)
const isActive = (path: string): boolean => {
  return route.path === path;
};

// Helper function to highlight parent/section links when a child is active
const isSectionActive = (sectionPath: string): boolean => {
  // Check if sectionPath is valid and if the current route starts with it
  return Boolean(sectionPath && route.path.startsWith(sectionPath));
}

// Close sidebar when route changes
watch(() => route.path, () => {
  if (window.innerWidth < 768) {
    isSidebarOpen.value = false;
  }
});
</script>

<style scoped>
.rotate-90 {
  transform: rotate(90deg);
}
</style>