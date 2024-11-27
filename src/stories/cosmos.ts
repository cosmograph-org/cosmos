import { GraphConfigInterface } from '@/graph/config'
import { Graph } from '@/graph/index'

export type CosmosStoryProps = GraphConfigInterface & {
  pointPositions: number[];
  links: number[];
  pointColors: number[];
  pointClusters: number[];
  clusterPositions: number[];
}

export const createCosmos = (props: CosmosStoryProps): HTMLCanvasElement => {
  const canvas = document.createElement('canvas')
  canvas.style.height = '100vh'
  canvas.style.width = '100%'

  const config: GraphConfigInterface = {
    backgroundColor: '#212C42',
    defaultPointSize: 3,
    defaultPointColor: '#4B5BBF',
    pointGreyoutOpacity: 0.1,
    defaultLinkWidth: 0.2,
    defaultLinkColor: '#5F74C2',
    defaultLinkArrows: false,
    linkGreyoutOpacity: 0,
    curvedLinks: true,
    renderLinks: true,
    renderHoveredPointRing: true,
    fitViewOnInit: false,
    hoveredPointRingColor: '#4B5BBF',
    enableDrag: true,
    simulation: {
      linkDistance: 1,
      linkSpring: 2,
      repulsion: 0.5,
      gravity: 0.02,
      decay: 10000000,
      friction: 0.7,
    },
    ...props,
  }

  // If we initialize the graph before the canvas is added to the DOM, nothing happens
  requestAnimationFrame(() => {
    const graph = new Graph(canvas, config)

    graph.setPointPositions(props.pointPositions)
    graph.setPointColors(props.pointColors)

    graph.setLinks(props.links)

    graph.setPointClusters(props.pointClusters)
    graph.setClusterPositions(props.clusterPositions)

    graph.zoom(0.9)
    graph.render()
  })

  return canvas
}
