
import { createCosmos } from '../create-cosmos'
import { generateMeshData } from '../generate-mesh-data'

export const RadialStory = (): HTMLDivElement => {
  const {
    pointPositions, pointColors, pointSizes,
    links, linkColors, linkWidths,
    pointClusters, clusterPositions, clusterStrength,
  } = generateMeshData(100, 100, 100, 1.0)
  const { div } = createCosmos({
    pointPositions,
    pointColors,
    pointSizes,
    pointClusters,
    links,
    linkColors,
    linkWidths,
    clusterPositions,
    clusterStrength,
  })

  return div
}
