import type { Meta } from '@storybook/html'

import { createStory, Story } from '@/graph/stories/create-story'
import { CosmosStoryProps } from './create-cosmos'
import { moscowMetro } from './embeddings/moscow-metro'

import embeddingStoryRaw from './embeddings/moscow-metro/index?raw'
import dataRaw from './embeddings/moscow-metro/moscow-metro-coords?raw'
import pointColorsRaw from './embeddings/moscow-metro/point-colors?raw'
import styleRaw from './embeddings/moscow-metro/style.css?raw'

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta: Meta<CosmosStoryProps> = {
  title: 'Examples/Embeddings',
}

export const MoscowMetro: Story = {
  ...createStory(moscowMetro),
  parameters: {
    sourceCode: [
      { name: 'Story', code: embeddingStoryRaw },
      { name: 'moscow-metro-coords', code: dataRaw },
      { name: 'point-colors', code: pointColorsRaw },
      { name: 'style.css', code: styleRaw },
    ],
  },
}

// eslint-disable-next-line import/no-default-export
export default meta
