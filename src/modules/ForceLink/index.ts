import {Framebuffer, Texture} from '@luma.gl/core'
import {Model} from '@luma.gl/engine'
import { CoreModule } from '@/graph/modules/core-module'
import { forceFrag } from '@/graph/modules/ForceLink/force-spring'
import { createQuadBuffer } from '@/graph/modules/Shared/buffer'
import updateVert from '@/graph/modules/Shared/quad.vert'

export enum LinkDirection {
  OUTGOING = 'outgoing',
  INCOMING = 'incoming'
}

export class ForceLink extends CoreModule {
  private linkFirstIndicesAndAmountFbo: Framebuffer | undefined
  private indicesFbo: Framebuffer | undefined
  private biasAndStrengthFbo: Framebuffer | undefined
  private randomDistanceFbo: Framebuffer | undefined
  private linkFirstIndicesAndAmount: Float32Array = new Float32Array()
  private indices: Float32Array = new Float32Array()
  private maxPointDegree = 0
  private runCommand: Model | undefined
  private linkFirstIndicesAndAmountTexture: Texture | undefined
  private indicesTexture: Texture | undefined
  private biasAndStrengthTexture: Texture | undefined
  private randomDistanceTexture: Texture | undefined

  public create (direction: LinkDirection): void {
    const { device, store: { pointsTextureSize, linksTextureSize }, data } = this
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

        connectedPointIndices.forEach(([connectedPointIndex, initialLinkIndex]) => {
          this.indices[linkIndex * 4 + 0] = connectedPointIndex % pointsTextureSize
          this.indices[linkIndex * 4 + 1] = Math.floor(connectedPointIndex / pointsTextureSize)
          const degree = data.degree?.[connectedPointIndex] ?? 0
          const connectedDegree = data.degree?.[pointIndex] ?? 0
          const bias = degree / (degree + connectedDegree)
          let strength = data.linkStrength?.[initialLinkIndex] ?? (1 / Math.min(degree, connectedDegree))
          strength = Math.sqrt(strength)
          linkBiasAndStrengthState[linkIndex * 4 + 0] = bias
          linkBiasAndStrengthState[linkIndex * 4 + 1] = strength
          linkDistanceState[linkIndex * 4] = this.store.getRandomFloat(0, 1)

          linkIndex += 1
        })

        this.maxPointDegree = Math.max(this.maxPointDegree, connectedPointIndices.length ?? 0)
      }
    })

    if (!this.linkFirstIndicesAndAmountTexture) this.linkFirstIndicesAndAmountTexture = device.createTexture()
    this.linkFirstIndicesAndAmountTexture({
      data: this.linkFirstIndicesAndAmount,
      shape: [pointsTextureSize, pointsTextureSize, 4],
      type: 'float',
    })
    if (!this.linkFirstIndicesAndAmountFbo) {
      this.linkFirstIndicesAndAmountFbo = device.createFramebuffer({
        color: this.linkFirstIndicesAndAmountTexture,
        depth: false,
        stencil: false,
      })
    }

    if (!this.indicesTexture) this.indicesTexture = device.crateTexture()
    this.indicesTexture({
      data: this.indices,
      shape: [linksTextureSize, linksTextureSize, 4],
      type: 'float',
    })
    if (!this.indicesFbo) {
      this.indicesFbo = device.createFramebuffer({
        color: this.indicesTexture,
        depth: false,
        stencil: false,
      })
    }

    if (!this.biasAndStrengthTexture) this.biasAndStrengthTexture = device.createTexture()
    this.biasAndStrengthTexture({
      data: linkBiasAndStrengthState,
      shape: [linksTextureSize, linksTextureSize, 4],
      type: 'float',
    })
    if (!this.biasAndStrengthFbo) {
      this.biasAndStrengthFbo = device.createFramebuffer({
        color: this.biasAndStrengthTexture,
        depth: false,
        stencil: false,
      })
    }

    if (!this.randomDistanceTexture) this.randomDistanceTexture = device.createTexture()
    this.randomDistanceTexture({
      data: linkDistanceState,
      shape: [linksTextureSize, linksTextureSize, 4],
      type: 'float',
    })
    if (!this.randomDistanceFbo) {
      this.randomDistanceFbo = device.createFramebuffer({
        color: this.randomDistanceTexture,
        depth: false,
        stencil: false,
      })
    }
  }

  public initPrograms (): void {
    const { device, config, store, points } = this
    if (!this.runCommand) {
      this.runCommand = device({
        frag: () => forceFrag(this.maxPointDegree),
        vert: updateVert,
        framebuffer: () => points?.velocityFbo as Framebuffer,
        primitive: 'triangle strip',
        count: 4,
        attributes: { vertexCoord: createQuadBuffer(device) },
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
  }

  public run (): void {
    this.runCommand?.()
  }
}
