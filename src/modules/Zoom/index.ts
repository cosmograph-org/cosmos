import { zoom, ZoomTransform, zoomIdentity } from 'd3-zoom'
import { extent } from 'd3-array'
import { mat3 } from 'gl-matrix'
import { Store } from '@/graph/modules/Store'
import { GraphConfigInterface } from '@/graph/config'
import { InputNode, InputLink } from '@/graph/types'
import { clamp } from '@/graph/helper'

export class Zoom <N extends InputNode, L extends InputLink> {
  public readonly store: Store
  public readonly config: GraphConfigInterface<N, L>
  public eventTransform = zoomIdentity
  public behavior = zoom<HTMLCanvasElement, unknown>()
    .on('start', () => {
      this.isRunning = true
    })
    .on('zoom', (event) => {
      this.eventTransform = event.transform
      const { eventTransform: { x, y, k }, store: { transform, screenSize } } = this
      const w = screenSize[0]
      const h = screenSize[1]
      mat3.projection(transform, w, h)
      mat3.translate(transform, transform, [x, y])
      mat3.scale(transform, transform, [k, k])
      mat3.translate(transform, transform, [w / 2, h / 2])
      mat3.scale(transform, transform, [w / 2, h / 2])
      mat3.scale(transform, transform, [1, -1])
    })
    .on('end', () => {
      this.isRunning = false
    })

  public isRunning = false

  public constructor (store: Store, config: GraphConfigInterface<N, L>) {
    this.store = store
    this.config = config
  }

  public getTransform (positions: [number, number][], scale?: number): ZoomTransform {
    const { store: { screenSize, maxPointSize } } = this
    const width = screenSize[0]
    const height = screenSize[1]
    const xExtent = extent(positions.map(d => d[0])) as [number, number]
    const yExtent = extent(positions.map(d => d[1])) as [number, number]
    xExtent[0] = this.store.scaleX(xExtent[0] - maxPointSize / 2)
    xExtent[1] = this.store.scaleX(xExtent[1] + maxPointSize / 2)
    yExtent[0] = this.store.scaleY(yExtent[0] - maxPointSize / 2)
    yExtent[1] = this.store.scaleY(yExtent[1] + maxPointSize / 2)
    const xScale = width / (xExtent[1] - xExtent[0])
    const yScale = height / (yExtent[0] - yExtent[1])
    const clampedScale = clamp(scale ?? Math.min(xScale, yScale), ...this.behavior.scaleExtent())
    const xCenter = (xExtent[1] + xExtent[0]) / 2
    const yCenter = (yExtent[1] + yExtent[0]) / 2
    const translateX = width / 2 - xCenter * clampedScale
    const translateY = height / 2 - yCenter * clampedScale

    const transform = zoomIdentity
      .translate(translateX, translateY)
      .scale(clampedScale)

    return transform
  }
}
