import regl from 'regl'
// import { ColorAccessor } from '@/graph/config'
// import { getValue, getRgbaColor } from '@/graph/helper'
// import { CosmosInputNode, CosmosInputLink } from '@/graph/types'
// import { GraphData } from '@/graph/modules/GraphData'
import { GraphDataLow } from '@/graph/modules/GraphDataLow'
// import { defaultNodeColor } from '@/graph/variables'

export function createColorBuffer (
  data: GraphDataLow,
  reglInstance: regl.Regl,
  textureSize: number
  // colorAccessor: ColorAccessor<N>
): regl.Framebuffer2D | undefined {
  if (textureSize === 0) return undefined

  // Fill texture with zero if there are less nodes than texture size
  const delta = textureSize * textureSize * 4 - data.nodesNumber * 4
  for (let i = 0; i < delta; i += 1) {
    data.nodeColors?.push(0)
  }

  const initialTexture = reglInstance.texture({
    data: data.nodeColors,
    width: textureSize,
    height: textureSize,
    type: 'float',
  })

  return reglInstance.framebuffer({
    color: initialTexture,
    depth: false,
    stencil: false,
  })
}

export function createGreyoutStatusBuffer (
  selectedIndices: Float32Array | null,
  reglInstance: regl.Regl,
  textureSize: number
): regl.Framebuffer2D | undefined {
  if (textureSize === 0) return undefined
  // Greyout status: 0 - false, highlighted or normal point; 1 - true, greyout point
  const initialState = new Float32Array(textureSize * textureSize * 4)
    .fill(selectedIndices ? 1 : 0)

  if (selectedIndices) {
    for (const selectedIndex of selectedIndices) {
      initialState[selectedIndex * 4] = 0
    }
  }

  const initialTexture = reglInstance.texture({
    data: initialState,
    width: textureSize,
    height: textureSize,
    type: 'float',
  })

  return reglInstance.framebuffer({
    color: initialTexture,
    depth: false,
    stencil: false,
  })
}
