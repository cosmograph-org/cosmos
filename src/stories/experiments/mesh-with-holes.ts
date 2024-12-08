import { createCosmos } from '../create-cosmos'
import { generateMeshData } from '../generate-mesh-data'

export const MeshWithHolesStory = (): HTMLDivElement => {
  const { pointPositions, links, pointColors } = generateMeshData(40, 80, 15, 0.8)

  return createCosmos({
    pointPositions,
    links,
    pointColors,
  })
}
