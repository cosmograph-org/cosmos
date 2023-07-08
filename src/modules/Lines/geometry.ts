import { scalePow } from 'd3-scale'
import { range } from 'd3-array'

export const getCurveLineGeometry = (segments: number): number[][] => {
  const scale = scalePow()
    .exponent(2)
    .range([0, 1])
    .domain([-1, 1])

  const hodographValues = range(0, segments).map(d => -0.5 + d / segments)
  hodographValues.push(0.5)
  const result = new Array(hodographValues.length * 2)
  hodographValues.forEach((d, i) => {
    result[i * 2] = [scale(d * 2), 0.5]
    result[i * 2 + 1] = [scale(d * 2), -0.5]
  })
  return result
}
