import {Device, Framebuffer, Buffer, Texture} from '@luma.gl/core'
import {Model} from '@luma.gl/engine'
import { CoreModule } from '@/graph/modules/core-module'
import calculateCentermassFrag from '@/graph/modules/Clusters/calculate-centermass.frag'
import calculateCentermassVert from '@/graph/modules/Clusters/calculate-centermass.vert'
import forceFrag from '@/graph/modules/Clusters/force-cluster.frag'
import { createQuadBuffer, createIndexesForBuffer } from '@/graph/modules/Shared/buffer'
import clearFrag from '@/graph/modules/Shared/clear.frag'
import updateVert from '@/graph/modules/Shared/quad.vert'

export class Clusters extends CoreModule {
  private clusterFbo: Framebuffer | undefined
  private clusterPositionsFbo: Framebuffer | undefined
  private centermassFbo: Framebuffer | undefined
  private clearCentermassCommand: Model | undefined
  private calculateCentermassCommand: Model | undefined
  private applyForcesCommand: Model | undefined
  private clusterTexture: Texture | undefined
  private clusterPositionsTexture: Texture | undefined
  private centermassTexture: Texture | undefined
  private pointIndices: Buffer | undefined
  private clustersTextureSize: number | undefined

  public create (): void {
    const { device, store, data } = this
    const { pointsTextureSize } = store
    if (data.pointsNumber === undefined || (!data.pointClusters && !data.clusterPositions)) return

    // Find the highest cluster index in the array and add 1 (since cluster indices start at 0).
    const clusterNumber = (data.pointClusters ?? []).reduce<number>((max, clusterIndex) => {
      if (clusterIndex === undefined) return max
      return Math.max(max, clusterIndex)
    }, 0) + 1

    this.clustersTextureSize = Math.ceil(Math.sqrt(clusterNumber))

    if (!this.clusterTexture) this.clusterTexture = device.createTexture()

    if (!this.clusterPositionsTexture) this.clusterPositionsTexture = device.createTexture()
    const clusterState = new Float32Array(pointsTextureSize * pointsTextureSize * 4)
    const clusterPositions = new Float32Array(this.clustersTextureSize * this.clustersTextureSize * 4).fill(-1)
    if (data.clusterPositions) {
      for (let cluster = 0; cluster < clusterNumber; ++cluster) {
        clusterPositions[cluster * 4 + 0] = data.clusterPositions[cluster * 2 + 0] ?? -1
        clusterPositions[cluster * 4 + 1] = data.clusterPositions[cluster * 2 + 1] ?? -1
      }
    }

    for (let i = 0; i < data.pointsNumber; ++i) {
      const clusterIndex = data.pointClusters?.[i]
      if (clusterIndex === undefined) {
        // no cluster, so no forces
        clusterState[i * 4 + 0] = -1
        clusterState[i * 4 + 1] = -1
      } else {
        clusterState[i * 4 + 0] = clusterIndex % this.clustersTextureSize
        clusterState[i * 4 + 1] = Math.floor(clusterIndex / this.clustersTextureSize)
      }
    }
    this.clusterTexture({
      data: clusterState,
      shape: [pointsTextureSize, pointsTextureSize, 4],
      type: 'float',
    })
    if (!this.clusterFbo) {
      this.clusterFbo = device.createFramebuffer({
        color: this.clusterTexture,
        depth: false,
        stencil: false,
      })
    }

    this.clusterPositionsTexture({
      data: clusterPositions,
      shape: [this.clustersTextureSize, this.clustersTextureSize, 4],
      type: 'float',
    })
    if (!this.clusterPositionsFbo) {
      this.clusterPositionsFbo = device.createFramebuffer({
        color: this.clusterPositionsTexture,
        depth: false,
        stencil: false,
      })
    }

    if (!this.centermassTexture) this.centermassTexture = device.createTexture()

    this.centermassTexture({
      data: new Float32Array(this.clustersTextureSize * this.clustersTextureSize * 4).fill(0),
      shape: [this.clustersTextureSize, this.clustersTextureSize, 4],
      type: 'float',
    })
    if (!this.centermassFbo) {
      this.centermassFbo = device.createFramebuffer({
        color: this.centermassTexture,
        depth: false,
        stencil: false,
      })
    }

    if (!this.pointIndices) this.pointIndices = device.createBuffer(0)
    this.pointIndices(createIndexesForBuffer(store.pointsTextureSize))
  }

  public initPrograms (): void {
    const { device, store, data, points } = this
    if (data.pointClusters === undefined) return

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
          clusterTexture: () => this.clusterFbo,
          clustersTextureSize: () => this.clustersTextureSize,
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
    if (!this.applyForcesCommand) {
      this.applyForcesCommand = new Model(device, {
        frag: forceFrag,
        vert: updateVert,
        framebuffer: () => points?.velocityFbo as Framebuffer,
        primitive: 'triangle strip',
        count: 4,
        attributes: { vertexCoord: createQuadBuffer(device) },
        uniforms: {
          positionsTexture: () => points?.previousPositionFbo,
          clusterTexture: () => this.clusterFbo,
          centermassTexture: () => this.centermassFbo,
          clusterPositionsTexture: () => this.clusterPositionsFbo,
          alpha: () => store.alpha,
          clustersTextureSize: () => this.clustersTextureSize,
          clusterCoefficient: () => this.config.simulation?.cluster,
        },
      })
    }
  }

  public run (): void {
    if (!this.data.pointClusters && !this.data.clusterPositions) return
    this.clearCentermassCommand?.()
    this.calculateCentermassCommand?.()
    this.applyForcesCommand?.()
  }
}
