import { scaleLinear } from 'd3-scale'
import { mat3 } from 'gl-matrix'

export const ALPHA_MIN = 0.001
export const MAX_POINT_SIZE = 64

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
  private alphaTarget = 0
  private scaleNodeX = scaleLinear()
  private scaleNodeY = scaleLinear()

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

  public addAlpha (decay: number): number {
    return (this.alphaTarget - this.alpha) * this.alphaDecay(decay)
  }

  private alphaDecay = (decay: number): number => 1 - Math.pow(ALPHA_MIN, 1 / decay)
}
