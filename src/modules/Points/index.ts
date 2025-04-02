import regl from 'regl'
// import { scaleLinear } from 'd3-scale'
// import { extent } from 'd3-array'
import { CoreModule } from '@/graph/modules/core-module'
import { defaultConfigValues } from '@/graph/variables'
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
import { createIndexesForBuffer, createQuadBuffer } from '@/graph/modules/Shared/buffer'
import trackPositionsFrag from '@/graph/modules/Points/track-positions.frag'
import dragPointFrag from '@/graph/modules/Points/drag-point.frag'
import updateVert from '@/graph/modules/Shared/quad.vert'
import clearFrag from '@/graph/modules/Shared/clear.frag'
import { readPixels } from '@/graph/helper'

export class Points extends CoreModule {
  public currentPositionFbo: regl.Framebuffer2D | undefined
  public previousPositionFbo: regl.Framebuffer2D | undefined
  public velocityFbo: regl.Framebuffer2D | undefined
  public selectedFbo: regl.Framebuffer2D | undefined
  public hoveredFbo: regl.Framebuffer2D | undefined
  public greyoutStatusFbo: regl.Framebuffer2D | undefined
  public scaleX: ((x: number) => number) | undefined
  public scaleY: ((y: number) => number) | undefined
  private colorBuffer: regl.Buffer | undefined
  private sizeFbo: regl.Framebuffer2D | undefined
  private sizeBuffer: regl.Buffer | undefined
  private trackedIndicesFbo: regl.Framebuffer2D | undefined
  private trackedPositionsFbo: regl.Framebuffer2D | undefined
  private sampledPointsFbo: regl.Framebuffer2D | undefined
  private drawCommand: regl.DrawCommand | undefined
  private drawHighlightedCommand: regl.DrawCommand | undefined
  private updatePositionCommand: regl.DrawCommand | undefined
  private dragPointCommand: regl.DrawCommand | undefined
  private findPointsOnAreaSelectionCommand: regl.DrawCommand | undefined
  private findHoveredPointCommand: regl.DrawCommand | undefined
  private clearHoveredFboCommand: regl.DrawCommand | undefined
  private clearSampledPointsFboCommand: regl.DrawCommand | undefined
  private fillSampledPointsFboCommand: regl.DrawCommand | undefined
  private trackPointsCommand: regl.DrawCommand | undefined
  private trackedIndices: number[] | undefined
  private selectedTexture: regl.Texture2D | undefined
  private greyoutStatusTexture: regl.Texture2D | undefined
  private sizeTexture: regl.Texture2D | undefined
  private trackedIndicesTexture: regl.Texture2D | undefined
  private drawPointIndices: regl.Buffer | undefined
  private hoveredPointIndices: regl.Buffer | undefined
  private sampledPointIndices: regl.Buffer | undefined

  public updatePositions (): void {
    const { reglInstance, store, data, config: { disableRescalePositions, disableSimulation } } = this
    const { pointsTextureSize } = store
    if (!pointsTextureSize || !data.pointPositions || data.pointsNumber === undefined) return

    const initialState = new Float32Array(pointsTextureSize * pointsTextureSize * 4)
    // Rescale positions only when rescaling is enabled OR rescaling is not set and simulation is disabled
    this.scaleX = undefined
    this.scaleY = undefined
    if (disableRescalePositions === false || (disableRescalePositions === undefined && disableSimulation)) {
      this.rescaleInitialNodePositions()
    }
    for (let i = 0; i < data.pointsNumber; ++i) {
      initialState[i * 4 + 0] = data.pointPositions[i * 2 + 0] as number
      initialState[i * 4 + 1] = data.pointPositions[i * 2 + 1] as number
      initialState[i * 4 + 2] = i
    }

    // Create position buffer
    if (!this.currentPositionFbo) this.currentPositionFbo = reglInstance.framebuffer()
    this.currentPositionFbo({
      color: reglInstance.texture({
        data: initialState,
        shape: [pointsTextureSize, pointsTextureSize, 4],
        type: 'float',
      }),
      depth: false,
      stencil: false,
    })

    if (!this.previousPositionFbo) this.previousPositionFbo = reglInstance.framebuffer()
    this.previousPositionFbo({
      color: reglInstance.texture({
        data: initialState,
        shape: [pointsTextureSize, pointsTextureSize, 4],
        type: 'float',
      }),
      depth: false,
      stencil: false,
    })

    if (!this.config.disableSimulation) {
      // Create velocity buffer
      if (!this.velocityFbo) this.velocityFbo = reglInstance.framebuffer()
      this.velocityFbo({
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
    if (!this.selectedTexture) this.selectedTexture = reglInstance.texture()
    this.selectedTexture({
      data: initialState,
      shape: [pointsTextureSize, pointsTextureSize, 4],
      type: 'float',
    })
    if (!this.selectedFbo) this.selectedFbo = reglInstance.framebuffer()
    this.selectedFbo({
      color: this.selectedTexture,
      depth: false,
      stencil: false,
    })

    if (!this.hoveredFbo) this.hoveredFbo = reglInstance.framebuffer()
    this.hoveredFbo({
      shape: [2, 2],
      colorType: 'float',
      depth: false,
      stencil: false,
    })

    if (!this.drawPointIndices) this.drawPointIndices = reglInstance.buffer(0)
    this.drawPointIndices(createIndexesForBuffer(store.pointsTextureSize))

    if (!this.hoveredPointIndices) this.hoveredPointIndices = reglInstance.buffer(0)
    this.hoveredPointIndices(createIndexesForBuffer(store.pointsTextureSize))

    if (!this.sampledPointIndices) this.sampledPointIndices = reglInstance.buffer(0)
    this.sampledPointIndices(createIndexesForBuffer(store.pointsTextureSize))

    this.updateGreyoutStatus()
    this.updateSampledPointsGrid()

    this.trackPointsByIndices()
  }

  public initPrograms (): void {
    const { reglInstance, config, store, data } = this
    if (!config.disableSimulation) {
      if (!this.updatePositionCommand) {
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
            friction: () => config.simulationFriction,
            spaceSize: () => store.adjustedSpaceSize,
          },
        })
      }
    }
    if (!this.dragPointCommand) {
      this.dragPointCommand = reglInstance({
        frag: dragPointFrag,
        vert: updateVert,
        framebuffer: () => this.currentPositionFbo as regl.Framebuffer2D,
        primitive: 'triangle strip',
        count: 4,
        attributes: { vertexCoord: createQuadBuffer(reglInstance) },
        uniforms: {
          positionsTexture: () => this.previousPositionFbo,
          mousePos: () => store.mousePosition,
          index: () => store.hoveredPoint?.index ?? -1,
        },
      })
    }

    if (!this.drawCommand) {
      this.drawCommand = reglInstance({
        frag: drawPointsFrag,
        vert: drawPointsVert,
        primitive: 'points',
        count: () => data.pointsNumber ?? 0,
        attributes: {
          pointIndices: {
            buffer: this.drawPointIndices,
            size: 2,
          },
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
    }

    if (!this.findPointsOnAreaSelectionCommand) {
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
    }

    if (!this.clearHoveredFboCommand) {
      this.clearHoveredFboCommand = reglInstance({
        frag: clearFrag,
        vert: updateVert,
        framebuffer: this.hoveredFbo as regl.Framebuffer2D,
        primitive: 'triangle strip',
        count: 4,
        attributes: { vertexCoord: createQuadBuffer(reglInstance) },
      })
    }

    if (!this.findHoveredPointCommand) {
      this.findHoveredPointCommand = reglInstance({
        frag: findHoveredPointFrag,
        vert: findHoveredPointVert,
        primitive: 'points',
        count: () => data.pointsNumber ?? 0,
        framebuffer: () => this.hoveredFbo as regl.Framebuffer2D,
        attributes: {
          pointIndices: {
            buffer: this.hoveredPointIndices,
            size: 2,
          },
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
    }

    if (!this.clearSampledPointsFboCommand) {
      this.clearSampledPointsFboCommand = reglInstance({
        frag: clearFrag,
        vert: updateVert,
        framebuffer: () => this.sampledPointsFbo as regl.Framebuffer2D,
        primitive: 'triangle strip',
        count: 4,
        attributes: { vertexCoord: createQuadBuffer(reglInstance) },
      })
    }

    if (!this.fillSampledPointsFboCommand) {
      this.fillSampledPointsFboCommand = reglInstance({
        frag: fillGridWithSampledPointsFrag,
        vert: fillGridWithSampledPointsVert,
        primitive: 'points',
        count: () => data.pointsNumber ?? 0,
        framebuffer: () => this.sampledPointsFbo as regl.Framebuffer2D,
        attributes: {
          pointIndices: {
            buffer: this.sampledPointIndices,
            size: 2,
          },
        },
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
    }

    if (!this.drawHighlightedCommand) {
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
    }

    if (!this.trackPointsCommand) {
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
  }

  public updateColor (): void {
    const { reglInstance, store: { pointsTextureSize }, data } = this
    if (!pointsTextureSize) return
    if (!this.colorBuffer) this.colorBuffer = reglInstance.buffer(0)
    this.colorBuffer(data.pointColors as Float32Array)
  }

  public updateGreyoutStatus (): void {
    const { reglInstance, store: { selectedIndices, pointsTextureSize } } = this
    if (!pointsTextureSize) return

    // Greyout status: 0 - false, highlighted or normal point; 1 - true, greyout point
    const initialState = new Float32Array(pointsTextureSize * pointsTextureSize * 4)
      .fill(selectedIndices ? 1 : 0)

    if (selectedIndices) {
      for (const selectedIndex of selectedIndices) {
        initialState[selectedIndex * 4] = 0
      }
    }
    if (!this.greyoutStatusTexture) this.greyoutStatusTexture = reglInstance.texture()
    this.greyoutStatusTexture({
      data: initialState,
      width: pointsTextureSize,
      height: pointsTextureSize,
      type: 'float',
    })
    if (!this.greyoutStatusFbo) this.greyoutStatusFbo = reglInstance.framebuffer()
    this.greyoutStatusFbo({
      color: this.greyoutStatusTexture,
      depth: false,
      stencil: false,
    })
  }

  public updateSize (): void {
    const { reglInstance, store: { pointsTextureSize }, data } = this
    if (!pointsTextureSize || data.pointsNumber === undefined || data.pointSizes === undefined) return
    if (!this.sizeBuffer) this.sizeBuffer = reglInstance.buffer(0)
    this.sizeBuffer(data.pointSizes)

    const initialState = new Float32Array(pointsTextureSize * pointsTextureSize * 4)
    for (let i = 0; i < data.pointsNumber; i++) {
      initialState[i * 4] = data.pointSizes[i] as number
    }

    if (!this.sizeTexture) this.sizeTexture = reglInstance.texture()
    this.sizeTexture({
      data: initialState,
      width: pointsTextureSize,
      height: pointsTextureSize,
      type: 'float',
    })

    if (!this.sizeFbo) this.sizeFbo = reglInstance.framebuffer()
    this.sizeFbo({
      color: this.sizeTexture,
      depth: false,
      stencil: false,
    })
  }

  public updateSampledPointsGrid (): void {
    const { store: { screenSize }, config: { pointSamplingDistance }, reglInstance } = this
    let dist = pointSamplingDistance ?? Math.min(...screenSize) / 2
    if (dist === 0) dist = defaultConfigValues.pointSamplingDistance
    const w = Math.ceil(screenSize[0] / dist)
    const h = Math.ceil(screenSize[1] / dist)
    if (!this.sampledPointsFbo) this.sampledPointsFbo = reglInstance.framebuffer()
    this.sampledPointsFbo({
      shape: [w, h],
      depth: false,
      stencil: false,
      colorType: 'float',
    })
  }

  public trackPoints (): void {
    if (!this.trackedIndices?.length) return
    this.trackPointsCommand?.()
  }

  public draw (): void {
    const { config: { renderHoveredPointRing, pointSize }, store, data } = this
    if (!this.colorBuffer) this.updateColor()
    if (!this.sizeBuffer) this.updateSize()
    this.drawCommand?.()
    if ((renderHoveredPointRing) && store.hoveredPoint) {
      this.drawHighlightedCommand?.({
        width: 0.85,
        color: store.hoveredPointRingColor,
        pointIndex: store.hoveredPoint.index,
        size: data.pointSizes?.[store.hoveredPoint.index] ?? pointSize,
      })
    }
    if (store.focusedPoint) {
      this.drawHighlightedCommand?.({
        width: 0.75,
        color: store.focusedPointRingColor,
        pointIndex: store.focusedPoint.index,
        size: data.pointSizes?.[store.focusedPoint.index] ?? pointSize,
      })
    }
  }

  public updatePosition (): void {
    this.updatePositionCommand?.()
    this.swapFbo()
  }

  public drag (): void {
    this.dragPointCommand?.()
    this.swapFbo()
  }

  public findPointsOnAreaSelection (): void {
    this.findPointsOnAreaSelectionCommand?.()
  }

  public findHoveredPoint (): void {
    this.clearHoveredFboCommand?.()
    this.findHoveredPointCommand?.()
  }

  public trackPointsByIndices (indices?: number[] | undefined): void {
    const { store: { pointsTextureSize }, reglInstance } = this
    this.trackedIndices = indices
    if (!indices?.length) return
    const textureSize = Math.ceil(Math.sqrt(indices.length))

    const initialState = new Float32Array(textureSize * textureSize * 4).fill(-1)
    for (const [i, sortedIndex] of indices.entries()) {
      if (sortedIndex !== undefined) {
        initialState[i * 4] = sortedIndex % pointsTextureSize
        initialState[i * 4 + 1] = Math.floor(sortedIndex / pointsTextureSize)
        initialState[i * 4 + 2] = 0
        initialState[i * 4 + 3] = 0
      }
    }
    if (!this.trackedIndicesTexture) this.trackedIndicesTexture = reglInstance.texture()
    this.trackedIndicesTexture({
      data: initialState,
      width: textureSize,
      height: textureSize,
      type: 'float',
    })
    if (!this.trackedIndicesFbo) this.trackedIndicesFbo = reglInstance.framebuffer()
    this.trackedIndicesFbo({
      color: this.trackedIndicesTexture,
      depth: false,
      stencil: false,
    })

    if (!this.trackedPositionsFbo) this.trackedPositionsFbo = reglInstance.framebuffer()
    this.trackedPositionsFbo({
      shape: [textureSize, textureSize],
      depth: false,
      stencil: false,
      colorType: 'float',
    })

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

  private swapFbo (): void {
    const temp = this.previousPositionFbo
    this.previousPositionFbo = this.currentPositionFbo
    this.currentPositionFbo = temp
  }

  private rescaleInitialNodePositions (): void {
    const { config: { spaceSize } } = this
    if (!this.data.pointPositions || !spaceSize) return

    const points = this.data.pointPositions
    const pointsNumber = points.length / 2
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (let i = 0; i < points.length; i += 2) {
      const x = points[i] as number
      const y = points[i + 1] as number
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }
    const w = maxX - minX
    const h = maxY - minY
    const range = Math.max(w, h)

    // Do not rescale if the range is greater than the space size (no need to)
    if (range > spaceSize) {
      this.scaleX = undefined
      this.scaleY = undefined
      return
    }

    // Density threshold - points per pixel ratio (0.001 = 0.1%)
    const densityThreshold = spaceSize * spaceSize * 0.001
    // Calculate effective space size based on point density
    const effectiveSpaceSize = pointsNumber > densityThreshold
    // For dense datasets: scale up based on point count, minimum 120% of space
      ? spaceSize * Math.max(1.2, Math.sqrt(pointsNumber) / spaceSize)
    // For sparse datasets: use 10% of space to cluster points closer
      : spaceSize * 0.1

    // Calculate uniform scale factor to fit data within effective space
    const scaleFactor = effectiveSpaceSize / range
    // Center the data horizontally by adding padding on x-axis
    const offsetX = ((range - w) / 2) * scaleFactor
    // Center the data vertically by adding padding on y-axis
    const offsetY = ((range - h) / 2) * scaleFactor

    this.scaleX = (x: number): number => (x - minX) * scaleFactor + offsetX
    this.scaleY = (y: number): number => (y - minY) * scaleFactor + offsetY

    // Apply scaling to point positions
    for (let i = 0; i < pointsNumber; i++) {
      this.data.pointPositions[i * 2] = this.scaleX(points[i * 2] as number)
      this.data.pointPositions[i * 2 + 1] = this.scaleY(points[i * 2 + 1] as number)
    }
  }
}
