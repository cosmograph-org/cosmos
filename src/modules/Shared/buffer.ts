import {Device, Buffer, Framebuffer} from '@luma.gl/core'

export function createQuadBuffer (device: Device): { buffer: Buffer; size: number } {
  const quadBuffer = device.createBuffer(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]))
  return {
    buffer: quadBuffer,
    size: 2,
  }
}

export function createIndexesForBuffer (textureSize: number): Float32Array {
  const indexes = new Float32Array(textureSize * textureSize * 2)
  for (let y = 0; y < textureSize; y++) {
    for (let x = 0; x < textureSize; x++) {
      const i = y * textureSize * 2 + x * 2
      indexes[i + 0] = x
      indexes[i + 1] = y
    }
  }
  return indexes
}

export function destroyFramebuffer (fbo?: Framebuffer): void {
  if (!fbo) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((fbo as any)?._framebuffer?.framebuffer) {
    fbo.destroy()
  }
}

export function destroyBuffer (fbo?: Buffer): void {
  if (!fbo) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((fbo as any)?._buffer?.buffer) {
    fbo.destroy()
  }
}
