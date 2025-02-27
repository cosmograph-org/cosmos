import type { Meta } from '@storybook/html'
import { CosmosStoryProps } from '@/graph/stories/create-cosmos'
import { createStory, Story } from '@/graph/stories/create-story'
import { withLabels } from './clusters/with-labels'
import { worm } from './clusters/worm'
import { radial } from './clusters/radial'

import createCosmosRaw from './create-cosmos?raw'
import generateMeshDataRaw from './generate-mesh-data?raw'
import withLabelsStoryRaw from './clusters/with-labels?raw'
import createClusterLabelsRaw from './create-cluster-labels?raw'
import wormStory from './clusters/worm?raw'
import radialStory from './clusters/radial?raw'

const meta: Meta<CosmosStoryProps> = {
  title: 'Examples/Clusters',
  parameters: {
    controls: {
      disable: true,
    },
  },
}

const sourceCodeAddonParams = [
  { name: 'create-cosmos', code: createCosmosRaw },
  { name: 'generate-mesh-data', code: generateMeshDataRaw },
]

export const Worm: Story = {
  ...createStory(worm),
  parameters: {
    sourceCode: [
      { name: 'Story', code: wormStory },
      ...sourceCodeAddonParams,
    ],
  },
}

export const Radial: Story = {
  ...createStory(radial),
  parameters: {
    sourceCode: [
      { name: 'Story', code: radialStory },
      ...sourceCodeAddonParams,
    ],
  },
}

export const WithLabels: Story = {
  ...createStory(withLabels),
  parameters: {
    sourceCode: [
      { name: 'Story', code: withLabelsStoryRaw },
      { name: 'create-cluster-labels', code: createClusterLabelsRaw },
      ...sourceCodeAddonParams,
    ],
  },
}

// eslint-disable-next-line import/no-default-export
export default meta
