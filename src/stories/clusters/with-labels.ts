
import { Graph } from '@cosmograph/cosmos'
import { createClusterLabels } from '../create-cluster-labels'
import { createCosmos } from '../create-cosmos'
import { generateMeshData } from '../generate-mesh-data'

export const WithLabelsStory = (): {div: HTMLDivElement; graph: Graph } => {
  const { pointPositions, pointColors, pointClusters } = generateMeshData(100, 100, 15, 1.0)
  const { div, graph } = createCosmos({
    pointPositions,
    pointColors,
    pointClusters,
    simulationGravity: 0.5,
    simulationLinkSpring: 1,
  })

  const updateClusterLabels = createClusterLabels({ div })

  graph.setConfig({
    onZoom: updateClusterLabels.bind(this, graph),
    onSimulationTick: updateClusterLabels.bind(this, graph),
  })

  return { div, graph }
}
