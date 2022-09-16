import { zoom, ZoomTransform, zoomIdentity } from 'd3-zoom'
import { mat3 } from 'gl-matrix'
import { Store } from '@/graph/modules/Store'
import { GraphConfigInterface } from '@/graph/config'
import { InputNode, InputLink } from '@/graph/types'

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

  public getTransform (positions: [number, number][]): { transform: ZoomTransform; scale: number } {
    const { store: { screenSize, maxPointSize }, config: { spaceSize } } = this
    const w = screenSize[0]
    const h = screenSize[1]
    const xArray = positions.map(d => d[0])
    const yArray = positions.map(d => d[1])
    const xExtent = [Math.min(...xArray), Math.max(...xArray)] as [number, number]
    const yExtent = [Math.min(...yArray), Math.max(...yArray)] as [number, number]

    const xScale = w / (xExtent[1] - xExtent[0] + maxPointSize)
    const yScale = h / (yExtent[1] - yExtent[0] + maxPointSize)

    const clampedScale = Math.min(xScale, yScale)

    const xCenter = ((xExtent[1] + xExtent[0]) / 2)
    const yCenter = ((yExtent[1] + yExtent[0]) / 2)
    const translateX = (spaceSize as number) / 2 - xCenter
    const translateY = yCenter - (spaceSize as number) / 2
    const transform = zoomIdentity
      .translate(translateX, translateY)
      .scale(1)

    return { transform, scale: clampedScale }
  }
}
