import regl from 'regl'
import { getValue, getRgbaColor } from '@/graph/helper'
import { CoreModule } from '@/graph/modules/core-module'
import drawLineFrag from '@/graph/modules/Lines/draw-curve-line.frag'
import drawLineVert from '@/graph/modules/Lines/draw-curve-line.vert'
import { defaultConfigValues, defaultLinkColor, defaultLinkWidth } from '@/graph/variables'
import { CosmosInputNode, CosmosInputLink } from '@/graph/types'
import { destroyBuffer } from '@/graph/modules/Shared/buffer'
import { getCurveLineGeometry } from '@/graph/modules/Lines/geometry'

export class Lines<N extends CosmosInputNode, L extends CosmosInputLink> extends CoreModule<N, L> {
  private drawCurveCommand: regl.DrawCommand | undefined
  private colorBuffer: regl.Buffer | undefined
  private widthBuffer: regl.Buffer | undefined
  private arrowBuffer: regl.Buffer | undefined
  private curveLineGeometry: number[][] | undefined
  private curveLineBuffer: regl.Buffer | undefined

  public create (): void {
    this.updateColor()
    this.updateWidth()
    this.updateArrow()
    this.updateCurveLineGeometry()
  }

  public initPrograms (): void {
    const { reglInstance, config, store, data, points } = this
    const { pointsTextureSize } = store

    const instancePoints: number[][] = []
    data.completeLinks.forEach(l => {
      const toIndex = data.getSortedIndexById(l.target) as number
      const fromIndex = data.getSortedIndexById(l.source) as number
      const fromX = fromIndex % pointsTextureSize
      const fromY = Math.floor(fromIndex / pointsTextureSize)

      const toX = toIndex % pointsTextureSize
      const toY = Math.floor(toIndex / pointsTextureSize)
      instancePoints.push([fromX, fromY])
      instancePoints.push([toX, toY])
    })
    const pointsBuffer = reglInstance.buffer(instancePoints)

    this.drawCurveCommand = reglInstance({
      vert: drawLineVert,
      frag: drawLineFrag,

      attributes: {
        position: {
          buffer: () => this.curveLineBuffer,
          divisor: 0,
        },
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
        arrow: {
          buffer: () => this.arrowBuffer,
          divisor: 1,
          offset: Float32Array.BYTES_PER_ELEMENT * 0,
          stride: Float32Array.BYTES_PER_ELEMENT * 1,
        },
      },
      uniforms: {
        positions: () => points?.currentPositionFbo,
        particleGreyoutStatus: () => points?.greyoutStatusFbo,
        transform: () => store.transform,
        pointsTextureSize: () => store.pointsTextureSize,
        nodeSizeScale: () => config.nodeSizeScale,
        widthScale: () => config.linkWidthScale,
        arrowSizeScale: () => config.linkArrowsSizeScale,
        spaceSize: () => store.adjustedSpaceSize,
        screenSize: () => store.screenSize,
        ratio: () => config.pixelRatio,
        linkVisibilityDistanceRange: () => config.linkVisibilityDistanceRange,
        linkVisibilityMinTransparency: () => config.linkVisibilityMinTransparency,
        greyoutOpacity: () => config.linkGreyoutOpacity,
        scaleNodesOnZoom: () => config.scaleNodesOnZoom,
        curvedWeight: () => config.curvedLinkWeight,
        curvedLinkControlPointDistance: () => config.curvedLinkControlPointDistance,
        curvedLinkSegments: () => config.curvedLinks ? config.curvedLinkSegments ?? defaultConfigValues.curvedLinkSegments : 1,
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
      count: () => this.curveLineGeometry?.length ?? 0,
      instances: () => data.linksNumber,
      primitive: 'triangle strip',
    })
  }

  public draw (): void {
    if (!this.colorBuffer || !this.widthBuffer || !this.curveLineBuffer) return
    this.drawCurveCommand?.()
  }

  public updateColor (): void {
    const { reglInstance, config, data } = this
    const instancePoints: number[][] = []
    data.completeLinks.forEach(l => {
      const c = getValue<L, string | [number, number, number, number]>(l, config.linkColor) ?? defaultLinkColor
      const rgba = getRgbaColor(c)
      instancePoints.push(rgba)
    })
    this.colorBuffer = reglInstance.buffer(instancePoints)
  }

  public updateWidth (): void {
    const { reglInstance, config, data } = this
    const instancePoints: number[][] = []
    data.completeLinks.forEach(l => {
      const linkWidth = getValue<L, number>(l, config.linkWidth)
      instancePoints.push([linkWidth ?? defaultLinkWidth])
    })
    this.widthBuffer = reglInstance.buffer(instancePoints)
  }

  public updateArrow (): void {
    const { reglInstance, config, data } = this
    const instancePoints: number[][] = []
    data.completeLinks.forEach(l => {
      const useArrow = getValue<L, boolean>(l, config.linkArrows) ?? defaultConfigValues.arrowLinks
      instancePoints.push([useArrow ? 1.0 : 0.0])
    })
    this.arrowBuffer = reglInstance.buffer(instancePoints)
  }

  public updateCurveLineGeometry (): void {
    const { reglInstance, config: { curvedLinks, curvedLinkSegments } } = this
    this.curveLineGeometry = getCurveLineGeometry(curvedLinks ? curvedLinkSegments ?? defaultConfigValues.curvedLinkSegments : 1)
    this.curveLineBuffer = reglInstance.buffer(this.curveLineGeometry)
  }

  public destroy (): void {
    destroyBuffer(this.colorBuffer)
    destroyBuffer(this.widthBuffer)
    destroyBuffer(this.arrowBuffer)
    destroyBuffer(this.curveLineBuffer)
  }
}
