import { Ref, ref, watch } from "vue";

export default (root: Ref<HTMLElement | null>) => {
	const dynamicBorderElements = ref<Element[]>([]) 

	watch(
		() => root.value,
		() => {
			dynamicBorderElements.value = [...(root.value?.getElementsByClassName("dynamic-border") || [])]
		}
	)

	const mousePos = async (e: MouseEvent) => {
		if (!e.target) {
			return
		}
	
		for (const c of dynamicBorderElements.value) {
			const target = c as HTMLElement
			const rect = target .getBoundingClientRect()
			const x = e.clientX - rect.left
			const y = e.clientY - rect.top
			target.style.setProperty('--x', x + 'px')
			target.style.setProperty('--y', y + 'px')
		}
	}

	return {
		mousePos
	}
}