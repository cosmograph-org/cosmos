import regl from 'regl'

export function createQuadBuffer (reglInstance: regl.Regl): { buffer: regl.Buffer; size: number } {
  const quadBuffer = reglInstance.buffer(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]))
  return {
    buffer: quadBuffer,
    size: 2,
  }
}

export function createIndexesBuffer (reglInstance: regl.Regl, textureSize: number): { buffer: regl.Buffer; size: number } {
  const indexes = new Float32Array(textureSize * textureSize * 2)
  for (let y = 0; y < textureSize; y++) {
    for (let x = 0; x < textureSize; x++) {
      const i = y * textureSize * 2 + x * 2
      indexes[i + 0] = x
      indexes[i + 1] = y
    }
  }
  const indexBuffer = reglInstance.buffer(indexes)
  return {
    buffer: indexBuffer,
    size: 2,
  }
}
