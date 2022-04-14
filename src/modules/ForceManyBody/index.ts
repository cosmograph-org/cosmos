import regl from 'regl'
import { CoreModule } from '@/graph/modules/core-module'
import { calculateLevelVert } from '@/graph/modules/ForceManyBody/calculate-level'
import calculateLevelFrag from '@/graph/modules/ForceManyBody/calculate-level.frag'
import { forceFrag } from '@/graph/modules/ForceManyBody/quadtree-frag-shader'
import { createIndexesBuffer, createQuadBuffer } from '@/graph/modules/Shared/buffer'
import clearFrag from '@/graph/modules/Shared/clear.frag'
import updateVert from '@/graph/modules/Shared/quad.vert'
import { defaultConfigValues } from '@/graph/variables'
import { InputNode, InputLink } from '@/graph/types'
import { getRandomValue } from '@/graph/helper'

export class ForceManyBody<N extends InputNode, L extends InputLink> extends CoreModule<N, L> {
  private randomValuesFbo: regl.Framebuffer2D | undefined
  private levelsFbos = new Map<string, regl.Framebuffer2D>()
  private clearLevelsCommand: regl.DrawCommand | undefined
  private calculateLevelsCommand: regl.DrawCommand | undefined
  private quadtreeCommand: regl.DrawCommand | undefined
  private quadtreeLevels = 0

  public create (): void {
    const { reglInstance, config, store } = this
    this.quadtreeLevels = Math.log2(config.spaceSize ?? defaultConfigValues.spaceSize)
    for (let i = 0; i < this.quadtreeLevels; i += 1) {
      const levelTextureSize = Math.pow(2, i + 1)

      this.levelsFbos.set(`level[${i}]`, reglInstance.framebuffer({
        color: reglInstance.texture({
          data: new Float32Array(levelTextureSize * levelTextureSize * 4),
          shape: [levelTextureSize, levelTextureSize, 4],
          type: 'float',
        }),
        depth: false,
        stencil: false,
      })
      )
    }
    // Create random number to prevent point to stick together in one coordinate
    const randomValuesState = new Float32Array(store.pointsTextureSize * store.pointsTextureSize * 4)
    for (let i = 0; i < store.pointsTextureSize * store.pointsTextureSize; ++i) {
      randomValuesState[i * 4] = getRandomValue(-1, 1) * 0.00001
      randomValuesState[i * 4 + 1] = getRandomValue(-1, 1) * 0.00001
    }

    this.randomValuesFbo = reglInstance.framebuffer({
      color: reglInstance.texture({
        data: randomValuesState,
        shape: [store.pointsTextureSize, store.pointsTextureSize, 4],
        type: 'float',
      }),
      depth: false,
      stencil: false,
    })
  }

  public initPrograms (): void {
    const { reglInstance, config, store, data, points } = this
    this.clearLevelsCommand = reglInstance({
      frag: clearFrag,
      vert: updateVert,
      framebuffer: (_: regl.DefaultContext, props: { levelFbo: regl.Framebuffer2D }) => props.levelFbo,
      primitive: 'triangle strip',
      count: 4,
      attributes: { quad: createQuadBuffer(reglInstance) },
    })
    this.calculateLevelsCommand = reglInstance({
      frag: calculateLevelFrag,
      vert: (
        _: regl.DefaultContext,
        props: { levelFbo: regl.Framebuffer2D; matrixSize: number; levelSize: number }
      ) => calculateLevelVert(props.matrixSize, props.levelSize),
      framebuffer: (_: regl.DefaultContext, props: { levelFbo: regl.Framebuffer2D }) => props.levelFbo,
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
    this.quadtreeCommand = reglInstance({
      frag: forceFrag(config.simulation?.repulsionQuadtreeLevels ?? this.quadtreeLevels, this.quadtreeLevels),
      vert: updateVert,
      framebuffer: () => points?.velocityFbo as regl.Framebuffer2D,
      primitive: 'triangle strip',
      count: 4,
      attributes: { quad: createQuadBuffer(reglInstance) },
      uniforms: {
        position: () => points?.previousPositionFbo,
        randomValues: () => this.randomValuesFbo,
        spaceSize: () => config.spaceSize,
        repulsion: () => config.simulation?.repulsion,
        theta: () => config.simulation?.repulsionTheta,
        alpha: () => store.alpha,
        ...Object.fromEntries(this.levelsFbos),
      },
    })
  }

  public run (): void {
    const { config } = this
    for (let i = 0; i < this.quadtreeLevels; i += 1) {
      this.clearLevelsCommand?.({ levelFbo: this.levelsFbos.get(`level[${i}]`) })
      this.calculateLevelsCommand?.({
        levelFbo: this.levelsFbos.get(`level[${i}]`),
        matrixSize: Math.pow(2, i + 1),
        levelSize: (config.spaceSize ?? defaultConfigValues.spaceSize) / Math.pow(2, i + 1),
      })
    }
    this.quadtreeCommand?.()
  }

  public destroy (): void {
    this.randomValuesFbo?.destroy()
    this.levelsFbos.forEach(fbo => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((fbo as any)?._framebuffer.framebuffer) {
        fbo.destroy()
      }
    })
    this.levelsFbos.clear()
  }
}
