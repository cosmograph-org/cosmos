import type { Meta, StoryObj } from '@storybook/html'
import { CosmosStoryProps, createCosmos } from '@/graph/stories/cosmos'

import { generateMeshData } from './data.mesh'

const meta: Meta<CosmosStoryProps> = {
  title: 'Clusters',
  parameters: {
    controls: {
      disable: true,
    },
  },
  render: (args) => {
    return createCosmos(args)
  },
}

// eslint-disable-next-line import/no-default-export
export default meta
type Story = StoryObj<CosmosStoryProps>;

const wormData = generateMeshData(100, 100, 1000, 1.0)
export const worm: Story = {
  args: {
    simulation: {
      linkDistance: 1,
      linkSpring: 1,
      repulsion: 1,
      gravity: 0.5,
      decay: 100000,
    },

    pointPositions: wormData.pointPositions,
    pointColors: wormData.pointColors,
    pointClusters: wormData.clusters,
    links: wormData.links,
  },
}

const withoutLinksData = generateMeshData(100, 100, 15, 1.0)
export const withoutLinks: Story = {
  args: {
    simulation: {
      linkDistance: 1,
      linkSpring: 1,
      repulsion: 0.5,
      gravity: 0.5,
      decay: 100000,
    },

    pointPositions: withoutLinksData.pointPositions,
    pointColors: withoutLinksData.pointColors,
    pointClusters: withoutLinksData.clusters,
  },
}
