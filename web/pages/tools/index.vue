<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <h1 class="text-4xl font-bold text-gray-900 mb-8">Developer Tools</h1>
    <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      <Card v-for="i in 3" :key="i" class="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <template #header>
          <div class="h-48 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <i :class="`pi pi-${['code', 'cog', 'wrench'][i - 1]} text-6xl text-white`"></i>
          </div>
        </template>
        <template #title>
          <h2 class="text-xl font-semibold text-gray-900">Developer Tool {{ i }}</h2>
        </template>
        <template #content>
          <p class="text-gray-600 mb-4">
            This is a sample developer tool. Replace this with your actual tool description.
          </p>
          <div class="flex gap-2">
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              Free
            </span>
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Open Source
            </span>
          </div>
        </template>
        <template #footer>
          <Button label="Try Tool" class="p-button-outlined" />
        </template>
      </Card>
    </div>
  </div>
</template>