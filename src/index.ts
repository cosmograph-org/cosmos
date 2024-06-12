import { select, Selection } from 'd3-selection'
import 'd3-transition'
import { easeQuadInOut, easeQuadIn, easeQuadOut } from 'd3-ease'
import { D3ZoomEvent } from 'd3-zoom'
import regl from 'regl'
import { GraphConfig, GraphConfigInterface } from '@/graph/config'
import { getRgbaColor, readPixels } from '@/graph/helper'
import { ForceCenter } from '@/graph/modules/ForceCenter'
import { ForceGravity } from '@/graph/modules/ForceGravity'
import { ForceLink, LinkDirection } from '@/graph/modules/ForceLink'
import { ForceManyBody } from '@/graph/modules/ForceManyBody'
import { ForceManyBodyQuadtree } from '@/graph/modules/ForceManyBodyQuadtree'
import { ForceMouse } from '@/graph/modules/ForceMouse'
import { FPSMonitor } from '@/graph/modules/FPSMonitor'
import { GraphData } from '@/graph/modules/GraphData'
import { Lines } from '@/graph/modules/Lines'
import { Points } from '@/graph/modules/Points'
import { Store, ALPHA_MIN, MAX_POINT_SIZE } from '@/graph/modules/Store'
import { Zoom } from '@/graph/modules/Zoom'
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
  private zoomInstance = new Zoom(this.store, this.config)
  private fpsMonitor: FPSMonitor | undefined
  private hasParticleSystemDestroyed = false
  private currentEvent: D3ZoomEvent<HTMLCanvasElement, undefined> | MouseEvent | undefined
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
    this.zoomInstance.behavior
      .on('start.detect', (e: D3ZoomEvent<HTMLCanvasElement, undefined>) => { this.currentEvent = e })
      .on('zoom.detect', (e: D3ZoomEvent<HTMLCanvasElement, undefined>) => {
        const userDriven = !!e.sourceEvent
        if (userDriven) this.updateMousePosition(e.sourceEvent)
        this.currentEvent = e
      })
      .on('end.detect', (e: D3ZoomEvent<HTMLCanvasElement, undefined>) => { this.currentEvent = e })
    this.canvasD3Selection
      .call(this.zoomInstance.behavior)
      .on('click', this.onClick.bind(this))
      .on('mousemove', this.onMouseMove.bind(this))
      .on('contextmenu', this.onRightClickMouse.bind(this))
    if (this.config.disableZoom) this.disableZoom()
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
    }

    this.store.backgroundColor = getRgbaColor(this.config.backgroundColor)
    if (this.config.hoveredPointRingColor) {
      this.store.setHoveredPointRingColor(this.config.hoveredPointRingColor)
    }
    if (this.config.focusedPointRingColor) {
      this.store.setFocusedPointRingColor(this.config.focusedPointRingColor)
    }

    if (this.config.showFPSMonitor) this.fpsMonitor = new FPSMonitor(this.canvas)

    if (this.config.randomSeed !== undefined) this.store.addRandomSeed(this.config.randomSeed)
  }

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
    if (prevConfig.defaultPointColor !== this.config.defaultPointColor) {
      this.graph.updatePointColor()
      this.points.updateColor()
    }
    if (prevConfig.defaultPointSize !== this.config.defaultPointSize) {
      this.graph.updatePointSize()
      this.points.updateSize()
    }
    if (prevConfig.defaultLinkColor !== this.config.defaultLinkColor) {
      this.graph.updateLinkColor()
      this.lines.updateColor()
    }
    if (prevConfig.defaultLinkWidth !== this.config.defaultLinkWidth) {
      this.graph.updateLinkWidth()
      this.lines.updateWidth()
    }
    if (prevConfig.defaultLinkArrows !== this.config.defaultLinkArrows) {
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
    if (prevConfig.spaceSize !== this.config.spaceSize ||
      prevConfig.simulation.repulsionQuadtreeLevels !== this.config.simulation.repulsionQuadtreeLevels) {
      this.store.adjustSpaceSize(this.config.spaceSize, this.reglInstance.limits.maxTextureSize)
      this.resizeCanvas(true)
      this.update(this.store.isSimulationRunning)
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

    if (prevConfig.disableZoom !== this.config.disableZoom) {
      if (this.config.disableZoom) this.disableZoom()
      else this.enableZoom()
    }
  }

  public setPointPositions (pointPositions: number[]): void {
    this.graph.pointPositions = pointPositions
  }

  public setPointColors (pointColors: number[]): void {
    this.graph.inputPointColors = pointColors
  }

  public setPointSizes (pointSizes: number[]): void {
    this.graph.inputPointSizes = pointSizes
  }

  public setLinks (links: number[]): void {
    this.graph.links = links
  }

  public setLinkColors (linkColors: number[]): void {
    this.graph.inputLinkColors = linkColors
  }

  public setLinkWidths (linkWidths: number[]): void {
    this.graph.inputLinkWidths = linkWidths
  }

  public setLinkArrows (linkArrows: boolean[]): void {
    this.graph.linkArrowsBoolean = linkArrows
  }

  public setLinkStrength (linkStrength: number[]): void {
    this.graph.inputLinkStrength = linkStrength
  }

  public render (runSimulation = true): void {
    this.graph.update()
    const { fitViewOnInit, fitViewDelay, fitViewByPointsInRect, initialZoomLevel } = this.config
    if (!this.graph.pointsNumber && !this.graph.linksNumber) {
      this.destroyParticleSystem()
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
        if (fitViewByPointsInRect) this.setZoomTransformByPointPositions(fitViewByPointsInRect, undefined, undefined, 0)
        else this.fitView()
      }, fitViewDelay)
    }
    this._isFirstRenderAfterInit = false

    this.update(runSimulation)
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
    if (this.hasParticleSystemDestroyed) return []
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
   * Center and zoom in/out the view to fit all points in the scene.
   * @param duration Duration of the center and zoom in/out animation in milliseconds (`250` by default).
   * @param padding Padding around the viewport in percentage
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
      this.store.selectedIndices = new Float32Array(indices.filter((d): d is number => d !== undefined))
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
   * @param index The index of the point in the array of points.
   */
  public setFocusedPointByIndex (index?: number): void {
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
    this.config.simulation.onStart?.()
    this.stopFrames()
    this.frame()
  }

  /**
   * Pause the simulation.
   */
  public pause (): void {
    this.store.isSimulationRunning = false
    this.config.simulation.onPause?.()
  }

  /**
   * Restart the simulation.
   */
  public restart (): void {
    this.store.isSimulationRunning = true
    this.config.simulation.onRestart?.()
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
    this.destroyParticleSystem()
    this.fpsMonitor?.destroy()
    document.getElementById('gl-bench-style')?.remove()
  }

  /**
   * Create new Cosmos instance.
   */
  public create (): void {
    this.points.create()
    this.lines.create()
    this.forceManyBody?.create()
    this.forceLinkIncoming?.create(LinkDirection.INCOMING)
    this.forceLinkOutgoing?.create(LinkDirection.OUTGOING)
    this.forceCenter?.create()
    this.hasParticleSystemDestroyed = false
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

  private destroyParticleSystem (): void {
    if (this.hasParticleSystemDestroyed) return
    this.points.destroy()
    this.lines.destroy()
    this.forceCenter?.destroy()
    this.forceLinkIncoming?.destroy()
    this.forceLinkOutgoing?.destroy()
    this.forceManyBody?.destroy()
    this.reglInstance.destroy()
    this.hasParticleSystemDestroyed = true
  }

  private update (runSimulation: boolean): void {
    const { graph } = this
    this.store.pointsTextureSize = Math.ceil(Math.sqrt(graph.pointsNumber ?? 0))
    this.store.linksTextureSize = Math.ceil(Math.sqrt((graph.linksNumber ?? 0) * 2))
    this.destroyParticleSystem()
    this.create()
    this.initPrograms()
    this.store.setFocusedPoint()
    this.store.hoveredPoint = undefined
    if (runSimulation) {
      this.start()
    } else {
      this.step()
    }
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
  }

  private frame (): void {
    const { config: { simulation, renderLinks, disableSimulation }, store: { alpha, isSimulationRunning } } = this
    if (alpha < ALPHA_MIN && isSimulationRunning) this.end()
    if (!this.store.pointsTextureSize) return

    this.requestAnimationFrameId = window.requestAnimationFrame((now) => {
      this.fpsMonitor?.begin()
      this.resizeCanvas()
      this.findHoveredPoint()

      if (!disableSimulation) {
        if (this.isRightClickMouse) {
          if (!isSimulationRunning) this.start(0.1)
          this.forceMouse?.run()
          this.points.updatePosition()
        }
        if ((isSimulationRunning && !this.zoomInstance.isRunning)) {
          if (simulation.gravity) {
            this.forceGravity?.run()
            this.points.updatePosition()
          }

          if (simulation.center) {
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

          this.store.alpha += this.store.addAlpha(this.config.simulation.decay ?? defaultConfigValues.simulation.decay)
          if (this.isRightClickMouse) this.store.alpha = Math.max(this.store.alpha, 0.1)
          this.store.simulationProgress = Math.sqrt(Math.min(1, ALPHA_MIN / this.store.alpha))
          this.config.simulation.onTick?.(
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
    this.config.simulation.onEnd?.()
  }

  private onClick (event: MouseEvent): void {
    this.config.events.onClick?.(
      this.store.hoveredPoint?.index,
      this.store.hoveredPoint?.position,
      event
    )
  }

  private updateMousePosition (event: MouseEvent): void {
    if (!event || event.offsetX === undefined || event.offsetY === undefined) return
    const mouseX = event.offsetX
    const mouseY = event.offsetY
    this.store.mousePosition = this.zoomInstance.convertScreenToSpacePosition([mouseX, mouseY])
    this.store.screenMousePosition = [mouseX, (this.store.screenSize[1] - mouseY)]
  }

  private onMouseMove (event: MouseEvent): void {
    this.currentEvent = event
    this.updateMousePosition(event)
    this.isRightClickMouse = event.which === 3
    this.config.events.onMouseMove?.(
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

  private disableZoom (): void {
    this.canvasD3Selection
      .call(this.zoomInstance.behavior)
      .on('wheel.zoom', null)
  }

  private enableZoom (): void {
    this.canvasD3Selection.call(this.zoomInstance.behavior)
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
    const position = [0, 0] as [number, number]
    if (pointSize) {
      const hoveredIndex = pixels[0] as number
      if (this.store.hoveredPoint?.index !== hoveredIndex) isMouseover = true
      const pointX = pixels[2] as number
      const pointY = pixels[3] as number
      position[0] = pointX
      position[1] = pointY
      this.store.hoveredPoint = {
        index: hoveredIndex,
        position: [pointX, pointY],
      }
    } else {
      if (this.store.hoveredPoint) isMouseout = true
      this.store.hoveredPoint = undefined
    }

    if (isMouseover && this.store.hoveredPoint) {
      this.config.events.onPointMouseOver?.(
        this.store.hoveredPoint.index,
        this.store.hoveredPoint.position,
        this.currentEvent
      )
    }
    if (isMouseout) this.config.events.onPointMouseOut?.(this.currentEvent)
  }
}

export type { GraphConfigInterface, GraphEvents, GraphSimulationSettings } from './config'
