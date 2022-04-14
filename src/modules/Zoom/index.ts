import { zoom, D3ZoomEvent, ZoomBehavior, zoomIdentity } from 'd3-zoom'
import { mat3 } from 'gl-matrix'
import { Store } from '@/graph/modules/Store'

export class Zoom <Datum> {
  public readonly store: Store
  public eventTransform = zoomIdentity
  public behavior: ZoomBehavior<HTMLCanvasElement, Datum> = zoom<HTMLCanvasElement, Datum>()
    .on('start', () => {
      this.isRunning = true
    })
    .on('zoom', (event: D3ZoomEvent<HTMLCanvasElement, Datum>) => {
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

  public constructor (store: Store) {
    this.store = store
  }
}
