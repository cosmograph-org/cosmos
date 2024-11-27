import {Framebuffer} from '@luma.gl/core'
import {Model} from '@luma.gl/engine'
import { CoreModule } from '@/graph/modules/core-module'
import calculateCentermassFrag from '@/graph/modules/ForceCenter/calculate-centermass.frag'
import calculateCentermassVert from '@/graph/modules/ForceCenter/calculate-centermass.vert'
import forceFrag from '@/graph/modules/ForceCenter/force-center.frag'
import { createQuadBuffer, createIndexesForBuffer } from '@/graph/modules/Shared/buffer'
import clearFrag from '@/graph/modules/Shared/clear.frag'
import updateVert from '@/graph/modules/Shared/quad.vert'

export class ForceCenter extends CoreModule {
  private centermassFbo: Framebuffer | undefined
  private clearCentermassCommand: Model | undefined
  private calculateCentermassCommand: Model | undefined
  private runCommand: Model | undefined
  private centermassTexture: Texture | undefined
  private pointIndices: Buffer | undefined

  public create (): void {
    const { device, store } = this
    if (!this.centermassTexture) this.centermassTexture = device.createTexture()
    this.centermassTexture({
      data: new Float32Array(4).fill(0),
      shape: [1, 1, 4],
      type: 'float',
    })
    if (!this.centermassFbo) {
      this.centermassFbo = device.createFramebuffer({
        color: this.centermassTexture,
        depth: false,
        stencil: false,
      })
    }

    if (!this.pointIndices) this.pointIndices = device.buffer(0)
    this.pointIndices(createIndexesForBuffer(store.pointsTextureSize))
  }

  public initPrograms (): void {
    const { device, config, store, data, points } = this
    if (!this.clearCentermassCommand) {
      this.clearCentermassCommand = new Model(device, {
        frag: clearFrag,
        vert: updateVert,
        framebuffer: () => this.centermassFbo as Framebuffer,
        primitive: 'triangle strip',
        count: 4,
        attributes: { vertexCoord: createQuadBuffer(device) },
      })
    }
    if (!this.calculateCentermassCommand) {
      this.calculateCentermassCommand = new Model(device, {
        frag: calculateCentermassFrag,
        vert: calculateCentermassVert,
        framebuffer: () => this.centermassFbo as Framebuffer,
        primitive: 'points',
        count: () => data.pointsNumber ?? 0,
        attributes: {
          pointIndices: {
            buffer: this.pointIndices,
            size: 2,
          },
        },
        uniforms: {
          positionsTexture: () => points?.previousPositionFbo,
          pointsTextureSize: () => store.pointsTextureSize,
        },
        blend: {
          enable: true,
          func: {
            src: 'one',
            dst: 'one',
          },
          equation: {
            rgb: 'add',
            alpha: 'add',
          },
        },
        depth: { enable: false, mask: false },
        stencil: { enable: false },
      })
    }
    if (!this.runCommand) {
      this.runCommand = device({
        frag: forceFrag,
        vert: updateVert,
        framebuffer: () => points?.velocityFbo as Framebuffer,
        primitive: 'triangle strip',
        count: 4,
        attributes: { vertexCoord: createQuadBuffer(device) },
        uniforms: {
          positionsTexture: () => points?.previousPositionFbo,
          centermassTexture: () => this.centermassFbo,
          centerForce: () => config.simulation?.center,
          alpha: () => store.alpha,
        },
      })
    }
  }

  public run (): void {
    this.clearCentermassCommand?.()
    this.calculateCentermassCommand?.()
    this.runCommand?.()
  }
}
