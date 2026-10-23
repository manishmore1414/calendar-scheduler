export function layoutDay(events) {
  const sorted = [...events].sort((a, b) => new Date(a.start) - new Date(b.start))
  const result = []
  let group = []
  let groupEnd = 0

  const finishGroup = () => {
    const columnEnds = []
    group.forEach((item) => {
      let col = columnEnds.findIndex((end) => end <= item.start)
      if (col === -1) { col = columnEnds.length; columnEnds.push(0) }
      columnEnds[col] = item.end
      item.col = col
    })
    group.forEach((item) => result.push({ event: item.event, col: item.col, cols: columnEnds.length }))
    group = []
  }

  sorted.forEach((event) => {
    const start = new Date(event.start).getTime()
    const end = new Date(event.end).getTime()
    if (group.length > 0 && start >= groupEnd) finishGroup()
    group.push({ event, start, end })
    groupEnd = Math.max(groupEnd, end)
  })
  if (group.length > 0) finishGroup()
  return result
}
