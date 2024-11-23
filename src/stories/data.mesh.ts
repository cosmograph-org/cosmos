import { scaleSequential } from 'd3-scale'
import { interpolateWarm } from 'd3-scale-chromatic'
import { getRgbaColor } from '@/graph/helper'

function getRandom (min: number, max: number): number {
  return Math.random() * (max - min) + min
}

export type MeshData = {
  pointPositions: number[];
  links: number[];
  clusters: number[];
  pointColors: number[];
}

export function generateMeshData (
  n: number,
  m: number,
  nClusters: number,
  wholeness: number
): MeshData {
  const pointColorScale = scaleSequential(interpolateWarm)
  pointColorScale.domain([0, nClusters])

  const pointPositions = new Array(n * m * 2)
  const links: number[] = []
  const clusters = new Array(n * m)
  const pointColors = new Array(n * m * 4)

  for (let pointIndex = 0; pointIndex < n * m; pointIndex += 1) {
    const x = 4096 * getRandom(0.495, 0.505)
    const y = 4096 * getRandom(0.495, 0.505)
    pointPositions[pointIndex * 2] = x
    pointPositions[pointIndex * 2 + 1] = y

    clusters[pointIndex] = pointIndex % nClusters
    const pointColor = pointColorScale(pointIndex % nClusters)
    const rgba = getRgbaColor(pointColor)
    pointColors[pointIndex * 4] = rgba[0]
    pointColors[pointIndex * 4 + 1] = rgba[1]
    pointColors[pointIndex * 4 + 2] = rgba[2]
    pointColors[pointIndex * 4 + 3] = rgba[3]

    const nextPointIndex = pointIndex + 1
    const bottomPointIndex = pointIndex + n
    const pointLine = Math.floor(pointIndex / n)
    const nextPointLine = Math.floor(nextPointIndex / n)
    const bottomPointLine = Math.floor(bottomPointIndex / n)

    if (pointLine === nextPointLine && Math.random() < wholeness) {
      links.push(pointIndex)
      links.push(nextPointIndex)
    }

    if (bottomPointLine < m && Math.random() < wholeness) {
      links.push(pointIndex)
      links.push(bottomPointIndex)
    }
  }

  return { pointPositions, links, clusters, pointColors }
}
