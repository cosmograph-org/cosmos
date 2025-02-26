import type { Meta } from '@storybook/html'

import { createStory, Story } from '@/graph/stories/create-story'
import { CosmosStoryProps } from './create-cosmos'
import { QuickStartStory } from './beginners/quick-start'
import { BasicSetUpStory } from './beginners/basic-set-up'
import { PointLabelsStory } from './beginners/point-labels'
import { AddRemovePoints } from './beginners/add-remove-points'

import quickStartStoryRaw from './beginners/quick-start?raw'
import basicSetUpStoryRaw from './beginners/basic-set-up/index?raw'
import basicSetUpStoryCssRaw from './beginners/basic-set-up/style.css?raw'
import basicSetUpStoryDataGenRaw from './beginners/basic-set-up/data-gen?raw'
import pointLabelsStoryRaw from './beginners/point-labels/index?raw'
import pointLabelsStoryDataRaw from './beginners/point-labels/data.ts?raw'
import pointLabelsStoryLabelsRaw from './beginners/point-labels/labels.ts?raw'
import pointLabelsStoryCssRaw from './beginners/point-labels/style.css?raw'
import addRemovePointsStoryRaw from './beginners/add-remove-points/index?raw'
import addRemovePointsStoryCssRaw from './beginners/add-remove-points/style.css?raw'
import addRemovePointsStoryConfigRaw from './beginners/add-remove-points/config.ts?raw'
import addRemovePointsStoryDataGenRaw from './beginners/add-remove-points/data-gen.ts?raw'

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

export const PointLabels: Story = {
  name: 'Point Labels',
  loaders: [
    async (): Promise<{ data: Response | { performances: [] } }> => {
      try {
        const response = await fetch('https://gist.githubusercontent.com/Stukova/e6c4c7777e0166431a983999213f10c8/raw/performances.json')
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }
        return {
          data: await response.json(),
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
        return {
          data: { performances: [] },
        }
      }
    },
  ],
  async beforeEach (d): Promise<() => void> {
    return (): void => {
      d.args.graph?.destroy()
    }
  },
  render: (args, { loaded: { data } }) => {
    const story = PointLabelsStory(data.performances)
    args.graph = story.graph
    return story.div
  },
  parameters: {
    sourceCode: [
      { name: 'Story', code: pointLabelsStoryRaw },
      { name: 'data.ts', code: pointLabelsStoryDataRaw },
      { name: 'labels.ts', code: pointLabelsStoryLabelsRaw },
      { name: 'style.css', code: pointLabelsStoryCssRaw },
    ],
  },
}

export const AddRemovePointsStory: Story = {
  ...createStory(AddRemovePoints),
  name: 'Add / Remove Points',
  parameters: {
    sourceCode: [
      { name: 'Story', code: addRemovePointsStoryRaw },
      { name: 'config.ts', code: addRemovePointsStoryConfigRaw },
      { name: 'data-gen.ts', code: addRemovePointsStoryDataGenRaw },
      { name: 'style.css', code: addRemovePointsStoryCssRaw },
    ],
  },
}
// eslint-disable-next-line import/no-default-export
export default meta
