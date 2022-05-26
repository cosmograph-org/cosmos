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
import { Store, ALPHA_MIN } from '@/graph/modules/Store'
import { Zoom } from '@/graph/modules/Zoom'
import { Node, Link, InputNode, InputLink } from '@/graph/types'
import { defaultConfigValues } from '@/graph/variables'

export class Graph<N extends InputNode, L extends InputLink> {
  public config = new GraphConfig<Node<N>, Link<N, L>>()
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
  private forceLinkOutcoming: ForceLink<N, L>
  private forceMouse: ForceMouse<N, L>
  private zoomInstance = new Zoom(this.store)
  private fpsMonitor: FPSMonitor | undefined
  private hasBeenRecentlyDestroyed = false

  public constructor (canvas: HTMLCanvasElement, config?: GraphConfigInterface<N, L>) {
    if (config) this.config.init(config)

    const w = canvas.clientWidth
    const h = canvas.clientHeight
    this.store.screenSize = [w, h]

    canvas.width = w * this.config.pixelRatio
    canvas.height = h * this.config.pixelRatio
    // If the canvas element has no CSS width and height style, the clientWidth and the clientHeight will always be equal to the width and height canvas attribute.
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

    this.points = new Points(this.reglInstance, this.config, this.store, this.graph)
    this.lines = new Lines(this.reglInstance, this.config, this.store, this.graph, this.points)
    this.forceGravity = new ForceGravity(this.reglInstance, this.config, this.store, this.graph, this.points)
    this.forceCenter = new ForceCenter(this.reglInstance, this.config, this.store, this.graph, this.points)
    this.forceManyBody = this.config.useQuadtree
      ? new ForceManyBodyQuadtree(this.reglInstance, this.config, this.store, this.graph, this.points)
      : new ForceManyBody(this.reglInstance, this.config, this.store, this.graph, this.points)
    this.forceLinkIncoming = new ForceLink(this.reglInstance, this.config, this.store, this.graph, this.points)
    this.forceLinkOutcoming = new ForceLink(this.reglInstance, this.config, this.store, this.graph, this.points)
    this.forceMouse = new ForceMouse(this.reglInstance, this.config, this.store, this.graph, this.points)

    this.store.backgroundColor = getRgbaColor(this.config.backgroundColor)

    if (this.config.showFPSMonitor) this.fpsMonitor = new FPSMonitor(this.canvas)
  }

  public get progress (): number {
    return this.store.simulationProgress
  }

  public get simulationIsRunning (): boolean {
    return this.store.simulationIsRunning
  }

  public get nodes (): Node<N>[] {
    return this.graph.nodes
  }

  public get links (): Link<N, L>[] {
    return this.graph.links
  }

  public setConfig (config: Partial<GraphConfigInterface<Node<N>, Link<N, L>>>): void {
    const prevConfig = { ...this.config }
    this.config.init(config)
    if (prevConfig.linkColor !== this.config.linkColor) this.lines.updateColor()
    if (prevConfig.nodeColor !== this.config.nodeColor) this.points.updateColor()
    if (prevConfig.nodeSize !== this.config.nodeSize) this.points.updateSize()
    if (prevConfig.linkWidth !== this.config.linkWidth) this.lines.updateWidth()
    if (prevConfig.backgroundColor !== this.config.backgroundColor) this.store.backgroundColor = getRgbaColor(this.config.backgroundColor)
    if (prevConfig.spaceSize !== this.config.spaceSize ||
      prevConfig.simulation.repulsionQuadtreeLevels !== this.config.simulation.repulsionQuadtreeLevels) this.update(this.store.simulationIsRunning)
    if (prevConfig.showFPSMonitor !== this.config.showFPSMonitor) {
      if (this.config.showFPSMonitor) {
        this.fpsMonitor = new FPSMonitor(this.canvas)
      } else {
        this.fpsMonitor?.destroy()
        this.fpsMonitor = undefined
      }
    }
  }

  public setData (nodes: InputNode[], links: InputLink[], runSimulation = true): void {
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

  public findNodeById (id: string): Node<N> | undefined {
    return this.graph.findNodeById(id)
  }

  public selectNodeById (id: string): void {
    const node = this.graph.findNodeById(id)
    if (!node) return
    const positionPixels = readPixels(this.reglInstance, this.points.currentPositionFbo as regl.Framebuffer2D)
    const posX = positionPixels[node.index * 4 + 0]
    const posY = positionPixels[node.index * 4 + 1]
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

  public zoom (value: number, duration = 0): void {
    select(this.canvas)
      .transition()
      .duration(duration)
      .call(this.zoomInstance.behavior.scaleTo, value)
  }

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

  public onSelect (selection: [[number, number], [number, number]] | null): void {
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
  }

  public get selectedPoints (): N[] {
    return this.graph.nodes.filter((n, i) => this.store.selectedIndices.includes(i))
  }

  public start (alpha = 1): void {
    if (!this.graph.nodes.length) return
    this.store.simulationIsRunning = true
    this.store.alpha = alpha
    this.store.simulationProgress = 0
    this.config.simulation.onStart?.()
    this.stopFrames()
    this.frame()
  }

  public pause (): void {
    this.store.simulationIsRunning = false
    this.config.simulation.onPause?.()
  }

  public restart (): void {
    this.store.simulationIsRunning = true
    this.config.simulation.onRestart?.()
  }

  public drawOneFrame (): void {
    this.store.simulationIsRunning = false
    this.stopFrames()
    this.frame()
  }

  public destroy (): void {
    this.stopFrames()
    if (this.hasBeenRecentlyDestroyed) return
    this.points.destroy()
    this.lines.destroy()
    this.forceCenter.destroy()
    this.forceLinkIncoming.destroy()
    this.forceLinkOutcoming.destroy()
    this.forceManyBody?.destroy()
    this.reglInstance.destroy()
    this.hasBeenRecentlyDestroyed = true
  }

  public create (): void {
    this.points.create()
    this.lines.create()
    this.forceManyBody?.create()
    this.forceLinkIncoming.create(LinkDirection.INCOMING)
    this.forceLinkOutcoming.create(LinkDirection.OUTCOMING)
    this.forceCenter.create()
    this.hasBeenRecentlyDestroyed = false
  }

  private update (runSimulation: boolean): void {
    const { graph } = this
    this.store.pointsTextureSize = Math.ceil(Math.sqrt(graph.nodes.length))
    this.store.linksTextureSize = Math.ceil(Math.sqrt(graph.links.length * 2))
    this.destroy()
    this.create()
    this.initPrograms()
    if (runSimulation) {
      this.start()
    } else {
      this.drawOneFrame()
    }
  }

  private initPrograms (): void {
    this.points.initPrograms()
    this.lines.initPrograms()
    this.forceGravity.initPrograms()
    this.forceLinkIncoming.initPrograms()
    this.forceLinkOutcoming.initPrograms()
    this.forceMouse.initPrograms()
    this.forceManyBody?.initPrograms()
    this.forceCenter.initPrograms()
  }

  private frame (): void {
    const { config: { simulation, renderLinks }, store: { alpha, simulationIsRunning } } = this
    if (alpha < ALPHA_MIN && simulationIsRunning) this.end()

    this.requestAnimationFrameId = window.requestAnimationFrame((now) => {
      this.fpsMonitor?.begin()
      this.resizeCanvas()

      if (this.isRightClickMouse) {
        if (!simulationIsRunning) this.start(0.1)
        this.forceMouse.run()
        this.points.updatePosition()
      }

      if ((simulationIsRunning && !this.zoomInstance.isRunning)) {
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
        this.forceLinkOutcoming.run()
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
    this.store.simulationIsRunning = false
    this.store.simulationProgress = 1
    this.config.simulation.onEnd?.()
  }

  private onClick (event: MouseEvent): void {
    const h = this.store.screenSize[1]
    this.store.selectedArea = [[event.offsetX, (h - event.offsetY)], [event.offsetX, (h - event.offsetY)]]
    this.points.findPoint(true)
    const pixels = readPixels(this.reglInstance, this.points.selectedFbo as regl.Framebuffer2D)
    const selectedIndices = pixels
      .map((pixel, i) => {
        if (i % 4 === 0 && pixel !== 0) return i / 4
        else return 404
      })
      .filter(d => d !== 404)
    this.store.selectedIndices = selectedIndices
    const clickedId = selectedIndices[selectedIndices.length - 1] ?? -1
    const clickedParticle = selectedIndices.length ? this.graph.nodes[clickedId] : undefined
    this.config.events.onClick?.(clickedParticle)
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
}

export type { InputLink, InputNode, Node, Link } from './types'
export type { GraphConfigInterface } from './config'
