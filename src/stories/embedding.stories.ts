import type { Meta } from '@storybook/html'

import { createStory, Story } from '@/graph/stories/create-story'
import { CosmosStoryProps } from './create-cosmos'
import { EmbeddingStory } from './embedding/embedding'

import createCosmosRaw from './create-cosmos?raw'
import embeddingStoryRaw from './embedding/embedding?raw'
import dataRaw from './embedding/data?raw'

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta: Meta<CosmosStoryProps> = {
  title: 'Examples/Embedding',
}

const sourceCodeAddonParams = [
  { name: 'create-cosmos', code: createCosmosRaw },
]

export const Embedding: Story = {
  ...createStory(EmbeddingStory),
  parameters: {
    sourceCode: [
      { name: 'Story', code: embeddingStoryRaw },
      { name: 'data', code: dataRaw },
      ...sourceCodeAddonParams,
    ],
  },
}

// eslint-disable-next-line import/no-default-export
export default meta
