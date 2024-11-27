import {Framebuffer} from '@luma.gl/core'
import { Model } from '@luma.gl/engine'
import { CoreModule } from '@/graph/modules/core-module'
import forceFrag from '@/graph/modules/ForceGravity/force-gravity.frag'
import { createQuadBuffer } from '@/graph/modules/Shared/buffer'
import updateVert from '@/graph/modules/Shared/quad.vert'

export class ForceGravity extends CoreModule {
  private runCommand: Model | undefined

  public initPrograms (): void {
    const { device, config, store, points } = this
    if (!this.runCommand) {
      this.runCommand = new Model(device, {
        frag: forceFrag,
        vert: updateVert,
        framebuffer: () => points?.velocityFbo as Framebuffer,
        primitive: 'triangle strip',
        count: 4,
        attributes: { vertexCoord: createQuadBuffer(device) },
        uniforms: {
          positionsTexture: () => points?.previousPositionFbo,
          gravity: () => config.simulation?.gravity,
          spaceSize: () => store.adjustedSpaceSize,
          alpha: () => store.alpha,
        },
      })
    }
  }

  public run (): void {
    this.runCommand?.()
  }
}
