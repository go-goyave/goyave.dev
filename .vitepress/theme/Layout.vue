<script setup>
import DefaultTheme from 'vitepress/theme'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #sidebar-nav-before>
      <div class="become-sponsor">
        <a
          href="https://github.com/sponsors/System-Glitch/"
          rel="nofollow"
          target="_blank"
        >
          Become a Sponsor
        </a>
      </div>
    </template>
  </Layout>
</template>