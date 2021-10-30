export type CellStatus = 'flagged' | 'touched' | 'initial';

export type Cell = {
	bomb: boolean;
	adjacent: number;
	status: CellStatus;
};

export type GameStatus = 'idle' | 'playing' | 'win' | 'lose';

export const getAdjacentIndexes = ({
	i,
	size,
	grid
}: {
	i: number;
	size: number;
	grid: Cell[];
}): number[] => {
	return [
		i - size - 1, // upper left
		i - size, // above
		i - size + 1, // upper right
		i - 1, // left
		i + 1, // right
		i + size - 1, // lower left
		i + size, // below
		i + size + 1 // lower right
	].filter(
		// Remove any indexes that are outside of the grid's bounds
		// if the cell is on an edge
		(idx) => {
			// above the top row
			if (idx < 0) return false;
			// below the bottom row
			if (idx >= grid.length) return false;
			// cell is on the left edge and idx points to one on the right edge
			if (i % size === 0 && idx % size === size - 1) return false;
			// cell is on the right edge and idx points to one on the left edge
			if (i % size === size - 1 && idx % size === 0) return false;
			return true;
		}
	);
};

/**
 * For a given cell in the grid, find the number of adjacent bombs
 */
export const getAdjacentBombs = ({
	i,
	size,
	grid
}: {
	i: number;
	size: number;
	grid: Cell[];
}): number => {
	// TODO: return something diff here? Or do this check up above?
	if (grid[i].bomb) {
		return 0;
	}

	let count = 0;

	const indexesToCheck = getAdjacentIndexes({ i, size, grid });
	indexesToCheck.forEach((idx) => {
		if (grid[idx].bomb) {
			count++;
		}
	});

	return count;
};
