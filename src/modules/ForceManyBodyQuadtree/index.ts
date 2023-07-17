import regl from 'regl'
import { CoreModule } from '@/graph/modules/core-module'
import calculateLevelFrag from '@/graph/modules/ForceManyBody/calculate-level.frag'
import calculateLevelVert from '@/graph/modules/ForceManyBody/calculate-level.vert'
import { forceFrag } from '@/graph/modules/ForceManyBody/quadtree-frag-shader'
import { createIndexesBuffer, createQuadBuffer, destroyFramebuffer } from '@/graph/modules/Shared/buffer'
import clearFrag from '@/graph/modules/Shared/clear.frag'
import updateVert from '@/graph/modules/Shared/quad.vert'
import { CosmosInputNode, CosmosInputLink } from '@/graph/types'

export class ForceManyBodyQuadtree<N extends CosmosInputNode, L extends CosmosInputLink> extends CoreModule<N, L> {
  private randomValuesFbo: regl.Framebuffer2D | undefined
  private levelsFbos = new Map<string, regl.Framebuffer2D>()
  private clearLevelsCommand: regl.DrawCommand | undefined
  private calculateLevelsCommand: regl.DrawCommand | undefined
  private quadtreeCommand: regl.DrawCommand | undefined
  private quadtreeLevels = 0

  public create (): void {
    const { reglInstance, store } = this
    if (!store.pointsTextureSize) return
    this.quadtreeLevels = Math.log2(store.adjustedSpaceSize)
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
      randomValuesState[i * 4] = store.getRandomFloat(-1, 1) * 0.00001
      randomValuesState[i * 4 + 1] = store.getRandomFloat(-1, 1) * 0.00001
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
      vert: calculateLevelVert,
      framebuffer: (_: regl.DefaultContext, props: { levelFbo: regl.Framebuffer2D; levelTextureSize: number; cellSize: number }) => props.levelFbo,
      primitive: 'points',
      count: () => data.nodes.length,
      attributes: { indexes: createIndexesBuffer(reglInstance, store.pointsTextureSize) },
      uniforms: {
        position: () => points?.previousPositionFbo,
        pointsTextureSize: () => store.pointsTextureSize,
        levelTextureSize: (_: regl.DefaultContext, props: { levelTextureSize: number }) => props.levelTextureSize,
        cellSize: (_: regl.DefaultContext, props: { cellSize: number }) => props.cellSize,
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
        spaceSize: () => store.adjustedSpaceSize,
        repulsion: () => config.simulation?.repulsion,
        theta: () => config.simulation?.repulsionTheta,
        alpha: () => store.alpha,
        ...Object.fromEntries(this.levelsFbos),
      },
    })
  }

  public run (): void {
    const { store } = this
    for (let i = 0; i < this.quadtreeLevels; i += 1) {
      this.clearLevelsCommand?.({ levelFbo: this.levelsFbos.get(`level[${i}]`) })
      const levelTextureSize = Math.pow(2, i + 1)
      const cellSize = store.adjustedSpaceSize / levelTextureSize
      this.calculateLevelsCommand?.({
        levelFbo: this.levelsFbos.get(`level[${i}]`),
        levelTextureSize,
        cellSize,
      })
    }
    this.quadtreeCommand?.()
  }

  public destroy (): void {
    destroyFramebuffer(this.randomValuesFbo)
    this.levelsFbos.forEach(fbo => {
      destroyFramebuffer(fbo)
    })
    this.levelsFbos.clear()
  }
}
