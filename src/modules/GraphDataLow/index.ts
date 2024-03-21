
export class GraphDataLow {
  public nodePositions: number[] | undefined
  public nodeColors: number[] | undefined
  public nodeSizes: number[] | undefined

  public links: number[] | undefined
  public linkColors: number[] | undefined
  public linkWidths: number[] | undefined
  public linkArrows: number[] | undefined

  public get nodesNumber (): number {
    return (this.nodePositions?.length ?? 0) / 2
  }

  public get linksNumber (): number {
    return (this.links?.length ?? 0) / 2
  }

  public update (): void {
    if (this.nodesNumber === undefined) return
    if (this.nodeColors === undefined || this.nodeColors.length / 4 !== this.nodesNumber) {
      this.nodeColors = new Array(this.nodesNumber * 4).fill(1)
    }
    if (this.nodeSizes === undefined || this.nodeSizes.length !== this.nodesNumber) {
      this.nodeSizes = new Array(this.nodesNumber).fill(100)
    }

    if (this.linksNumber === undefined) return
    if (this.linkColors === undefined || this.linkColors.length / 4 !== this.linksNumber) {
      this.linkColors = new Array(this.linksNumber * 4).fill(1)
    }
    if (this.linkWidths === undefined || this.linkWidths.length !== this.linksNumber) {
      this.linkWidths = new Array(this.linksNumber).fill(1)
    }
    if (this.linkArrows === undefined || this.linkArrows.length !== this.linksNumber) {
      this.linkArrows = new Array(this.linksNumber).fill(0)
    }
  }
}
