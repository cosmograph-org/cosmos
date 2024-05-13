import { getRgbaColor } from '@/graph/helper'
import { GraphConfig } from '@/graph/config'
export class GraphData {
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

  public get nodesNumber (): number | undefined {
    return this.nodePositions && this.nodePositions.length / 2
  }

  public get linksNumber (): number | undefined {
    return this.links && this.links.length / 2
  }

  public updateArrows (config: GraphConfig): void {
    if (this.linkArrowsBoolean === undefined || this.linkArrowsBoolean.length !== this.linksNumber) {
      this.linkArrows = new Array(this.linksNumber).fill(+config.linkArrows)
    } else {
      this.linkArrows = this.linkArrowsBoolean.map(d => +d)
    }
  }

  public update (config: GraphConfig): void {
    if (this.nodesNumber === undefined) return
    if (this.nodeColors === undefined || this.nodeColors.length / 4 !== this.nodesNumber) {
      this.nodeColors = new Array(this.nodesNumber * 4)
      const rgba = getRgbaColor(config.nodeColor)
      for (let i = 0; i < this.nodeColors.length / 4; i++) {
        this.nodeColors[i * 4] = rgba[0]
        this.nodeColors[i * 4 + 1] = rgba[1]
        this.nodeColors[i * 4 + 2] = rgba[2]
        this.nodeColors[i * 4 + 3] = rgba[3]
      }
    }
    if (this.nodeSizes === undefined || this.nodeSizes.length !== this.nodesNumber) {
      this.nodeSizes = new Array(this.nodesNumber).fill(config.nodeSize)
    }

    if (this.linksNumber === undefined) return
    if (this.linkColors === undefined || this.linkColors.length / 4 !== this.linksNumber) {
      this.linkColors = new Array(this.linksNumber * 4)
      const rgba = getRgbaColor(config.linkColor)
      for (let i = 0; i < this.linkColors.length / 4; i++) {
        this.linkColors[i * 4] = rgba[0]
        this.linkColors[i * 4 + 1] = rgba[1]
        this.linkColors[i * 4 + 2] = rgba[2]
        this.linkColors[i * 4 + 3] = rgba[3]
      }
    }
    if (this.linkWidths === undefined || this.linkWidths.length !== this.linksNumber) {
      this.linkWidths = new Array(this.linksNumber).fill(config.linkWidth)
    }
    this.updateArrows(config)

    // Create arrays for adjacent indices
    if (this.links?.length === undefined) return
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
    this.degree = new Array(this.nodesNumber).fill(0)
    for (let i = 0; i < this.nodesNumber; i++) {
      this.degree[i] = (this.sourceIndexToTargetIndices[i]?.length ?? 0) + (this.targetIndexToSourceIndices[i]?.length ?? 0)
    }
  }

  public getAdjacentIndices (index: number): number[] | undefined {
    return [...(this.sourceIndexToTargetIndices?.[index] || []), ...(this.targetIndexToSourceIndices?.[index] || [])]
  }
}
