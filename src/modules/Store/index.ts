import { scaleLinear } from 'd3-scale'
import { mat3 } from 'gl-matrix'
import { Random } from 'random'
import { getRgbaColor } from '@/graph/helper'
import { hoveredNodeRingOpacity, focusedNodeRingOpacity } from '@/graph/variables'

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

  public updateScreenSize (width: number, height: number, spaceSize: number): void {
    this.screenSize = [width, height]
    this.scaleNodeX
      .domain([0, spaceSize])
      .range([(width - spaceSize) / 2, (width + spaceSize) / 2])
    this.scaleNodeY
      .domain([spaceSize, 0])
      .range([(height - spaceSize) / 2, (height + spaceSize) / 2])
  }

  public scaleX (x: number): number {
    return this.scaleNodeX(x)
  }

  public scaleY (y: number): number {
    return this.scaleNodeY(y)
  }

  public setHighlightedNodeRingColor (color: string): void {
    const convertedRgba = getRgbaColor(color)
    this.hoveredNodeRingColor[0] = convertedRgba[0]
    this.hoveredNodeRingColor[1] = convertedRgba[1]
    this.hoveredNodeRingColor[2] = convertedRgba[2]
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
