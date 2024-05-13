import regl from 'regl'

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
