import Index from '../index.svelte'
import { render } from '@testing-library/svelte'

test('PAGE: Minesweeper', () => {
	const { getByText } = render(Index)

	expect(getByText('minesweeper 💣💥')).toBeInTheDocument()
})
