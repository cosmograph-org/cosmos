
import { createCosmos } from '../create-cosmos'
import { generateMeshData } from '../generate-mesh-data'

export const WormStory = (): HTMLDivElement => {
  const { pointPositions, pointColors, links, linkColors, pointClusters } = generateMeshData(100, 100, 1000, 1.0)
  const { div } = createCosmos({
    simulationGravity: 0.5,
    simulationRepulsion: 1,
    simulationLinkSpring: 1,
    pointPositions,
    pointColors,
    pointClusters,
    links,
    linkColors,
  })

  return div
}
