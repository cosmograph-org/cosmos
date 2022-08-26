import regl from 'regl'
import { NumericAccessor } from '@/graph/config'
import { getValue } from '@/graph/helper'
import { GraphData } from '@/graph/modules/GraphData'
import { InputNode, Node, InputLink } from '@/graph/types'
import { defaultNodeSize } from '@/graph/variables'

export function createSizeBuffer <N extends InputNode, L extends InputLink> (
  data: GraphData<N, L>,
  reglInstance: regl.Regl,
  pointTextureSize: number,
  sizeAccessor: NumericAccessor<Node<N>>
): regl.Framebuffer2D {
  const numParticles = data.nodes.length
  const initialState = new Float32Array(pointTextureSize * pointTextureSize * 4)

  for (let i = 0; i < numParticles; ++i) {
    const sortedIndex = data.getSortedIndexByInputIndex(i)
    const node = data.nodes[i]
    if (node && sortedIndex !== undefined) {
      const size = getValue<Node<N>, number>(node, sizeAccessor)
      initialState[sortedIndex * 4] = size ?? defaultNodeSize
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
