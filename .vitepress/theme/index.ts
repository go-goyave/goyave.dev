// https://vitepress.dev/guide/custom-theme
import { useRoute, type Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import './style.css'
import Layout from './Layout.vue'
import { nextTick, onMounted, watch } from 'vue'
import mediumZoom from 'medium-zoom'

export default {
  extends: DefaultTheme,
  Layout: Layout,
  enhanceApp({ app, router, siteData }) {
  },
	setup() {
    onMounted(() => {
			const route = useRoute();
			const initZoom = () => {
				mediumZoom('[data-zoomable]', { background: 'var(--vp-c-bg)' }); 
			}
			onMounted(() => initZoom())
			watch(
				() => route.path,
				() => nextTick(() => initZoom()),
				{ immediate: true }
			)
    });
  },

} satisfies Theme
