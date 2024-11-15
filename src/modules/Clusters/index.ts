import regl from 'regl'
import { CoreModule } from '@/graph/modules/core-module'
import calculateCentermassFrag from '@/graph/modules/Clusters/calculate-centermass.frag'
import calculateCentermassVert from '@/graph/modules/Clusters/calculate-centermass.vert'
import forceFrag from '@/graph/modules/Clusters/force-cluster.frag'
import { createQuadBuffer, createIndexesForBuffer } from '@/graph/modules/Shared/buffer'
import clearFrag from '@/graph/modules/Shared/clear.frag'
import updateVert from '@/graph/modules/Shared/quad.vert'

export class Clusters extends CoreModule {
  private clusterFbo: regl.Framebuffer2D | undefined
  private centermassFbo: regl.Framebuffer2D | undefined
  private clearCentermassCommand: regl.DrawCommand | undefined
  private calculateCentermassCommand: regl.DrawCommand | undefined
  private applyForcesCommand: regl.DrawCommand | undefined
  private clusterTexture: regl.Texture2D | undefined
  private centermassTexture: regl.Texture2D | undefined
  private pointIndices: regl.Buffer | undefined
  private clustersTextureSize: number | undefined

  public create (): void {
    const { reglInstance, store, data } = this
    const { pointsTextureSize } = store
    if (data.pointsNumber === undefined || !data.clusters) return
    const clusterNumber = data.clusters.reduce((max, clusterIndex) => Math.max(max, clusterIndex), 0) + 1
    this.clustersTextureSize = Math.ceil(Math.sqrt(clusterNumber))

    if (!this.clusterTexture) this.clusterTexture = reglInstance.texture()
    const clusterState = new Float32Array(pointsTextureSize * pointsTextureSize * 4)
    for (let i = 0; i < data.pointsNumber; ++i) {
      const clusterIndex = data.clusters[i]
      if (clusterIndex === undefined) continue
      clusterState[i * 4 + 0] = clusterIndex % this.clustersTextureSize
      clusterState[i * 4 + 1] = Math.floor(clusterIndex / this.clustersTextureSize)
    }
    this.clusterTexture({
      data: clusterState,
      shape: [pointsTextureSize, pointsTextureSize, 4],
      type: 'float',
    })
    if (!this.clusterFbo) {
      this.clusterFbo = reglInstance.framebuffer({
        color: this.clusterTexture,
        depth: false,
        stencil: false,
      })
    }

    if (!this.centermassTexture) this.centermassTexture = reglInstance.texture()
    this.centermassTexture({
      data: new Float32Array(this.clustersTextureSize * this.clustersTextureSize * 4).fill(0),
      shape: [this.clustersTextureSize, this.clustersTextureSize, 4],
      type: 'float',
    })
    if (!this.centermassFbo) {
      this.centermassFbo = reglInstance.framebuffer({
        color: this.centermassTexture,
        depth: false,
        stencil: false,
      })
    }

    if (!this.pointIndices) this.pointIndices = reglInstance.buffer(0)
    this.pointIndices(createIndexesForBuffer(store.pointsTextureSize))
  }

  public initPrograms (): void {
    const { reglInstance, store, data, points } = this
    if (!data.clusters) return

    if (!this.clearCentermassCommand) {
      this.clearCentermassCommand = reglInstance({
        frag: clearFrag,
        vert: updateVert,
        framebuffer: () => this.centermassFbo as regl.Framebuffer2D,
        primitive: 'triangle strip',
        count: 4,
        attributes: { vertexCoord: createQuadBuffer(reglInstance) },
      })
    }
    if (!this.calculateCentermassCommand) {
      this.calculateCentermassCommand = reglInstance({
        frag: calculateCentermassFrag,
        vert: calculateCentermassVert,
        framebuffer: () => this.centermassFbo as regl.Framebuffer2D,
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
      this.applyForcesCommand = reglInstance({
        frag: forceFrag,
        vert: updateVert,
        framebuffer: () => points?.velocityFbo as regl.Framebuffer2D,
        primitive: 'triangle strip',
        count: 4,
        attributes: { vertexCoord: createQuadBuffer(reglInstance) },
        uniforms: {
          positionsTexture: () => points?.previousPositionFbo,
          clusterTexture: () => this.clusterFbo,
          centermassTexture: () => this.centermassFbo,
          alpha: () => store.alpha,
          clustersTextureSize: () => this.clustersTextureSize,
        },
      })
    }
  }

  public run (): void {
    if (!this.data.clusters) return

    this.clearCentermassCommand?.()
    this.calculateCentermassCommand?.()
    this.applyForcesCommand?.()
  }
}
