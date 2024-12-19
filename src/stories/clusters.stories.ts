import type { Meta, StoryObj } from '@storybook/html'
import { CosmosStoryProps } from '@/graph/stories/create-cosmos'
import { WithLabelsStory } from './clusters/with-labels'
import { WormStory } from './clusters/worm'
import { RadialStory } from './clusters/radial'

import createCosmosRaw from './create-cosmos?raw'
import generateMeshDataRaw from './generate-mesh-data?raw'
import withLabelsStory from './clusters/with-labels?raw'
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

type Story = StoryObj<CosmosStoryProps>;

const sourceCodeAddonParams = [
  { name: 'create-cosmos', code: createCosmosRaw },
  { name: 'generate-mesh-data', code: generateMeshDataRaw },
]

export const Worm = WormStory as Story
Worm.parameters = {
  sourceCode: [
    { name: 'Story', code: wormStory },
    ...sourceCodeAddonParams,
  ],
}

export const Radial = RadialStory as Story
Radial.parameters = {
  sourceCode: [
    { name: 'Story', code: radialStory },
    ...sourceCodeAddonParams,
  ],
}

export const WithLabels = WithLabelsStory as Story
WithLabels.parameters = {
  sourceCode: [
    { name: 'Story', code: withLabelsStory },
    ...sourceCodeAddonParams,
  ],
}

// eslint-disable-next-line import/no-default-export
export default meta
