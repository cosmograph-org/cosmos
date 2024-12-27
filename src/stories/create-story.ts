import { Graph } from '@cosmograph/cosmos'
import type { StoryObj } from '@storybook/html'
import { CosmosStoryProps } from '@/graph/stories/create-cosmos'

export type Story = StoryObj<CosmosStoryProps & { graph: Graph }>;

export const createStory: (storyFunction: () => {
  graph: Graph;
  div: HTMLDivElement;
}) => Story = (storyFunction) => ({
  async beforeEach (d): Promise<() => void> {
    return (): void => {
      d.args.graph?.destroy()
    }
  },
  render: (args): HTMLDivElement => {
    const story = storyFunction()
    args.graph = story.graph
    return story.div
  },
})
