
import { Graph } from '@cosmograph/cosmos'
import { createCosmos } from '../create-cosmos'
import { pointPositions } from './data'

export const EmbeddingStory = (): {graph: Graph; div: HTMLDivElement} => {
  return createCosmos({
    pointSize: 10,
    pointColor: '#e9ff00',
    disableSimulation: true,
    pointPositions,
    fitViewOnInit: true,
  })
}
