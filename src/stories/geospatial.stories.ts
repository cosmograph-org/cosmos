import type { Meta } from '@storybook/html'

import { createStory, Story } from '@/graph/stories/create-story'
import { CosmosStoryProps } from './create-cosmos'
import { moscowMetroStations } from './geospatial/moscow-metro-stations'

import moscowMetroStationsStoryRaw from './geospatial/moscow-metro-stations/index?raw'
import dataRaw from './geospatial/moscow-metro-stations/moscow-metro-coords?raw'
import pointColorsRaw from './geospatial/moscow-metro-stations/point-colors?raw'
import styleRaw from './geospatial/moscow-metro-stations/style.css?raw'

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta: Meta<CosmosStoryProps> = {
  title: 'Examples/Geospatial',
}

export const MoscowMetroStations: Story = {
  ...createStory(moscowMetroStations),
  parameters: {
    sourceCode: [
      { name: 'Story', code: moscowMetroStationsStoryRaw },
      { name: 'moscow-metro-coords', code: dataRaw },
      { name: 'point-colors', code: pointColorsRaw },
      { name: 'style.css', code: styleRaw },
    ],
  },
}

// eslint-disable-next-line import/no-default-export
export default meta
