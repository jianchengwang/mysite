<template>
    <header class="sticky top-0 w-full p-4 bg-slate-100 bg-opacity-40 border-b-2 border-white border-opacity-30 backdrop-blur-lg z-20">
        <div class="flex items-center justify-between max-w-6xl m-auto">
            <g-link to="/" class="no-underline">
                <figure class="font-black text-lg">
                <h1>JianchengwangのSite</h1>
                </figure>
            </g-link>

            <nav class="site-nav">
                <ul class="links">
                <li class="link">
                    <g-link to="/tech">Tech | </g-link>
                    <g-link to="/life">Life | </g-link>
                    <g-link to="/store">Store | </g-link>
                    <g-link to="/book">Book | </g-link>
                    <g-link to="/girls">Girls | </g-link>
                </li>
                </ul>
            </nav>
        </div>
    </header>
</template>

<script setup name="AppHeader">
</script>
  
<style scoped>
</style>