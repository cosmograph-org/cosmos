import regl from 'regl'
import { NumericAccessor } from '@/graph/config'
import { getValue } from '@/graph/helper'
import { GraphData } from '@/graph/modules/GraphData'
import { CosmosInputNode, CosmosInputLink } from '@/graph/types'
import { defaultNodeSize } from '@/graph/variables'

export function getNodeSize<N extends CosmosInputNode> (
  node: N,
  sizeAccessor: NumericAccessor<N>,
  index?: number
): number {
  const size = getValue<N, number>(node, sizeAccessor, index)
  return size ?? defaultNodeSize
}

export function createSizeBufferAndFillSizeStore <N extends CosmosInputNode, L extends CosmosInputLink> (
  data: GraphData<N, L>,
  reglInstance: regl.Regl,
  pointTextureSize: number,
  sizeAccessor: NumericAccessor<N>,
  sizeStore: Float32Array
): regl.Framebuffer2D | undefined {
  if (pointTextureSize === 0) return undefined
  const numParticles = data.nodes.length
  const initialState = new Float32Array(pointTextureSize * pointTextureSize * 4)

  for (let i = 0; i < numParticles; ++i) {
    const sortedIndex = data.getSortedIndexByInputIndex(i)
    const node = data.nodes[i]
    if (node && sortedIndex !== undefined) {
      const nodeSize = getNodeSize(node, sizeAccessor, i)
      initialState[sortedIndex * 4] = nodeSize
      sizeStore[i] = nodeSize
    }
  }

  const initialTexture = reglInstance.texture({
    data: initialState,
    width: pointTextureSize,
    height: pointTextureSize,
    type: 'float',
  })

  return reglInstance.framebuffer({
    color: initialTexture,
    depth: false,
    stencil: false,
  })
}
