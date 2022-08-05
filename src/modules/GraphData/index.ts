import { Node, Link, InputNode, InputLink } from '@/graph/types'

export class GraphData <N extends InputNode, L extends InputLink> {
  private _nodes: Node<N>[] = []
  private _links: Link<N, L>[] = []
  private nodeIdToNodeMap: Map<string, Node<N>> = new Map()

  public get nodes (): Node<N>[] {
    return this._nodes
  }

  public get links (): Link<N, L>[] {
    return this._links
  }

  public setData (inputNodes: InputNode[], inputLinks: InputLink[]): void {
    const nodes = inputNodes.map((n, i) => {
      return {
        ...n,
        degree: 0,
        indegree: 0,
        outdegree: 0,
        index: i,
      } as Node<N>
    })

    this.nodeIdToNodeMap.clear()
    nodes.forEach(n => {
      this.nodeIdToNodeMap.set(n.id, n)
    })

    // Calculate node outdegree/indegree value
    inputLinks.forEach(l => {
      const sourceNode = this.nodeIdToNodeMap.get(l.source)
      const targetNode = this.nodeIdToNodeMap.get(l.target)
      if (sourceNode !== undefined && targetNode !== undefined) {
        sourceNode.outdegree += 1
        targetNode.indegree += 1
      }
    })

    // Calculate node degree value
    nodes.forEach(n => {
      if (!n.degree) n.degree = (n.outdegree ?? 0) + (n.indegree ?? 0)
    })

    // Put index to node by ascending from 0
    nodes.forEach((n, i) => {
      n.index = i
    })

    const links = inputLinks
      .map(l => {
        const sourceNode = this.nodeIdToNodeMap.get(l.source)
        const targetNode = this.nodeIdToNodeMap.get(l.target)
        if (sourceNode !== undefined && targetNode !== undefined) {
          return {
            ...l,
            from: sourceNode.index,
            to: targetNode.index,
            source: sourceNode,
            target: targetNode,
          } as Link<N, L>
        } else {
          return undefined
        }
      })
      .filter(l => l !== undefined) as Link<N, L>[]
    this._nodes = nodes
    this._links = links
  }

  public getNodeById (id: string): Node<N> | undefined {
    return this.nodeIdToNodeMap.get(id)
  }

  public getNodeByIndex (index: number): Node<N> | undefined {
    return this._nodes[index]
  }
}
