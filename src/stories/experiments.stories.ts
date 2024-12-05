import type { Meta, StoryObj } from '@storybook/html'
import { CosmosStoryProps, createCosmos } from '@/graph/stories/cosmos'

import { generateMeshData } from './data.mesh'

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta: Meta<CosmosStoryProps> = {
  title: 'Experiments',
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

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
const fullMeshData = generateMeshData(40, 30, 15, 1.0)
export const FullMesh: Story = {
  args: {
    pointPositions: fullMeshData.pointPositions,
    links: fullMeshData.links,
    pointColors: fullMeshData.pointColors,
  },
}

export const MeshWithHoles = (): HTMLDivElement => {
  const { pointPositions, links, pointColors } = generateMeshData(40, 80, 15, 0.8)

  return createCosmos({
    pointPositions,
    links,
    pointColors,
  })
}
