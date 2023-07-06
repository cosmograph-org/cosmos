import { CosmosInputNode, CosmosInputLink } from '@/graph/types'

export class GraphData <N extends CosmosInputNode, L extends CosmosInputLink> {
  /** Links that have existing source and target nodes  */
  public completeLinks: Set<L> = new Set()
  public degree: number[] = []
  /** Mapping the source node index to a `Set` of target node indices connected to that node */
  public groupedSourceToTargetLinks: Map<number, Set<number>> = new Map()
  /** Mapping the target node index to a `Set` of source node indices connected to that node */
  public groupedTargetToSourceLinks: Map<number, Set<number>> = new Map()
  private _nodes: N[] = []
  private _links: L[] = []
  /** Mapping the original id to the original node */
  private idToNodeMap: Map<string, N> = new Map()

  /** We want to display more important nodes (i.e. with the biggest number of connections)
   * on top of the other. To render them in the right order,
   * we create an array of node indices sorted by degree (number of connections)
   * and and we store multiple maps that help us referencing the right data objects
   * and other properties by original node index, sorted index, and id 👇. */

  /** Mapping the sorted index to the original index */
  private sortedIndexToInputIndexMap: Map<number, number> = new Map()
  /** Mapping the original index to the sorted index of the node */
  private inputIndexToSortedIndexMap: Map<number, number> = new Map()
  /** Mapping the original id to the sorted index of the node */
  private idToSortedIndexMap: Map<string, number> = new Map()
  /** Mapping the original index to the original id of the node */
  private inputIndexToIdMap: Map<number, string> = new Map()
  /** Mapping the original id to the indegree value of the node */
  private idToIndegreeMap: Map<string, number> = new Map()
  /** Mapping the original id to the outdegree value of the node */
  private idToOutdegreeMap: Map<string, number> = new Map()

  public get nodes (): N[] {
    return this._nodes
  }

  public get links (): L[] {
    return this._links
  }

  public get linksNumber (): number {
    return this.completeLinks.size
  }

  public setData (inputNodes: N[], inputLinks: L[]): void {
    this.idToNodeMap.clear()
    this.idToSortedIndexMap.clear()
    this.inputIndexToIdMap.clear()
    this.idToIndegreeMap.clear()
    this.idToOutdegreeMap.clear()

    inputNodes.forEach((n, i) => {
      this.idToNodeMap.set(n.id, n)
      this.inputIndexToIdMap.set(i, n.id)
      this.idToIndegreeMap.set(n.id, 0)
      this.idToOutdegreeMap.set(n.id, 0)
    })

    // Calculate node outdegree/indegree values
    // And filter links if source/target node does not exist
    this.completeLinks.clear()
    inputLinks.forEach(l => {
      const sourceNode = this.idToNodeMap.get(l.source)
      const targetNode = this.idToNodeMap.get(l.target)
      if (sourceNode !== undefined && targetNode !== undefined) {
        this.completeLinks.add(l)
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

    this._nodes = inputNodes
    this._links = inputLinks
  }

  public getNodeById (id: string): N | undefined {
    return this.idToNodeMap.get(id)
  }

  public getNodeByIndex (index: number): N | undefined {
    return this._nodes[index]
  }

  public getSortedIndexByInputIndex (index: number): number | undefined {
    return this.inputIndexToSortedIndexMap.get(index)
  }

  public getInputIndexBySortedIndex (index: number): number | undefined {
    return this.sortedIndexToInputIndexMap.get(index)
  }

  public getSortedIndexById (id: string | undefined): number | undefined {
    return id !== undefined ? this.idToSortedIndexMap.get(id) : undefined
  }

  public getInputIndexById (id: string | undefined): number | undefined {
    if (id === undefined) return undefined
    const sortedIndex = this.getSortedIndexById(id)
    if (sortedIndex === undefined) return undefined
    return this.getInputIndexBySortedIndex(sortedIndex)
  }

  public getAdjacentNodes (id: string): N[] | undefined {
    const index = this.getSortedIndexById(id)
    if (index === undefined) return undefined
    const outgoingSet = this.groupedSourceToTargetLinks.get(index) ?? []
    const incomingSet = this.groupedTargetToSourceLinks.get(index) ?? []
    return [...new Set([...outgoingSet, ...incomingSet])]
      .map(index => this.getNodeByIndex(this.getInputIndexBySortedIndex(index) as number) as N)
  }
}
