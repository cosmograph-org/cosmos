import regl from 'regl'
import { CoreModule } from '@/graph/modules/core-module'
import calculateCentermassFrag from '@/graph/modules/ForceCenter/calculate-centermass.frag'
import calculateCentermassVert from '@/graph/modules/ForceCenter/calculate-centermass.vert'
import forceFrag from '@/graph/modules/ForceCenter/force-center.frag'
import { createIndexesBuffer, createQuadBuffer, destroyFramebuffer } from '@/graph/modules/Shared/buffer'
import clearFrag from '@/graph/modules/Shared/clear.frag'
import updateVert from '@/graph/modules/Shared/quad.vert'
import { CosmosInputNode, CosmosInputLink } from '@/graph/types'

export class ForceCenter<N extends CosmosInputNode, L extends CosmosInputLink> extends CoreModule<N, L> {
  private centermassFbo: regl.Framebuffer2D | undefined
  private clearCentermassCommand: regl.DrawCommand | undefined
  private calculateCentermassCommand: regl.DrawCommand | undefined
  private runCommand: regl.DrawCommand | undefined

  public create (): void {
    const { reglInstance } = this
    this.centermassFbo = reglInstance.framebuffer({
      color: reglInstance.texture({
        data: new Float32Array(4).fill(0),
        shape: [1, 1, 4],
        type: 'float',
      }),
      depth: false,
      stencil: false,
    })
  }

  public initPrograms (): void {
    const { reglInstance, config, store, data, points } = this
    this.clearCentermassCommand = reglInstance({
      frag: clearFrag,
      vert: updateVert,
      framebuffer: this.centermassFbo,
      primitive: 'triangle strip',
      count: 4,
      attributes: { quad: createQuadBuffer(reglInstance) },
    })
    this.calculateCentermassCommand = reglInstance({
      frag: calculateCentermassFrag,
      vert: calculateCentermassVert,
      framebuffer: () => this.centermassFbo as regl.Framebuffer2D,
      primitive: 'points',
      count: () => data.nodes.length,
      attributes: { indexes: createIndexesBuffer(reglInstance, store.pointsTextureSize) },
      uniforms: {
        position: () => points?.previousPositionFbo,
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
    this.runCommand = reglInstance({
      frag: forceFrag,
      vert: updateVert,
      framebuffer: () => points?.velocityFbo as regl.Framebuffer2D,
      primitive: 'triangle strip',
      count: 4,
      attributes: { quad: createQuadBuffer(reglInstance) },
      uniforms: {
        position: () => points?.previousPositionFbo,
        centermass: () => this.centermassFbo,
        center: () => config.simulation?.center,
        alpha: () => store.alpha,
      },
    })
  }

  public run (): void {
    this.clearCentermassCommand?.()
    this.calculateCentermassCommand?.()
    this.runCommand?.()
  }

  public destroy (): void {
    destroyFramebuffer(this.centermassFbo)
  }
}
