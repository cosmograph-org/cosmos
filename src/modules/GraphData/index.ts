import { getRgbaColor, isNumber } from '@/graph/helper'
import { GraphConfig } from '@/graph/config'
export class GraphData {
  public inputPointPositions: Float32Array | undefined
  public inputPointColors: Float32Array | undefined
  public inputPointSizes: Float32Array | undefined
  public inputLinkColors: Float32Array | undefined
  public inputLinkWidths: Float32Array | undefined
  public inputLinkStrength: Float32Array | undefined
  public inputPointClusters: (number | undefined)[] | undefined
  public inputClusterPositions: (number | undefined)[] | undefined
  public inputClusterStrength: Float32Array | undefined

  public pointPositions: Float32Array | undefined
  public pointColors: Float32Array | undefined
  public pointSizes: Float32Array | undefined

  public inputLinks: Float32Array | undefined
  public links: Float32Array | undefined
  public linkColors: Float32Array | undefined
  public linkWidths: Float32Array | undefined
  public linkArrowsBoolean: boolean[] | undefined
  public linkArrows: number[] | undefined
  public linkStrength: Float32Array | undefined

  public pointClusters: (number | undefined)[] | undefined
  public clusterPositions: (number | undefined)[] | undefined
  public clusterStrength: Float32Array | undefined

  /**
   * Each inner array of `sourceIndexToTargetIndices` and `targetIndexToSourceIndices` contains pairs where:
   *   - The first value is the target/source index in the point array.
   *   - The second value is the link index in the array of links.
  */
  public sourceIndexToTargetIndices: ([number, number][] | undefined)[] | undefined
  public targetIndexToSourceIndices: ([number, number][] | undefined)[] | undefined

  public degree: number[] | undefined
  public inDegree: number[] | undefined
  public outDegree: number[] | undefined

  private _config: GraphConfig

  public constructor (config: GraphConfig) {
    this._config = config
  }

  public get pointsNumber (): number | undefined {
    return this.pointPositions && this.pointPositions.length / 2
  }

  public get linksNumber (): number | undefined {
    return this.links && this.links.length / 2
  }

  public updatePoints (): void {
    this.pointPositions = this.inputPointPositions
  }

  /**
   * Updates the point colors based on the input data or default config value.
   */
  public updatePointColor (): void {
    if (this.pointsNumber === undefined) {
      this.pointColors = undefined
      return
    }

    // Sets point colors to default values from config if the input is missing or does not match input points number.
    const defaultRgba = getRgbaColor(this._config.pointColor)
    if (this.inputPointColors === undefined || this.inputPointColors.length / 4 !== this.pointsNumber) {
      this.pointColors = new Float32Array(this.pointsNumber * 4)
      for (let i = 0; i < this.pointColors.length / 4; i++) {
        this.pointColors[i * 4] = defaultRgba[0]
        this.pointColors[i * 4 + 1] = defaultRgba[1]
        this.pointColors[i * 4 + 2] = defaultRgba[2]
        this.pointColors[i * 4 + 3] = defaultRgba[3]
      }
    } else {
      this.pointColors = this.inputPointColors
      for (let i = 0; i < this.pointColors.length / 4; i++) {
        if (!isNumber(this.pointColors[i * 4])) this.pointColors[i * 4] = defaultRgba[0]
        if (!isNumber(this.pointColors[i * 4 + 1])) this.pointColors[i * 4 + 1] = defaultRgba[1]
        if (!isNumber(this.pointColors[i * 4 + 2])) this.pointColors[i * 4 + 2] = defaultRgba[2]
        if (!isNumber(this.pointColors[i * 4 + 3])) this.pointColors[i * 4 + 3] = defaultRgba[3]
      }
    }
  }

  /**
   * Updates the point sizes based on the input data or default config value.
   */
  public updatePointSize (): void {
    if (this.pointsNumber === undefined) {
      this.pointSizes = undefined
      return
    }

    // Sets point sizes to default values from config if the input is missing or does not match input points number.
    if (this.inputPointSizes === undefined || this.inputPointSizes.length !== this.pointsNumber) {
      this.pointSizes = new Float32Array(this.pointsNumber).fill(this._config.pointSize)
    } else {
      this.pointSizes = this.inputPointSizes
      for (let i = 0; i < this.pointSizes.length; i++) {
        if (!isNumber(this.pointSizes[i])) {
          this.pointSizes[i] = this._config.pointSize
        }
      }
    }
  }

  public updateLinks (): void {
    this.links = this.inputLinks
  }

  /**
   * Updates the link colors based on the input data or default config value.
   */
  public updateLinkColor (): void {
    if (this.linksNumber === undefined) {
      this.linkColors = undefined
      return
    }

    // Sets link colors to default values from config if the input is missing or does not match input links number.
    const defaultRgba = getRgbaColor(this._config.linkColor)
    if (this.inputLinkColors === undefined || this.inputLinkColors.length / 4 !== this.linksNumber) {
      this.linkColors = new Float32Array(this.linksNumber * 4)

      for (let i = 0; i < this.linkColors.length / 4; i++) {
        this.linkColors[i * 4] = defaultRgba[0]
        this.linkColors[i * 4 + 1] = defaultRgba[1]
        this.linkColors[i * 4 + 2] = defaultRgba[2]
        this.linkColors[i * 4 + 3] = defaultRgba[3]
      }
    } else {
      this.linkColors = this.inputLinkColors
      for (let i = 0; i < this.linkColors.length / 4; i++) {
        if (!isNumber(this.linkColors[i * 4])) this.linkColors[i * 4] = defaultRgba[0]
        if (!isNumber(this.linkColors[i * 4 + 1])) this.linkColors[i * 4 + 1] = defaultRgba[1]
        if (!isNumber(this.linkColors[i * 4 + 2])) this.linkColors[i * 4 + 2] = defaultRgba[2]
        if (!isNumber(this.linkColors[i * 4 + 3])) this.linkColors[i * 4 + 3] = defaultRgba[3]
      }
    }
  }

  /**
   * Updates the link width based on the input data or default config value.
   */
  public updateLinkWidth (): void {
    if (this.linksNumber === undefined) {
      this.linkWidths = undefined
      return
    }

    // Sets link widths to default values from config if the input is missing or does not match input links number.
    if (this.inputLinkWidths === undefined || this.inputLinkWidths.length !== this.linksNumber) {
      this.linkWidths = new Float32Array(this.linksNumber).fill(this._config.linkWidth)
    } else {
      this.linkWidths = this.inputLinkWidths
      for (let i = 0; i < this.linkWidths.length; i++) {
        if (!isNumber(this.linkWidths[i])) {
          this.linkWidths[i] = this._config.linkWidth
        }
      }
    }
  }

  /**
   * Updates the link arrows based on the input data or default config value.
   */
  public updateArrows (): void {
    if (this.linksNumber === undefined) {
      this.linkArrows = undefined
      return
    }

    // Sets link arrows to default values from config if the input is missing or does not match input links number.
    if (this.linkArrowsBoolean === undefined || this.linkArrowsBoolean.length !== this.linksNumber) {
      this.linkArrows = new Array(this.linksNumber).fill(+this._config.linkArrows)
    } else {
      this.linkArrows = this.linkArrowsBoolean.map(d => +d)
    }
  }

  public updateLinkStrength (): void {
    if (this.linksNumber === undefined) {
      this.linkStrength = undefined
    }

    if (this.inputLinkStrength === undefined || this.inputLinkStrength.length !== this.linksNumber) {
      this.linkStrength = undefined
    } else {
      this.linkStrength = this.inputLinkStrength
    }
  }

  public updateClusters (): void {
    if (this.pointsNumber === undefined) {
      this.pointClusters = undefined
      this.clusterPositions = undefined
      return
    }
    if (this.inputPointClusters === undefined || this.inputPointClusters.length !== this.pointsNumber) {
      this.pointClusters = undefined
    } else {
      this.pointClusters = this.inputPointClusters
    }
    if (this.inputClusterPositions === undefined) {
      this.clusterPositions = undefined
    } else {
      this.clusterPositions = this.inputClusterPositions
    }
    if (this.inputClusterStrength === undefined || this.inputClusterStrength.length !== this.pointsNumber) {
      this.clusterStrength = undefined
    } else {
      this.clusterStrength = this.inputClusterStrength
    }
  }

  public update (): void {
    this.updatePoints()
    this.updatePointColor()
    this.updatePointSize()

    this.updateLinks()
    this.updateLinkColor()
    this.updateLinkWidth()
    this.updateArrows()
    this.updateLinkStrength()

    this.updateClusters()

    this._createAdjacencyLists()
    this._calculateDegrees()
  }

  public getAdjacentIndices (index: number): number[] | undefined {
    return [...(this.sourceIndexToTargetIndices?.[index]?.map(d => d[0]) || []), ...(this.targetIndexToSourceIndices?.[index]?.map(d => d[0]) || [])]
  }

  private _createAdjacencyLists (): void {
    if (this.linksNumber === undefined || this.links === undefined) {
      this.sourceIndexToTargetIndices = undefined
      this.targetIndexToSourceIndices = undefined
      return
    }

    this.sourceIndexToTargetIndices = new Array(this.pointsNumber).fill(undefined)
    this.targetIndexToSourceIndices = new Array(this.pointsNumber).fill(undefined)
    for (let i = 0; i < this.linksNumber; i++) {
      const sourceIndex = this.links[i * 2]
      const targetIndex = this.links[i * 2 + 1]
      if (sourceIndex !== undefined && targetIndex !== undefined) {
        if (this.sourceIndexToTargetIndices[sourceIndex] === undefined) this.sourceIndexToTargetIndices[sourceIndex] = []
        this.sourceIndexToTargetIndices[sourceIndex]?.push([targetIndex, i])

        if (this.targetIndexToSourceIndices[targetIndex] === undefined) this.targetIndexToSourceIndices[targetIndex] = []
        this.targetIndexToSourceIndices[targetIndex]?.push([sourceIndex, i])
      }
    }
  }

  private _calculateDegrees (): void {
    if (this.pointsNumber === undefined) {
      this.degree = undefined
      this.inDegree = undefined
      this.outDegree = undefined
      return
    }

    this.degree = new Array(this.pointsNumber).fill(0)
    this.inDegree = new Array(this.pointsNumber).fill(0)
    this.outDegree = new Array(this.pointsNumber).fill(0)

    for (let i = 0; i < this.pointsNumber; i++) {
      this.inDegree[i] = this.targetIndexToSourceIndices?.[i]?.length ?? 0
      this.outDegree[i] = this.sourceIndexToTargetIndices?.[i]?.length ?? 0
      this.degree[i] = (this.inDegree[i] ?? 0) + (this.outDegree[i] ?? 0)
    }
  }
}
