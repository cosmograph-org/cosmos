import { scaleSequential } from 'd3-scale'
import { interpolateWarm } from 'd3-scale-chromatic'
import { getRgbaColor } from '@cosmograph/cosmos'

export const getPointColors = (pointPositions: number[]): Float32Array => {
  const pointColorScale = scaleSequential(interpolateWarm)

  // Calculate center coordinates
  let sumX = 0
  let sumY = 0
  const numPoints = pointPositions.length / 2
  for (let i = 0; i < numPoints; i++) {
    sumX += pointPositions[i * 2] as number
    sumY += pointPositions[i * 2 + 1] as number
  }
  const centerX = sumX / numPoints
  const centerY = sumY / numPoints

  // Find maximum distance from center
  let maxDistance = 0
  for (let i = 0; i < numPoints; i++) {
    const dx = (pointPositions[i * 2] as number) - centerX
    const dy = (pointPositions[i * 2 + 1] as number) - centerY
    const distance = Math.sqrt(dx * dx + dy * dy)
    if (distance > maxDistance) maxDistance = distance
  }

  pointColorScale.domain([0, maxDistance])

  const pointColors = new Float32Array(pointPositions.length * 2)
  for (let i = 0; i < pointPositions.length / 2; i += 1) {
    const x = pointPositions[i * 2] as number
    const y = pointPositions[i * 2 + 1] as number
    const dx = x - centerX
    const dy = y - centerY
    const distance = Math.sqrt(dx * dx + dy * dy)
    const pointColor = pointColorScale(distance)
    const rgba = getRgbaColor(pointColor)
    pointColors[i * 4] = rgba[0]
    pointColors[i * 4 + 1] = rgba[1]
    pointColors[i * 4 + 2] = rgba[2]
    pointColors[i * 4 + 3] = rgba[3]
  }

  return pointColors
}
