import { scaleLinear } from 'd3-scale'
import { mat3 } from 'gl-matrix'
import { Random } from 'random'
import { getRgbaColor } from '@/graph/helper'
import { hoveredPointRingOpacity, focusedPointRingOpacity, defaultConfigValues } from '@/graph/variables'

export const ALPHA_MIN = 0.001
export const MAX_POINT_SIZE = 64

export type Hovered = { index: number; position: [ number, number ] }
type Focused = { index: number }

export class Store {
  public pointsTextureSize = 0
  public linksTextureSize = 0
  public alpha = 1
  public transform = mat3.create()
  public backgroundColor: [number, number, number, number] = [0, 0, 0, 0]
  public screenSize: [number, number] = [0, 0]
  public mousePosition = [0, 0]
  public screenMousePosition = [0, 0]
  public selectedArea = [[0, 0], [0, 0]]
  public isSimulationRunning = false
  public simulationProgress = 0
  public selectedIndices: Float32Array | null = null
  public maxPointSize = MAX_POINT_SIZE
  public hoveredPoint: Hovered | undefined = undefined
  public focusedPoint: Focused | undefined = undefined
  public draggingPointIndex: number | undefined = undefined
  public adjustedSpaceSize = defaultConfigValues.spaceSize
  public isSpaceKeyPressed = false

  public hoveredPointRingColor = [1, 1, 1, hoveredPointRingOpacity]
  public focusedPointRingColor = [1, 1, 1, focusedPointRingOpacity]
  private alphaTarget = 0
  private scalePointX = scaleLinear()
  private scalePointY = scaleLinear()
  private random = new Random()

  public addRandomSeed (seed: number | string): void {
    this.random = this.random.clone(seed)
  }

  public getRandomFloat (min: number, max: number): number {
    return this.random.float(min, max)
  }

  /**
   * If the config parameter `spaceSize` exceeds the limits of WebGL,
   * it reduces the space size without changing the config parameter.
   */
  public adjustSpaceSize (configSpaceSize: number, webglMaxTextureSize: number): void {
    if (configSpaceSize >= webglMaxTextureSize) {
      this.adjustedSpaceSize = webglMaxTextureSize / 2
      console.warn(`The \`spaceSize\` has been reduced to ${this.adjustedSpaceSize} due to WebGL limits`)
    } else this.adjustedSpaceSize = configSpaceSize
  }

  public updateScreenSize (width: number, height: number): void {
    const { adjustedSpaceSize } = this
    this.screenSize = [width, height]
    this.scalePointX
      .domain([0, adjustedSpaceSize])
      .range([(width - adjustedSpaceSize) / 2, (width + adjustedSpaceSize) / 2])
    this.scalePointY
      .domain([adjustedSpaceSize, 0])
      .range([(height - adjustedSpaceSize) / 2, (height + adjustedSpaceSize) / 2])
  }

  public scaleX (x: number): number {
    return this.scalePointX(x)
  }

  public scaleY (y: number): number {
    return this.scalePointY(y)
  }

  public setHoveredPointRingColor (color: string): void {
    const convertedRgba = getRgbaColor(color)
    this.hoveredPointRingColor[0] = convertedRgba[0]
    this.hoveredPointRingColor[1] = convertedRgba[1]
    this.hoveredPointRingColor[2] = convertedRgba[2]
  }

  public setFocusedPointRingColor (color: string): void {
    const convertedRgba = getRgbaColor(color)
    this.focusedPointRingColor[0] = convertedRgba[0]
    this.focusedPointRingColor[1] = convertedRgba[1]
    this.focusedPointRingColor[2] = convertedRgba[2]
  }

  public setFocusedPoint (index?: number): void {
    if (index !== undefined) {
      this.focusedPoint = { index }
    } else this.focusedPoint = undefined
  }

  public addAlpha (decay: number): number {
    return (this.alphaTarget - this.alpha) * this.alphaDecay(decay)
  }

  private alphaDecay = (decay: number): number => 1 - Math.pow(ALPHA_MIN, 1 / decay)
}
