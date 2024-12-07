import { select, Selection } from 'd3-selection'
import 'd3-transition'
import { easeQuadInOut, easeQuadIn, easeQuadOut } from 'd3-ease'
import { D3ZoomEvent } from 'd3-zoom'
import { D3DragEvent } from 'd3-drag'
import regl from 'regl'
import { GraphConfig, GraphConfigInterface } from '@/graph/config'
import { getRgbaColor, readPixels } from '@/graph/helper'
import { ForceCenter } from '@/graph/modules/ForceCenter'
import { ForceGravity } from '@/graph/modules/ForceGravity'
import { ForceLink, LinkDirection } from '@/graph/modules/ForceLink'
import { ForceManyBody } from '@/graph/modules/ForceManyBody'
import { ForceManyBodyQuadtree } from '@/graph/modules/ForceManyBodyQuadtree'
import { ForceMouse } from '@/graph/modules/ForceMouse'
import { Clusters } from '@/graph/modules/Clusters'
import { FPSMonitor } from '@/graph/modules/FPSMonitor'
import { GraphData } from '@/graph/modules/GraphData'
import { Lines } from '@/graph/modules/Lines'
import { Points } from '@/graph/modules/Points'
import { Store, ALPHA_MIN, MAX_POINT_SIZE, type Hovered } from '@/graph/modules/Store'
import { Zoom } from '@/graph/modules/Zoom'
import { Drag } from '@/graph/modules/Drag'
import { defaultConfigValues, defaultScaleToZoom } from '@/graph/variables'

export class Graph {
  public config = new GraphConfig()
  public graph = new GraphData(this.config)
  private canvas: HTMLCanvasElement
  private canvasD3Selection: Selection<HTMLCanvasElement, undefined, null, undefined>
  private reglInstance: regl.Regl
  private requestAnimationFrameId = 0
  private isRightClickMouse = false

  private store = new Store()
  private points: Points
  private lines: Lines
  private forceGravity: ForceGravity | undefined
  private forceCenter: ForceCenter | undefined
  private forceManyBody: ForceManyBody | ForceManyBodyQuadtree | undefined
  private forceLinkIncoming: ForceLink | undefined
  private forceLinkOutgoing: ForceLink | undefined
  private forceMouse: ForceMouse | undefined
  private clusters: Clusters | undefined
  private zoomInstance = new Zoom(this.store, this.config)
  private dragInstance = new Drag(this.store, this.config)

  private fpsMonitor: FPSMonitor | undefined

  private currentEvent: D3ZoomEvent<HTMLCanvasElement, undefined> | D3DragEvent<HTMLCanvasElement, undefined, Hovered> | MouseEvent | undefined
  /**
   * The value of `_findHoveredPointExecutionCount` is incremented by 1 on each animation frame.
   * When the counter reaches 2 (or more), it is reset to 0 and the `findHoveredPoint` method is executed.
   */
  private _findHoveredPointExecutionCount = 0
  /**
   * If the mouse is not on the Canvas, the `findHoveredPoint` method will not be executed.
   */
  private _isMouseOnCanvas = false
  /**
   * After setting data and render graph at a first time, the fit logic will run
   * */
  private _isFirstRenderAfterInit = true
  private _fitViewOnInitTimeoutID: number | undefined

  private _hasPointPositionsChanged = false
  private _hasPointColorsChanged = false
  private _hasPointSizesChanged = false
  private _hasLinksChanged = false
  private _hasLinkColorsChanged = false
  private _hasLinkWidthsChanged = false
  private _hasLinkArrowsChanged = false
  private _hasPointClustersChanged = false
  private _hasClusterPositionsChanged = false
  private _hasPointClusterForceChanged = false

  public constructor (canvas: HTMLCanvasElement, config?: GraphConfigInterface) {
    if (config) this.config.init(config)

    const w = canvas.clientWidth
    const h = canvas.clientHeight

    canvas.width = w * this.config.pixelRatio
    canvas.height = h * this.config.pixelRatio
    // If the canvas element has no CSS width and height style, the clientWidth and the clientHeight will always
    // be equal to the width and height canvas attribute.
    // In order to prevent resize problem assume that canvas CSS style width and height has a value of 100%.
    if (canvas.style.width === '' && canvas.style.height === '') {
      select(canvas)
        .style('width', '100%')
        .style('height', '100%')
    }

    this.canvas = canvas
    this.canvasD3Selection = select<HTMLCanvasElement, undefined>(canvas)
    this.canvasD3Selection
      .on('mouseenter.cosmos', () => { this._isMouseOnCanvas = true })
      .on('mousemove.cosmos', () => { this._isMouseOnCanvas = true })
      .on('mouseleave.cosmos', () => { this._isMouseOnCanvas = false })
    select(document)
      .on('keydown.cosmos', (event) => { if (event.code === 'Space') this.store.isSpaceKeyPressed = true })
      .on('keyup.cosmos', (event) => { if (event.code === 'Space') this.store.isSpaceKeyPressed = false })
    this.zoomInstance.behavior
      .on('start.detect', (e: D3ZoomEvent<HTMLCanvasElement, undefined>) => { this.currentEvent = e })
      .on('zoom.detect', (e: D3ZoomEvent<HTMLCanvasElement, undefined>) => {
        const userDriven = !!e.sourceEvent
        if (userDriven) this.updateMousePosition(e.sourceEvent)
        this.currentEvent = e
      })
      .on('end.detect', (e: D3ZoomEvent<HTMLCanvasElement, undefined>) => { this.currentEvent = e })
    this.dragInstance.behavior
      .on('start.detect', (e: D3DragEvent<HTMLCanvasElement, undefined, Hovered>) => {
        this.currentEvent = e
        this.updateCanvasCursor()
      })
      .on('drag.detect', (e: D3DragEvent<HTMLCanvasElement, undefined, Hovered>) => {
        if (this.dragInstance.isActive) {
          this.updateMousePosition(e)
        }
        this.currentEvent = e
      })
      .on('end.detect', (e: D3DragEvent<HTMLCanvasElement, undefined, Hovered>) => {
        this.currentEvent = e
        this.updateCanvasCursor()
      })
    this.canvasD3Selection
      .call(this.dragInstance.behavior)
      .call(this.zoomInstance.behavior)
      .on('click', this.onClick.bind(this))
      .on('mousemove', this.onMouseMove.bind(this))
      .on('contextmenu', this.onRightClickMouse.bind(this))
    if (this.config.disableZoom || !this.config.enableDrag) this.updateZoomDragBehaviors()
    this.setZoomLevel(this.config.initialZoomLevel ?? 1)

    this.reglInstance = regl({
      canvas: this.canvas,
      attributes: {
        antialias: false,
        preserveDrawingBuffer: true,
      },
      extensions: ['OES_texture_float', 'ANGLE_instanced_arrays'],
    })

    this.store.maxPointSize = (this.reglInstance.limits.pointSizeDims[1] ?? MAX_POINT_SIZE) / this.config.pixelRatio
    this.store.adjustSpaceSize(this.config.spaceSize, this.reglInstance.limits.maxTextureSize)
    this.store.updateScreenSize(w, h)

    this.points = new Points(this.reglInstance, this.config, this.store, this.graph)
    this.lines = new Lines(this.reglInstance, this.config, this.store, this.graph, this.points)
    if (!this.config.disableSimulation) {
      this.forceGravity = new ForceGravity(this.reglInstance, this.config, this.store, this.graph, this.points)
      this.forceCenter = new ForceCenter(this.reglInstance, this.config, this.store, this.graph, this.points)
      this.forceManyBody = this.config.useQuadtree
        ? new ForceManyBodyQuadtree(this.reglInstance, this.config, this.store, this.graph, this.points)
        : new ForceManyBody(this.reglInstance, this.config, this.store, this.graph, this.points)
      this.forceLinkIncoming = new ForceLink(this.reglInstance, this.config, this.store, this.graph, this.points)
      this.forceLinkOutgoing = new ForceLink(this.reglInstance, this.config, this.store, this.graph, this.points)
      this.forceMouse = new ForceMouse(this.reglInstance, this.config, this.store, this.graph, this.points)
      this.clusters = new Clusters(this.reglInstance, this.config, this.store, this.graph, this.points)
    }

    this.store.backgroundColor = getRgbaColor(this.config.backgroundColor)
    if (this.config.hoveredPointRingColor) {
      this.store.setHoveredPointRingColor(this.config.hoveredPointRingColor)
    }
    if (this.config.focusedPointRingColor) {
      this.store.setFocusedPointRingColor(this.config.focusedPointRingColor)
    }
    if (this.config.focusedPointIndex !== undefined) {
      this.store.setFocusedPoint(this.config.focusedPointIndex)
    }

    if (this.config.showFPSMonitor) this.fpsMonitor = new FPSMonitor(this.canvas)

    if (this.config.randomSeed !== undefined) this.store.addRandomSeed(this.config.randomSeed)
  }

  /**
   * Returns the current simulation progress
   */
  public get progress (): number {
    return this.store.simulationProgress
  }

  /**
   * A value that gives information about the running simulation status.
   */
  public get isSimulationRunning (): boolean {
    return this.store.isSimulationRunning
  }

  /**
   * The maximum point size.
   * This value is the maximum size of the `gl.POINTS` primitive that WebGL can render on the user's hardware.
   */
  public get maxPointSize (): number {
    return this.store.maxPointSize
  }

  /**
   * Set or update Cosmos configuration. The changes will be applied in real time.
   * @param config Cosmos configuration object.
   */
  public setConfig (config: Partial<GraphConfigInterface>): void {
    const prevConfig = { ...this.config }
    this.config.init(config)
    if (prevConfig.pointColor !== this.config.pointColor) {
      this.graph.updatePointColor()
      this.points.updateColor()
    }
    if (prevConfig.pointSize !== this.config.pointSize) {
      this.graph.updatePointSize()
      this.points.updateSize()
    }
    if (prevConfig.linkColor !== this.config.linkColor) {
      this.graph.updateLinkColor()
      this.lines.updateColor()
    }
    if (prevConfig.linkWidth !== this.config.linkWidth) {
      this.graph.updateLinkWidth()
      this.lines.updateWidth()
    }
    if (prevConfig.linkArrows !== this.config.linkArrows) {
      this.graph.updateArrows()
      this.lines.updateArrow()
    }
    if (prevConfig.curvedLinkSegments !== this.config.curvedLinkSegments ||
      prevConfig.curvedLinks !== this.config.curvedLinks) {
      this.lines.updateCurveLineGeometry()
    }
    if (prevConfig.backgroundColor !== this.config.backgroundColor) this.store.backgroundColor = getRgbaColor(this.config.backgroundColor)
    if (prevConfig.hoveredPointRingColor !== this.config.hoveredPointRingColor) {
      this.store.setHoveredPointRingColor(this.config.hoveredPointRingColor)
    }
    if (prevConfig.focusedPointRingColor !== this.config.focusedPointRingColor) {
      this.store.setFocusedPointRingColor(this.config.focusedPointRingColor)
    }
    if (prevConfig.focusedPointIndex !== this.config.focusedPointIndex) {
      this.store.setFocusedPoint(this.config.focusedPointIndex)
    }
    if (prevConfig.spaceSize !== this.config.spaceSize ||
      prevConfig.simulationRepulsionQuadtreeLevels !== this.config.simulationRepulsionQuadtreeLevels) {
      this.store.adjustSpaceSize(this.config.spaceSize, this.reglInstance.limits.maxTextureSize)
      this.resizeCanvas(true)
      this.update(this.store.isSimulationRunning ? this.store.alpha : 0)
    }
    if (prevConfig.showFPSMonitor !== this.config.showFPSMonitor) {
      if (this.config.showFPSMonitor) {
        this.fpsMonitor = new FPSMonitor(this.canvas)
      } else {
        this.fpsMonitor?.destroy()
        this.fpsMonitor = undefined
      }
    }
    if (prevConfig.pixelRatio !== this.config.pixelRatio) {
      this.store.maxPointSize = (this.reglInstance.limits.pointSizeDims[1] ?? MAX_POINT_SIZE) / this.config.pixelRatio
    }

    if (prevConfig.disableZoom !== this.config.disableZoom || prevConfig.enableDrag !== this.config.enableDrag) {
      this.updateZoomDragBehaviors()
    }
  }

  /**
   * Sets the positions for the graph points.
   *
   * @param {Float32Array} pointPositions - A Float32Array representing the positions of points in the format [x1, y1, x2, y2, ..., xn, yn],
   * where `n` is the index of the point.
   * Example: `new Float32Array([1, 2, 3, 4, 5, 6])` sets the first point to (1, 2), the second point to (3, 4), and so on.
   */
  public setPointPositions (pointPositions: Float32Array): void {
    this.graph.inputPointPositions = pointPositions
    this._hasPointPositionsChanged = true
  }

  /**
   * Sets the colors for the graph points.
   *
   * @param {Float32Array} pointColors - A Float32Array representing the colors of points in the format [r1, g1, b1, a1, r2, g2, b2, a2, ..., rn, gn, bn, an],
   * where each color is represented in RGBA format.
   * Example: `new Float32Array([255, 0, 0, 1, 0, 255, 0, 1])` sets the first point to red and the second point to green.
  */
  public setPointColors (pointColors: Float32Array): void {
    this.graph.inputPointColors = pointColors
    this._hasPointColorsChanged = true
  }

  /**
   * Sets the sizes for the graph points.
   *
   * @param {Float32Array} pointSizes - A Float32Array representing the sizes of points in the format [size1, size2, ..., sizen],
   * where `n` is the index of the point.
   * Example: `new Float32Array([10, 20, 30])` sets the first point to size 10, the second point to size 20, and the third point to size 30.
   */
  public setPointSizes (pointSizes: Float32Array): void {
    this.graph.inputPointSizes = pointSizes
    this._hasPointSizesChanged = true
  }

  /**
   * Sets the links for the graph.
   *
   * @param {Float32Array} links - A Float32Array representing the links between points
   * in the format [source1, target1, source2, target2, ..., sourcen, targetn],
   * where `source` and `target` are the indices of the points being linked.
   * Example: `new Float32Array([0, 1, 1, 2])` creates a link from point 0 to point 1 and another link from point 1 to point 2.
   */
  public setLinks (links: Float32Array): void {
    this.graph.inputLinks = links
    this._hasLinksChanged = true
  }

  /**
   * Sets the colors for the graph links.
   *
   * @param {Float32Array} linkColors - A Float32Array representing the colors of links in the format [r1, g1, b1, a1, r2, g2, b2, a2, ..., rn, gn, bn, an],
   * where each color is in RGBA format.
   * Example: `new Float32Array([255, 0, 0, 1, 0, 255, 0, 1])` sets the first link to red and the second link to green.
   */
  public setLinkColors (linkColors: Float32Array): void {
    this.graph.inputLinkColors = linkColors
    this._hasLinkColorsChanged = true
  }

  /**
   * Sets the widths for the graph links.
   *
   * @param {Float32Array} linkWidths - A Float32Array representing the widths of links in the format [width1, width2, ..., widthn],
   * where `n` is the index of the link.
   * Example: `new Float32Array([1, 2, 3])` sets the first link to width 1, the second link to width 2, and the third link to width 3.
   */
  public setLinkWidths (linkWidths: Float32Array): void {
    this.graph.inputLinkWidths = linkWidths
    this._hasLinkWidthsChanged = true
  }

  /**
   * Sets the arrows for the graph links.
   *
   * @param {boolean[]} linkArrows - An array of booleans indicating whether each link should have an arrow,
   * in the format [arrow1, arrow2, ..., arrown], where `n` is the index of the link.
   * Example: `[true, false, true]` sets arrows on the first and third links, but not on the second link.
   */
  public setLinkArrows (linkArrows: boolean[]): void {
    this.graph.linkArrowsBoolean = linkArrows
    this._hasLinkArrowsChanged = true
  }

  /**
   * Sets the strength for the graph links.
   *
   * @param {Float32Array} linkStrength - A Float32Array representing the strength of each link in the format [strength1, strength2, ..., strengthn],
   * where `n` is the index of the link.
   * Example: `new Float32Array([1, 2, 3])` sets the first link to strength 1, the second link to strength 2, and the third link to strength 3.
   */
  public setLinkStrength (linkStrength: Float32Array): void {
    this.graph.inputLinkStrength = linkStrength
  }

  /**
   * Sets the point clusters for the graph.
   *
   * @param {(number | undefined)[]} pointClusters - Array of cluster indices for each point in the graph.
   *   - Index: Each index corresponds to a point.
   *   - Values: Integers starting from 0; `undefined` indicates that a point does not belong to any cluster and will not be affected by cluster forces.
   * @example
   *   `[0, 1, 0, 2, undefined, 1]` maps points to clusters: point 0 and 2 to cluster 0, point 1 to cluster 1, and point 3 to cluster 2.
   * Points 4 is unclustered.
   * @note Clusters without specified positions via `setClusterPositions` will be positioned at their centermass by default.
   */
  public setPointClusters (pointClusters: (number | undefined)[]): void {
    this.graph.inputPointClusters = pointClusters
    this._hasPointClustersChanged = true
  }

  /**
   * Sets the positions of the point clusters for the graph.
   *
   * @param {(number | undefined)[]} clusterPositions - Array of cluster positions.
   *   - Every two elements represent the x and y coordinates for a cluster position.
   *   - `undefined` means the cluster's position is not defined and will use centermass positioning instead.
   * @example
   *   `[10, 20, 30, 40, undefined, undefined]` places the first cluster at (10, 20) and the second at (30, 40);
   * the third cluster will be positioned at its centermass automatically.
   */
  public setClusterPositions (clusterPositions: (number | undefined)[]): void {
    this.graph.inputClusterPositions = clusterPositions
    this._hasClusterPositionsChanged = true
  }

  /**
   * Sets the force strength coefficients for clustering points in the graph.
   *
   * This method allows you to customize the forces acting on individual points during the clustering process.
   * The force coefficients determine the strength of the forces applied to each point.
   *
   * @param {Float32Array} clusterStrength - A Float32Array of force strength coefficients for each point in the format [coeff1, coeff2, ..., coeffn],
   * where `n` is the index of the point.
   * Example: `new Float32Array([1, 0.4, 0.3])` sets the force coefficient for point 0 to 1, point 1 to 0.4, and point 2 to 0.3.
   */
  public setPointClusterStrength (clusterStrength: Float32Array): void {
    this.graph.inputClusterStrength = clusterStrength
    this._hasPointClusterForceChanged = true
  }

  /**
   * Renders the graph.
   *
   * @param {number} [simulationAlpha] - Optional value between 0 and 1
   * that controls the initial energy of the simulation.The higher the value,
   * the more initial energy the simulation will get. Zero value stops the simulation.
   */
  public render (simulationAlpha?: number): void {
    this.graph.update()
    const { fitViewOnInit, fitViewDelay, fitViewPadding, fitViewDuration, fitViewByPointsInRect, initialZoomLevel } = this.config
    if (!this.graph.pointsNumber && !this.graph.linksNumber) {
      this.stopFrames()
      select(this.canvas).style('cursor', null)
      this.reglInstance.clear({
        color: this.store.backgroundColor,
        depth: 1,
        stencil: 0,
      })
      return
    }

    // If `initialZoomLevel` is set, we don't need to fit the view
    if (this._isFirstRenderAfterInit && fitViewOnInit && initialZoomLevel === undefined) {
      this._fitViewOnInitTimeoutID = window.setTimeout(() => {
        if (fitViewByPointsInRect) this.setZoomTransformByPointPositions(fitViewByPointsInRect, fitViewDuration, undefined, fitViewPadding)
        else this.fitView(fitViewDuration, fitViewPadding)
      }, fitViewDelay)
    }
    this._isFirstRenderAfterInit = false

    this.update(simulationAlpha)
  }

  /**
   * Center the view on a point and zoom in, by point index.
   * @param index The index of the point in the array of points.
   * @param duration Duration of the animation transition in milliseconds (`700` by default).
   * @param scale Scale value to zoom in or out (`3` by default).
   * @param canZoomOut Set to `false` to prevent zooming out from the point (`true` by default).
   */
  public zoomToPointByIndex (index: number, duration = 700, scale = defaultScaleToZoom, canZoomOut = true): void {
    const { store: { screenSize } } = this
    const positionPixels = readPixels(this.reglInstance, this.points.currentPositionFbo as regl.Framebuffer2D)
    if (index === undefined) return
    const posX = positionPixels[index * 4 + 0]
    const posY = positionPixels[index * 4 + 1]
    if (posX === undefined || posY === undefined) return
    const distance = this.zoomInstance.getDistanceToPoint([posX, posY])
    const zoomLevel = canZoomOut ? scale : Math.max(this.getZoomLevel(), scale)
    if (distance < Math.min(screenSize[0], screenSize[1])) {
      this.setZoomTransformByPointPositions([posX, posY], duration, zoomLevel)
    } else {
      const transform = this.zoomInstance.getTransform([[posX, posY]], zoomLevel)
      const middle = this.zoomInstance.getMiddlePointTransform([posX, posY])
      this.canvasD3Selection
        .transition()
        .ease(easeQuadIn)
        .duration(duration / 2)
        .call(this.zoomInstance.behavior.transform, middle)
        .transition()
        .ease(easeQuadOut)
        .duration(duration / 2)
        .call(this.zoomInstance.behavior.transform, transform)
    }
  }

  /**
   * Zoom the view in or out to the specified zoom level.
   * @param value Zoom level
   * @param duration Duration of the zoom in/out transition.
   */

  public zoom (value: number, duration = 0): void {
    this.setZoomLevel(value, duration)
  }

  /**
   * Zoom the view in or out to the specified zoom level.
   * @param value Zoom level
   * @param duration Duration of the zoom in/out transition.
   */
  public setZoomLevel (value: number, duration = 0): void {
    if (duration === 0) {
      this.canvasD3Selection
        .call(this.zoomInstance.behavior.scaleTo, value)
    } else {
      this.canvasD3Selection
        .transition()
        .duration(duration)
        .call(this.zoomInstance.behavior.scaleTo, value)
    }
  }

  /**
   * Get zoom level.
   * @returns Zoom level value of the view.
   */
  public getZoomLevel (): number {
    return this.zoomInstance.eventTransform.k
  }

  /**
   * Get current X and Y coordinates of the points.
   * @returns Array of point positions.
   */
  public getPointPositions (): number[] {
    if (this.graph.pointsNumber === undefined) return []
    const positions: number[] = []
    const pointPositionsPixels = readPixels(this.reglInstance, this.points.currentPositionFbo as regl.Framebuffer2D)
    positions.length = this.graph.pointsNumber * 2
    for (let i = 0; i < this.graph.pointsNumber; i += 1) {
      const posX = pointPositionsPixels[i * 4 + 0]
      const posY = pointPositionsPixels[i * 4 + 1]
      if (posX !== undefined && posY !== undefined) {
        positions[i * 2] = posX
        positions[i * 2 + 1] = posY
      }
    }
    return positions
  }

  /**
   * Get current X and Y coordinates of the clusters.
   * @returns Array of point cluster.
   */
  public getClusterPositions (): number[] {
    if (this.graph.pointClusters === undefined || this.clusters === undefined) return []
    const positions: number[] = []
    const clusterPositionsPixels = readPixels(this.reglInstance, this.clusters.centermassFbo as regl.Framebuffer2D)
    positions.length = clusterPositionsPixels.length / 2
    for (let i = 0; i < positions.length / 2; i += 1) {
      const sumX = clusterPositionsPixels[i * 4 + 0]
      const sumY = clusterPositionsPixels[i * 4 + 1]
      const sumN = clusterPositionsPixels[i * 4 + 2]
      if (sumX !== undefined && sumY !== undefined && sumN !== undefined) {
        positions[i * 2] = sumX / sumN
        positions[i * 2 + 1] = sumY / sumN
      }
    }
    return positions
  }

  /**
   * Center and zoom in/out the view to fit all points in the scene.
   * @param duration Duration of the center and zoom in/out animation in milliseconds (`250` by default).
   * @param padding Padding around the viewport in percentage (`0.1` by default).
   */
  public fitView (duration = 250, padding = 0.1): void {
    this.setZoomTransformByPointPositions(this.getPointPositions(), duration, undefined, padding)
  }

  /**
   * Center and zoom in/out the view to fit points by their indices in the scene.
   * @param duration Duration of the center and zoom in/out animation in milliseconds (`250` by default).
   * @param padding Padding around the viewport in percentage
   */
  public fitViewByPointIndices (indices: number[], duration = 250, padding = 0.1): void {
    const positionsArray = this.getPointPositions()
    const positions = new Array(indices.length * 2)
    for (const [i, index] of indices.entries()) {
      positions[i * 2] = positionsArray[index * 2]
      positions[i * 2 + 1] = positionsArray[index * 2 + 1]
    }
    this.setZoomTransformByPointPositions(positions, duration, undefined, padding)
  }

  /**
   * Center and zoom in/out the view to fit points by their positions in the scene.
   * @param duration Duration of the center and zoom in/out animation in milliseconds (`250` by default).
   * @param padding Padding around the viewport in percentage
   */
  public fitViewByPointPositions (positions: number[], duration = 250, padding = 0.1): void {
    this.setZoomTransformByPointPositions(positions, duration, undefined, padding)
  }

  /**
   * Get points indices inside a rectangular area.
   * @param selection - Array of two corner points `[[left, top], [right, bottom]]`.
   * The `left` and `right` coordinates should be from 0 to the width of the canvas.
   * The `top` and `bottom` coordinates should be from 0 to the height of the canvas.
   * @returns A Float32Array containing the indices of points inside a rectangular area.
   */
  public getPointsInRange (selection: [[number, number], [number, number]]): Float32Array {
    const h = this.store.screenSize[1]
    this.store.selectedArea = [[selection[0][0], (h - selection[1][1])], [selection[1][0], (h - selection[0][1])]]
    this.points.findPointsOnAreaSelection()
    const pixels = readPixels(this.reglInstance, this.points.selectedFbo as regl.Framebuffer2D)

    return pixels
      .map((pixel, i) => {
        if (i % 4 === 0 && pixel !== 0) return i / 4
        else return -1
      })
      .filter(d => d !== -1)
  }

  /** Select points inside a rectangular area.
   * @param selection - Array of two corner points `[[left, top], [right, bottom]]`.
   * The `left` and `right` coordinates should be from 0 to the width of the canvas.
   * The `top` and `bottom` coordinates should be from 0 to the height of the canvas. */
  public selectPointsInRange (selection: [[number, number], [number, number]] | null): void {
    if (selection) {
      const h = this.store.screenSize[1]
      this.store.selectedArea = [[selection[0][0], (h - selection[1][1])], [selection[1][0], (h - selection[0][1])]]
      this.points.findPointsOnAreaSelection()
      const pixels = readPixels(this.reglInstance, this.points.selectedFbo as regl.Framebuffer2D)
      this.store.selectedIndices = pixels
        .map((pixel, i) => {
          if (i % 4 === 0 && pixel !== 0) return i / 4
          else return -1
        })
        .filter(d => d !== -1)
    } else {
      this.store.selectedIndices = null
    }
    this.points.updateGreyoutStatus()
  }

  /**
   * Select a point by index. If you want the adjacent points to get selected too, provide `true` as the second argument.
   * @param index The index of the point in the array of points.
   * @param selectAdjacentPoints When set to `true`, selects adjacent points (`false` by default).
   */
  public selectPointByIndex (index: number, selectAdjacentPoints = false): void {
    if (selectAdjacentPoints) {
      const adjacentIndices = this.graph.getAdjacentIndices(index) ?? []
      this.selectPointsByIndices([index, ...adjacentIndices])
    } else this.selectPointsByIndices([index])
  }

  /**
   * Select multiples points by their indices.
   * @param indices Array of points indices.
   */
  public selectPointsByIndices (indices?: (number | undefined)[] | null): void {
    if (!indices) {
      this.store.selectedIndices = null
    } else if (indices.length === 0) {
      this.store.selectedIndices = new Float32Array()
    } else {
      this.store.selectedIndices = new Float32Array(indices.filter(d => d !== undefined))
    }

    this.points.updateGreyoutStatus()
  }

  /**
   * Unselect all points.
   */
  public unselectPoints (): void {
    this.store.selectedIndices = null
    this.points.updateGreyoutStatus()
  }

  /**
   * Get indices of points that are currently selected.
   * @returns Array of selected indices of points.
   */
  public getSelectedIndices (): number[] | null {
    const { selectedIndices } = this.store
    if (!selectedIndices) return null
    return Array.from(selectedIndices)
  }

  /**
   * Get indices that are adjacent to a specific point by its index.
   * @param index Index of the point.
   * @returns Array of adjacent indices.
   */

  public getAdjacentIndices (index: number): number[] | undefined {
    return this.graph.getAdjacentIndices(index)
  }

  /**
   * Set focus on a point by index. A ring will be highlighted around the focused point.
   * If no index is specified, the focus will be reset.
   * If `focusedPointIndex` is specified in the config, this method will have no effect.
   * @param index The index of the point in the array of points.
   */
  public setFocusedPointByIndex (index?: number): void {
    // Config `focusedPointIndex` parameter has higher priority than this method.
    if (this.config.focusedPointIndex !== undefined) return
    if (index === undefined) {
      this.store.setFocusedPoint()
    } else {
      this.store.setFocusedPoint(index)
    }
  }

  /**
   * Converts the X and Y point coordinates from the space coordinate system to the screen coordinate system.
   * @param spacePosition Array of x and y coordinates in the space coordinate system.
   * @returns Array of x and y coordinates in the screen coordinate system.
   */
  public spaceToScreenPosition (spacePosition: [number, number]): [number, number] {
    return this.zoomInstance.convertSpaceToScreenPosition(spacePosition)
  }

  /**
   * Converts the X and Y point coordinates from the screen coordinate system to the space coordinate system.
   * @param screenPosition Array of x and y coordinates in the screen coordinate system.
   * @returns Array of x and y coordinates in the space coordinate system.
   */
  public screenToSpacePosition (screenPosition: [number, number]): [number, number] {
    return this.zoomInstance.convertScreenToSpacePosition(screenPosition)
  }

  /**
   * Converts the point radius value from the space coordinate system to the screen coordinate system.
   * @param spaceRadius Radius of point in the space coordinate system.
   * @returns Radius of point in the screen coordinate system.
   */
  public spaceToScreenRadius (spaceRadius: number): number {
    return this.zoomInstance.convertSpaceToScreenRadius(spaceRadius)
  }

  /**
   * Get point radius by its index.
   * @param index Index of the point.
   * @returns Radius of the point.
   */
  public getPointRadiusByIndex (index: number): number | undefined {
    return this.graph.pointSizes?.[index]
  }

  /**
   * Track multiple point positions by their indices on each Cosmos tick.
   * @param indices Array of points indices.
   */
  public trackPointPositionsByIndices (indices: number[]): void {
    this.points.trackPointsByIndices(indices)
  }

  /**
   * Get current X and Y coordinates of the tracked points.
   * @returns A Map object where keys are the indices of the points and values are their corresponding X and Y coordinates in the [number, number] format.
   */
  public getTrackedPointPositionsMap (): Map<number, [number, number]> {
    return this.points.getTrackedPositionsMap()
  }

  /**
   * For the points that are currently visible on the screen, get a sample of point indices with their coordinates.
   * The resulting number of points will depend on the `pointSamplingDistance` configuration property,
   * and the sampled points will be evenly distributed.
   * @returns A Map object where keys are the index of the points and values are their corresponding X and Y coordinates in the [number, number] format.
   */
  public getSampledPointPositionsMap (): Map<number, [number, number]> {
    return this.points.getSampledPointPositionsMap()
  }

  /**
   * Start the simulation.
   * @param alpha Value from 0 to 1. The higher the value, the more initial energy the simulation will get.
   */
  public start (alpha = 1): void {
    if (!this.graph.pointsNumber) return
    this.store.isSimulationRunning = true
    this.store.alpha = alpha
    this.store.simulationProgress = 0
    this.config.onSimulationStart?.()
    this.stopFrames()
    this.frame()
  }

  /**
   * Pause the simulation.
   */
  public pause (): void {
    this.store.isSimulationRunning = false
    this.config.onSimulationPause?.()
  }

  /**
   * Restart the simulation.
   */
  public restart (): void {
    this.store.isSimulationRunning = true
    this.config.onSimulationRestart?.()
  }

  /**
   * Render only one frame of the simulation (stops the simulation if it was running).
   */
  public step (): void {
    this.store.isSimulationRunning = false
    this.stopFrames()
    this.frame()
  }

  /**
   * Destroy this Cosmos instance.
   */
  public destroy (): void {
    window.clearTimeout(this._fitViewOnInitTimeoutID)
    this.stopFrames()
    this.reglInstance.destroy()
    // Clears the canvas after particle system is destroyed
    this.reglInstance.clear({
      color: this.store.backgroundColor,
      depth: 1,
      stencil: 0,
    })
    select(this.canvas).style('cursor', null)
    this.fpsMonitor?.destroy()
    document.getElementById('gl-bench-style')?.remove()
  }

  /**
   * Create new Cosmos instance.
   */
  public create (): void {
    if (this._hasPointPositionsChanged) this.points.updatePositions()
    if (this._hasPointColorsChanged) this.points.updateColor()
    if (this._hasPointSizesChanged) this.points.updateSize()

    if (this._hasLinksChanged || this._hasPointPositionsChanged) this.lines.updatePointsBuffer()
    if (this._hasLinkColorsChanged) this.lines.updateColor()
    if (this._hasLinkWidthsChanged) this.lines.updateWidth()
    if (this._hasLinkArrowsChanged) this.lines.updateArrow()
    this.lines.updateCurveLineGeometry()

    this.forceManyBody?.create()
    this.forceLinkIncoming?.create(LinkDirection.INCOMING)
    this.forceLinkOutgoing?.create(LinkDirection.OUTGOING)
    this.forceCenter?.create()
    if (this._hasPointClustersChanged || this._hasClusterPositionsChanged || this._hasPointClusterForceChanged) this.clusters?.create()

    this._hasPointPositionsChanged = false
    this._hasPointColorsChanged = false
    this._hasPointSizesChanged = false
    this._hasLinksChanged = false
    this._hasLinkColorsChanged = false
    this._hasLinkWidthsChanged = false
    this._hasLinkArrowsChanged = false
    this._hasPointClustersChanged = false
    this._hasClusterPositionsChanged = false
    this._hasPointClusterForceChanged = false
  }

  /**
   * Converts an array of tuple positions to a single array containing all coordinates sequentially
   * @param pointPositions An array of tuple positions
   * @returns A flatten array of coordinates
   */
  public flatten (pointPositions: [number, number][]): number[] {
    return pointPositions.flat()
  }

  /**
   * Converts a flat array of point positions to a tuple pairs representing coordinates
   * @param pointPositions A flattened array of coordinates
   * @returns An array of tuple positions
   */
  public pair (pointPositions: number[]): [number, number][] {
    const arr = new Array(pointPositions.length / 2) as [number, number][]
    for (let i = 0; i < pointPositions.length / 2; i++) {
      arr[i] = [pointPositions[i * 2] as number, pointPositions[i * 2 + 1] as number]
    }

    return arr
  }

  private update (simulationAlpha = this.store.alpha): void {
    const { graph } = this
    this.store.pointsTextureSize = Math.ceil(Math.sqrt(graph.pointsNumber ?? 0))
    this.store.linksTextureSize = Math.ceil(Math.sqrt((graph.linksNumber ?? 0) * 2))
    this.create()
    this.initPrograms()
    this.points.trackPointsByIndices()
    this.store.setFocusedPoint(this.config.focusedPointIndex)
    this.store.hoveredPoint = undefined
    this.start(simulationAlpha)
  }

  private initPrograms (): void {
    this.points.initPrograms()
    this.lines.initPrograms()
    this.forceGravity?.initPrograms()
    this.forceLinkIncoming?.initPrograms()
    this.forceLinkOutgoing?.initPrograms()
    this.forceMouse?.initPrograms()
    this.forceManyBody?.initPrograms()
    this.forceCenter?.initPrograms()
    this.clusters?.initPrograms()
  }

  private frame (): void {
    const { config: { simulationGravity, simulationCenter, renderLinks, disableSimulation }, store: { alpha, isSimulationRunning } } = this
    if (alpha < ALPHA_MIN && isSimulationRunning) this.end()
    if (!this.store.pointsTextureSize) return

    this.requestAnimationFrameId = window.requestAnimationFrame((now) => {
      this.fpsMonitor?.begin()
      this.resizeCanvas()
      if (!this.dragInstance.isActive) this.findHoveredPoint()

      if (!disableSimulation) {
        if (this.isRightClickMouse) {
          if (!isSimulationRunning) this.start(0.1)
          this.forceMouse?.run()
          this.points.updatePosition()
        }
        if ((isSimulationRunning && !this.zoomInstance.isRunning)) {
          if (simulationGravity) {
            this.forceGravity?.run()
            this.points.updatePosition()
          }

          if (simulationCenter) {
            this.forceCenter?.run()
            this.points.updatePosition()
          }

          this.forceManyBody?.run()
          this.points.updatePosition()

          if (this.store.linksTextureSize) {
            this.forceLinkIncoming?.run()
            this.points.updatePosition()
            this.forceLinkOutgoing?.run()
            this.points.updatePosition()
          }

          if (this.graph.pointClusters || this.graph.clusterPositions) {
            this.clusters?.run()
            this.points.updatePosition()
          }

          this.store.alpha += this.store.addAlpha(this.config.simulationDecay ?? defaultConfigValues.simulation.decay)
          if (this.isRightClickMouse) this.store.alpha = Math.max(this.store.alpha, 0.1)
          this.store.simulationProgress = Math.sqrt(Math.min(1, ALPHA_MIN / this.store.alpha))
          this.config.onSimulationTick?.(
            this.store.alpha,
            this.store.hoveredPoint?.index,
            this.store.hoveredPoint?.position
          )
        }

        this.points.trackPoints()
      }

      // Clear canvas
      this.reglInstance.clear({
        color: this.store.backgroundColor,
        depth: 1,
        stencil: 0,
      })

      if (renderLinks && this.store.linksTextureSize) {
        this.lines.draw()
      }

      this.points.draw()
      if (this.dragInstance.isActive) {
        // To prevent the dragged point from suddenly jumping, run the drag function twice
        this.points.drag()
        this.points.drag()
      }
      this.fpsMonitor?.end(now)

      this.currentEvent = undefined
      this.frame()
    })
  }

  private stopFrames (): void {
    if (this.requestAnimationFrameId) window.cancelAnimationFrame(this.requestAnimationFrameId)
  }

  private end (): void {
    this.store.isSimulationRunning = false
    this.store.simulationProgress = 1
    this.config.onSimulationEnd?.()
  }

  private onClick (event: MouseEvent): void {
    this.config.onClick?.(
      this.store.hoveredPoint?.index,
      this.store.hoveredPoint?.position,
      event
    )
  }

  private updateMousePosition (event: MouseEvent | D3DragEvent<HTMLCanvasElement, undefined, Hovered>): void {
    if (!event) return
    const mouseX = (event as MouseEvent).offsetX ?? (event as D3DragEvent<HTMLCanvasElement, undefined, Hovered>).x
    const mouseY = (event as MouseEvent).offsetY ?? (event as D3DragEvent<HTMLCanvasElement, undefined, Hovered>).y
    if (mouseX === undefined || mouseY === undefined) return
    this.store.mousePosition = this.zoomInstance.convertScreenToSpacePosition([mouseX, mouseY])
    this.store.screenMousePosition = [mouseX, (this.store.screenSize[1] - mouseY)]
  }

  private onMouseMove (event: MouseEvent): void {
    this.currentEvent = event
    this.updateMousePosition(event)
    this.isRightClickMouse = event.which === 3
    this.config.onMouseMove?.(
      this.store.hoveredPoint?.index,
      this.store.hoveredPoint?.position,
      this.currentEvent
    )
  }

  private onRightClickMouse (event: MouseEvent): void {
    event.preventDefault()
  }

  private resizeCanvas (forceResize = false): void {
    const prevWidth = this.canvas.width
    const prevHeight = this.canvas.height
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight

    if (forceResize || prevWidth !== w * this.config.pixelRatio || prevHeight !== h * this.config.pixelRatio) {
      const [prevW, prevH] = this.store.screenSize
      const { k } = this.zoomInstance.eventTransform
      const centerPosition = this.zoomInstance.convertScreenToSpacePosition([prevW / 2, prevH / 2])

      this.store.updateScreenSize(w, h)
      this.canvas.width = w * this.config.pixelRatio
      this.canvas.height = h * this.config.pixelRatio
      this.reglInstance.poll()
      this.canvasD3Selection
        .call(this.zoomInstance.behavior.transform, this.zoomInstance.getTransform([centerPosition], k))
      this.points.updateSampledPointsGrid()
    }
  }

  private setZoomTransformByPointPositions (positions: number[], duration = 250, scale?: number, padding?: number): void {
    this.resizeCanvas()
    const transform = this.zoomInstance.getTransform(this.pair(positions), scale, padding)
    this.canvasD3Selection
      .transition()
      .ease(easeQuadInOut)
      .duration(duration)
      .call(this.zoomInstance.behavior.transform, transform)
  }

  private updateZoomDragBehaviors (): void {
    if (this.config.enableDrag) {
      this.canvasD3Selection.call(this.dragInstance.behavior)
    } else {
      this.canvasD3Selection
        .call(this.dragInstance.behavior)
        .on('.drag', null)
    }

    if (this.config.disableZoom) {
      this.canvasD3Selection
        .call(this.zoomInstance.behavior)
        .on('wheel.zoom', null)
    } else this.canvasD3Selection.call(this.zoomInstance.behavior)
  }

  private findHoveredPoint (): void {
    if (!this._isMouseOnCanvas) return
    if (this._findHoveredPointExecutionCount < 2) {
      this._findHoveredPointExecutionCount += 1
      return
    }
    this._findHoveredPointExecutionCount = 0
    this.points.findHoveredPoint()
    let isMouseover = false
    let isMouseout = false
    const pixels = readPixels(this.reglInstance, this.points.hoveredFbo as regl.Framebuffer2D)
    const pointSize = pixels[1] as number
    if (pointSize) {
      const hoveredIndex = pixels[0] as number
      if (this.store.hoveredPoint?.index !== hoveredIndex) isMouseover = true
      const pointX = pixels[2] as number
      const pointY = pixels[3] as number
      this.store.hoveredPoint = {
        index: hoveredIndex,
        position: [pointX, pointY],
      }
    } else {
      if (this.store.hoveredPoint) isMouseout = true
      this.store.hoveredPoint = undefined
    }

    if (isMouseover && this.store.hoveredPoint) {
      this.config.onPointMouseOver?.(
        this.store.hoveredPoint.index,
        this.store.hoveredPoint.position,
        this.currentEvent
      )
    }
    if (isMouseout) this.config.onPointMouseOut?.(this.currentEvent)
    this.updateCanvasCursor()
  }

  private updateCanvasCursor (): void {
    const { hoveredPointCursor } = this.config
    if (this.dragInstance.isActive) select(this.canvas).style('cursor', 'grabbing')
    else if (this.store.hoveredPoint) {
      if (!this.config.enableDrag || this.store.isSpaceKeyPressed) select(this.canvas).style('cursor', hoveredPointCursor)
      else select(this.canvas).style('cursor', 'grab')
    } else select(this.canvas).style('cursor', null)
  }
}

export type { GraphConfigInterface } from './config'
