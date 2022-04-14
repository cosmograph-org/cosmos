import regl from 'regl'
import { NumericAccessor } from '@/graph/config'
import { getValue } from '@/graph/helper'
import { InputNode, Node } from '@/graph/types'
import { defaultNodeSize } from '@/graph/variables'

export function createSizeBuffer <N extends InputNode> (
  nodes: Node<N>[],
  reglInstance: regl.Regl,
  pointTextureSize: number,
  sizeAccessor: NumericAccessor<Node<N>>
): regl.Framebuffer2D {
  const numParticles = nodes.length
  const initialState = new Float32Array(pointTextureSize * pointTextureSize * 4)

  for (let i = 0; i < numParticles; ++i) {
    const node = nodes[i]
    if (node) {
      const size = getValue<Node<N>, number>(node, sizeAccessor)
      initialState[i * 4] = size ?? defaultNodeSize
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
