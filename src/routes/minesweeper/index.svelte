<script lang="ts">
	import { interpret } from '@xstate/fsm'

	import {
		Cell,
		GameStatus,
		getAdjacentBombs,
		getAdjacentIndexes
	} from './_state'
	import { createStore } from './_store'

	// TODO:
	// - configurable "flag" event (right click or double click)
	// - fast flag mode (default to flag on click, reveal on secondary control)
	// - random bomb distrubution

	const getNewCell = (): Cell => ({
		bomb: false,
		adjacent: 0,
		status: 'initial'
	})

	let size = 6
	let bombs = 6
	// TODO: move all of the grid generation, bomb distribution, and everything inside
	// the state machine. Everything except the size & bomb count config.
	let grid: Cell[] = Array.from({ length: size ** 2 }, () => getNewCell())

	const { state, send } = createStore({
		bombs,
		size
	})

	/**
	 * Given the grid size, determine all the locations of the bombs in relation
	 * to the player's first move. This allows precomputing some values, but also
	 * makes sure the player never loses on their first move.
	 */
	function distributeBombs() {
		let remainingBombs = bombs
		let bombIndices = []
		for (let i = 9; i < grid.length; i++) {
			const hasBomb = Math.random() < remainingBombs / (grid.length - i)

			if (hasBomb) {
				bombIndices.push(i)
				remainingBombs--
			}

			if (remainingBombs === 0) {
				break
			}
		}

		return bombIndices
	}

	/**
	 * On (or immediately after) a player's first move, fill the grid with the bombs
	 * from the indices.
	 */
	function fillGrid() {
		const bombLocations = distributeBombs()
		bombLocations.forEach((index) => {
			grid[index].bomb = true
		})

		for (let i = 0; i < grid.length; i++) {
			grid[i].adjacent = getAdjacentBombs({ grid, i, size })
		}
	}

	function revealAdjacent({
		i,
		size,
		grid
	}: {
		i: number
		size: number
		grid: Cell[]
	}) {
		const indexesToCheck = getAdjacentIndexes({ i, size, grid })
		indexesToCheck.forEach((i) => {
			const cell = grid[i]
			// recursively crawl hidden cells with 0 adjacent bombs and reveal
			if (cell.adjacent === 0 && cell.status === 'initial') {
				cell.status = 'touched'
				revealAdjacent({ i, size, grid })
			} else {
				// otherwise, reveal the edges of the open space
				cell.status = 'touched'
			}
		})
	}
</script>

<h1>minesweeper 💣💥</h1>

<main>
	<div>
		<p>{$state.value}</p>
	</div>
	<div class="grid" style={`--size: ${size};`}>
		{#each $state?.context?.grid as cell, index}
			<button
				class="cell"
				class:bg-blue-500={cell.status === 'initial' ||
					cell.status === 'flagged'}
				data-index={index}
				on:contextmenu|preventDefault={() => {
					if (cell.status === 'flagged') {
						cell.status = 'initial'
					} else {
						cell.status = 'flagged'
					}
				}}
				on:click={() => {
					send({ type: 'revealCell', i: index })
					console.log($state)
					// if (cell.status === 'flagged') return
					// cell.status = 'touched'
					// if (gameStatus === 'idle') {
					// 	fillGrid()
					// 	gameStatus = 'playing'
					// }

					// if (gameStatus === 'playing') {
					// 	if (cell.bomb) {
					// 		gameStatus = 'lose'
					// 	} else if (cell.adjacent === 0) {
					// 		revealAdjacent({ grid, i: index, size })
					// 	}
					// }
				}}
			>
				{#if cell.status === 'touched'}
					{#if cell.bomb}
						💣
					{:else}
						{cell.adjacent}
					{/if}
				{:else if cell.status === 'flagged'}
					<span class="text-2xl">🚩</span>
				{/if}
			</button>
		{/each}
	</div>
</main>

<style>
	.grid {
		display: inline-grid;
		grid-template-columns: repeat(var(--size), 1fr);
		grid-template-rows: repeat(var(--size), 1fr);
		gap: 0.5rem;
	}

	.cell {
		height: 4rem;
		width: 4rem;
	}
</style>
