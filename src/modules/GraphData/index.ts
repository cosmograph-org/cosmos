import { Node, Link, InputNode, InputLink } from '@/graph/types'

export class GraphData <N extends InputNode, L extends InputLink> {
  private _nodes: Node<N>[] = []
  private _links: Link<N, L>[] = []

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

    const nodesObj: { [key: string]: Node<N> } = {}
    nodes.forEach(n => {
      nodesObj[n.id] = n
    })

    // Calculate node outdegree/indegree value
    inputLinks.forEach(l => {
      const sourceNode = nodesObj[l.source]
      const targetNode = nodesObj[l.target]
      if (sourceNode !== undefined && targetNode !== undefined) {
        sourceNode.outdegree += 1
        targetNode.indegree += 1
      }
    })

    // Calculate node degree value
    nodes.forEach(n => {
      if (!n.degree) n.degree = (n.outdegree ?? 0) + (n.indegree ?? 0)
    })

    // Sort nodes by degree value
    nodes.sort((a, b) => (a.degree) - (b.degree ?? 0))

    // Put index to node by ascending from 0
    nodes.forEach((n, i) => {
      n.index = i
    })

    const links = inputLinks
      .map(l => {
        const sourceNode = nodesObj[l.source]
        const targetNode = nodesObj[l.target]
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

  public get nodes (): Node<N>[] {
    return this._nodes
  }

  public get links (): Link<N, L>[] {
    return this._links
  }

  public findNodeById (id: string): Node<N> | undefined {
    return this.nodes.find(node => node.id.toLowerCase() === id.toLowerCase())
  }
}
