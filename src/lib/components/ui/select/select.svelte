<script lang="ts">
	import { Select as SelectPrimitive } from "bits-ui";

	let {
		open = $bindable(false),
		type = "single",
		// ponytail: bits-ui union type (string | string[]) breaks single-select bindings; loosen to any
		value = $bindable<any>(),
		...restProps
	}: Omit<SelectPrimitive.RootProps, 'value' | 'type' | 'onValueChange'> & { value?: any; type?: 'single' | 'multiple' } = $props();
</script>

<SelectPrimitive.Root bind:open {type} bind:value={value as never} {...restProps} />
