import { paginate } from './paginate'

const makeItems = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: `id-${i}` }))

describe('paginate', () => {
  it('returns all items when count is less than limit', () => {
    const items = makeItems(5)
    const result = paginate(items, 20)

    expect(result.data).toHaveLength(5)
    expect(result.hasMore).toBe(false)
    expect(result.nextCursor).toBeNull()
  })

  it('returns all items when count exactly equals limit', () => {
    const items = makeItems(20)
    const result = paginate(items, 20)

    expect(result.data).toHaveLength(20)
    expect(result.hasMore).toBe(false)
    expect(result.nextCursor).toBeNull()
  })

  it('returns limit items and sets nextCursor when there are more', () => {
    // repo fetches limit+1 = 21 items
    const items = makeItems(21)
    const result = paginate(items, 20)

    expect(result.data).toHaveLength(20)
    expect(result.hasMore).toBe(true)
    expect(result.nextCursor).toBe('id-19') // last item in the returned page
  })

  it('nextCursor is the id of the last item in the returned page', () => {
    const items = makeItems(6)
    const result = paginate(items, 5)

    expect(result.nextCursor).toBe(result.data[result.data.length - 1].id)
  })

  it('returns empty data with no cursor when list is empty', () => {
    const result = paginate([], 20)

    expect(result.data).toHaveLength(0)
    expect(result.hasMore).toBe(false)
    expect(result.nextCursor).toBeNull()
  })
})