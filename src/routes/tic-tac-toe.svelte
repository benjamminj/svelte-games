<script lang="ts">
	type Value = 'x' | 'o' | '';
	type Move = Exclude<Value, ''>;

	let size = 3;
	let player: Move = 'x';
	let board: Value[];

	/**
	 * Bootstrap the game board, whether at the start of the game loading or when resetting
	 */
	function startGame(newSize = size) {
		player = 'x';
		board = Array.from({ length: newSize ** 2 }, () => '');
	}

	// Set up the game board, and reset it any time the size changes
	$: startGame(size);

	/**
	 * Allow a player to play a turn, placing their mark on a given cell
	 */
	function playTurn(i: number) {
		board[i] = player;
		player = player === 'x' ? 'o' : 'x';
	}

	/**
	 * This function runs after every turn and checks for any of the "end game" states.
	 *
	 * The game is considered to have "ended" if any of the following are true:
	 *
	 * 1. A player has three of their marks in a row (horizontally, vertically, or diagonally).
	 * 1. All of the cells on the board have been filled (draw)
	 */
	function checkForGameEnd(board: Value[]): Move | 'draw' | undefined {
		for (let i = 0; i < board.length; i++) {
			const v = board[i];
			const isWinning = (arr: Value[]) => arr.every((x) => x === arr[0]);

			if (v === '') continue;

			// If starting a row, check to see whether that row is a "win"
			if (i % size === 0) {
				const row = board.slice(i, i + size);
				if (isWinning(row)) return v;
			}

			// For each column, check to see whether it's a win
			if (i < size) {
				const col = Array.from({ length: size }, (_, j) => board[j * size + i]);
				if (isWinning(col)) return v;
			}

			if (i === 0) {
				const diag = Array.from({ length: size }).map((_, j) => board[j * size + j]);
				if (isWinning(diag)) return v;
			}

			if (i === size - 1) {
				const diag = Array.from({ length: size }).map((_, j) => board[j * size + (size - 1 - j)]);
				if (isWinning(diag)) return v;
			}
		}

		if (!board.some((x) => x === '')) return 'draw';
		return undefined;
	}

	// Check the board every time the board changes
	$: endState = checkForGameEnd(board);
</script>

<h1>tic tac toe ❌ 🅾️</h1>

<header>
	<button on:click={() => startGame()}>reset</button>

	<label>
		size:
		<input type="number" bind:value={size} />
	</label>
</header>

<main>
	<p>
		{#if endState === 'draw'}
			it's a draw
		{:else if endState === 'x' || endState === 'o'}
			{endState} wins!
		{:else}
			{player}'s turn
		{/if}
	</p>

	<section
		class="gap-2 inline-grid"
		style={`
		grid-template-columns: repeat(${size}, auto);
		grid-template-rows: repeat(${size}, auto);
	`}
	>
		{#each board as cell, i}
			<button class="cell" on:click={() => playTurn(i)} disabled={Boolean(endState)}>
				{cell}
			</button>
		{/each}
	</section>
</main>

<style>
	header {
		padding: 1rem 0;
	}

	/* .game {
		display: inline-grid;
		grid-template-columns: repeat(var(--size), auto);
		grid-template-rows: repeat(var(--size), auto);
		gap: 0.5rem;
	} */

	.cell {
		--cell-size: 4rem;

		height: var(--cell-size);
		width: var(--cell-size);
		border: 1px solid black;
		font-size: 1.5rem;
	}
</style>
