import { assign, createMachine, interpret } from '@xstate/fsm'
import { readable, writable } from 'svelte/store'
import type { Readable } from 'svelte/store'
import type { StateMachine } from '@xstate/fsm'
import { getAdjacentBombs } from './_state'

//------------------------------------------------------------------------------
// DOMAIN TYPES
//------------------------------------------------------------------------------
export type CellStatus = 'flagged' | 'touched' | 'initial'

export type Cell = {
	bomb: boolean
	adjacent: number
	status: CellStatus
}

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

type GameActions =
	| { type: 'revealCell'; i: number }
	| { type: 'flagCell'; i: number }
	| { type: 'reset' }

export const machine = createMachine<Context, GameActions, GameStates>({
	id: 'minesweeper',
	initial: 'idle',
	states: {
		idle: {
			// TODO: assign initial grid & bomb locations upon entry?
			on: { revealCell: 'playing' }
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
						}
					},
					{
						target: 'win'
						// TODO: win condition if flagging (flagged last cell, exact num
						// of flags as num of bombs)
					}
				],
				revealCell: [
					{
						target: 'playing',
						cond: (ctx, ev) => {
							const cell = ctx.grid[ev.i]
							// You can only reveal a cell that's unrevealed AND unflagged
							return cell.status === 'initial'
						},
						actions: [
							assign((ctx, ev) => {
								ctx.grid[ev.i].status = 'touched'
								return ctx
							}),
							(ctx, ev) => {
								console.log('reveal adjacent cells here??')
							}
						]
					},
					{
						target: 'win',
						cond: (ctx, ev) => ev.i === 3
					},
					{
						target: 'lose',
						cond: (ctx, ev) => ev.i === 4
					}
				]
			}
		},
		win: {
			entry: () => console.log('>> win!!!'),
			on: {
				reset: {
					target: 'idle'
				}
			}
		},
		lose: {
			on: {
				reset: {
					target: 'idle'
				}
			}
		}
	}
})

//------------------------------------------------------------------------------
// READABLE STORE TO CONNECT TO SVELTE
//------------------------------------------------------------------------------
type Store = {
	state: Readable<StateMachine.State<Context, GameActions, GameStates>>
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
	console.log('after start')

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
