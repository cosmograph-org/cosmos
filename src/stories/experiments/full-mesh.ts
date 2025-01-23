import { Graph } from '@cosmograph/cosmos'
import { createCosmos } from '../create-cosmos'
import { generateMeshData } from '../generate-mesh-data'

export const FullMeshStory = (): { graph: Graph; div: HTMLDivElement} => {
  const { pointPositions, links, pointColors } = generateMeshData(40, 30, 15, 1.0)

  return createCosmos({
    pointPositions,
    links,
    pointColors,
  })
}