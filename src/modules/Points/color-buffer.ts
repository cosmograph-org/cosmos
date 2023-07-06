import regl from 'regl'
import { ColorAccessor } from '@/graph/config'
import { getValue, getRgbaColor } from '@/graph/helper'
import { CosmosInputNode, CosmosInputLink } from '@/graph/types'
import { GraphData } from '@/graph/modules/GraphData'
import { defaultNodeColor } from '@/graph/variables'

export function createColorBuffer <N extends CosmosInputNode, L extends CosmosInputLink> (
  data: GraphData<N, L>,
  reglInstance: regl.Regl,
  textureSize: number,
  colorAccessor: ColorAccessor<N>
): regl.Framebuffer2D | undefined {
  if (textureSize === 0) return undefined
  const initialState = new Float32Array(textureSize * textureSize * 4)

  for (let i = 0; i < data.nodes.length; ++i) {
    const sortedIndex = data.getSortedIndexByInputIndex(i)
    const node = data.nodes[i]
    if (node && sortedIndex !== undefined) {
      const c = getValue<N, string | [number, number, number, number]>(node, colorAccessor, i) ?? defaultNodeColor
      const rgba = getRgbaColor(c)
      initialState[sortedIndex * 4 + 0] = rgba[0]
      initialState[sortedIndex * 4 + 1] = rgba[1]
      initialState[sortedIndex * 4 + 2] = rgba[2]
      initialState[sortedIndex * 4 + 3] = rgba[3]
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
