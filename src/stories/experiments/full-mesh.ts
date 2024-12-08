import { createCosmos } from '../create-cosmos'
import { generateMeshData } from '../generate-mesh-data'

export const FullMeshStory = (): HTMLDivElement => {
  const { pointPositions, links, pointColors } = generateMeshData(40, 30, 15, 1.0)

  return createCosmos({
    pointPositions,
    links,
    pointColors,
  })
}
