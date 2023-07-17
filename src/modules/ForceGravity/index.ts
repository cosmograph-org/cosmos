import regl from 'regl'
import { CoreModule } from '@/graph/modules/core-module'
import forceFrag from '@/graph/modules/ForceGravity/force-gravity.frag'
import { createQuadBuffer } from '@/graph/modules/Shared/buffer'
import updateVert from '@/graph/modules/Shared/quad.vert'
import { CosmosInputNode, CosmosInputLink } from '@/graph/types'

export class ForceGravity<N extends CosmosInputNode, L extends CosmosInputLink> extends CoreModule<N, L> {
  private runCommand: regl.DrawCommand | undefined

  public initPrograms (): void {
    const { reglInstance, config, store, points } = this
    this.runCommand = reglInstance({
      frag: forceFrag,
      vert: updateVert,
      framebuffer: () => points?.velocityFbo as regl.Framebuffer2D,
      primitive: 'triangle strip',
      count: 4,
      attributes: { quad: createQuadBuffer(reglInstance) },
      uniforms: {
        position: () => points?.previousPositionFbo,
        gravity: () => config.simulation?.gravity,
        spaceSize: () => store.adjustedSpaceSize,
        alpha: () => store.alpha,
      },
    })
  }

  public run (): void {
    this.runCommand?.()
  }
}
