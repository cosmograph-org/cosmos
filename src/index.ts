import { select, Selection } from 'd3-selection'
import 'd3-transition'
import { easeQuadIn, easeQuadOut, easeQuadInOut } from 'd3-ease'
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
import { CosmosInputNode, CosmosInputLink } from '@/graph/types'
import { defaultConfigValues, defaultScaleToZoom } from '@/graph/variables'
import { reglCachedCode } from '@/graph/regl-cached-code'

export class Graph<N extends CosmosInputNode, L extends CosmosInputLink> {
  public config = new GraphConfig<N, L>()
  public graph = new GraphData<N, L>()
  private canvas: HTMLCanvasElement
  private canvasD3Selection: Selection<HTMLCanvasElement, undefined, null, undefined>
  private reglInstance: regl.Regl
  private requestAnimationFrameId = 0
  private isRightClickMouse = false

  private store = new Store<N>()
  private points: Points<N, L>
  private lines: Lines<N, L>
  private forceGravity: ForceGravity<N, L> | undefined
  private forceCenter: ForceCenter<N, L> | undefined
  private forceManyBody: ForceManyBody<N, L> | ForceManyBodyQuadtree<N, L> | undefined
  private forceLinkIncoming: ForceLink<N, L> | undefined
  private forceLinkOutgoing: ForceLink<N, L> | undefined
  private forceMouse: ForceMouse<N, L> | undefined
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
   * After setting data at a first time, the fit logic will run
   * */
  private _isFirstDataAfterInit = true
  private _fitViewOnInitTimeoutID: number | undefined

  public constructor (canvas: HTMLCanvasElement, config?: GraphConfigInterface<N, L>) {
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
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      cachedCode: reglCachedCode,
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
    if (this.config.highlightedNodeRingColor) {
      this.store.setHoveredNodeRingColor(this.config.highlightedNodeRingColor)
      this.store.setFocusedNodeRingColor(this.config.highlightedNodeRingColor)
    } else {
      if (this.config.hoveredNodeRingColor) {
        this.store.setHoveredNodeRingColor(this.config.hoveredNodeRingColor)
      }
      if (this.config.focusedNodeRingColor) {
        this.store.setFocusedNodeRingColor(this.config.focusedNodeRingColor)
      }
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
  public setConfig (config: Partial<GraphConfigInterface<N, L>>): void {
    const prevConfig = { ...this.config }
    this.config.init(config)
    if (prevConfig.linkColor !== this.config.linkColor) this.lines.updateColor()
    if (prevConfig.nodeColor !== this.config.nodeColor) this.points.updateColor()
    if (prevConfig.nodeSize !== this.config.nodeSize) this.points.updateSize()
    if (prevConfig.linkWidth !== this.config.linkWidth) this.lines.updateWidth()
    if (prevConfig.linkArrows !== this.config.linkArrows) this.lines.updateArrow()
    if (prevConfig.curvedLinkSegments !== this.config.curvedLinkSegments ||
      prevConfig.curvedLinks !== this.config.curvedLinks) {
      this.lines.updateCurveLineGeometry()
    }
    if (prevConfig.backgroundColor !== this.config.backgroundColor) this.store.backgroundColor = getRgbaColor(this.config.backgroundColor)
    if (prevConfig.highlightedNodeRingColor !== this.config.highlightedNodeRingColor) {
      this.store.setHoveredNodeRingColor(this.config.highlightedNodeRingColor)
      this.store.setFocusedNodeRingColor(this.config.highlightedNodeRingColor)
    }
    if (prevConfig.hoveredNodeRingColor !== this.config.hoveredNodeRingColor) {
      this.store.setHoveredNodeRingColor(this.config.hoveredNodeRingColor)
    }
    if (prevConfig.focusedNodeRingColor !== this.config.focusedNodeRingColor) {
      this.store.setFocusedNodeRingColor(this.config.focusedNodeRingColor)
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

  /**
   * Pass data to Cosmos.
   * @param nodes Array of nodes.
   * @param links Array of links.
   * @param runSimulation When set to `false`, the simulation won't be started automatically (`true` by default).
   */
  public setData (nodes: N[], links: L[], runSimulation = true): void {
    const { fitViewOnInit, fitViewDelay, fitViewByNodesInRect, initialZoomLevel } = this.config
    if (!nodes.length && !links.length) {
      this.destroyParticleSystem()
      this.reglInstance.clear({
        color: this.store.backgroundColor,
        depth: 1,
        stencil: 0,
      })
      return
    }
    this.graph.setData(nodes, links)
    // If `initialZoomLevel` is set, we don't need to fit the view
    if (this._isFirstDataAfterInit && fitViewOnInit && initialZoomLevel === undefined) {
      this._fitViewOnInitTimeoutID = window.setTimeout(() => {
        if (fitViewByNodesInRect) this.setZoomTransformByNodePositions(fitViewByNodesInRect, undefined, undefined, 0)
        else this.fitView()
      }, fitViewDelay)
    }
    this._isFirstDataAfterInit = false

    this.update(runSimulation)
  }

  /**
   * Center the view on a node and zoom in, by node id.
   * @param id Id of the node.
   * @param duration Duration of the animation transition in milliseconds (`700` by default).
   * @param scale Scale value to zoom in or out (`3` by default).
   * @param canZoomOut Set to `false` to prevent zooming out from the node (`true` by default).
   */
  public zoomToNodeById (id: string, duration = 700, scale = defaultScaleToZoom, canZoomOut = true): void {
    const node = this.graph.getNodeById(id)
    if (!node) return
    this.zoomToNode(node, duration, scale, canZoomOut)
  }

  /**
   * Center the view on a node and zoom in, by node index.
   * @param index The index of the node in the array of nodes.
   * @param duration Duration of the animation transition in milliseconds (`700` by default).
   * @param scale Scale value to zoom in or out (`3` by default).
   * @param canZoomOut Set to `false` to prevent zooming out from the node (`true` by default).
   */
  public zoomToNodeByIndex (index: number, duration = 700, scale = defaultScaleToZoom, canZoomOut = true): void {
    const node = this.graph.getNodeByIndex(index)
    if (!node) return
    this.zoomToNode(node, duration, scale, canZoomOut)
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
   * Get current X and Y coordinates of the nodes.
   * @returns Object where keys are the ids of the nodes and values are corresponding `{ x: number; y: number }` objects.
   */
  public getNodePositions (): { [key: string]: { x: number; y: number } } {
    if (this.hasParticleSystemDestroyed) return {}
    const particlePositionPixels = readPixels(this.reglInstance, this.points.currentPositionFbo as regl.Framebuffer2D)
    return this.graph.nodes.reduce<{ [key: string]: { x: number; y: number } }>((acc, curr) => {
      const index = this.graph.getSortedIndexById(curr.id) as number
      const posX = particlePositionPixels[index * 4 + 0]
      const posY = particlePositionPixels[index * 4 + 1]
      if (posX !== undefined && posY !== undefined) {
        acc[curr.id] = {
          x: posX,
          y: posY,
        }
      }
      return acc
    }, {})
  }

  /**
   * Get current X and Y coordinates of the nodes.
   * @returns A Map object where keys are the ids of the nodes and values are their corresponding X and Y coordinates in the [number, number] format.
   */
  public getNodePositionsMap (): Map<string, [number, number]> {
    const positionMap = new Map()
    if (this.hasParticleSystemDestroyed) return positionMap
    const particlePositionPixels = readPixels(this.reglInstance, this.points.currentPositionFbo as regl.Framebuffer2D)
    return this.graph.nodes.reduce<Map<string, [number, number]>>((acc, curr) => {
      const index = this.graph.getSortedIndexById(curr.id) as number
      const posX = particlePositionPixels[index * 4 + 0]
      const posY = particlePositionPixels[index * 4 + 1]
      if (posX !== undefined && posY !== undefined) {
        acc.set(curr.id, [posX, posY])
      }
      return acc
    }, positionMap)
  }

  /**
   * Get current X and Y coordinates of the nodes.
   * @returns Array of `[x: number, y: number]` arrays.
   */
  public getNodePositionsArray (): [number, number][] {
    const positions: [number, number][] = []
    if (this.hasParticleSystemDestroyed) return []
    const particlePositionPixels = readPixels(this.reglInstance, this.points.currentPositionFbo as regl.Framebuffer2D)
    positions.length = this.graph.nodes.length
    for (let i = 0; i < this.graph.nodes.length; i += 1) {
      const index = this.graph.getSortedIndexByInputIndex(i) as number
      const posX = particlePositionPixels[index * 4 + 0]
      const posY = particlePositionPixels[index * 4 + 1]
      if (posX !== undefined && posY !== undefined) {
        positions[i] = [posX, posY]
      }
    }
    return positions
  }

  /**
   * Center and zoom in/out the view to fit all nodes in the scene.
   * @param duration Duration of the center and zoom in/out animation in milliseconds (`250` by default).
   * @param padding Padding around the viewport in percentage
   */
  public fitView (duration = 250, padding = 0.1): void {
    this.setZoomTransformByNodePositions(this.getNodePositionsArray(), duration, undefined, padding)
  }

  /**
   * Center and zoom in/out the view to fit nodes by their ids in the scene.
   * @param duration Duration of the center and zoom in/out animation in milliseconds (`250` by default).
   * @param padding Padding around the viewport in percentage
   */
  public fitViewByNodeIds (ids: string[], duration = 250, padding = 0.1): void {
    const positionsMap = this.getNodePositionsMap()
    const positions = ids.map(id => positionsMap.get(id)).filter((d): d is [number, number] => d !== undefined)
    this.setZoomTransformByNodePositions(positions, duration, undefined, padding)
  }

  /** Select nodes inside a rectangular area.
   * @param selection - Array of two corner points `[[left, top], [right, bottom]]`.
   * The `left` and `right` coordinates should be from 0 to the width of the canvas.
   * The `top` and `bottom` coordinates should be from 0 to the height of the canvas. */
  public selectNodesInRange (selection: [[number, number], [number, number]] | null): void {
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
   * Select a node by id. If you want the adjacent nodes to get selected too, provide `true` as the second argument.
   * @param id Id of the node.
   * @param selectAdjacentNodes When set to `true`, selects adjacent nodes (`false` by default).
   */
  public selectNodeById (id: string, selectAdjacentNodes = false): void {
    if (selectAdjacentNodes) {
      const adjacentNodes = this.graph.getAdjacentNodes(id) ?? []
      this.selectNodesByIds([id, ...adjacentNodes.map(d => d.id)])
    } else this.selectNodesByIds([id])
  }

  /**
   * Select a node by index. If you want the adjacent nodes to get selected too, provide `true` as the second argument.
   * @param index The index of the node in the array of nodes.
   * @param selectAdjacentNodes When set to `true`, selects adjacent nodes (`false` by default).
   */
  public selectNodeByIndex (index: number, selectAdjacentNodes = false): void {
    const node = this.graph.getNodeByIndex(index)
    if (node) this.selectNodeById(node.id, selectAdjacentNodes)
  }

  /**
   * Select multiples nodes by their ids.
   * @param ids Array of nodes ids.
   */
  public selectNodesByIds (ids?: (string | undefined)[] | null): void {
    this.selectNodesByIndices(ids?.map(d => this.graph.getSortedIndexById(d)))
  }

  /**
   * Select multiples nodes by their indices.
   * @param indices Array of nodes indices.
   */
  public selectNodesByIndices (indices?: (number | undefined)[] | null): void {
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
   * Unselect all nodes.
   */
  public unselectNodes (): void {
    this.store.selectedIndices = null
    this.points.updateGreyoutStatus()
  }

  /**
   * Get nodes that are currently selected.
   * @returns Array of selected nodes.
   */
  public getSelectedNodes (): N[] | null {
    const { selectedIndices } = this.store
    if (!selectedIndices) return null
    const points = new Array(selectedIndices.length)
    for (const [i, selectedIndex] of selectedIndices.entries()) {
      if (selectedIndex !== undefined) {
        const index = this.graph.getInputIndexBySortedIndex(selectedIndex)
        if (index !== undefined) points[i] = this.graph.nodes[index]
      }
    }
    return points
  }

  /**
   * Get nodes that are adjacent to a specific node by its id.
   * @param id Id of the node.
   * @returns Array of adjacent nodes.
   */

  public getAdjacentNodes (id: string): N[] | undefined {
    return this.graph.getAdjacentNodes(id)
  }

  /**
   * Set focus on a node by id. A ring will be highlighted around the focused node.
   * If no id is specified, the focus will be reset.
   * @param id Id of the node.
   */
  public setFocusedNodeById (id?: string): void {
    if (id === undefined) {
      this.store.setFocusedNode()
    } else {
      this.store.setFocusedNode(this.graph.getNodeById(id), this.graph.getSortedIndexById(id))
    }
  }

  /**
   * Set focus on a node by index. A ring will be highlighted around the focused node.
   * If no index is specified, the focus will be reset.
   * @param index The index of the node in the array of nodes.
   */
  public setFocusedNodeByIndex (index?: number): void {
    if (index === undefined) {
      this.store.setFocusedNode()
    } else {
      this.store.setFocusedNode(this.graph.getNodeByIndex(index), index)
    }
  }

  /**
   * Converts the X and Y node coordinates from the space coordinate system to the screen coordinate system.
   * @param spacePosition Array of x and y coordinates in the space coordinate system.
   * @returns Array of x and y coordinates in the screen coordinate system.
   */

  public spaceToScreenPosition (spacePosition: [number, number]): [number, number] {
    return this.zoomInstance.convertSpaceToScreenPosition(spacePosition)
  }

  /**
   * Converts the node radius value from the space coordinate system to the screen coordinate system.
   * @param spaceRadius Radius of Node in the space coordinate system.
   * @returns Radius of Node in the screen coordinate system.
   */
  public spaceToScreenRadius (spaceRadius: number): number {
    return this.zoomInstance.convertSpaceToScreenRadius(spaceRadius)
  }

  /**
   * Get node radius by its index.
   * @param index Index of the node.
   * @returns Radius of the node.
   */
  public getNodeRadiusByIndex (index: number): number | undefined {
    return this.points.getNodeRadiusByIndex(index)
  }

  /**
   * Get node radius by its id.
   * @param id Id of the node.
   * @returns Radius of the node.
   */
  public getNodeRadiusById (id: string): number | undefined {
    const index = this.graph.getInputIndexById(id)
    if (index === undefined) return undefined
    return this.points.getNodeRadiusByIndex(index)
  }

  /**
   * Track multiple node positions by their ids on each Cosmos tick.
   * @param ids Array of nodes ids.
   */
  public trackNodePositionsByIds (ids: string[]): void {
    this.points.trackNodesByIds(ids)
  }

  /**
   * Track multiple node positions by their indices on each Cosmos tick.
   * @param ids Array of nodes indices.
   */
  public trackNodePositionsByIndices (indices: number[]): void {
    this.points.trackNodesByIds(
      indices.map(index => this.graph.getNodeByIndex(index))
        .filter((d): d is N => d !== undefined)
        .map(d => d.id)
    )
  }

  /**
   * Get current X and Y coordinates of the tracked nodes.
   * @returns A Map object where keys are the ids of the nodes and values are their corresponding X and Y coordinates in the [number, number] format.
   */
  public getTrackedNodePositionsMap (): Map<string, [number, number]> {
    return this.points.getTrackedPositions()
  }

  /**
   * For the nodes that are currently visible on the screen, get a sample of node ids with their coordinates.
   * The resulting number of nodes will depend on the `nodeSamplingDistance` configuration property,
   * and the sampled nodes will be evenly distributed.
   * @returns A Map object where keys are the ids of the nodes and values are their corresponding X and Y coordinates in the [number, number] format.
   */
  public getSampledNodePositionsMap (): Map<string, [number, number]> {
    return this.points.getSampledNodePositionsMap()
  }

  /**
   * Start the simulation.
   * @param alpha Value from 0 to 1. The higher the value, the more initial energy the simulation will get.
   */
  public start (alpha = 1): void {
    if (!this.graph.nodes.length) return
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
    this.store.pointsTextureSize = Math.ceil(Math.sqrt(graph.nodes.length))
    this.store.linksTextureSize = Math.ceil(Math.sqrt(graph.linksNumber * 2))
    this.destroyParticleSystem()
    this.create()
    this.initPrograms()
    this.setFocusedNodeById()
    this.store.hoveredNode = undefined
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
            this.store.hoveredNode?.node,
            this.store.hoveredNode ? this.graph.getInputIndexBySortedIndex(this.store.hoveredNode.index) : undefined,
            this.store.hoveredNode?.position
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
      this.store.hoveredNode?.node,
      this.store.hoveredNode ? this.graph.getInputIndexBySortedIndex(this.store.hoveredNode.index) : undefined,
      this.store.hoveredNode?.position,
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
      this.store.hoveredNode?.node,
      this.store.hoveredNode ? this.graph.getInputIndexBySortedIndex(this.store.hoveredNode.index) : undefined,
      this.store.hoveredNode?.position,
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
      this.points.updateSampledNodesGrid()
    }
  }

  private setZoomTransformByNodePositions (positions: [number, number][], duration = 250, scale?: number, padding?: number): void {
    this.resizeCanvas()
    const transform = this.zoomInstance.getTransform(positions, scale, padding)
    this.canvasD3Selection
      .transition()
      .ease(easeQuadInOut)
      .duration(duration)
      .call(this.zoomInstance.behavior.transform, transform)
  }

  private zoomToNode (node: N, duration: number, scale: number, canZoomOut: boolean): void {
    const { graph, store: { screenSize } } = this
    const positionPixels = readPixels(this.reglInstance, this.points.currentPositionFbo as regl.Framebuffer2D)
    const nodeIndex = graph.getSortedIndexById(node.id)
    if (nodeIndex === undefined) return
    const posX = positionPixels[nodeIndex * 4 + 0]
    const posY = positionPixels[nodeIndex * 4 + 1]
    if (posX === undefined || posY === undefined) return
    const distance = this.zoomInstance.getDistanceToPoint([posX, posY])
    const zoomLevel = canZoomOut ? scale : Math.max(this.getZoomLevel(), scale)
    if (distance < Math.min(screenSize[0], screenSize[1])) {
      this.setZoomTransformByNodePositions([[posX, posY]], duration, zoomLevel)
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
    const nodeSize = pixels[1] as number
    if (nodeSize) {
      const index = pixels[0] as number
      const inputIndex = this.graph.getInputIndexBySortedIndex(index)
      const hovered = inputIndex !== undefined ? this.graph.getNodeByIndex(inputIndex) : undefined
      if (this.store.hoveredNode?.node !== hovered) isMouseover = true
      const pointX = pixels[2] as number
      const pointY = pixels[3] as number
      this.store.hoveredNode = hovered && {
        node: hovered,
        index,
        position: [pointX, pointY],
      }
    } else {
      if (this.store.hoveredNode) isMouseout = true
      this.store.hoveredNode = undefined
    }

    if (isMouseover && this.store.hoveredNode) {
      this.config.events.onNodeMouseOver?.(
        this.store.hoveredNode.node as N,
        this.graph.getInputIndexBySortedIndex(
          this.graph.getSortedIndexById(this.store.hoveredNode.node.id) as number
        ) as number,
        this.store.hoveredNode.position,
        this.currentEvent
      )
    }
    if (isMouseout) this.config.events.onNodeMouseOut?.(this.currentEvent)
  }
}

export type { CosmosInputNode, CosmosInputLink, InputNode, InputLink } from './types'
export type { GraphConfigInterface, GraphEvents, GraphSimulationSettings } from './config'
