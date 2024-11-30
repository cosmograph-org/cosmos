import { GraphConfigInterface } from '@/graph/config'
import { Graph } from '@/graph/index'

export type CosmosStoryProps = GraphConfigInterface & {
  pointPositions: Float32Array;
  pointColors: Float32Array;
  pointSizes?: Float32Array;

  links?: Float32Array;
  linkColors?: Float32Array;
  linkWidths?: Float32Array;
  // linkStrength?: Float32Array;

  pointClusters?: number[];
  clusterPositions?: number[];
  clusterForces?: Float32Array;
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
    simulationLinkDistance: 1,
    simulationLinkSpring: 2,
    simulationRepulsion: 0.5,
    simulationGravity: 0.02,
    simulationFriction: 0.7,
    simulationDecay: 10000000,
    ...props,
  }

  // If we initialize the graph before the canvas is added to the DOM, nothing happens
  requestAnimationFrame(() => {
    const graph = new Graph(canvas, config)

    graph.setPointPositions(props.pointPositions)
    graph.setPointColors(props.pointColors)
    if (props.pointSizes) graph.setPointSizes(props.pointSizes)

    if (props.links) graph.setLinks(props.links)
    if (props.linkColors) graph.setLinkColors(props.linkColors)
    if (props.linkWidths) graph.setLinkWidths(props.linkWidths)
    // if (props.linkStrength) graph.setLinkStrength(props.linkStrength)

    if (props.pointClusters) graph.setPointClusters(props.pointClusters)
    if (props.clusterPositions) graph.setClusterPositions(props.clusterPositions)
    if (props.clusterForces) graph.setClusterForceCoefficients(props.clusterForces)

    graph.zoom(0.9)
    graph.render()
  })

  return canvas
}
