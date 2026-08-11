<script lang="ts">
	interface Props {
		open: boolean;
		title: string;
		message: string;
		confirmLabel?: string;
		onConfirm?: () => void;
		onClose?: () => void;
	}
	let { open, title, message, confirmLabel = 'Eliminar', onConfirm, onClose }: Props = $props();
	let dialog: HTMLDialogElement;

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		else if (!open && dialog.open) dialog.close();
	});

	function close() {
		dialog.close();
		onClose?.();
	}

	function confirm() {
		onConfirm?.();
		close();
	}
</script>

<dialog bind:this={dialog} onclose={onClose}>
	<h3>{title}</h3>
	<p>{message}</p>
	<div class="actions">
		<button class="secondary" onclick={close}>Cancelar</button>
		<button class="danger" onclick={confirm}>{confirmLabel}</button>
	</div>
</dialog>

<style>
	dialog {
		border: none;
		border-radius: 12px;
		background: var(--panel);
		color: var(--text);
		padding: 20px;
		max-width: 320px;
	}

	dialog::backdrop {
		background: rgb(0 0 0 / 0.55);
	}

	dialog h3 {
		margin: 0 0 8px;
	}

	dialog p {
		margin: 0;
		color: var(--muted);
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		margin-top: 16px;
	}
</style>