import regl from 'regl'
// import { scaleLinear } from 'd3-scale'
// import { extent } from 'd3-array'
import { CoreModule } from '@/graph/modules/core-module'
// import { defaultConfigValues } from '@/graph/variables'
import { createGreyoutStatusBuffer } from '@/graph/modules/Points/color-buffer'
import drawPointsFrag from '@/graph/modules/Points/draw-points.frag'
import drawPointsVert from '@/graph/modules/Points/draw-points.vert'
import findPointsOnAreaSelectionFrag from '@/graph/modules/Points/find-points-on-area-selection.frag'
import drawHighlightedFrag from '@/graph/modules/Points/draw-highlighted.frag'
import drawHighlightedVert from '@/graph/modules/Points/draw-highlighted.vert'
import findHoveredPointFrag from '@/graph/modules/Points/find-hovered-point.frag'
import findHoveredPointVert from '@/graph/modules/Points/find-hovered-point.vert'
import fillGridWithSampledPointsFrag from '@/graph/modules/Points/fill-sampled-points.frag'
import fillGridWithSampledPointsVert from '@/graph/modules/Points/fill-sampled-points.vert'
import updatePositionFrag from '@/graph/modules/Points/update-position.frag'
import { createIndexesBuffer, createQuadBuffer, destroyBuffer, destroyFramebuffer } from '@/graph/modules/Shared/buffer'
import { createTrackedIndicesBuffer, createTrackedPositionsBuffer } from '@/graph/modules/Points/tracked-buffer'
import trackPositionsFrag from '@/graph/modules/Points/track-positions.frag'
import updateVert from '@/graph/modules/Shared/quad.vert'
import clearFrag from '@/graph/modules/Shared/clear.frag'
import { readPixels } from '@/graph/helper'

export class Points extends CoreModule {
  public currentPositionFbo: regl.Framebuffer2D | undefined
  public previousPositionFbo: regl.Framebuffer2D | undefined
  public velocityFbo: regl.Framebuffer2D | undefined
  public selectedFbo: regl.Framebuffer2D | undefined
  public colorBuffer: regl.Buffer | undefined
  public hoveredFbo: regl.Framebuffer2D | undefined
  public greyoutStatusFbo: regl.Framebuffer2D | undefined
  public sizeFbo: regl.Framebuffer2D | undefined
  public sizeBuffer: regl.Buffer | undefined
  public trackedIndicesFbo: regl.Framebuffer2D | undefined
  public trackedPositionsFbo: regl.Framebuffer2D | undefined
  public sampledPointsFbo: regl.Framebuffer2D | undefined
  private drawCommand: regl.DrawCommand | undefined
  private drawHighlightedCommand: regl.DrawCommand | undefined
  private updatePositionCommand: regl.DrawCommand | undefined
  private findPointsOnAreaSelectionCommand: regl.DrawCommand | undefined
  private findHoveredPointCommand: regl.DrawCommand | undefined
  private clearHoveredFboCommand: regl.DrawCommand | undefined
  private clearSampledPointsFboCommand: regl.DrawCommand | undefined
  private fillSampledPointsFboCommand: regl.DrawCommand | undefined
  private trackPointsCommand: regl.DrawCommand | undefined
  private trackedIndices: number[] | undefined

  public create (): void {
    const { reglInstance, store, data } = this
    const { pointsTextureSize } = store
    if (!pointsTextureSize || !data.pointPositions || data.pointsNumber === undefined) return
    const initialState = new Float32Array(pointsTextureSize * pointsTextureSize * 4)
    // if (!config.disableSimulation) this.rescaleInitialNodePositions() // TODO ⁉️
    for (let i = 0; i < data.pointsNumber; ++i) {
      initialState[i * 4 + 0] = data.pointPositions[i * 2 + 0] as number
      initialState[i * 4 + 1] = data.pointPositions[i * 2 + 1] as number
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
    this.updateSampledPointsGrid()
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
        attributes: { vertexCoord: createQuadBuffer(reglInstance) },
        uniforms: {
          positionsTexture: () => this.previousPositionFbo,
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
      count: () => data.pointsNumber ?? 0,
      attributes: {
        pointIndices: createIndexesBuffer(reglInstance, store.pointsTextureSize),
        size: {
          buffer: () => this.sizeBuffer,
          size: 1,
        },
        color: {
          buffer: () => this.colorBuffer,
          size: 4,
        },
      },
      uniforms: {
        positionsTexture: () => this.currentPositionFbo,
        pointGreyoutStatus: () => this.greyoutStatusFbo,
        ratio: () => config.pixelRatio,
        sizeScale: () => config.pointSizeScale,
        pointsTextureSize: () => store.pointsTextureSize,
        transformationMatrix: () => store.transform,
        spaceSize: () => store.adjustedSpaceSize,
        screenSize: () => store.screenSize,
        greyoutOpacity: () => config.pointGreyoutOpacity,
        scalePointsOnZoom: () => config.scalePointsOnZoom,
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
      attributes: {
        vertexCoord: createQuadBuffer(reglInstance),
      },
      uniforms: {
        positionsTexture: () => this.currentPositionFbo,
        pointSize: () => this.sizeFbo,
        spaceSize: () => store.adjustedSpaceSize,
        screenSize: () => store.screenSize,
        sizeScale: () => config.pointSizeScale,
        transformationMatrix: () => store.transform,
        ratio: () => config.pixelRatio,
        'selection[0]': () => store.selectedArea[0],
        'selection[1]': () => store.selectedArea[1],
        scalePointsOnZoom: () => config.scalePointsOnZoom,
        maxPointSize: () => store.maxPointSize,
      },
    })
    this.clearHoveredFboCommand = reglInstance({
      frag: clearFrag,
      vert: updateVert,
      framebuffer: this.hoveredFbo as regl.Framebuffer2D,
      primitive: 'triangle strip',
      count: 4,
      attributes: { vertexCoord: createQuadBuffer(reglInstance) },
    })
    this.findHoveredPointCommand = reglInstance({
      frag: findHoveredPointFrag,
      vert: findHoveredPointVert,
      primitive: 'points',
      count: () => data.pointsNumber ?? 0,
      framebuffer: () => this.hoveredFbo as regl.Framebuffer2D,
      attributes: {
        pointIndices: createIndexesBuffer(reglInstance, store.pointsTextureSize),
        size: {
          buffer: () => this.sizeBuffer,
          size: 1,
        },
      },
      uniforms: {
        positionsTexture: () => this.currentPositionFbo,
        ratio: () => config.pixelRatio,
        sizeScale: () => config.pointSizeScale,
        pointsTextureSize: () => store.pointsTextureSize,
        transformationMatrix: () => store.transform,
        spaceSize: () => store.adjustedSpaceSize,
        screenSize: () => store.screenSize,
        scalePointsOnZoom: () => config.scalePointsOnZoom,
        mousePosition: () => store.screenMousePosition,
        maxPointSize: () => store.maxPointSize,
      },
      depth: {
        enable: false,
        mask: false,
      },
    })
    this.clearSampledPointsFboCommand = reglInstance({
      frag: clearFrag,
      vert: updateVert,
      framebuffer: () => this.sampledPointsFbo as regl.Framebuffer2D,
      primitive: 'triangle strip',
      count: 4,
      attributes: { vertexCoord: createQuadBuffer(reglInstance) },
    })
    this.fillSampledPointsFboCommand = reglInstance({
      frag: fillGridWithSampledPointsFrag,
      vert: fillGridWithSampledPointsVert,
      primitive: 'points',
      count: () => data.pointsNumber ?? 0,
      framebuffer: () => this.sampledPointsFbo as regl.Framebuffer2D,
      attributes: { pointIndices: createIndexesBuffer(reglInstance, store.pointsTextureSize) },
      uniforms: {
        positionsTexture: () => this.currentPositionFbo,
        pointsTextureSize: () => store.pointsTextureSize,
        transformationMatrix: () => store.transform,
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
      attributes: { vertexCoord: createQuadBuffer(reglInstance) },
      primitive: 'triangle strip',
      count: 4,
      uniforms: {
        color: reglInstance.prop<{ color: number[] }, 'color'>('color'),
        width: reglInstance.prop<{ width: number }, 'width'>('width'),
        pointIndex: reglInstance.prop<{ pointIndex: number }, 'pointIndex'>('pointIndex'),
        size: reglInstance.prop<{ size: number }, 'size'>('size'),
        positionsTexture: () => this.currentPositionFbo,
        sizeScale: () => config.pointSizeScale,
        pointsTextureSize: () => store.pointsTextureSize,
        transformationMatrix: () => store.transform,
        spaceSize: () => store.adjustedSpaceSize,
        screenSize: () => store.screenSize,
        scalePointsOnZoom: () => config.scalePointsOnZoom,
        maxPointSize: () => store.maxPointSize,
        pointGreyoutStatusTexture: () => this.greyoutStatusFbo,
        greyoutOpacity: () => config.pointGreyoutOpacity,
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
      attributes: { vertexCoord: createQuadBuffer(reglInstance) },
      uniforms: {
        positionsTexture: () => this.currentPositionFbo,
        trackedIndices: () => this.trackedIndicesFbo,
        pointsTextureSize: () => store.pointsTextureSize,
      },
    })
  }

  public updateColor (): void {
    const { reglInstance, store: { pointsTextureSize }, data } = this
    if (!pointsTextureSize) return
    destroyBuffer(this.colorBuffer)
    this.colorBuffer = reglInstance.buffer(data.pointColors as number[])
  }

  public updateGreyoutStatus (): void {
    const { reglInstance, store } = this
    this.greyoutStatusFbo = createGreyoutStatusBuffer(store.selectedIndices, reglInstance, store.pointsTextureSize)
  }

  public updateSize (): void {
    const { reglInstance, store: { pointsTextureSize }, data } = this
    if (!pointsTextureSize || data.pointsNumber === undefined || data.pointSizes === undefined) return
    destroyBuffer(this.sizeBuffer)
    this.sizeBuffer = reglInstance.buffer(data.pointSizes)

    const initialState = new Float32Array(pointsTextureSize * pointsTextureSize * 4)

    for (let i = 0; i < data.pointsNumber; i++) {
      initialState[i * 4] = data.pointSizes[i] as number
    }

    const initialTexture = reglInstance.texture({
      data: initialState,
      width: pointsTextureSize,
      height: pointsTextureSize,
      type: 'float',
    })

    this.sizeFbo = reglInstance.framebuffer({
      color: initialTexture,
      depth: false,
      stencil: false,
    })
  }

  public updateSampledPointsGrid (): void {
    const { store: { screenSize }, config: { pointSamplingDistance }, reglInstance } = this
    const dist = pointSamplingDistance ?? Math.min(...screenSize) / 2
    const w = Math.ceil(screenSize[0] / dist)
    const h = Math.ceil(screenSize[1] / dist)
    destroyFramebuffer(this.sampledPointsFbo)
    this.sampledPointsFbo = reglInstance.framebuffer({
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
    const { config: { renderHoveredPointRing, defaultPointSize }, store, data } = this
    this.drawCommand?.()
    if ((renderHoveredPointRing) && store.hoveredPoint) {
      this.drawHighlightedCommand?.({
        width: 0.85,
        color: store.hoveredPointRingColor,
        pointIndex: store.hoveredPoint.index,
        size: data.pointSizes?.[store.hoveredPoint.index] ?? defaultPointSize,
      })
    }
    if (store.focusedPoint) {
      this.drawHighlightedCommand?.({
        width: 0.75,
        color: store.focusedPointRingColor,
        pointIndex: store.focusedPoint.index,
        size: data.pointSizes?.[store.focusedPoint.index] ?? defaultPointSize,
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

  public trackPointsByIndices (indices: number[]): void {
    this.trackedIndices = indices
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

  public getTrackedPositionsMap (): Map<number, [number, number]> {
    const tracked = new Map<number, [number, number]>()
    if (!this.trackedIndices) return tracked
    const pixels = readPixels(this.reglInstance, this.trackedPositionsFbo as regl.Framebuffer2D)
    for (let i = 0; i < pixels.length / 4; i += 1) {
      const x = pixels[i * 4]
      const y = pixels[i * 4 + 1]
      const index = this.trackedIndices[i]
      if (x !== undefined && y !== undefined && index !== undefined) {
        tracked.set(index, [x, y])
      }
    }
    return tracked
  }

  public getSampledPointPositionsMap (): Map<number, [number, number]> {
    const positions = new Map<number, [number, number]>()
    if (!this.sampledPointsFbo) return positions
    this.clearSampledPointsFboCommand?.()
    this.fillSampledPointsFboCommand?.()
    const pixels = readPixels(this.reglInstance, this.sampledPointsFbo as regl.Framebuffer2D)
    for (let i = 0; i < pixels.length / 4; i++) {
      const index = pixels[i * 4]
      const isNotEmpty = !!pixels[i * 4 + 1]
      const x = pixels[i * 4 + 2]
      const y = pixels[i * 4 + 3]

      if (isNotEmpty && index !== undefined && x !== undefined && y !== undefined) {
        positions.set(index, [x, y])
      }
    }
    return positions
  }

  public destroy (): void {
    destroyFramebuffer(this.currentPositionFbo)
    destroyFramebuffer(this.previousPositionFbo)
    destroyFramebuffer(this.velocityFbo)
    destroyFramebuffer(this.selectedFbo)
    destroyBuffer(this.colorBuffer)
    destroyBuffer(this.sizeBuffer)
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

  // private rescaleInitialNodePositions (): void {
  //   const { nodes } = this.data
  //   const { spaceSize } = this.config
  //   if (nodes.length === 0) return
  //   const xs = nodes.map(n => n.x).filter((n): n is number => n !== undefined)
  //   if (xs.length === 0) return
  //   const ys = nodes.map(n => n.y).filter((n): n is number => n !== undefined)
  //   if (ys.length === 0) return
  //   const [minX, maxX] = extent(xs)
  //   if (minX === undefined || maxX === undefined) return
  //   const [minY, maxY] = extent(ys)
  //   if (minY === undefined || maxY === undefined) return
  //   const w = maxX - minX
  //   const h = maxY - minY

  //   const size = Math.max(w, h)
  //   const dw = (size - w) / 2
  //   const dh = (size - h) / 2

  //   const scaleX = scaleLinear()
  //     .range([0, spaceSize ?? defaultConfigValues.spaceSize])
  //     .domain([minX - dw, maxX + dw])
  //   const scaleY = scaleLinear()
  //     .range([0, spaceSize ?? defaultConfigValues.spaceSize])
  //     .domain([minY - dh, maxY + dh])
  //   nodes.forEach(n => {
  //     n.x = scaleX(n.x as number)
  //     n.y = scaleY(n.y as number)
  //   })
  // }
}
