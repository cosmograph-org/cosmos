import { createCosmos } from '../create-cosmos'
import { generateMeshData } from '../generate-mesh-data'

export const MeshWithHolesStory = (): HTMLDivElement => {
  const { pointPositions, links, pointColors } = generateMeshData(40, 80, 15, 0.8)
  const { div } = createCosmos({
    pointPositions,
    links,
    pointColors,
  })

  return div
}
