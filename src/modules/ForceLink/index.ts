import regl from 'regl'
import { group } from '@/graph/helper'
import { CoreModule } from '@/graph/modules/core-module'
import { forceFrag } from '@/graph/modules/ForceLink/force-spring'
import { createQuadBuffer } from '@/graph/modules/Shared/buffer'
import updateVert from '@/graph/modules/Shared/quad.vert'
import { InputNode, InputLink } from '@/graph/types'

export enum LinkDirection {
  OUTCOMING = 'outcoming',
  INCOMING = 'incoming'
}

export class ForceLink<N extends InputNode, L extends InputLink> extends CoreModule<N, L> {
  public linkFirstIndicesAndAmountFbo: regl.Framebuffer2D | undefined
  public indicesFbo: regl.Framebuffer2D | undefined
  public biasAndStrengthFbo: regl.Framebuffer2D | undefined
  public randomDistanceFbo: regl.Framebuffer2D | undefined
  public linkFirstIndicesAndAmount: Float32Array = new Float32Array()
  public indices: Float32Array = new Float32Array()
  public maxPointDegree = 0
  private runCommand: regl.DrawCommand | undefined

  public create (direction: LinkDirection): void {
    const { reglInstance, store: { pointsTextureSize, linksTextureSize }, data: { links } } = this
    this.linkFirstIndicesAndAmount = new Float32Array(pointsTextureSize * pointsTextureSize * 4)
    this.indices = new Float32Array(linksTextureSize * linksTextureSize * 4)
    const linkBiasAndStrengthState = new Float32Array(linksTextureSize * linksTextureSize * 4)
    const linkDistanceState = new Float32Array(linksTextureSize * linksTextureSize * 4)

    const linksByDirection = group(links, d => direction === LinkDirection.INCOMING ? d.to : d.from)
    this.maxPointDegree = 0
    let linkIndex = 0
    linksByDirection.forEach((oneDirectionLinks, nodeId) => {
      this.linkFirstIndicesAndAmount[nodeId * 4 + 0] = linkIndex % linksTextureSize
      this.linkFirstIndicesAndAmount[nodeId * 4 + 1] = Math.floor(linkIndex / linksTextureSize)
      this.linkFirstIndicesAndAmount[nodeId * 4 + 2] = oneDirectionLinks.length

      oneDirectionLinks.forEach((link) => {
        const connectedNodeId = direction === LinkDirection.OUTCOMING ? link.to : link.from
        this.indices[linkIndex * 4 + 0] = connectedNodeId % pointsTextureSize
        this.indices[linkIndex * 4 + 1] = Math.floor(connectedNodeId / pointsTextureSize)
        let bias = (link.source.degree ?? 0) / ((link.source.degree ?? 0) + (link.target.degree ?? 0))
        if (direction === LinkDirection.OUTCOMING) bias = 1 - bias
        let strength = 1 / Math.min((link.source.degree ?? 0), (link.target.degree ?? 0))
        strength = Math.sqrt(strength)
        linkBiasAndStrengthState[linkIndex * 4 + 0] = bias
        linkBiasAndStrengthState[linkIndex * 4 + 1] = strength
        linkDistanceState[linkIndex * 4] = Math.random() // link distance random variation

        linkIndex += 1
      })

      this.maxPointDegree = Math.max(this.maxPointDegree, oneDirectionLinks.length)
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
      attributes: { quad: createQuadBuffer(reglInstance) },
      uniforms: {
        position: () => points?.previousPositionFbo,
        linkSpring: () => config.simulation?.linkSpring,
        linkDistance: () => config.simulation?.linkDistance,
        linkDistRandomVariationRange: () => config.simulation?.linkDistRandomVariationRange,
        linkFirstIndicesAndAmount: () => this.linkFirstIndicesAndAmountFbo,
        linkIndices: () => this.indicesFbo,
        linkBiasAndStrength: () => this.biasAndStrengthFbo,
        linkRandomDistanceFbo: () => this.randomDistanceFbo,
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
    this.linkFirstIndicesAndAmountFbo?.destroy()
    this.indicesFbo?.destroy()
    this.biasAndStrengthFbo?.destroy()
    this.randomDistanceFbo?.destroy()
  }
}
