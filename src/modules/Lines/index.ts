import regl from 'regl'
import { getValue, getRgbaColor } from '@/graph/helper'
import { CoreModule } from '@/graph/modules/core-module'
import drawStraightFrag from '@/graph/modules/Lines/draw-straight.frag'
import drawStraightVert from '@/graph/modules/Lines/draw-straight.vert'
import { defaultLinkColor, defaultLinkWidth } from '@/graph/variables'
import { Link, InputNode, InputLink } from '@/graph/types'

export class Lines<N extends InputNode, L extends InputLink> extends CoreModule<N, L> {
  private drawStraightCommand: regl.DrawCommand | undefined
  private colorBuffer: regl.Buffer | undefined
  private widthBuffer: regl.Buffer | undefined

  public create (): void {
    this.updateColor()
    this.updateWidth()
  }

  public initPrograms (): void {
    const { reglInstance, config, store, data, points } = this
    const { pointsTextureSize } = store

    const geometryLinkBuffer = {
      buffer: reglInstance.buffer([
        [0, -0.5],
        [1, -0.5],
        [1, 0.5],
        [0, -0.5],
        [1, 0.5],
        [0, 0.5],
      ]),
      divisor: 0,
    }

    const instancePoints: number[][] = []
    data.links.forEach(l => {
      const fromX = l.from % pointsTextureSize
      const fromY = Math.floor(l.from / pointsTextureSize)

      const toX = l.to % pointsTextureSize
      const toY = Math.floor(l.to / pointsTextureSize)
      instancePoints.push([fromX, fromY])
      instancePoints.push([toX, toY])
    })
    const pointsBuffer = reglInstance.buffer(instancePoints)

    this.drawStraightCommand = reglInstance({
      vert: drawStraightVert,
      frag: drawStraightFrag,

      attributes: {
        position: geometryLinkBuffer,
        pointA: {
          buffer: () => pointsBuffer,
          divisor: 1,
          offset: Float32Array.BYTES_PER_ELEMENT * 0,
          stride: Float32Array.BYTES_PER_ELEMENT * 4,
        },
        pointB: {
          buffer: () => pointsBuffer,
          divisor: 1,
          offset: Float32Array.BYTES_PER_ELEMENT * 2,
          stride: Float32Array.BYTES_PER_ELEMENT * 4,
        },
        color: {
          buffer: () => this.colorBuffer,
          divisor: 1,
          offset: Float32Array.BYTES_PER_ELEMENT * 0,
          stride: Float32Array.BYTES_PER_ELEMENT * 4,
        },
        width: {
          buffer: () => this.widthBuffer,
          divisor: 1,
          offset: Float32Array.BYTES_PER_ELEMENT * 0,
          stride: Float32Array.BYTES_PER_ELEMENT * 1,
        },
      },
      uniforms: {
        positions: () => points?.currentPositionFbo,
        particleSize: () => points?.sizeFbo,
        transform: () => store.transform,
        pointsTextureSize: () => store.pointsTextureSize,
        nodeSizeScale: () => config.nodeSizeScale,
        widthScale: () => config.linkWidthScale,
        useArrow: () => config.linkArrows,
        arrowSizeScale: () => config.linkArrowsSizeScale,
        spaceSize: () => config.spaceSize,
        screenSize: () => store.screenSize,
        ratio: () => config.pixelRatio,
        linkVisibilityDistanceRange: () => config.linkVisibilityDistanceRange,
        linkVisibilityMinTransparency: () => config.linkVisibilityMinTransparency,
      },
      cull: {
        enable: true,
        face: 'back',
      },
      blend: {
        enable: true,
        func: {
          dstRGB: 'one minus src alpha',
          srcRGB: 'src alpha',
          dstAlpha: 'one minus src alpha',
          srcAlpha: 'one',
        },
        equation: {
          rgb: 'add',
          alpha: 'add',
        },
      },
      depth: {
        enable: false,
        mask: false,
      },
      count: 6, // segmentInstanceGeometry length
      instances: () => data.links.length,
    })
  }

  public draw (): void {
    if (!this.colorBuffer || !this.widthBuffer) return
    this.drawStraightCommand?.()
  }

  public updateColor (): void {
    const { reglInstance, config, data: { links } } = this
    const instancePoints: number[][] = []
    links.forEach(l => {
      const c = getValue<Link<N, L>, string | [number, number, number, number]>(l, config.linkColor) ?? defaultLinkColor
      const rgba = getRgbaColor(c)
      instancePoints.push(rgba)
    })
    this.colorBuffer = reglInstance.buffer(instancePoints)
  }

  public updateWidth (): void {
    const { reglInstance, config, data: { links } } = this
    const instancePoints: number[][] = []
    links.forEach(l => {
      const linkWidth = getValue<Link<N, L>, number>(l, config.linkWidth)
      instancePoints.push([linkWidth ?? defaultLinkWidth])
    })
    this.widthBuffer = reglInstance.buffer(instancePoints)
  }

  public destroy (): void {
    this.colorBuffer?.destroy()
    this.widthBuffer?.destroy()
  }
}
