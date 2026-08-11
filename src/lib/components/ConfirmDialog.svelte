<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';

	interface Props {
		open: boolean;
		title: string;
		message: string;
		confirmLabel?: string;
		onConfirm?: () => void;
		onClose?: () => void;
	}
	let { open, title, message, confirmLabel = 'Eliminar', onConfirm, onClose }: Props = $props();

	function confirm() {
		onConfirm?.();
		onClose?.();
	}
</script>

<Dialog.Root
	bind:open
	onOpenChange={(o) => {
		if (!o) onClose?.();
	}}
>
	<Dialog.Content showCloseButton={false} class="max-w-[320px]">
		<Dialog.Title>{title}</Dialog.Title>
		<Dialog.Description>{message}</Dialog.Description>
		<div class="mt-2 flex justify-end gap-2">
			<Button variant="outline" onclick={onClose}>Cancelar</Button>
			<Button variant="destructive" onclick={confirm}>{confirmLabel}</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>
