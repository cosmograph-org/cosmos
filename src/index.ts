import { select } from 'd3-selection'
import 'd3-transition'
import { zoomIdentity } from 'd3-zoom'
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
import { InputNode, InputLink } from '@/graph/types'
import { defaultConfigValues } from '@/graph/variables'

export class Graph<N extends InputNode, L extends InputLink> {
  public config = new GraphConfig<N, L>()
  private canvas: HTMLCanvasElement
  private reglInstance: regl.Regl
  private requestAnimationFrameId = 0
  private isRightClickMouse = false

  private graph = new GraphData<N, L>()
  private store = new Store()
  private points: Points<N, L>
  private lines: Lines<N, L>
  private forceGravity: ForceGravity<N, L>
  private forceCenter: ForceCenter<N, L>
  private forceManyBody: ForceManyBody<N, L> | ForceManyBodyQuadtree<N, L> | undefined
  private forceLinkIncoming: ForceLink<N, L>
  private forceLinkOutgoing: ForceLink<N, L>
  private forceMouse: ForceMouse<N, L>
  private zoomInstance = new Zoom(this.store, this.config)
  private fpsMonitor: FPSMonitor | undefined
  private hasBeenRecentlyDestroyed = false

  public constructor (canvas: HTMLCanvasElement, config?: GraphConfigInterface<N, L>) {
    if (config) this.config.init(config)

    const w = canvas.clientWidth
    const h = canvas.clientHeight
    this.store.screenSize = [w, h]

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
    select(canvas)
      .call(this.zoomInstance.behavior)
      .on('click', this.onClick.bind(this))
      .on('mousemove', this.onMouseMove.bind(this))
      .on('contextmenu', this.onRightClickMouse.bind(this))

    this.reglInstance = regl({
      canvas: this.canvas,
      attributes: {
        antialias: false,
        preserveDrawingBuffer: true,
        premultipliedAlpha: false,
        alpha: false,
      },
      extensions: ['OES_texture_float', 'ANGLE_instanced_arrays'],
    })

    this.store.maxPointSize = (this.reglInstance.limits.pointSizeDims[1] ?? MAX_POINT_SIZE) / this.config.pixelRatio

    this.points = new Points(this.reglInstance, this.config, this.store, this.graph)
    this.lines = new Lines(this.reglInstance, this.config, this.store, this.graph, this.points)
    this.forceGravity = new ForceGravity(this.reglInstance, this.config, this.store, this.graph, this.points)
    this.forceCenter = new ForceCenter(this.reglInstance, this.config, this.store, this.graph, this.points)
    this.forceManyBody = this.config.useQuadtree
      ? new ForceManyBodyQuadtree(this.reglInstance, this.config, this.store, this.graph, this.points)
      : new ForceManyBody(this.reglInstance, this.config, this.store, this.graph, this.points)
    this.forceLinkIncoming = new ForceLink(this.reglInstance, this.config, this.store, this.graph, this.points)
    this.forceLinkOutgoing = new ForceLink(this.reglInstance, this.config, this.store, this.graph, this.points)
    this.forceMouse = new ForceMouse(this.reglInstance, this.config, this.store, this.graph, this.points)

    this.store.backgroundColor = getRgbaColor(this.config.backgroundColor)

    if (this.config.showFPSMonitor) this.fpsMonitor = new FPSMonitor(this.canvas)
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
    if (prevConfig.backgroundColor !== this.config.backgroundColor) this.store.backgroundColor = getRgbaColor(this.config.backgroundColor)
    if (prevConfig.spaceSize !== this.config.spaceSize ||
      prevConfig.simulation.repulsionQuadtreeLevels !== this.config.simulation.repulsionQuadtreeLevels) this.update(this.store.isSimulationRunning)
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
  }

  /**
   * Pass data to Cosmos.
   * @param nodes Array of nodes.
   * @param links Array of links.
   * @param runSimulation When set to `false`, the simulation won't be started automatically (`true` by default).
   */
  public setData (nodes: N[], links: L[], runSimulation = true): void {
    if (!nodes.length && !links.length) {
      this.destroy()
      this.reglInstance.clear({
        color: this.store.backgroundColor,
        depth: 1,
        stencil: 0,
      })
      return
    }
    this.graph.setData(nodes, links)
    this.update(runSimulation)
  }

  /**
   * Find a node by its id.
   * @param id Id of the node.
   * @returns Node or `undefined`.
   */
  public findNodeById (id: string): N | undefined {
    return this.graph.getNodeById(id)
  }

  /**
   * Center the view on a node and zoom in, by node id.
   * @param id Id of the node.
   */
  public zoomToNodeById (id: string): void {
    const node = this.graph.getNodeById(id)
    if (!node) return
    this.zoomToNode(node)
  }

  /**
   * Center the view on a node and zoom in, by node index.
   * @param index The index of the node in the array of nodes.
   */
  public zoomToNodeByIndex (index: number): void {
    const node = this.graph.getNodeByIndex(index)
    if (!node) return
    this.zoomToNode(node)
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
    select(this.canvas)
      .transition()
      .duration(duration)
      .call(this.zoomInstance.behavior.scaleTo, value)
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
    if (this.hasBeenRecentlyDestroyed) return {}
    const particlePositionPixels = readPixels(this.reglInstance, this.points.currentPositionFbo as regl.Framebuffer2D)
    return this.graph.nodes.reduce<{ [key: string]: { x: number; y: number } }>((acc, curr, i) => {
      const posX = particlePositionPixels[i * 4 + 0]
      const posY = particlePositionPixels[i * 4 + 1]
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
   * @returns Map where keys are the ids of the nodes and values are corresponding `[number, number]` with X and Y coordinates of the node.
   */
  public getNodePositionsMap (): Map<string, [number, number]> {
    const positionMap = new Map()
    if (this.hasBeenRecentlyDestroyed) return positionMap
    const particlePositionPixels = readPixels(this.reglInstance, this.points.currentPositionFbo as regl.Framebuffer2D)
    return this.graph.nodes.reduce<Map<string, [number, number]>>((acc, curr, i) => {
      const posX = particlePositionPixels[i * 4 + 0]
      const posY = particlePositionPixels[i * 4 + 1]
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
    if (this.hasBeenRecentlyDestroyed) return []
    const particlePositionPixels = readPixels(this.reglInstance, this.points.currentPositionFbo as regl.Framebuffer2D)
    positions.length = this.graph.nodes.length
    for (let i = 0; i < this.graph.nodes.length; i += 1) {
      const posX = particlePositionPixels[i * 4 + 0]
      const posY = particlePositionPixels[i * 4 + 1]
      if (posX !== undefined && posY !== undefined) {
        positions[i] = [posX, posY]
      }
    }
    return positions
  }

  /**
   * Center and zoom in/out the view to fit all nodes in the scene.
   * @param duration Duration of the center and zoom in/out animation in milliseconds (`500` by default).
   */
  public fitView (duration = 500): void {
    const { transform, scale } = this.zoomInstance.getTransform(this.getNodePositionsArray())
    select(this.canvas)
      .transition()
      .duration(duration / 2)
      .call(this.zoomInstance.behavior.transform, transform)
      .transition()
      .duration(duration / 2)
      .call(this.zoomInstance.behavior.scaleTo, scale)
  }

  /** Select nodes inside a rectangular area.
   * @param selection - Array of two corner points `[[left, top], [right, bottom]]`.
   * The `left` and `right` coordinates should be from 0 to the width of the canvas.
   * The `top` and `bottom` coordinates should be from 0 to the height of the canvas. */
  public selectNodesInRange (selection: [[number, number], [number, number]] | null): void {
    if (selection) {
      const h = this.store.screenSize[1]
      this.store.selectedArea = [[selection[0][0], (h - selection[1][1])], [selection[1][0], (h - selection[0][1])]]
      this.points.findPoint(false)
      const pixels = readPixels(this.reglInstance, this.points.selectedFbo as regl.Framebuffer2D)
      this.store.selectedIndices = pixels
        .map((pixel, i) => {
          if (i % 4 === 0 && pixel !== 0) return i / 4
          else return -1
        })
        .filter(d => d !== -1)
    } else {
      this.store.selectedIndices = new Float32Array()
    }
    this.points.updateGreyoutStatus()
  }

  /**
   * Select a node by id.
   * @param id Id of the node.
   */
  public selectNodeById (id: string): void {
    this.selectNodesByIds([id])
  }

  /**
   * Select multiples nodes by their ids.
   * @param ids Array of nodes ids.
   */
  public selectNodesByIds (ids: (string | undefined)[]): void {
    const indices = ids.map(d => this.graph.getSortedIndexById(d))
      .filter(d => d !== undefined) as number[]
    if (indices.length !== 0) {
      this.store.selectedIndices = new Float32Array(indices)
    } else {
      this.store.selectedIndices = new Float32Array()
    }
    this.points.updateGreyoutStatus()
  }

  /**
   * Get nodes that are currently selected.
   * @returns Array of selected nodes.
   */
  public getSelectedNodes (): N[] {
    const points = new Array(this.store.selectedIndices.length)
    for (let i = 0; i < this.store.selectedIndices.length; i += 1) {
      const selectedIndex = this.store.selectedIndices[i]
      if (selectedIndex !== undefined) {
        const index = this.graph.getInputIndexBySortedIndex(selectedIndex)
        if (index !== undefined) points[i] = this.graph.nodes[index]
      }
    }
    return points
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
    this.stopFrames()
    if (this.hasBeenRecentlyDestroyed) return
    this.points.destroy()
    this.lines.destroy()
    this.forceCenter.destroy()
    this.forceLinkIncoming.destroy()
    this.forceLinkOutgoing.destroy()
    this.forceManyBody?.destroy()
    this.reglInstance.destroy()
    this.hasBeenRecentlyDestroyed = true
  }

  /**
   * Create new Cosmos instance.
   */
  public create (): void {
    this.points.create()
    this.lines.create()
    this.forceManyBody?.create()
    this.forceLinkIncoming.create(LinkDirection.INCOMING)
    this.forceLinkOutgoing.create(LinkDirection.OUTGOING)
    this.forceCenter.create()
    this.hasBeenRecentlyDestroyed = false
  }

  private update (runSimulation: boolean): void {
    const { graph } = this
    this.store.pointsTextureSize = Math.ceil(Math.sqrt(graph.nodes.length))
    this.store.linksTextureSize = Math.ceil(Math.sqrt(graph.linksNumber * 2))
    this.destroy()
    this.create()
    this.initPrograms()
    if (runSimulation) {
      this.start()
    } else {
      this.step()
    }
  }

  private initPrograms (): void {
    this.points.initPrograms()
    this.lines.initPrograms()
    this.forceGravity.initPrograms()
    this.forceLinkIncoming.initPrograms()
    this.forceLinkOutgoing.initPrograms()
    this.forceMouse.initPrograms()
    this.forceManyBody?.initPrograms()
    this.forceCenter.initPrograms()
  }

  private frame (): void {
    const { config: { simulation, renderLinks }, store: { alpha, isSimulationRunning } } = this
    if (alpha < ALPHA_MIN && isSimulationRunning) this.end()

    this.requestAnimationFrameId = window.requestAnimationFrame((now) => {
      this.fpsMonitor?.begin()
      this.resizeCanvas()

      if (this.isRightClickMouse) {
        if (!isSimulationRunning) this.start(0.1)
        this.forceMouse.run()
        this.points.updatePosition()
      }

      if ((isSimulationRunning && !this.zoomInstance.isRunning)) {
        if (simulation.gravity) {
          this.forceGravity.run()
          this.points.updatePosition()
        }

        if (simulation.center) {
          this.forceCenter.run()
          this.points.updatePosition()
        }

        this.forceManyBody?.run()
        this.points.updatePosition()

        this.forceLinkIncoming.run()
        this.points.updatePosition()
        this.forceLinkOutgoing.run()
        this.points.updatePosition()

        this.store.alpha += this.store.addAlpha(this.config.simulation.decay ?? defaultConfigValues.simulation.decay)
        if (this.isRightClickMouse) this.store.alpha = Math.max(this.store.alpha, 0.1)
        this.store.simulationProgress = Math.sqrt(Math.min(1, ALPHA_MIN / this.store.alpha))
        this.config.simulation.onTick?.(this.store.alpha)
      }

      // Clear canvas
      this.reglInstance.clear({
        color: this.store.backgroundColor,
        depth: 1,
        stencil: 0,
      })

      if (renderLinks) {
        this.lines.draw()
      }

      this.points.draw()
      this.fpsMonitor?.end(now)

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
    const h = this.store.screenSize[1]
    this.store.selectedArea = [[event.offsetX, (h - event.offsetY)], [event.offsetX, (h - event.offsetY)]]
    this.points.findPoint(true)
    const pixels = readPixels(this.reglInstance, this.points.selectedFbo as regl.Framebuffer2D)
    const pixelsInSelectedArea = pixels
      .map((pixel, i) => {
        if (i % 4 === 0 && pixel !== 0) return i / 4
        else return -1
      })
      .filter(d => d !== -1)
    const clickedIndex = this.graph.getInputIndexBySortedIndex(pixelsInSelectedArea[pixelsInSelectedArea.length - 1] as number)
    const clickedParticle = (pixelsInSelectedArea.length && clickedIndex !== undefined) ? this.graph.nodes[clickedIndex] : undefined
    this.config.events.onClick?.(clickedParticle, clickedIndex)
  }

  private onMouseMove (event: MouseEvent): void {
    const { x, y, k } = this.zoomInstance.eventTransform
    const h = this.canvas.clientHeight
    const mouseX = event.offsetX
    const mouseY = event.offsetY
    const invertedX = (mouseX - x) / k
    const invertedY = (mouseY - y) / k
    this.store.mousePosition = [invertedX, (h - invertedY)]
    this.store.mousePosition[0] -= (this.store.screenSize[0] - this.config.spaceSize) / 2
    this.store.mousePosition[1] -= (this.store.screenSize[1] - this.config.spaceSize) / 2
    this.isRightClickMouse = event.which === 3
  }

  private onRightClickMouse (event: MouseEvent): void {
    event.preventDefault()
  }

  private resizeCanvas (): void {
    const prevWidth = this.canvas.width
    const prevHeight = this.canvas.height
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight

    if (prevWidth !== w * this.config.pixelRatio || prevHeight !== h * this.config.pixelRatio) {
      this.store.screenSize = [w, h]
      this.canvas.width = w * this.config.pixelRatio
      this.canvas.height = h * this.config.pixelRatio
      this.reglInstance.poll()
      select(this.canvas)
        .call(this.zoomInstance.behavior.transform, this.zoomInstance.eventTransform)
    }
  }

  private zoomToNode (node: N): void {
    const { graph } = this
    const positionPixels = readPixels(this.reglInstance, this.points.currentPositionFbo as regl.Framebuffer2D)
    const nodeIndex = graph.getSortedIndexById(node.id)
    if (nodeIndex === undefined) return
    const posX = positionPixels[nodeIndex * 4 + 0]
    const posY = positionPixels[nodeIndex * 4 + 1]
    if (posX === undefined || posY === undefined) return
    const scale = 8
    const translateX = posX - this.config.spaceSize / 2
    const translateY = posY - this.config.spaceSize / 2
    select(this.canvas)
      .transition()
      .duration(250)
      .call(this.zoomInstance.behavior.transform, zoomIdentity
        .translate(0, 0)
        .scale(1)
        .translate(-translateX, translateY)
      )
      .transition()
      .duration(500)
      .call(this.zoomInstance.behavior.scaleTo, scale)
  }
}

export type { InputLink, InputNode } from './types'
export type { GraphConfigInterface } from './config'
