import { scaleLinear } from 'd3-scale'
import { mat3 } from 'gl-matrix'
import { Random } from 'random'
import { getRgbaColor } from '@/graph/helper'
import { hoveredNodeRingOpacity, focusedNodeRingOpacity, defaultConfigValues } from '@/graph/variables'

export const ALPHA_MIN = 0.001
export const MAX_POINT_SIZE = 64

type Hovered<Node> = { node: Node; index: number; position: [ number, number ] }
type Focused<Node> = { node: Node; index: number }

export class Store <N> {
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
  public hoveredNode: Hovered<N> | undefined = undefined
  public focusedNode: Focused<N> | undefined = undefined
  public adjustedSpaceSize = defaultConfigValues.spaceSize

  public hoveredNodeRingColor = [1, 1, 1, hoveredNodeRingOpacity]
  public focusedNodeRingColor = [1, 1, 1, focusedNodeRingOpacity]
  private alphaTarget = 0
  private scaleNodeX = scaleLinear()
  private scaleNodeY = scaleLinear()
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
    this.scaleNodeX
      .domain([0, adjustedSpaceSize])
      .range([(width - adjustedSpaceSize) / 2, (width + adjustedSpaceSize) / 2])
    this.scaleNodeY
      .domain([adjustedSpaceSize, 0])
      .range([(height - adjustedSpaceSize) / 2, (height + adjustedSpaceSize) / 2])
  }

  public scaleX (x: number): number {
    return this.scaleNodeX(x)
  }

  public scaleY (y: number): number {
    return this.scaleNodeY(y)
  }

  public setHoveredNodeRingColor (color: string): void {
    const convertedRgba = getRgbaColor(color)
    this.hoveredNodeRingColor[0] = convertedRgba[0]
    this.hoveredNodeRingColor[1] = convertedRgba[1]
    this.hoveredNodeRingColor[2] = convertedRgba[2]
  }

  public setFocusedNodeRingColor (color: string): void {
    const convertedRgba = getRgbaColor(color)
    this.focusedNodeRingColor[0] = convertedRgba[0]
    this.focusedNodeRingColor[1] = convertedRgba[1]
    this.focusedNodeRingColor[2] = convertedRgba[2]
  }

  public setFocusedNode (node?: N, index?: number): void {
    if (node && index !== undefined) {
      this.focusedNode = { node, index }
    } else this.focusedNode = undefined
  }

  public addAlpha (decay: number): number {
    return (this.alphaTarget - this.alpha) * this.alphaDecay(decay)
  }

  private alphaDecay = (decay: number): number => 1 - Math.pow(ALPHA_MIN, 1 / decay)
}
