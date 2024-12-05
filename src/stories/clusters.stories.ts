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
    simulationGravity: 0.5,
    simulationRepulsion: 1,
    simulationLinkSpring: 1,

    pointPositions: wormData.pointPositions,
    pointColors: wormData.pointColors,
    pointClusters: wormData.clusters,
    links: wormData.links,
    linkColors: wormData.linkColors,
  },
}

const radialData = generateMeshData(100, 100, 100, 1.0)
export const radial: Story = {
  args: {
    pointPositions: radialData.pointPositions,
    pointColors: radialData.pointColors,
    pointSizes: radialData.pointSizes,
    pointClusters: radialData.clusters,

    links: radialData.links,
    linkColors: radialData.linkColors,
    linkWidths: radialData.linkWidths,

    clusterPositions: radialData.clusterPositions,
    clusterStrength: radialData.clusterStrength,
  },
}

const withoutLinksData = generateMeshData(100, 100, 15, 1.0)
export const withoutLinks: Story = {
  args: {
    simulationGravity: 0.5,
    simulationLinkSpring: 1,

    pointPositions: withoutLinksData.pointPositions,
    pointColors: withoutLinksData.pointColors,
    pointClusters: withoutLinksData.clusters,

    showClusterLabels: true,
  },
}
