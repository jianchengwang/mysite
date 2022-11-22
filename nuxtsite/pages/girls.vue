
<script setup>
</script>
<template>
   <ContentQuery path="/girls" v-slot="{ data }">
    <main class="container mx-auto px-4 mt-6 flex justify-center">
      <div class="p-16 md:p-16 max-w-screen-md w-full flex flex-col items-center justify-center rounded-3xl shadow-inset-white dark:shadow-none">
        <h1 class="text-xl md:text-3xl font-bold my-4 tracking-tight font-space">{{ data[0].title }}</h1>
        <div class="my-4 tracking-tight font-space">{{ data[0].girls.length }}</div>
        <ul class="grid grid-cols-4 gap-4">
          <li class="container mx-auto px-2 text-center" v-for="girl in data[0].girls" :key="girl.name">
            <a :href="'https://zh.moegirl.org/' + girl.name + ''" :title="girl.reason" alt="portrait" target="_blank" rel="noopener">
                <img class="ml-8 w-16 h-16 border-pink-500 border-2 rounded-full transition ease-in-out delay-150 hover:-translate-y-1 hover:scale-110 hover: duration-300" :src="girl.avatar" :alt="girl.name">
                <figcaption class="my-2 tracking-tight font-space">{{ girl.name }}</figcaption>
                <figcaption class="my-2 tracking-tight font-space">「{{ girl.from }}」</figcaption>
            </a>
          </li>
        </ul>
      </div>
    </main>
  </ContentQuery>
</template>

<style scoped>
</style>