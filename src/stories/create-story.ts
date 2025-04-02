import { Graph } from '@cosmograph/cosmos'
import type { StoryObj } from '@storybook/html'
import { CosmosStoryProps } from '@/graph/stories/create-cosmos'

export type Story = StoryObj<CosmosStoryProps & { graph: Graph; destroy?: () => void }>;

export const createStory: (storyFunction: () => {
  graph: Graph;
  div: HTMLDivElement;
  destroy?: () => void;
}) => Story = (storyFunction) => ({
  async beforeEach (d): Promise<() => void> {
    return (): void => {
      d.args.destroy?.()
      d.args.graph?.destroy()
    }
  },
  render: (args): HTMLDivElement => {
    const story = storyFunction()
    args.graph = story.graph
    args.destroy = story.destroy
    return story.div
  },
})
