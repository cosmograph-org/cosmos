import { getRgbaColor } from '@/graph/helper'
import { GraphConfig } from '@/graph/config'
export class GraphData {
  public inputNodeColors: number[] | undefined
  public inputNodeSizes: number[] | undefined
  public inputLinkColors: number[] | undefined
  public inputLinkWidths: number[] | undefined

  public nodePositions: number[] | undefined
  public nodeColors: number[] | undefined
  public nodeSizes: number[] | undefined

  public links: number[] | undefined
  public linkColors: number[] | undefined
  public linkWidths: number[] | undefined
  public linkArrowsBoolean: boolean[] | undefined
  public linkArrows: number[] | undefined

  public sourceIndexToTargetIndices: (number[] | undefined)[] | undefined
  public targetIndexToSourceIndices: (number[] | undefined)[] | undefined
  public degree: number[] | undefined

  private _config: GraphConfig

  public constructor (config: GraphConfig) {
    this._config = config
  }

  public get nodesNumber (): number | undefined {
    return this.nodePositions && this.nodePositions.length / 2
  }

  public get linksNumber (): number | undefined {
    return this.links && this.links.length / 2
  }

  /**
   * Updates the node colors based on the input data or default config value.
   */
  public updateNodeColor (): void {
    if (this.nodesNumber === undefined) {
      this.nodeColors = undefined
      return
    }

    // Sets node colors to default values from config if the input is missing or does not match input nodes number.
    const defaultRgba = getRgbaColor(this._config.defaultNodeColor)
    if (this.inputNodeColors === undefined || this.inputNodeColors.length / 4 !== this.nodesNumber) {
      this.nodeColors = new Array(this.nodesNumber * 4)
      for (let i = 0; i < this.nodeColors.length / 4; i++) {
        this.nodeColors[i * 4] = defaultRgba[0]
        this.nodeColors[i * 4 + 1] = defaultRgba[1]
        this.nodeColors[i * 4 + 2] = defaultRgba[2]
        this.nodeColors[i * 4 + 3] = defaultRgba[3]
      }
    } else {
      this.nodeColors = this.inputNodeColors
      for (let i = 0; i < this.nodeColors.length / 4; i++) {
        if (this.nodeColors[i * 4] === undefined || this.nodeColors[i * 4] === null) this.nodeColors[i * 4] = defaultRgba[0]
        if (this.nodeColors[i * 4 + 1] === undefined || this.nodeColors[i * 4 + 1] === null) this.nodeColors[i * 4 + 1] = defaultRgba[1]
        if (this.nodeColors[i * 4 + 2] === undefined || this.nodeColors[i * 4 + 2] === null) this.nodeColors[i * 4 + 2] = defaultRgba[2]
        if (this.nodeColors[i * 4 + 3] === undefined || this.nodeColors[i * 4 + 3] === null) this.nodeColors[i * 4 + 3] = defaultRgba[3]
      }
    }
  }

  /**
   * Updates the node sizes based on the input data or default config value.
   */
  public updateNodeSize (): void {
    if (this.nodesNumber === undefined) {
      this.nodeSizes = undefined
      return
    }

    // Sets node sizes to default values from config if the input is missing or does not match input nodes number.
    if (this.inputNodeSizes === undefined || this.inputNodeSizes.length !== this.nodesNumber) {
      this.nodeSizes = new Array(this.nodesNumber).fill(this._config.defaultNodeSize)
    } else {
      this.nodeSizes = this.inputNodeSizes
    }
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
    if (this.inputLinkColors === undefined || this.inputLinkColors.length / 4 !== this.linksNumber) {
      this.linkColors = new Array(this.linksNumber * 4)
      const rgba = getRgbaColor(this._config.defaultLinkColor)
      for (let i = 0; i < this.linkColors.length / 4; i++) {
        this.linkColors[i * 4] = rgba[0]
        this.linkColors[i * 4 + 1] = rgba[1]
        this.linkColors[i * 4 + 2] = rgba[2]
        this.linkColors[i * 4 + 3] = rgba[3]
      }
    } else {
      this.linkColors = this.inputLinkColors
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
      this.linkWidths = new Array(this.linksNumber).fill(this._config.defaultLinkWidth)
    } else {
      this.linkWidths = this.inputLinkWidths
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
      this.linkArrows = new Array(this.linksNumber).fill(+this._config.defaultLinkArrows)
    } else {
      this.linkArrows = this.linkArrowsBoolean.map(d => +d)
    }
  }

  public update (): void {
    this.updateNodeColor()
    this.updateNodeSize()

    this.updateLinkColor()
    this.updateLinkWidth()
    this.updateArrows()

    this._createAdjacencyLists()
    this._calculateDegrees()
  }

  public getAdjacentIndices (index: number): number[] | undefined {
    return [...(this.sourceIndexToTargetIndices?.[index] || []), ...(this.targetIndexToSourceIndices?.[index] || [])]
  }

  private _createAdjacencyLists (): void {
    if (this.linksNumber === undefined || this.links === undefined) {
      this.sourceIndexToTargetIndices = undefined
      this.targetIndexToSourceIndices = undefined
      return
    }

    this.sourceIndexToTargetIndices = new Array(this.nodesNumber).fill(undefined)
    this.targetIndexToSourceIndices = new Array(this.nodesNumber).fill(undefined)
    for (let i = 0; i < this.linksNumber; i++) {
      const sourceIndex = this.links[i * 2]
      const targetIndex = this.links[i * 2 + 1]
      if (sourceIndex !== undefined && targetIndex !== undefined) {
        if (this.sourceIndexToTargetIndices[sourceIndex] === undefined) this.sourceIndexToTargetIndices[sourceIndex] = []
        this.sourceIndexToTargetIndices[sourceIndex]?.push(targetIndex)

        if (this.targetIndexToSourceIndices[targetIndex] === undefined) this.targetIndexToSourceIndices[targetIndex] = []
        this.targetIndexToSourceIndices[targetIndex]?.push(sourceIndex)
      }
    }
  }

  private _calculateDegrees (): void {
    if (this.nodesNumber === undefined) {
      this.degree = undefined
      return
    }
    this.degree = new Array(this.nodesNumber).fill(0)
    for (let i = 0; i < this.nodesNumber; i++) {
      this.degree[i] = (this.sourceIndexToTargetIndices?.[i]?.length ?? 0) + (this.targetIndexToSourceIndices?.[i]?.length ?? 0)
    }
  }
}
