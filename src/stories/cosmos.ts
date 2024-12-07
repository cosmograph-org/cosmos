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
  clusterStrength?: Float32Array;
  showClusterLabels?: boolean;
}

export const createCosmos = (props: CosmosStoryProps): HTMLDivElement => {
  const div = document.createElement('div')
  const canvas = document.createElement('canvas')
  canvas.style.height = '100vh'
  canvas.style.width = '100%'
  div.appendChild(canvas)

  const config: GraphConfigInterface = {
    backgroundColor: '#212C42',
    pointSize: 3,
    pointColor: '#4B5BBF',
    pointGreyoutOpacity: 0.1,
    linkWidth: 0.2,
    linkColor: '#5F74C2',
    linkArrows: false,
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
    if (props.clusterStrength) graph.setPointClusterStrength(props.clusterStrength)

    graph.zoom(0.9)
    graph.render()

    if (props.showClusterLabels) {
      const clusterLabelDivs: HTMLDivElement[] = []
      function updateClusterLabels (graph: Graph): void {
        const clusterPositions = graph.getClusterPositions()
        const nClusters = clusterPositions.length / 2
        if (nClusters === 0) return
        if (clusterLabelDivs.length === 0) {
          for (let i = 0; i < nClusters; i++) {
            const clusterLabelDiv = document.createElement('div')
            const contentLabel = document.createElement('p')
            clusterLabelDiv.appendChild(contentLabel)
            clusterLabelDiv.style.position = 'absolute'
            clusterLabelDiv.style.pointerEvents = 'none'

            contentLabel.style.fontFamily = [
              '"Nunito Sans"',
              '-apple-system',
              '".SFNSText-Regular"',
              '"San Francisco"',
              'BlinkMacSystemFont',
              '"Segoe UI"',
              '"Helvetica Neue"',
              'Helvetica',
              'Arial',
              'sans-serif',
            ].join(', ')
            contentLabel.style.fontWeight = 'bold'
            contentLabel.style.color = 'white'
            contentLabel.style.transform = 'translate(-50%, -100%)'
            contentLabel.innerText = `Cluster ${i + 1}`

            div.appendChild(clusterLabelDiv)
            clusterLabelDivs[i] = clusterLabelDiv
          }
        }

        for (let i = 0; i < nClusters; i++) {
          const clusterPosition = clusterPositions.slice(i * 2, i * 2 + 2)
          const x = clusterPosition[0]
          const y = clusterPosition[1]
          const clusterLabelDiv = clusterLabelDivs[i] as HTMLDivElement
          const screenXY = graph.spaceToScreenPosition([x ?? 0, y ?? 0])
          clusterLabelDiv.style.top = `${screenXY[1]}px`
          clusterLabelDiv.style.left = `${screenXY[0]}px`
        }
      }
      graph.setConfig({
        onZoom: updateClusterLabels.bind(this, graph),
        onSimulationTick: updateClusterLabels.bind(this, graph),
      })
    }
  })

  return div
}
