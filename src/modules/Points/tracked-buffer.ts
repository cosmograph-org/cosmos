import regl from 'regl'

export function createTrackedPositionsBuffer (
  indices: number[],
  reglInstance: regl.Regl
): regl.Framebuffer2D {
  const size = Math.ceil(Math.sqrt(indices.length))

  return reglInstance.framebuffer({
    shape: [size, size],
    depth: false,
    stencil: false,
    colorType: 'float',
  })
}

export function createTrackedIndicesBuffer (
  indices: number[],
  pointsTextureSize: number,
  reglInstance: regl.Regl
): regl.Framebuffer2D {
  const size = Math.ceil(Math.sqrt(indices.length))
  const initialState = new Float32Array(size * size * 4).fill(-1)

  for (const [i, sortedIndex] of indices.entries()) {
    if (sortedIndex !== undefined) {
      initialState[i * 4] = sortedIndex % pointsTextureSize
      initialState[i * 4 + 1] = Math.floor(sortedIndex / pointsTextureSize)
      initialState[i * 4 + 2] = 0
      initialState[i * 4 + 3] = 0
    }
  }

  const initialTexture = reglInstance.texture({
    data: initialState,
    width: size,
    height: size,
    type: 'float',
  })

  return reglInstance.framebuffer({
    color: initialTexture,
    depth: false,
    stencil: false,
  })
}
