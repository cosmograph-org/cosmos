import { zoom, ZoomTransform, zoomIdentity, D3ZoomEvent } from 'd3-zoom'
import { extent } from 'd3-array'
import { mat3 } from 'gl-matrix'
import { Store } from '@/graph/modules/Store'
import { GraphConfigInterface } from '@/graph/config'
import { clamp } from '@/graph/helper'

export class Zoom {
  public readonly store: Store
  public readonly config: GraphConfigInterface
  public eventTransform = zoomIdentity
  public behavior = zoom<HTMLCanvasElement, undefined>()
    .scaleExtent([0.001, Infinity])
    .on('start', (e: D3ZoomEvent<HTMLCanvasElement, undefined>) => {
      this.isRunning = true
      const userDriven = !!e.sourceEvent
      this.config?.onZoomStart?.(e, userDriven)
    })
    .on('zoom', (e: D3ZoomEvent<HTMLCanvasElement, undefined>) => {
      this.eventTransform = e.transform
      const { eventTransform: { x, y, k }, store: { transform, screenSize } } = this
      const w = screenSize[0]
      const h = screenSize[1]
      mat3.projection(transform, w, h)
      mat3.translate(transform, transform, [x, y])
      mat3.scale(transform, transform, [k, k])
      mat3.translate(transform, transform, [w / 2, h / 2])
      mat3.scale(transform, transform, [w / 2, h / 2])
      mat3.scale(transform, transform, [1, -1])

      const userDriven = !!e.sourceEvent
      this.config?.onZoom?.(e, userDriven)
    })
    .on('end', (e: D3ZoomEvent<HTMLCanvasElement, undefined>) => {
      this.isRunning = false

      const userDriven = !!e.sourceEvent
      this.config?.onZoomEnd?.(e, userDriven)
    })

  public isRunning = false

  public constructor (store: Store, config: GraphConfigInterface) {
    this.store = store
    this.config = config
  }

  /**
   * Get the zoom transform that will fit the given point positions into the viewport
   *
   * @param positions An array of point positions in the form `[x, y]`
   * @param scale An optional scale factor to apply to the transform
   * @param padding Padding around the viewport in percentage
   */
  public getTransform (positions: [number, number][], scale?: number, padding = 0.1): ZoomTransform {
    if (positions.length === 0) return this.eventTransform
    const { store: { screenSize } } = this
    const width = screenSize[0]
    const height = screenSize[1]
    const xExtent = extent(positions.map(d => d[0])) as [number, number]
    const yExtent = extent(positions.map(d => d[1])) as [number, number]
    xExtent[0] = this.store.scaleX(xExtent[0])
    xExtent[1] = this.store.scaleX(xExtent[1])
    yExtent[0] = this.store.scaleY(yExtent[0])
    yExtent[1] = this.store.scaleY(yExtent[1])
    // Adjust extent with one screen pixel if one point coordinate is set
    if (xExtent[0] === xExtent[1]) {
      xExtent[0] -= 0.5
      xExtent[1] += 0.5
    }
    if (yExtent[0] === yExtent[1]) {
      yExtent[0] += 0.5
      yExtent[1] -= 0.5
    }

    const xScale = (width * (1 - padding * 2)) / (xExtent[1] - xExtent[0])
    const yScale = (height * (1 - padding * 2)) / (yExtent[0] - yExtent[1])
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

  public getDistanceToPoint (position: [number, number]): number {
    const { x, y, k } = this.eventTransform
    const point = this.getTransform([position], k)
    const dx = x - point.x
    const dy = y - point.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  public getMiddlePointTransform (position: [number, number]): ZoomTransform {
    const { store: { screenSize }, eventTransform: { x, y, k } } = this
    const width = screenSize[0]
    const height = screenSize[1]
    const currX = (width / 2 - x) / k
    const currY = (height / 2 - y) / k
    const pointX = this.store.scaleX(position[0])
    const pointY = this.store.scaleY(position[1])
    const centerX = (currX + pointX) / 2
    const centerY = (currY + pointY) / 2

    const scale = 1
    const translateX = width / 2 - centerX * scale
    const translateY = height / 2 - centerY * scale

    return zoomIdentity
      .translate(translateX, translateY)
      .scale(scale)
  }

  public convertScreenToSpacePosition (screenPosition: [number, number]): [number, number] {
    const { eventTransform: { x, y, k }, store: { screenSize } } = this
    const w = screenSize[0]
    const h = screenSize[1]
    const invertedX = (screenPosition[0] - x) / k
    const invertedY = (screenPosition[1] - y) / k
    const spacePosition = [invertedX, (h - invertedY)] as [number, number]
    spacePosition[0] -= (w - this.store.adjustedSpaceSize) / 2
    spacePosition[1] -= (h - this.store.adjustedSpaceSize) / 2
    return spacePosition
  }

  public convertSpaceToScreenPosition (spacePosition: [number, number]): [number, number] {
    const screenPointX = this.eventTransform.applyX(this.store.scaleX(spacePosition[0]))
    const screenPointY = this.eventTransform.applyY(this.store.scaleY(spacePosition[1]))
    return [screenPointX, screenPointY]
  }

  public convertSpaceToScreenRadius (spaceRadius: number): number {
    const { config: { scalePointsOnZoom }, store: { maxPointSize }, eventTransform: { k } } = this
    let size = spaceRadius * 2
    if (scalePointsOnZoom) {
      size *= k
    } else {
      size *= Math.min(5.0, Math.max(1.0, k * 0.01))
    }
    return Math.min(size, maxPointSize) / 2
  }
}
