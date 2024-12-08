import type { Meta, StoryObj } from '@storybook/html'

import { CosmosStoryProps, createCosmos } from './create-cosmos'
import { MeshWithHolesStory } from './experiments/mesh-with-holes'
import { FullMeshStory } from './experiments/full-mesh'

import createCosmosRaw from './create-cosmos?raw'
import generateMeshDataRaw from './generate-mesh-data?raw'
import meshWithHolesRaw from './experiments/mesh-with-holes?raw'
import fullMeshRaw from './experiments/full-mesh?raw'

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta: Meta<CosmosStoryProps> = {
  title: 'Experiments',
  render: (args) => createCosmos(args),
}

type Story = StoryObj<CosmosStoryProps>;

const sourceCodeAddonParams = [
  { name: 'create-cosmos', code: createCosmosRaw },
  { name: 'generate-mesh-data', code: generateMeshDataRaw },
]

export const FullMesh = FullMeshStory as Story
FullMesh.parameters = {
  sourceCode: [
    { name: 'Story', code: fullMeshRaw },
    ...sourceCodeAddonParams,
  ],
}
export const MeshWithHoles = MeshWithHolesStory as Story
MeshWithHoles.parameters = {
  sourceCode: [
    { name: 'Story', code: meshWithHolesRaw },
    ...sourceCodeAddonParams,
  ],
}

// eslint-disable-next-line import/no-default-export
export default meta
