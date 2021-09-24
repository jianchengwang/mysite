<template>
  <div class="main">
    <h1 class="main-title">Project</h1>
    <p>
      I like to write code sometimes. Here are some of my projects:
    </p>
    <div id="project-list">
      <span v-if="isLoading">Loading...</span>
      <ul v-else v-for='repo in repos' :key="repo.name">
        <li><a :href="repo.html_url">{{ repo.name }}</a>
          (⭐️ {{ repo.stargazers_count }})</li>
      </ul>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      username: "jianchengwang",
      isLoading: true,
      repos: [],
    };
  },
  mounted() {
    const listRepos = async (username) => {
      this.repos = await fetch(
        `https://api.github.com/users/${username}/repos?type=owner&sort=updated`
      ).then((res) => res.json());
      this.isLoading = false;
    };
    listRepos(this.username);
  },
};
</script>

<style lang="scss" scoped>
p,
span {
  margin: 1rem auto;
  text-align: center;
  font-size: 1.2rem;
  color: darkgray;
  padding: 0.2rem;
}
.project-list {
  justify-items: center;
  text-align: center;
}
ul {
  margin: 1rem auto;
  text-align: center;
  font-size: 1.1rem;
  li {
    padding: 0.1rem;
  }
}
</style>
