import { assign, createMachine, interpret } from '@xstate/fsm'
import { readable } from 'svelte/store'
import type { Readable } from 'svelte/store'
import type { StateMachine } from '@xstate/fsm'
import { getAdjacentBombs, getAdjacentIndexes } from './_state'

//------------------------------------------------------------------------------
// DOMAIN TYPES
//------------------------------------------------------------------------------
export type CellStatus = 'flagged' | 'touched' | 'initial'

export type Cell = {
	bomb: boolean
	adjacent: number
	status: CellStatus
}

//  0 1  2 3  4
//  5 6  7  8  9
// 10 11 12 13 14
// 15 16 17 18 19
// 20 21 22 23 24

//------------------------------------------------------------------------------
// STATE MACHINE
//------------------------------------------------------------------------------
type Context = {
	grid?: Cell[]
	readonly bombIndices?: number[]
	readonly size: number
}

type GameStates =
	| {
			value: 'idle'
			context: Context
	  }
	| { value: 'playing'; context: Context }
	| { value: 'win'; context: Context }
	| { value: 'lose'; context: Context }

type RevealCellAction = { type: 'revealCell'; i: number }
type GameActions =
	| RevealCellAction
	| { type: 'flagCell'; i: number }
	| { type: 'reset' }
	| { type: 'win' }

//------------------------------------------------------------------------------
// ACTIONS
//------------------------------------------------------------------------------
const revealCell = assign((ctx: Context, ev: RevealCellAction) => {
	ctx.grid[ev.i].status = 'touched'
	return ctx
})

const revealAdjacentCells = assign((ctx: Context, ev: RevealCellAction) => {
	const { size, grid } = ctx

	const revealAdjacent = (i: number) => {
		const indexesToCheck = getAdjacentIndexes({ i, size, grid })
		indexesToCheck.forEach((i) => {
			const cell = grid[i]
			// recursively crawl hidden cells with 0 adjacent bombs and reveal
			if (!cell.bomb && cell.adjacent === 0 && cell.status === 'initial') {
				cell.status = 'touched'
				revealAdjacent(i)
			} else if (cell.status === 'initial') {
				// otherwise, reveal the edges of the open space
				cell.status = 'touched'
			}
		})
	}

	revealAdjacent(ev.i)
	return ctx
})

//------------------------------------------------------------------------------
// MACHINE
//------------------------------------------------------------------------------
export const machine = createMachine<Context, GameActions, GameStates>({
	id: 'minesweeper',
	initial: 'idle',
	states: {
		idle: {
			on: {
				revealCell: {
					target: 'playing',
					actions: [
						assign((ctx, ev) => {
							const i = ev.i

							let bombsPlaced = 0
							let counter = 0
							let j = 0
							const indexesAroundPlayedSpace = getAdjacentIndexes({
								i,
								size: ctx.size,
								grid: ctx.grid
							})

							while (bombsPlaced < ctx.bombIndices.length && j <= 24) {
								// if we're in the empty space around the played tile,
								// increment the iterator, but not the counter
								if (j === i || indexesAroundPlayedSpace.includes(j)) {
									j++
									continue
								}

								if (counter === ctx.bombIndices[bombsPlaced]) {
									ctx.grid[j].bomb = true
									bombsPlaced++
								}

								// Since this tile was a valid candidate for placing a
								// bomb, increment the counter.
								counter++
								j++
							}

							return ctx
						}),
						assign((ctx) => {
							for (let i = 0; i < ctx.grid.length; i++) {
								ctx.grid[i].adjacent = getAdjacentBombs({
									grid: ctx.grid,
									i,
									size: ctx.size
								})
							}
							return ctx
						}),
						// flip the cell to be touched now that we're playing.
						revealCell,
						// Reveal any adjacent cells around the cell played
						revealAdjacentCells
					]
				}
			}
		},
		playing: {
			on: {
				flagCell: [
					{
						target: 'playing',
						cond: (ctx, ev) => {
							const cell = ctx.grid[ev.i]
							// You can't flag a cell that's already been revealed
							return cell.status !== 'touched'
						},
						actions: [
							assign((ctx, ev) => {
								ctx.grid[ev.i].status = 'flagged'
								return ctx
							})
						]
					}
				],
				win: {
					target: 'win',
					cond: (ctx, ev) => {
						for (const cell of ctx.grid) {
							if (cell.status === 'initial') return false
							// if it's a bomb, it must be flagged
							if (cell.bomb && cell.status !== 'flagged') return false
							// if it's not a bomb, it must be revealed
							if (!cell.bomb && cell.status !== 'touched') return false
						}

						return true
					}
				},
				revealCell: [
					{
						target: 'lose',
						cond: (ctx, ev) => ctx.grid[ev.i].bomb
					},
					{
						target: 'playing',
						cond: (ctx, ev) => {
							// console.log('ev')
							const cell = ctx.grid[ev.i]
							// You can only reveal a cell that's unrevealed AND unflagged
							return cell.status === 'initial'
						},
						actions: [revealCell, revealAdjacentCells]
					}
				]
			}
		},
		win: {},
		lose: {}
	}
})

//------------------------------------------------------------------------------
// READABLE STORE TO CONNECT TO SVELTE
//------------------------------------------------------------------------------
export type GameMachineState = StateMachine.State<
	Context,
	GameActions,
	GameStates
>

type Store = {
	state: Readable<GameMachineState>
	send: StateMachine.Service<Context, GameActions, GameStates>['send']
}

type CreateStoreParams = {
	size: number
	bombs: number
}

/**
 * Given the grid size, determine all the locations of the bombs in relation
 * to the player's first move. This allows precomputing some values, but also
 * makes sure the player never loses on their first move.
 */
const distributeBombs = ({ bombs, grid }: { bombs: number; grid: Cell[] }) => {
	let remainingBombs = bombs
	const bombIndices = []
	for (let i = 0; i <= grid.length - 8; i++) {
		const hasBomb = Math.random() < remainingBombs / (grid.length - 8 - i)

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

const getNewCell = (): Cell => ({
	bomb: false,
	adjacent: 0,
	status: 'initial'
})

export const createStore = ({ size, bombs }: CreateStoreParams): Store => {
	// TODO: getInitialContext function?
	const grid: Cell[] = Array.from({ length: size ** 2 }, () => getNewCell())
	const bombIndices = distributeBombs({ bombs, grid })

	//
	// Start the service with the initial grid state and all bombs placed
	//
	const service = interpret(machine).start({
		value: 'idle',
		context: { grid, bombIndices, size }
	})

	const store = readable(service.state, (set) => {
		service.subscribe((state) => {
			if (state.changed) {
				set(state)
			}
		})

		return () => service.stop()
	})

	return { state: store, send: service.send }
}
