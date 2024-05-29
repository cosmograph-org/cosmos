import regl from 'regl'
import { CoreModule } from '@/graph/modules/core-module'
import { forceFrag } from '@/graph/modules/ForceLink/force-spring'
import { createQuadBuffer, destroyFramebuffer } from '@/graph/modules/Shared/buffer'
import updateVert from '@/graph/modules/Shared/quad.vert'

export enum LinkDirection {
  OUTGOING = 'outgoing',
  INCOMING = 'incoming'
}

export class ForceLink extends CoreModule {
  public linkFirstIndicesAndAmountFbo: regl.Framebuffer2D | undefined
  public indicesFbo: regl.Framebuffer2D | undefined
  public biasAndStrengthFbo: regl.Framebuffer2D | undefined
  public randomDistanceFbo: regl.Framebuffer2D | undefined
  public linkFirstIndicesAndAmount: Float32Array = new Float32Array()
  public indices: Float32Array = new Float32Array()
  public maxPointDegree = 0
  private runCommand: regl.DrawCommand | undefined

  public create (direction: LinkDirection): void {
    const { reglInstance, store: { pointsTextureSize, linksTextureSize }, data } = this
    if (!pointsTextureSize || !linksTextureSize) return
    this.linkFirstIndicesAndAmount = new Float32Array(pointsTextureSize * pointsTextureSize * 4)
    this.indices = new Float32Array(linksTextureSize * linksTextureSize * 4)
    const linkBiasAndStrengthState = new Float32Array(linksTextureSize * linksTextureSize * 4)
    const linkDistanceState = new Float32Array(linksTextureSize * linksTextureSize * 4)

    const grouped = direction === LinkDirection.INCOMING ? data.sourceIndexToTargetIndices : data.targetIndexToSourceIndices
    this.maxPointDegree = 0
    let linkIndex = 0
    grouped?.forEach((connectedPointIndices, pointIndex) => {
      if (connectedPointIndices) {
        this.linkFirstIndicesAndAmount[pointIndex * 4 + 0] = linkIndex % linksTextureSize
        this.linkFirstIndicesAndAmount[pointIndex * 4 + 1] = Math.floor(linkIndex / linksTextureSize)
        this.linkFirstIndicesAndAmount[pointIndex * 4 + 2] = connectedPointIndices.length ?? 0

        connectedPointIndices.forEach((connectedPointIndex) => {
          this.indices[linkIndex * 4 + 0] = connectedPointIndex % pointsTextureSize
          this.indices[linkIndex * 4 + 1] = Math.floor(connectedPointIndex / pointsTextureSize)
          const degree = data.degree?.[connectedPointIndex] ?? 0
          const connectedDegree = data.degree?.[pointIndex] ?? 0
          const bias = degree / (degree + connectedDegree)
          let strength = 1 / Math.min(degree, connectedDegree)
          strength = Math.sqrt(strength)
          linkBiasAndStrengthState[linkIndex * 4 + 0] = bias
          linkBiasAndStrengthState[linkIndex * 4 + 1] = strength
          linkDistanceState[linkIndex * 4] = this.store.getRandomFloat(0, 1)

          linkIndex += 1
        })

        this.maxPointDegree = Math.max(this.maxPointDegree, connectedPointIndices.length ?? 0)
      }
    })

    this.linkFirstIndicesAndAmountFbo = reglInstance.framebuffer({
      color: reglInstance.texture({
        data: this.linkFirstIndicesAndAmount,
        shape: [pointsTextureSize, pointsTextureSize, 4],
        type: 'float',
      }),
      depth: false,
      stencil: false,
    })
    this.indicesFbo = reglInstance.framebuffer({
      color: reglInstance.texture({
        data: this.indices,
        shape: [linksTextureSize, linksTextureSize, 4],
        type: 'float',
      }),
      depth: false,
      stencil: false,
    })
    this.biasAndStrengthFbo = reglInstance.framebuffer({
      color: reglInstance.texture({
        data: linkBiasAndStrengthState,
        shape: [linksTextureSize, linksTextureSize, 4],
        type: 'float',
      }),
      depth: false,
      stencil: false,
    })
    this.randomDistanceFbo = reglInstance.framebuffer({
      color: reglInstance.texture({
        data: linkDistanceState,
        shape: [linksTextureSize, linksTextureSize, 4],
        type: 'float',
      }),
      depth: false,
      stencil: false,
    })
  }

  public initPrograms (): void {
    const { reglInstance, config, store, points } = this
    this.runCommand = reglInstance({
      frag: () => forceFrag(this.maxPointDegree),
      vert: updateVert,
      framebuffer: () => points?.velocityFbo as regl.Framebuffer2D,
      primitive: 'triangle strip',
      count: 4,
      attributes: { vertexCoord: createQuadBuffer(reglInstance) },
      uniforms: {
        positionsTexture: () => points?.previousPositionFbo,
        linkSpring: () => config.simulation?.linkSpring,
        linkDistance: () => config.simulation?.linkDistance,
        linkDistRandomVariationRange: () => config.simulation?.linkDistRandomVariationRange,
        linkInfoTexture: () => this.linkFirstIndicesAndAmountFbo,
        linkIndicesTexture: () => this.indicesFbo,
        linkPropertiesTexture: () => this.biasAndStrengthFbo,
        linkRandomDistanceTexture: () => this.randomDistanceFbo,
        pointsTextureSize: () => store.pointsTextureSize,
        linksTextureSize: () => store.linksTextureSize,
        alpha: () => store.alpha,
      },
    })
  }

  public run (): void {
    this.runCommand?.()
  }

  public destroy (): void {
    destroyFramebuffer(this.linkFirstIndicesAndAmountFbo)
    destroyFramebuffer(this.indicesFbo)
    destroyFramebuffer(this.biasAndStrengthFbo)
    destroyFramebuffer(this.randomDistanceFbo)
  }
}
