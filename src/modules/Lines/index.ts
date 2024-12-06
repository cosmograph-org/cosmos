import regl from 'regl'
import { CoreModule } from '@/graph/modules/core-module'
import drawLineFrag from '@/graph/modules/Lines/draw-curve-line.frag'
import drawLineVert from '@/graph/modules/Lines/draw-curve-line.vert'
import { defaultConfigValues } from '@/graph/variables'
import { getCurveLineGeometry } from '@/graph/modules/Lines/geometry'

export class Lines extends CoreModule {
  private drawCurveCommand: regl.DrawCommand | undefined
  private pointsBuffer: regl.Buffer | undefined
  private colorBuffer: regl.Buffer | undefined
  private widthBuffer: regl.Buffer | undefined
  private arrowBuffer: regl.Buffer | undefined
  private curveLineGeometry: number[][] | undefined
  private curveLineBuffer: regl.Buffer | undefined

  public initPrograms (): void {
    const { reglInstance, config, store } = this

    if (!this.drawCurveCommand) {
      this.drawCurveCommand = reglInstance({
        vert: drawLineVert,
        frag: drawLineFrag,

        attributes: {
          position: {
            buffer: () => this.curveLineBuffer,
            divisor: 0,
          },
          pointA: {
            buffer: () => this.pointsBuffer,
            divisor: 1,
            offset: Float32Array.BYTES_PER_ELEMENT * 0,
            stride: Float32Array.BYTES_PER_ELEMENT * 4,
          },
          pointB: {
            buffer: () => this.pointsBuffer,
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
          positionsTexture: () => this.points?.currentPositionFbo,
          pointGreyoutStatus: () => this.points?.greyoutStatusFbo,
          transformationMatrix: () => store.transform,
          pointsTextureSize: () => store.pointsTextureSize,
          pointSizeScale: () => config.pointSizeScale,
          widthScale: () => config.linkWidthScale,
          arrowSizeScale: () => config.linkArrowsSizeScale,
          spaceSize: () => store.adjustedSpaceSize,
          screenSize: () => store.screenSize,
          ratio: () => config.pixelRatio,
          linkVisibilityDistanceRange: () => config.linkVisibilityDistanceRange,
          linkVisibilityMinTransparency: () => config.linkVisibilityMinTransparency,
          greyoutOpacity: () => config.linkGreyoutOpacity,
          scalePointsOnZoom: () => config.scalePointsOnZoom,
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
        instances: () => this.data.linksNumber ?? 0,
        primitive: 'triangle strip',
      })
    }
  }

  public draw (): void {
    if (!this.pointsBuffer || !this.curveLineBuffer) return
    if (!this.colorBuffer) this.updateColor()
    if (!this.widthBuffer) this.updateWidth()
    if (!this.arrowBuffer) this.updateArrow()
    this.drawCurveCommand?.()
  }

  public updatePointsBuffer (): void {
    const { reglInstance, data, store } = this
    if (data.linksNumber === undefined || data.links === undefined) return
    const instancePoints: [number, number][] = [] // new Float32Array(data.linksNumber * 2)
    for (let i = 0; i < data.linksNumber; i++) {
      const fromIndex = data.links[i * 2] as number
      const toIndex = data.links[i * 2 + 1] as number
      const fromX = fromIndex % store.pointsTextureSize
      const fromY = Math.floor(fromIndex / store.pointsTextureSize)
      const toX = toIndex % store.pointsTextureSize
      const toY = Math.floor(toIndex / store.pointsTextureSize)
      instancePoints[i * 2] = [fromX, fromY]
      instancePoints[i * 2 + 1] = [toX, toY]
    }

    if (!this.pointsBuffer) this.pointsBuffer = reglInstance.buffer(0)
    this.pointsBuffer(instancePoints)
  }

  public updateColor (): void {
    const { reglInstance, data } = this
    if (!this.colorBuffer) this.colorBuffer = reglInstance.buffer(0)
    this.colorBuffer(data.linkColors ?? new Float32Array())
  }

  public updateWidth (): void {
    const { reglInstance, data } = this
    if (!this.widthBuffer) this.widthBuffer = reglInstance.buffer(0)
    this.widthBuffer(data.linkWidths ?? new Float32Array())
  }

  public updateArrow (): void {
    const { reglInstance, data } = this
    if (!this.arrowBuffer) this.arrowBuffer = reglInstance.buffer(0)
    this.arrowBuffer(data.linkArrows ?? new Float32Array())
  }

  public updateCurveLineGeometry (): void {
    const { reglInstance, config: { curvedLinks, curvedLinkSegments } } = this
    this.curveLineGeometry = getCurveLineGeometry(curvedLinks ? curvedLinkSegments ?? defaultConfigValues.curvedLinkSegments : 1)
    if (!this.curveLineBuffer) this.curveLineBuffer = reglInstance.buffer(0)
    this.curveLineBuffer(this.curveLineGeometry)
  }
}
