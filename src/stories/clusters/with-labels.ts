
import { Graph } from '@cosmograph/cosmos'
import { createClusterLabels } from '../create-cluster-labels'
import { createCosmos } from '../create-cosmos'
import { generateMeshData } from '../generate-mesh-data'

export const withLabels = (): {div: HTMLDivElement; graph: Graph } => {
  let nClusters = 2
  const { pointPositions, pointColors, pointClusters } = generateMeshData(100, 100, nClusters, 1.0)

  const { div, graph } = createCosmos({
    pointPositions,
    pointColors,
    pointClusters,
    simulationGravity: 2,
    simulationCluster: 0.25,
    simulationRepulsion: 10,
    pointSize: 10,
  })

  const updateClusterLabels = createClusterLabels({ div })
  graph.setZoomLevel(0.3)

  graph.setConfig({
    onZoom: updateClusterLabels.bind(this, graph),
    onSimulationTick: updateClusterLabels.bind(this, graph),
  })

  const interval = setInterval(() => {
    nClusters += 5
    if (nClusters > 15) {
      clearInterval(interval)
    }
    const nextData = generateMeshData(100, 100, nClusters, 1.0)
    graph.setPointClusters(nextData.pointClusters)
    graph.setPointColors(nextData.pointColors)
    graph.render(1)
  }, 1500)

  return { div, graph }
}
