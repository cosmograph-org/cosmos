import {Device, Framebuffer, Buffer, Texture} from '@luma.gl/core'
import {Model} from '@luma.gl/engine'
import { CoreModule } from '@/graph/modules/core-module'
import calculateLevelFrag from '@/graph/modules/ForceManyBody/calculate-level.frag'
import calculateLevelVert from '@/graph/modules/ForceManyBody/calculate-level.vert'
import forceFrag from '@/graph/modules/ForceManyBody/force-level.frag'
import forceCenterFrag from '@/graph/modules/ForceManyBody/force-centermass.frag'
import { createIndexesForBuffer, createQuadBuffer } from '@/graph/modules/Shared/buffer'
import clearFrag from '@/graph/modules/Shared/clear.frag'
import updateVert from '@/graph/modules/Shared/quad.vert'

export class ForceManyBody extends CoreModule {
  private randomValuesFbo: Framebuffer | undefined
  private levelsFbos = new Map<string, Framebuffer>()
  private clearLevelsCommand: Model | undefined
  private clearVelocityCommand: Model | undefined
  private calculateLevelsCommand: Model | undefined
  private forceCommand: Model | undefined
  private forceFromItsOwnCentermassCommand: Model | undefined
  private quadtreeLevels = 0
  private randomValuesTexture: Texture | undefined
  private pointIndices: Buffer | undefined

  public create (): void {
    const { device, store } = this
    if (!store.pointsTextureSize) return
    this.quadtreeLevels = Math.log2(store.adjustedSpaceSize)
    for (let i = 0; i < this.quadtreeLevels; i += 1) {
      const levelTextureSize = Math.pow(2, i + 1)
      if (!this.levelsFbos.has(`level[${i}]`)) {
        this.levelsFbos.set(`level[${i}]`, device.createFramebuffer())
      }
      const fbo = this.levelsFbos.get(`level[${i}]`)
      if (fbo) {
        fbo({
          shape: [levelTextureSize, levelTextureSize],
          colorType: 'float',
          depth: false,
          stencil: false,
        })
      }
    }
    // Create random number to prevent point to stick together in one coordinate
    const randomValuesState = new Float32Array(store.pointsTextureSize * store.pointsTextureSize * 4)
    for (let i = 0; i < store.pointsTextureSize * store.pointsTextureSize; ++i) {
      randomValuesState[i * 4] = store.getRandomFloat(-1, 1) * 0.00001
      randomValuesState[i * 4 + 1] = store.getRandomFloat(-1, 1) * 0.00001
    }

    if (!this.randomValuesTexture) this.randomValuesTexture = device.createTexture()
    this.randomValuesTexture({
      data: randomValuesState,
      shape: [store.pointsTextureSize, store.pointsTextureSize, 4],
      type: 'float',
    })
    if (!this.randomValuesFbo) {
      this.randomValuesFbo = device.createFramebuffer({
        color: this.randomValuesTexture,
        depth: false,
        stencil: false,
      })
    }

    if (!this.pointIndices) this.pointIndices = device.createBuffer(0)
    this.pointIndices(createIndexesForBuffer(store.pointsTextureSize))
  }

  public initPrograms (): void {
    const { device, config, store, data, points } = this
    if (!this.clearLevelsCommand) {
      this.clearLevelsCommand = new Model(device, {
        frag: clearFrag,
        vert: updateVert,
        framebuffer: (_: regl.DefaultContext, props: { levelFbo: Framebuffer }) => props.levelFbo,
        primitive: 'triangle strip',
        count: 4,
        attributes: { vertexCoord: createQuadBuffer(device) },
      })
    }
    if (!this.calculateLevelsCommand) {
      this.calculateLevelsCommand = new Model(device, {
        frag: calculateLevelFrag,
        vert: calculateLevelVert,
        framebuffer: (_: regl.DefaultContext, props: { levelFbo: Framebuffer; levelTextureSize: number; cellSize: number }) => props.levelFbo,
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
    }

    if (!this.forceCommand) {
      this.forceCommand = new Model(device, {
        frag: forceFrag,
        vert: updateVert,
        framebuffer: () => points?.velocityFbo as Framebuffer,
        primitive: 'triangle strip',
        count: 4,
        attributes: { vertexCoord: createQuadBuffer(device) },
        uniforms: {
          positionsTexture: () => points?.previousPositionFbo,
          level: (_, props: { levelFbo: Framebuffer; levelTextureSize: number; level: number }) => props.level,
          levels: this.quadtreeLevels,
          levelFbo: (_, props) => props.levelFbo,
          levelTextureSize: (_, props) => props.levelTextureSize,
          alpha: () => store.alpha,
          repulsion: () => config.simulation?.repulsion,
          spaceSize: () => store.adjustedSpaceSize,
          theta: () => config.simulation?.repulsionTheta,
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

    if (!this.forceFromItsOwnCentermassCommand) {
      this.forceFromItsOwnCentermassCommand = new Model(device, {
        frag: forceCenterFrag,
        vert: updateVert,
        framebuffer: () => points?.velocityFbo as Framebuffer,
        primitive: 'triangle strip',
        count: 4,
        attributes: { vertexCoord: createQuadBuffer(device) },
        uniforms: {
          positionsTexture: () => points?.previousPositionFbo,
          randomValues: () => this.randomValuesFbo,
          levelFbo: (_, props: { levelFbo: Framebuffer; levelTextureSize: number }) => props.levelFbo,
          levelTextureSize: (_, props) => props.levelTextureSize,
          alpha: () => store.alpha,
          repulsion: () => config.simulation?.repulsion,
          spaceSize: () => store.adjustedSpaceSize,
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

    if (!this.clearVelocityCommand) {
      this.clearVelocityCommand = new Model(device, {
        frag: clearFrag,
        vert: updateVert,
        framebuffer: () => points?.velocityFbo as Framebuffer,
        primitive: 'triangle strip',
        count: 4,
        attributes: { vertexCoord: createQuadBuffer(device) },
      })
    }
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
    this.clearVelocityCommand?.()
    for (let i = 0; i < this.quadtreeLevels; i += 1) {
      const levelTextureSize = Math.pow(2, i + 1)
      this.forceCommand?.({
        levelFbo: this.levelsFbos.get(`level[${i}]`),
        levelTextureSize,
        level: i,
      })

      if (i === this.quadtreeLevels - 1) {
        this.forceFromItsOwnCentermassCommand?.({
          levelFbo: this.levelsFbos.get(`level[${i}]`),
          levelTextureSize,
          level: i,
        })
      }
    }
  }
}
