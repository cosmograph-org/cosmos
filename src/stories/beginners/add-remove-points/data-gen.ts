function getRandom (min: number, max: number): number {
  return Math.random() * (max - min) + min
}

export function generateData (n = 100, m = 100): { pointPositions: number[]; links: number[] } {
  const pointPositions = new Array(n * m * 2)
  const links: number[] = []
  for (let pointIndex = 0; pointIndex < n * m; pointIndex += 1) {
    const x = 4096 * getRandom(0.495, 0.505)
    const y = 4096 * getRandom(0.495, 0.505)
    pointPositions[pointIndex * 2] = x
    pointPositions[pointIndex * 2 + 1] = y
    const nextPointIndex = pointIndex + 1
    const bottomPointIndex = pointIndex + n
    const pointLine = Math.floor(pointIndex / n)
    const nextPointLine = Math.floor(nextPointIndex / n)
    const bottomPointLine = Math.floor(bottomPointIndex / n)
    if (pointLine === nextPointLine) {
      links.push(pointIndex)
      links.push(nextPointIndex)
    }

    if (bottomPointLine < m) {
      links.push(pointIndex)
      links.push(bottomPointIndex)
    }
  }

  return { pointPositions, links }
}
