<script lang="ts">
	let count = 0;
</script>

<main>
	<div class="border-1 border-gray-600 p-4 flex items-center space-x-4">
		<button on:click={() => count--} class="bg-red-100 red-900 p-2">--</button>
		<h1>{count}</h1>
		<button on:click={() => count++} class="bg-green-100 green-900 p-2">++</button>
	</div>
</main>
