import regl from 'regl'
import { scaleLinear } from 'd3-scale'
import { extent } from 'd3-array'
import { CoreModule } from '@/graph/modules/core-module'
import { defaultConfigValues } from '@/graph/variables'
import { createColorBuffer, createGreyoutStatusBuffer } from '@/graph/modules/Points/color-buffer'
import drawPointsFrag from '@/graph/modules/Points/draw-points.frag'
import drawPointsVert from '@/graph/modules/Points/draw-points.vert'
import findPointsOnAreaSelectionFrag from '@/graph/modules/Points/find-points-on-area-selection.frag'
import drawHighlightedFrag from '@/graph/modules/Points/draw-highlighted.frag'
import drawHighlightedVert from '@/graph/modules/Points/draw-highlighted.vert'
import findHoveredPointFrag from '@/graph/modules/Points/find-hovered-point.frag'
import findHoveredPointVert from '@/graph/modules/Points/find-hovered-point.vert'
import fillGridWithSampledNodesFrag from '@/graph/modules/Points/fill-sampled-nodes.frag'
import fillGridWithSampledNodesVert from '@/graph/modules/Points/fill-sampled-nodes.vert'
import { createSizeBufferAndFillSizeStore } from '@/graph/modules/Points/size-buffer'
import updatePositionFrag from '@/graph/modules/Points/update-position.frag'
import { createIndexesBuffer, createQuadBuffer, destroyFramebuffer } from '@/graph/modules/Shared/buffer'
import { createTrackedIndicesBuffer, createTrackedPositionsBuffer } from '@/graph/modules/Points/tracked-buffer'
import trackPositionsFrag from '@/graph/modules/Points/track-positions.frag'
import updateVert from '@/graph/modules/Shared/quad.vert'
import clearFrag from '@/graph/modules/Shared/clear.frag'
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
  public sampledNodesFbo: regl.Framebuffer2D | undefined
  private drawCommand: regl.DrawCommand | undefined
  private drawHighlightedCommand: regl.DrawCommand | undefined
  private updatePositionCommand: regl.DrawCommand | undefined
  private findPointsOnAreaSelectionCommand: regl.DrawCommand | undefined
  private findHoveredPointCommand: regl.DrawCommand | undefined
  private clearHoveredFboCommand: regl.DrawCommand | undefined
  private clearSampledNodesFboCommand: regl.DrawCommand | undefined
  private fillSampledNodesFboCommand: regl.DrawCommand | undefined
  private trackPointsCommand: regl.DrawCommand | undefined
  private trackedIds: string[] | undefined
  private trackedPositionsById: Map<string, [number, number]> = new Map()
  private sizeByIndex: Float32Array | undefined

  public create (): void {
    const { reglInstance, store, data, config } = this
    const { pointsTextureSize, adjustedSpaceSize } = store
    if (!pointsTextureSize) return
    const numParticles = data.nodes.length
    const initialState = new Float32Array(pointsTextureSize * pointsTextureSize * 4)
    if (!config.disableSimulation) this.rescaleInitialNodePositions()
    for (let i = 0; i < numParticles; ++i) {
      const sortedIndex = this.data.getSortedIndexByInputIndex(i)
      const node = data.nodes[i]
      if (node && sortedIndex !== undefined) {
        initialState[sortedIndex * 4 + 0] = node.x ?? adjustedSpaceSize * store.getRandomFloat(0.495, 0.505)
        initialState[sortedIndex * 4 + 1] = node.y ?? adjustedSpaceSize * store.getRandomFloat(0.495, 0.505)
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

    if (!this.config.disableSimulation) {
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
    }

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
    this.updateSampledNodesGrid()
  }

  public initPrograms (): void {
    const { reglInstance, config, store, data } = this
    if (!config.disableSimulation) {
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
          spaceSize: () => store.adjustedSpaceSize,
        },
      })
    }

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
        spaceSize: () => store.adjustedSpaceSize,
        screenSize: () => store.screenSize,
        greyoutOpacity: () => config.nodeGreyoutOpacity,
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
        spaceSize: () => store.adjustedSpaceSize,
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
        spaceSize: () => store.adjustedSpaceSize,
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
    this.clearSampledNodesFboCommand = reglInstance({
      frag: clearFrag,
      vert: updateVert,
      framebuffer: () => this.sampledNodesFbo as regl.Framebuffer2D,
      primitive: 'triangle strip',
      count: 4,
      attributes: { quad: createQuadBuffer(reglInstance) },
    })
    this.fillSampledNodesFboCommand = reglInstance({
      frag: fillGridWithSampledNodesFrag,
      vert: fillGridWithSampledNodesVert,
      primitive: 'points',
      count: () => data.nodes.length,
      framebuffer: () => this.sampledNodesFbo as regl.Framebuffer2D,
      attributes: { indexes: createIndexesBuffer(reglInstance, store.pointsTextureSize) },
      uniforms: {
        position: () => this.currentPositionFbo,
        pointsTextureSize: () => store.pointsTextureSize,
        transform: () => store.transform,
        spaceSize: () => store.adjustedSpaceSize,
        screenSize: () => store.screenSize,
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
        particleColor: () => this.colorFbo,
        particleSize: () => this.sizeFbo,
        sizeScale: () => config.nodeSizeScale,
        pointsTextureSize: () => store.pointsTextureSize,
        transform: () => store.transform,
        spaceSize: () => store.adjustedSpaceSize,
        screenSize: () => store.screenSize,
        scaleNodesOnZoom: () => config.scaleNodesOnZoom,
        maxPointSize: () => store.maxPointSize,
        particleGreyoutStatus: () => this.greyoutStatusFbo,
        greyoutOpacity: () => config.nodeGreyoutOpacity,
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
    const { reglInstance, config, store: { pointsTextureSize }, data } = this
    if (!pointsTextureSize) return
    this.colorFbo = createColorBuffer(data, reglInstance, pointsTextureSize, config.nodeColor)
  }

  public updateGreyoutStatus (): void {
    const { reglInstance, store } = this
    this.greyoutStatusFbo = createGreyoutStatusBuffer(store.selectedIndices, reglInstance, store.pointsTextureSize)
  }

  public updateSize (): void {
    const { reglInstance, config, store: { pointsTextureSize }, data } = this
    if (!pointsTextureSize) return
    this.sizeByIndex = new Float32Array(data.nodes.length)
    this.sizeFbo = createSizeBufferAndFillSizeStore(data, reglInstance, pointsTextureSize, config.nodeSize, this.sizeByIndex)
  }

  public updateSampledNodesGrid (): void {
    const { store: { screenSize }, config: { nodeSamplingDistance }, reglInstance } = this
    const dist = nodeSamplingDistance ?? Math.min(...screenSize) / 2
    const w = Math.ceil(screenSize[0] / dist)
    const h = Math.ceil(screenSize[1] / dist)
    destroyFramebuffer(this.sampledNodesFbo)
    this.sampledNodesFbo = reglInstance.framebuffer({
      shape: [w, h],
      depth: false,
      stencil: false,
      colorType: 'float',
    })
  }

  public trackPoints (): void {
    if (!this.trackedIndicesFbo || !this.trackedPositionsFbo) return
    this.trackPointsCommand?.()
  }

  public draw (): void {
    const { config: { renderHoveredNodeRing, renderHighlightedNodeRing }, store } = this
    this.drawCommand?.()
    if ((renderHoveredNodeRing ?? renderHighlightedNodeRing) && store.hoveredNode) {
      this.drawHighlightedCommand?.({
        width: 0.85,
        color: store.hoveredNodeRingColor,
        pointIndex: store.hoveredNode.index,
      })
    }
    if (store.focusedNode) {
      this.drawHighlightedCommand?.({
        width: 0.75,
        color: store.focusedNodeRingColor,
        pointIndex: store.focusedNode.index,
      })
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

  public getNodeRadiusByIndex (index: number): number | undefined {
    return this.sizeByIndex?.[index]
  }

  public trackNodesByIds (ids: string[]): void {
    this.trackedIds = ids.length ? ids : undefined
    this.trackedPositionsById.clear()
    const indices = ids.map(id => this.data.getSortedIndexById(id)).filter((d): d is number => d !== undefined)
    destroyFramebuffer(this.trackedIndicesFbo)
    this.trackedIndicesFbo = undefined
    destroyFramebuffer(this.trackedPositionsFbo)
    this.trackedPositionsFbo = undefined
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

  public getSampledNodePositionsMap (): Map<string, [number, number]> {
    const positions = new Map<string, [number, number]>()
    if (!this.sampledNodesFbo) return positions
    this.clearSampledNodesFboCommand?.()
    this.fillSampledNodesFboCommand?.()
    const pixels = readPixels(this.reglInstance, this.sampledNodesFbo as regl.Framebuffer2D)
    for (let i = 0; i < pixels.length / 4; i++) {
      const index = pixels[i * 4]
      const isNotEmpty = !!pixels[i * 4 + 1]
      const x = pixels[i * 4 + 2]
      const y = pixels[i * 4 + 3]

      if (isNotEmpty && index !== undefined && x !== undefined && y !== undefined) {
        const inputIndex = this.data.getInputIndexBySortedIndex(index)
        if (inputIndex !== undefined) {
          const id = this.data.getNodeByIndex(inputIndex)?.id
          if (id !== undefined) positions.set(id, [x, y])
        }
      }
    }
    return positions
  }

  public destroy (): void {
    destroyFramebuffer(this.currentPositionFbo)
    destroyFramebuffer(this.previousPositionFbo)
    destroyFramebuffer(this.velocityFbo)
    destroyFramebuffer(this.selectedFbo)
    destroyFramebuffer(this.colorFbo)
    destroyFramebuffer(this.sizeFbo)
    destroyFramebuffer(this.greyoutStatusFbo)
    destroyFramebuffer(this.hoveredFbo)
    destroyFramebuffer(this.trackedIndicesFbo)
    destroyFramebuffer(this.trackedPositionsFbo)
  }

  private swapFbo (): void {
    const temp = this.previousPositionFbo
    this.previousPositionFbo = this.currentPositionFbo
    this.currentPositionFbo = temp
  }

  private rescaleInitialNodePositions (): void {
    const { nodes } = this.data
    const { spaceSize } = this.config
    if (nodes.length === 0) return
    const xs = nodes.map(n => n.x).filter((n): n is number => n !== undefined)
    if (xs.length === 0) return
    const ys = nodes.map(n => n.y).filter((n): n is number => n !== undefined)
    if (ys.length === 0) return
    const [minX, maxX] = extent(xs)
    if (minX === undefined || maxX === undefined) return
    const [minY, maxY] = extent(ys)
    if (minY === undefined || maxY === undefined) return
    const w = maxX - minX
    const h = maxY - minY

    const size = Math.max(w, h)
    const dw = (size - w) / 2
    const dh = (size - h) / 2

    const scaleX = scaleLinear()
      .range([0, spaceSize ?? defaultConfigValues.spaceSize])
      .domain([minX - dw, maxX + dw])
    const scaleY = scaleLinear()
      .range([0, spaceSize ?? defaultConfigValues.spaceSize])
      .domain([minY - dh, maxY + dh])
    nodes.forEach(n => {
      n.x = scaleX(n.x as number)
      n.y = scaleY(n.y as number)
    })
  }
}
