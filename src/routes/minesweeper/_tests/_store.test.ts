import { interpret } from '@xstate/fsm'
import { Cell, createStore, GameMachineState, machine } from '../_store'

describe.skip('createStore', () => {
	describe('STATE: IDLE', () => {
		test('bootstraps the game with a full grid', () => {
			const store = createStore({ size: 5, bombs: 2 })

			let state: GameMachineState
			store.state.subscribe((x) => {
				state = x
			})

			expect(state.value).toEqual('idle')
			const grid = state.context.grid
			expect(grid).toBeDefined()
			expect(grid.length).toEqual(25)

			store.send({ type: 'revealCell', i: 1 })
			expect(state.value).toEqual('playing')
		})

		// TODO: perhaps instead of using the `createStore` it's more robust
		// to instantiate the state machine directly so that we can control _exactly_
		// where the bombs are distributed
		test.only('allows starting the game', () => {
			const store = createStore({ size: 5, bombs: 2 })

			let state: GameMachineState
			store.state.subscribe((x) => {
				state = x
			})

			expect(state.value).toEqual('idle')

			// Play the first cell
			store.send({ type: 'revealCell', i: 12 })
			expect(state.value).toEqual('playing')

			// Check that the cell was made visible
			expect(state.context.grid[12].status).toEqual('touched')

			// Check that the bombs have been properly distributed across the grid
			let bombsCount = 0
			for (const cell of state.context.grid) {
				if (cell.bomb) bombsCount++
			}
			expect(bombsCount).toEqual(2)

			// Check that the touched cell is 0 adjacent bombs
			expect(state.context.grid[12].adjacent).toEqual(0)

			// Check that any adjacent 0 cells have been revealed as well.
			// TODO: should be in lower-level machine action tests.
		})
	})
})

describe.skip('machine', () => {
	const createGrid = (): Cell[] => {
		return Array.from({ length: 25 }, () => ({
			bomb: false,
			adjacent: 0,
			status: 'initial'
		}))
	}

	describe('STATE: IDLE', () => {
		it('should distribute the bombs on the first move', () => {
			const grid = createGrid()

			const service = interpret(machine).start({
				value: 'idle',
				context: { grid, bombIndices: [0, 16], size: 5 }
			})

			service.send({ type: 'revealCell', i: 0 })
			expect(service.state.context.grid[2].bomb).toEqual(true)
			expect(service.state.context.grid[20].bomb).toEqual(true)
		})

		it('should always leave empty space around the first move', () => {
			const grid = createGrid()

			const service = interpret(machine).start({
				value: 'idle',
				context: { grid, bombIndices: [0, 12], size: 5 }
			})

			service.send({ type: 'revealCell', i: 12 })
			expect(service.state.context.grid[0].bomb).toEqual(true)
			expect(service.state.context.grid[21].bomb).toEqual(true)

			expect(service.state.context.grid[12].adjacent).toEqual(0)

			const surroundingIndices = [6, 7, 8, 11, 13, 16, 17, 18]
			for (const i of surroundingIndices) {
				expect(service.state.context.grid[i].bomb).toEqual(false)
				expect(service.state.context.grid[i].status).toEqual('touched')
			}
		})
	})

	describe.only('STATE: PLAYING', () => {
		it('should allow revealing the cell and any adjacent empty cells', () => {
			const grid = createGrid()
			const service = interpret(machine).start({
				value: 'idle',
				context: { grid, bombIndices: [0, 8, 16, 20], size: 5 }
			})

			// bombs will be placed at indexes 2, 12, 20, & 24 based on this move
			// 0  1  x  3  4
			// 5  6  7  8  9
			// 10 11 x  13 14
			// 15 16 17 18 19
			// x  21 22 23 x
			service.send({ type: 'revealCell', i: 0 })
			expect(service.state.value).toEqual('playing')
			service.send({ type: 'revealCell', i: 4 })

			const cellsRevealed = [
				// index, adjacent
				[3, 1],
				[4, 0],
				[8, 2],
				[9, 0],
				[13, 1],
				[14, 0],
				[18, 2],
				[19, 1]
			]

			for (const [i, adjacent] of cellsRevealed) {
				expect(service.state.context.grid[i]).toEqual({
					adjacent,
					status: 'touched',
					bomb: false
				})
			}
		})

		it('should allow flagging any cell', () => {
			const grid = createGrid()
			const service = interpret(machine).start({
				value: 'idle',
				context: { grid, bombIndices: [0, 8, 16, 20], size: 5 }
			})

			// bombs will be placed at indexes 2, 12, 20, & 24 based on this move
			// 0  1  x  3  4
			// 5  6  7  8  9
			// 10 11 x  13 14
			// 15 16 17 18 19
			// x  21 22 23 x
			service.send({ type: 'revealCell', i: 0 })
			service.send({ type: 'flagCell', i: 20 })
			expect(service.state.context.grid[20].status).toEqual('flagged')
		})

		it('should not allow flagging an already revealed cell', () => {
			const grid = createGrid()
			const service = interpret(machine).start({
				value: 'idle',
				context: { grid, bombIndices: [0, 8, 16, 20], size: 5 }
			})

			// bombs will be placed at indexes 2, 12, 20, & 24 based on this move
			// 0  1  x  3  4
			// 5  6  7  8  9
			// 10 11 x  13 14
			// 15 16 17 18 19
			// x  21 22 23 x
			service.send({ type: 'revealCell', i: 0 })
			service.send({ type: 'revealCell', i: 18 })
			service.send({ type: 'flagCell', i: 18 })
			expect(service.state.context.grid[18].status).toEqual('touched')
		})

		it('should continue in "playing" state when the game is not yet won', () => {
			const grid = createGrid()
			const service = interpret(machine).start({
				value: 'idle',
				context: { grid, bombIndices: [0, 8, 16, 20], size: 5 }
			})

			// bombs will be placed at indexes 2, 12, 20, & 24 based on this move
			// 0  1  x  3  4
			// 5  6  7  8  9
			// 10 11 x  13 14
			// 15 16 17 18 19
			// x  21 22 23 x
			service.send({ type: 'revealCell', i: 0 })
			service.send({ type: 'revealCell', i: 1 })
			expect(service.state.value).toEqual('playing')
		})

		it.only('should allow transitioning to the "win" state', () => {
			const grid = createGrid()
			const service = interpret(machine).start({
				value: 'idle',
				context: { grid, bombIndices: [0, 8, 16, 20], size: 5 }
			})

			// bombs will be placed at indexes 2, 12, 20, & 24 based on this move
			// 0  1  x  3  4
			// 5  6  7  8  9
			// 10 11 x  13 14
			// 15 16 17 18 19
			// x  21 22 23 x
			service.send({ type: 'revealCell', i: 0 })
			const bombIndices = [2, 12, 20, 24]

			service.state.context.grid.forEach((_, i) => {
				if (bombIndices.includes(i)) {
					service.send({ type: 'flagCell', i })
				} else {
					service.send({ type: 'revealCell', i })
				}
			})

			// service.send({ type: 'win' })

			expect(service.state.value).toEqual('win')
		})

		it('should to to the "lose" state if a bomb cell is revealed', () => {
			const grid = createGrid()
			const service = interpret(machine).start({
				value: 'idle',
				context: { grid, bombIndices: [0, 8, 16, 20], size: 5 }
			})

			// bombs will be placed at indexes 2, 12, 20, & 24 based on this move
			// 0  1  x  3  4
			// 5  6  7  8  9
			// 10 11 x  13 14
			// 15 16 17 18 19
			// x  21 22 23 x
			service.send({ type: 'revealCell', i: 0 })
			service.send({ type: 'revealCell', i: 20 })
			expect(service.state.value).toEqual('lose')
		})
	})
})
