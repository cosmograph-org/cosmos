import regl from 'regl'
import { CoreModule } from '@/graph/modules/core-module'
import { createColorBuffer, createGreyoutStatusBuffer } from '@/graph/modules/Points/color-buffer'
import drawPointsFrag from '@/graph/modules/Points/draw-points.frag'
import drawPointsVert from '@/graph/modules/Points/draw-points.vert'
import findPointsOnAreaSelectionFrag from '@/graph/modules/Points/find-points-on-area-selection.frag'
import drawHighlightedFrag from '@/graph/modules/Points/draw-highlighted.frag'
import drawHighlightedVert from '@/graph/modules/Points/draw-highlighted.vert'
import findHoveredPointFrag from '@/graph/modules/Points/find-hovered-point.frag'
import findHoveredPointVert from '@/graph/modules/Points/find-hovered-point.vert'
import { createSizeBuffer, getNodeSize } from '@/graph/modules/Points/size-buffer'
import updatePositionFrag from '@/graph/modules/Points/update-position.frag'
import { createIndexesBuffer, createQuadBuffer } from '@/graph/modules/Shared/buffer'
import { createTrackedIndicesBuffer, createTrackedPositionsBuffer } from '@/graph/modules/Points/tracked-buffer'
import trackPositionsFrag from '@/graph/modules/Points/track-positions.frag'
import updateVert from '@/graph/modules/Shared/quad.vert'
import clearFrag from '@/graph/modules/Shared/clear.frag'
import { defaultConfigValues } from '@/graph/variables'
import { readPixels } from '@/graph/helper'
import { CosmosInputNode, CosmosInputLink } from '@/graph/types'

export class Points<N extends CosmosInputNode, L extends CosmosInputLink> extends CoreModule<N, L> {
  public currentPositionFbo: regl.Framebuffer2D | undefined
  public previousPositionFbo: regl.Framebuffer2D | undefined
  public velocityFbo: regl.Framebuffer2D | undefined
  public selectedFbo: regl.Framebuffer2D | undefined
  public colorFbo: regl.Framebuffer2D | undefined
  public hoveredFbo: regl.Framebuffer2D | undefined
  public greyoutStatusFbo: regl.Framebuffer2D | undefined
  public sizeFbo: regl.Framebuffer2D | undefined
  public trackedIndicesFbo: regl.Framebuffer2D | undefined
  public trackedPositionsFbo: regl.Framebuffer2D | undefined
  private drawCommand: regl.DrawCommand | undefined
  private drawHighlightedCommand: regl.DrawCommand | undefined
  private updatePositionCommand: regl.DrawCommand | undefined
  private findPointsOnAreaSelectionCommand: regl.DrawCommand | undefined
  private findHoveredPointCommand: regl.DrawCommand | undefined
  private clearHoveredFboCommand: regl.DrawCommand | undefined
  private trackPointsCommand: regl.DrawCommand | undefined
  private trackedIds: string[] | undefined
  private trackedPositionsById: Map<string, [number, number]> = new Map()

  public create (): void {
    const { reglInstance, config, store, data } = this
    const { spaceSize } = config
    const { pointsTextureSize } = store
    const numParticles = data.nodes.length
    const initialState = new Float32Array(pointsTextureSize * pointsTextureSize * 4)
    for (let i = 0; i < numParticles; ++i) {
      const sortedIndex = this.data.getSortedIndexByInputIndex(i)
      const node = data.nodes[i]
      if (node && sortedIndex !== undefined) {
        const space = spaceSize ?? defaultConfigValues.spaceSize
        initialState[sortedIndex * 4 + 0] = node.x ?? space * store.getRandomFloat(0.495, 0.505)
        initialState[sortedIndex * 4 + 1] = node.y ?? space * store.getRandomFloat(0.495, 0.505)
      }
    }

    // Create position buffer
    this.currentPositionFbo = reglInstance.framebuffer({
      color: reglInstance.texture({
        data: initialState,
        shape: [pointsTextureSize, pointsTextureSize, 4],
        type: 'float',
      }),
      depth: false,
      stencil: false,
    })

    this.previousPositionFbo = reglInstance.framebuffer({
      color: reglInstance.texture({
        data: initialState,
        shape: [pointsTextureSize, pointsTextureSize, 4],
        type: 'float',
      }),
      depth: false,
      stencil: false,
    })

    // Create velocity buffer
    this.velocityFbo = reglInstance.framebuffer({
      color: reglInstance.texture({
        data: new Float32Array(pointsTextureSize * pointsTextureSize * 4).fill(0),
        shape: [pointsTextureSize, pointsTextureSize, 4],
        type: 'float',
      }),
      depth: false,
      stencil: false,
    })

    // Create selected points buffer
    this.selectedFbo = reglInstance.framebuffer({
      color: reglInstance.texture({
        data: initialState,
        shape: [pointsTextureSize, pointsTextureSize, 4],
        type: 'float',
      }),
      depth: false,
      stencil: false,
    })

    this.hoveredFbo = reglInstance.framebuffer({
      shape: [2, 2],
      colorType: 'float',
      depth: false,
      stencil: false,
    })

    this.updateSize()
    this.updateColor()
    this.updateGreyoutStatus()
  }

  public initPrograms (): void {
    const { reglInstance, config, store, data } = this
    this.updatePositionCommand = reglInstance({
      frag: updatePositionFrag,
      vert: updateVert,
      framebuffer: () => this.currentPositionFbo as regl.Framebuffer2D,
      primitive: 'triangle strip',
      count: 4,
      attributes: { quad: createQuadBuffer(reglInstance) },
      uniforms: {
        position: () => this.previousPositionFbo,
        velocity: () => this.velocityFbo,
        friction: () => config.simulation?.friction,
        spaceSize: () => config.spaceSize,
      },
    })
    this.drawCommand = reglInstance({
      frag: drawPointsFrag,
      vert: drawPointsVert,
      primitive: 'points',
      count: () => data.nodes.length,
      attributes: { indexes: createIndexesBuffer(reglInstance, store.pointsTextureSize) },
      uniforms: {
        positions: () => this.currentPositionFbo,
        particleColor: () => this.colorFbo,
        particleGreyoutStatus: () => this.greyoutStatusFbo,
        particleSize: () => this.sizeFbo,
        ratio: () => config.pixelRatio,
        sizeScale: () => config.nodeSizeScale,
        pointsTextureSize: () => store.pointsTextureSize,
        transform: () => store.transform,
        spaceSize: () => config.spaceSize,
        screenSize: () => store.screenSize,
        greyoutOpacity: () => config.nodeGreyoutOpacity,
        scaleNodesOnZoom: () => config.scaleNodesOnZoom,
      },
      blend: {
        enable: true,
        func: {
          dstRGB: 'one minus src alpha',
          srcRGB: 'src alpha',
          dstAlpha: 'one minus src alpha',
          srcAlpha: 'one',
        },
        equation: {
          rgb: 'add',
          alpha: 'add',
        },
      },
      depth: {
        enable: false,
        mask: false,
      },
    })
    this.findPointsOnAreaSelectionCommand = reglInstance({
      frag: findPointsOnAreaSelectionFrag,
      vert: updateVert,
      framebuffer: () => this.selectedFbo as regl.Framebuffer2D,
      primitive: 'triangle strip',
      count: 4,
      attributes: { quad: createQuadBuffer(reglInstance) },
      uniforms: {
        position: () => this.currentPositionFbo,
        particleSize: () => this.sizeFbo,
        spaceSize: () => config.spaceSize,
        screenSize: () => store.screenSize,
        sizeScale: () => config.nodeSizeScale,
        transform: () => store.transform,
        ratio: () => config.pixelRatio,
        'selection[0]': () => store.selectedArea[0],
        'selection[1]': () => store.selectedArea[1],
        scaleNodesOnZoom: () => config.scaleNodesOnZoom,
        maxPointSize: () => store.maxPointSize,
      },
    })
    this.clearHoveredFboCommand = reglInstance({
      frag: clearFrag,
      vert: updateVert,
      framebuffer: this.hoveredFbo as regl.Framebuffer2D,
      primitive: 'triangle strip',
      count: 4,
      attributes: { quad: createQuadBuffer(reglInstance) },
    })
    this.findHoveredPointCommand = reglInstance({
      frag: findHoveredPointFrag,
      vert: findHoveredPointVert,
      primitive: 'points',
      count: () => data.nodes.length,
      framebuffer: () => this.hoveredFbo as regl.Framebuffer2D,
      attributes: { indexes: createIndexesBuffer(reglInstance, store.pointsTextureSize) },
      uniforms: {
        position: () => this.currentPositionFbo,
        particleSize: () => this.sizeFbo,
        ratio: () => config.pixelRatio,
        sizeScale: () => config.nodeSizeScale,
        pointsTextureSize: () => store.pointsTextureSize,
        transform: () => store.transform,
        spaceSize: () => config.spaceSize,
        screenSize: () => store.screenSize,
        scaleNodesOnZoom: () => config.scaleNodesOnZoom,
        mousePosition: () => store.screenMousePosition,
        maxPointSize: () => store.maxPointSize,
      },
      depth: {
        enable: false,
        mask: false,
      },
    })
    this.drawHighlightedCommand = reglInstance({
      frag: drawHighlightedFrag,
      vert: drawHighlightedVert,
      attributes: { quad: createQuadBuffer(reglInstance) },
      primitive: 'triangle strip',
      count: 4,
      uniforms: {
        color: reglInstance.prop<{ color: number[] }, 'color'>('color'),
        width: reglInstance.prop<{ width: number }, 'width'>('width'),
        pointIndex: reglInstance.prop<{ pointIndex: number }, 'pointIndex'>('pointIndex'),
        positions: () => this.currentPositionFbo,
        particleSize: () => this.sizeFbo,
        sizeScale: () => config.nodeSizeScale,
        pointsTextureSize: () => store.pointsTextureSize,
        transform: () => store.transform,
        spaceSize: () => config.spaceSize,
        screenSize: () => store.screenSize,
        scaleNodesOnZoom: () => config.scaleNodesOnZoom,
        maxPointSize: () => store.maxPointSize,
      },
      blend: {
        enable: true,
        func: {
          dstRGB: 'one minus src alpha',
          srcRGB: 'src alpha',
          dstAlpha: 'one minus src alpha',
          srcAlpha: 'one',
        },
        equation: {
          rgb: 'add',
          alpha: 'add',
        },
      },
      depth: {
        enable: false,
        mask: false,
      },
    })
    this.trackPointsCommand = reglInstance({
      frag: trackPositionsFrag,
      vert: updateVert,
      framebuffer: () => this.trackedPositionsFbo as regl.Framebuffer2D,
      primitive: 'triangle strip',
      count: 4,
      attributes: { quad: createQuadBuffer(reglInstance) },
      uniforms: {
        position: () => this.currentPositionFbo,
        trackedIndices: () => this.trackedIndicesFbo,
        pointsTextureSize: () => store.pointsTextureSize,
      },
    })
  }

  public updateColor (): void {
    const { reglInstance, config, store, data } = this
    this.colorFbo = createColorBuffer(data, reglInstance, store.pointsTextureSize, config.nodeColor)
  }

  public updateGreyoutStatus (): void {
    const { reglInstance, store } = this
    this.greyoutStatusFbo = createGreyoutStatusBuffer(store.selectedIndices, reglInstance, store.pointsTextureSize)
  }

  public updateSize (): void {
    const { reglInstance, config, store, data } = this
    this.sizeFbo = createSizeBuffer(data, reglInstance, store.pointsTextureSize, config.nodeSize)
  }

  public trackPoints (): void {
    if (!this.trackedIndicesFbo || !this.trackedPositionsFbo) return
    this.trackPointsCommand?.()
  }

  public draw (): void {
    this.drawCommand?.()
    if (this.config.renderHighlightedNodeRing) {
      if (this.store.hoveredNode) {
        this.drawHighlightedCommand?.({
          width: 0.85,
          color: this.store.hoveredNodeRingColor,
          pointIndex: this.store.hoveredNode.index,
        })
      }
      if (this.store.focusedNode) {
        this.drawHighlightedCommand?.({
          width: 0.75,
          color: this.store.focusedNodeRingColor,
          pointIndex: this.store.focusedNode.index,
        })
      }
    }
  }

  public updatePosition (): void {
    this.updatePositionCommand?.()
    this.swapFbo()
  }

  public findPointsOnAreaSelection (): void {
    this.findPointsOnAreaSelectionCommand?.()
  }

  public findHoveredPoint (): void {
    this.clearHoveredFboCommand?.()
    this.findHoveredPointCommand?.()
  }

  public getNodeRadius (node: N): number {
    const { nodeSize } = this.config
    return getNodeSize(node, nodeSize) / 2
  }

  public trackNodesByIds (ids: string[]): void {
    this.trackedIds = ids.length ? ids : undefined
    this.trackedPositionsById.clear()
    const indices = ids.map(id => this.data.getSortedIndexById(id)).filter((d): d is number => d !== undefined)
    if (this.trackedIndicesFbo) {
      this.trackedIndicesFbo.destroy()
      this.trackedIndicesFbo = undefined
    }
    if (this.trackedPositionsFbo) {
      this.trackedPositionsFbo.destroy()
      this.trackedPositionsFbo = undefined
    }
    if (indices.length) {
      this.trackedIndicesFbo = createTrackedIndicesBuffer(indices, this.store.pointsTextureSize, this.reglInstance)
      this.trackedPositionsFbo = createTrackedPositionsBuffer(indices, this.reglInstance)
    }
    this.trackPoints()
  }

  public getTrackedPositions (): Map<string, [number, number]> {
    if (!this.trackedIds) return this.trackedPositionsById
    const pixels = readPixels(this.reglInstance, this.trackedPositionsFbo as regl.Framebuffer2D)
    this.trackedIds.forEach((id, i) => {
      const x = pixels[i * 4]
      const y = pixels[i * 4 + 1]
      if (x !== undefined && y !== undefined) this.trackedPositionsById.set(id, [x, y])
    })
    return this.trackedPositionsById
  }

  public destroy (): void {
    this.currentPositionFbo?.destroy()
    this.previousPositionFbo?.destroy()
    this.velocityFbo?.destroy()
    this.selectedFbo?.destroy()
    this.colorFbo?.destroy()
    this.sizeFbo?.destroy()
    this.greyoutStatusFbo?.destroy()
    this.hoveredFbo?.destroy()
    this.trackedIndicesFbo?.destroy()
    this.trackedPositionsFbo?.destroy()
  }

  private swapFbo (): void {
    const temp = this.previousPositionFbo
    this.previousPositionFbo = this.currentPositionFbo
    this.currentPositionFbo = temp
  }
}
