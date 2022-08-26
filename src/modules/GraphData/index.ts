import { Node, Link, InputNode, InputLink } from '@/graph/types'

export class GraphData <N extends InputNode, L extends InputLink> {
  public completeLinks: Set<Link<N, L>> = new Set()
  public degree: number[] = []
  public groupedSourceToTargetLinks: Map<number, Set<number>> = new Map()
  public groupedTargetToSourceLinks: Map<number, Set<number>> = new Map()
  private _nodes: Node<N>[] = []
  private _links: Link<N, L>[] = []
  private idToNodeMap: Map<string, Node<N>> = new Map()
  private sortedIndexToInputIndexMap: Map<number, number> = new Map()
  private inputIndexToSortedIndexMap: Map<number, number> = new Map()
  private idToSortedIndexMap: Map<string, number> = new Map()
  private inputIndexToIdMap: Map<number, string> = new Map()
  private idToIndegreeMap: Map<string, number> = new Map()
  private idToOutdegreeMap: Map<string, number> = new Map()

  public get nodes (): Node<N>[] {
    return this._nodes
  }

  public get links (): Link<N, L>[] {
    return this._links
  }

  public get linksNumber (): number {
    return this.completeLinks.size
  }

  public setData (inputNodes: InputNode[], inputLinks: InputLink[]): void {
    this.idToNodeMap.clear()
    this.idToSortedIndexMap.clear()
    this.inputIndexToIdMap.clear()
    this.idToIndegreeMap.clear()
    this.idToOutdegreeMap.clear()

    inputNodes.forEach((n, i) => {
      this.idToNodeMap.set(n.id, n as Node<N>)
      this.inputIndexToIdMap.set(i, n.id)
      this.idToIndegreeMap.set(n.id, 0)
      this.idToOutdegreeMap.set(n.id, 0)
    })

    // Calculate node outdegree/indegree value
    // And filter links if source/target node does not exist
    this.completeLinks.clear()
    inputLinks.forEach(l => {
      const sourceNode = this.idToNodeMap.get(l.source)
      const targetNode = this.idToNodeMap.get(l.target)
      if (sourceNode !== undefined && targetNode !== undefined) {
        this.completeLinks.add(l as Link<N, L>)
        const outdegree = this.idToOutdegreeMap.get(sourceNode.id)
        if (outdegree !== undefined) this.idToOutdegreeMap.set(sourceNode.id, outdegree + 1)
        const indegree = this.idToIndegreeMap.get(targetNode.id)
        if (indegree !== undefined) this.idToIndegreeMap.set(targetNode.id, indegree + 1)
      }
    })

    // Calculate node degree value
    this.degree = new Array<number>(inputNodes.length)
    inputNodes.forEach((n, i) => {
      const outdegree = this.idToOutdegreeMap.get(n.id)
      const indegree = this.idToIndegreeMap.get(n.id)
      this.degree[i] = (outdegree ?? 0) + (indegree ?? 0)
    })

    // Sort nodes by degree value
    this.sortedIndexToInputIndexMap.clear()
    this.inputIndexToSortedIndexMap.clear()
    const sortedDegrees = Object.entries(this.degree).sort((a, b) => a[1] - b[1])
    sortedDegrees.forEach(([inputStringedIndex], sortedIndex) => {
      const inputIndex = +inputStringedIndex
      this.sortedIndexToInputIndexMap.set(sortedIndex, inputIndex)
      this.inputIndexToSortedIndexMap.set(inputIndex, sortedIndex)
      this.idToSortedIndexMap.set(this.inputIndexToIdMap.get(inputIndex) as string, sortedIndex)
    })

    this.groupedSourceToTargetLinks.clear()
    this.groupedTargetToSourceLinks.clear()
    inputLinks.forEach((l) => {
      const sourceIndex = this.idToSortedIndexMap.get(l.source)
      const targetIndex = this.idToSortedIndexMap.get(l.target)
      if (sourceIndex !== undefined && targetIndex !== undefined) {
        if (this.groupedSourceToTargetLinks.get(sourceIndex) === undefined) this.groupedSourceToTargetLinks.set(sourceIndex, new Set())
        const targets = this.groupedSourceToTargetLinks.get(sourceIndex)
        targets?.add(targetIndex)

        if (this.groupedTargetToSourceLinks.get(targetIndex) === undefined) this.groupedTargetToSourceLinks.set(targetIndex, new Set())
        const sources = this.groupedTargetToSourceLinks.get(targetIndex)
        sources?.add(sourceIndex)
      }
    })

    this._nodes = inputNodes as Node<N>[]
    this._links = inputLinks as Link<N, L>[]
  }

  public getNodeById (id: string): Node<N> | undefined {
    return this.idToNodeMap.get(id)
  }

  public getNodeByIndex (index: number): Node<N> | undefined {
    return this._nodes[index]
  }

  public getSortedIndexByInputIndex (index: number): number | undefined {
    return this.inputIndexToSortedIndexMap.get(index)
  }

  public getInputIndexBySortedIndex (index: number): number | undefined {
    return this.sortedIndexToInputIndexMap.get(index)
  }

  public getSortedIndexById (id: string): number | undefined {
    return this.idToSortedIndexMap.get(id)
  }
}
