<template>
  <nav class="main-nav flex gap-15">
    <g-link to="/tech/">
      <span class="main-nav__label">Tech</span>
    </g-link>

    <g-link to="/life/">
      <span class="main-nav__label">Life</span>
    </g-link>

    <g-link to="/store/">
      <span class="main-nav__label">Store</span>
    </g-link>

    <g-link to="/book/">
      <span class="main-nav__label">Book</span>
    </g-link>

    <g-link to="/column/">
      <span class="main-nav__label">Column</span>
    </g-link>

    <a href="https://jianchengwang.github.io/running_page"  target="_blank">
      <span class="main-nav__label">Running</span>
    </a>
  </nav>
</template>


<style lang="scss">
.main-nav {
  flex-wrap: nowrap;
}
@media screen and (max-width: 850px) {
  .main-nav {
    order: 10;
    min-width: 100%;
    a {
      padding-top: 5px;
      padding-bottom: 10px;
    }
  }
}
</style>