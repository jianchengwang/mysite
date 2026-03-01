<template>
  <footer class="bg-white border-t-2 border-zinc-900 mt-12">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      <!-- Copyright -->
      <div class="pt-8 text-center">
        <div class="w-full flex justify-center text-zinc-900 mb-4 flex-wrap gap-2 items-center">
          <a rel="noopener" href="https://beian.miit.gov.cn/" target="_blank" class="hover:underline">闽ICP备16000680号-2</a>
          <span class="mx-2 hidden sm:inline">|</span>
          <a class="text-tfh flex items-center"
            href="https://www.upyun.com/?utm_source=lianmeng&amp;utm_medium=referral" target="blank" title="又拍云">
            <img
              id="upyun" height="30" src="http://public.mysite.jianchengwang.info/upyun-logo.png" alt="upyun"
              style="height: 30px;" class="grayscale hover:grayscale-0 transition-all opacity-80 hover:opacity-100" />
          </a>
        </div>
        <p class="text-zinc-600 font-medium font-hand text-xl">
          © {{ new Date().getFullYear() }} JianchengWang. <span class="sketch-border-2 px-2 py-0.5 ml-1">Hand-sketched with love.</span>
        </p>
      </div>


    </div>
  </footer>
</template>

<style scoped>
</style>