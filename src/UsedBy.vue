<template>
  <div class="used-by">
    <a href="https://adagio.io" target="_blank" rel="nofollow">
        <img src="/usedby/adagio.webp" alt="Adagio.io" />
    </a>
    <a href="https://ffmate.io" target="_blank" rel="nofollow">
        <img src="/usedby/ffmate.webp" alt="ffmate.io" />
    </a>
  </div>
</template>
<style scoped>
.used-by {
	display: flex;
	flex-direction: row;
  flex-wrap: wrap;
	justify-content: center;
	gap: 1rem;
}

.used-by>a {
	border-radius: 1rem;
	overflow: hidden;
	background-color: white;
  display: inline-flex;
  align-items: center;
}

.used-by img {
  max-width: 200px !important;
  background-color: #fff;
}
</style>