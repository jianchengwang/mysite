<template>
  <Layout>
    <div class="container mx-auto px-6 mt-12 flex justify-center">
      <div
        class="
          p-16
          md:p-16
          max-w-screen-md
          w-full
          flex flex-col
          items-center
          justify-center
          rounded-3xl
          shadow-inset-white
          dark:shadow-none
        "
      >
        <g-link to="/about">
          <div class="relative p-8 md:p-8">
            <img
              class="
                h-32
                w-32
                ring ring-blue-500 ring-offset-4
                rounded-full
                transition
                ease-in-out
                delay-150
                hover:-translate-y-1 hover:scale-110 hover:bg-indigo-500
                duration-300
              "
              src="https://blog.res.jianchengwang.info/avatar.jpg"
              alt="jiancheng_wang"
            />
            <span
              class="
                absolute
                bottom-4
                right-4
                h-8
                w-8
                ring-white-500 ring-offset-16
              "
              title="balabala...."
              >😊</span
            >
          </div>
        </g-link>

        <p
          class="
            inline-flex
            items-center
            text-center text-lg
            md:text-2xl
            text-gray-500
            dark:text-gray-300
            tracking-wide
          "
        >
          Hey,
          <span class="wave text-5xl mx-3 max-2">👋🏻</span>
          I'm
        </p>
        <h1
          class="text-6xl md:text-8xl font-bold my-4 tracking-tight font-space"
        >
          Jianchengwang.
        </h1>
        <p
          class="
            mt-6
            text-lg
            md:text-xl
            text-center text-gray-500
            dark:text-gray-300
            tracking-wide
          "
        >
          A software engineer and creator who also like to write something,
          maybe life record, fantasy story and so on. Have fun and enjoy every
          day, hope my posts will help to you ✨
        </p>

        <div class="mt-28 pb-16"></div>
      </div>
    </div>
  </Layout>
</template>

<script setup>
</script>
