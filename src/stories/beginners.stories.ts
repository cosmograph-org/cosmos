import type { Meta } from '@storybook/html'

import { createStory, Story } from '@/graph/stories/create-story'
import { CosmosStoryProps } from './create-cosmos'
import { QuickStartStory } from './beginners/quick-start'
import { BasicSetUpStory } from './beginners/basic-set-up'

import quickStartStoryRaw from './beginners/quick-start?raw'
import basicSetUpStoryRaw from './beginners/basic-set-up/index?raw'
import basicSetUpStoryCssRaw from './beginners/basic-set-up/style.css?raw'
import basicSetUpStoryDataGenRaw from './beginners/basic-set-up/data-gen?raw'

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta: Meta<CosmosStoryProps> = {
  title: 'Examples/Beginners',
}

export const QuickStart: Story = {
  ...createStory(QuickStartStory),
  parameters: {
    sourceCode: [
      { name: 'Story', code: quickStartStoryRaw },
    ],
  },
}

export const BasicSetUp: Story = {
  ...createStory(BasicSetUpStory),
  name: '100x100 grid',
  parameters: {
    sourceCode: [
      { name: 'Story', code: basicSetUpStoryRaw },
      { name: 'style.css', code: basicSetUpStoryCssRaw },
      { name: 'data-gen', code: basicSetUpStoryDataGenRaw },
    ],
  },
}

// eslint-disable-next-line import/no-default-export
export default meta
