import { mat3 } from 'gl-matrix'

export const ALPHA_MIN = 0.001

export class Store {
  public pointsTextureSize = 0
  public linksTextureSize = 0
  public alpha = 1
  public transform = mat3.create()
  public backgroundColor: [number, number, number, number] = [0, 0, 0, 0]
  public screenSize: [number, number] = [0, 0]
  public mousePosition = [0, 0]
  public selectedArea = [[0, 0], [0, 0]]
  public simulationIsRunning = false
  public simulationProgress = 0
  public selectedIndices: Float32Array = new Float32Array()
  private alphaTarget = 0

  public addAlpha (decay: number): number {
    return (this.alphaTarget - this.alpha) * this.alphaDecay(decay)
  }

  private alphaDecay = (decay: number): number => 1 - Math.pow(ALPHA_MIN, 1 / decay)
}
