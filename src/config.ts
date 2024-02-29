import { D3ZoomEvent } from 'd3-zoom'
import { CosmosInputNode, CosmosInputLink } from '@/graph/types'
import {
  defaultNodeColor,
  defaultGreyoutNodeOpacity,
  defaultNodeSize,
  defaultLinkColor,
  defaultGreyoutLinkOpacity,
  defaultLinkWidth,
  defaultBackgroundColor,
  defaultConfigValues,
} from '@/graph/variables'
import { isPlainObject } from '@/graph/helper'

export type NumericAccessor<Datum> = ((d: Datum, i: number, ...rest: unknown[]) => number | null) | number | null | undefined
export type ColorAccessor<Datum> = ((d: Datum, i: number, ...rest: unknown[]) => string | [number, number, number, number] | null)
  | string | [number, number, number, number] | null | undefined
export type BooleanAccessor<Datum> = ((d: Datum, i: number, ...rest: unknown[]) => boolean | null) | boolean | null | undefined

export interface GraphEvents <N extends CosmosInputNode> {
  /**
   * Callback function that will be called on every canvas click.
   * If clicked on a node, its data will be passed as the first argument,
   * index as the second argument, position as the third argument
   * and the corresponding mouse event as the forth argument:
   * `(node: Node | undefined, index: number | undefined, nodePosition: [number, number] | undefined, event: MouseEvent) => void`.
   * Default value: `undefined`
   */
  onClick?: (
      clickedNode: N | undefined, index: number | undefined, nodePosition: [number, number] | undefined, event: MouseEvent
    ) => void;
  /**
   * Callback function that will be called when mouse movement happens.
   * If the mouse moves over a node, its data will be passed as the first argument,
   * index as the second argument, position as the third argument
   * and the corresponding mouse event as the forth argument:
   * `(node: Node | undefined, index: number | undefined, nodePosition: [number, number] | undefined, event: MouseEvent) => void`.
   * Default value: `undefined`
   */
  onMouseMove?: (
      hoveredNode: N | undefined, index: number | undefined, nodePosition: [number, number] | undefined, event: MouseEvent
    ) => void;
  /**
   * Callback function that will be called when a node appears under the mouse
   * as a result of a mouse event, zooming and panning, or movement of nodes.
   * The node data will be passed as the first argument,
   * index as the second argument, position as the third argument
   * and the corresponding mouse event or D3's zoom event as the forth argument:
   * `(node: Node, index: number, nodePosition: [number, number], event: MouseEvent | D3ZoomEvent<HTMLCanvasElement, undefined) => void`.
   * Default value: `undefined`
   */
  onNodeMouseOver?: (
      hoveredNode: N, index: number, nodePosition: [number, number], event: MouseEvent | D3ZoomEvent<HTMLCanvasElement, undefined> | undefined
    ) => void;
  /**
   * Callback function that will be called when a node is no longer underneath
   * the mouse pointer because of a mouse event, zoom/pan event, or movement of nodes.
   * The corresponding mouse event or D3's zoom event will be passed as the first argument:
   * `(event: MouseEvent | D3ZoomEvent<HTMLCanvasElement, undefined) => void`.
   * Default value: `undefined`
   */
  onNodeMouseOut?: (event: MouseEvent | D3ZoomEvent<HTMLCanvasElement, undefined> | undefined) => void;
  /**
   * Callback function that will be called when zooming or panning starts.
   * First argument is a D3 Zoom Event and second indicates whether
   * the event has been initiated by a user interaction (e.g. a mouse event):
   * `(event: D3ZoomEvent, userDriven: boolean) => void`.
   * Default value: `undefined`
   */
  onZoomStart?: (e: D3ZoomEvent<HTMLCanvasElement, undefined>, userDriven: boolean) => void;
  /**
   * Callback function that will be called continuously during zooming or panning.
   * First argument is a D3 Zoom Event and second indicates whether
   * the event has been initiated by a user interaction (e.g. a mouse event):
   * `(event: D3ZoomEvent, userDriven: boolean) => void`.
   * Default value: `undefined`
   */
  onZoom?: (e: D3ZoomEvent<HTMLCanvasElement, undefined>, userDriven: boolean) => void;
  /**
   * Callback function that will be called when zooming or panning ends.
   * First argument is a D3 Zoom Event and second indicates whether
   * the event has been initiated by a user interaction (e.g. a mouse event):
   * `(event: D3ZoomEvent, userDriven: boolean) => void`.
   * Default value: `undefined`
   */
  onZoomEnd?: (e: D3ZoomEvent<HTMLCanvasElement, undefined>, userDriven: boolean) => void;
}

export interface GraphSimulationSettings<N> {
  /**
   * Decay coefficient. Use smaller values if you want the simulation to "cool down" slower.
   * Default value: `1000`
   */
  decay?: number;
  /**
   * Gravity force coefficient.
   * Default value: `0`
   */
  gravity?: number;
  /**
   * Centering to center mass force coefficient.
   * Default value: `0`
   */
  center?: number;
  /**
   * Repulsion force coefficient.
   * Default value: `0.1`
   */
  repulsion?: number;
  /**
   * Decreases / increases the detalization of the Many-Body force calculations.
   * When `useQuadtree` is set to `true`, this property corresponds to the Barnes–Hut approximation criterion.
   * Default value: `1.7`
   */
  repulsionTheta?: number;
  /**
   * Barnes–Hut approximation depth.
   * Can only be used when `useQuadtree` is set `true`.
   * Default value: `12`
   */
  repulsionQuadtreeLevels?: number;
  /**
   * Link spring force coefficient.
   * Default value: `1`
   */
  linkSpring?: number;
  /**
   * Minimum link distance.
   * Default value: `2`
   */
  linkDistance?: number;
  /**
   * Range of random link distance values.
   * Default value: `[1, 1.2]`
   */
  linkDistRandomVariationRange?: number[];
  /**
   * Repulsion coefficient from mouse position.
   * The repulsion force is activated by pressing the right mouse button.
   * Default value: `2`
   */
  repulsionFromMouse?: number;
  /**
   * Friction coefficient.
   * Default value: `0.85`
   */
  friction?: number;
  /**
   * Callback function that will be called when the simulation starts.
   * Default value: `undefined`
   */
  onStart?: () => void;
  /**
   * Callback function that will be called on every simulation tick.
   * The value of the first argument `alpha` will decrease over time as the simulation "cools down".
   * If there's a node under the mouse pointer, its datum will be passed as the second argument,
   * index as the third argument and position as the forth argument:
   * `(alpha: number, node: Node | undefined, index: number | undefined, nodePosition: [number, number] | undefined) => void`.
   * Default value: `undefined`
   */
  onTick?: (
    alpha: number, hoveredNode?: N, index?: number, nodePosition?: [number, number]
    ) => void;
  /**
   * Callback function that will be called when the simulation stops.
   * Default value: `undefined`
   */
  onEnd?: () => void;
  /**
   * Callback function that will be called when the simulation gets paused.
   * Default value: `undefined`
   */
  onPause?: () => void;
  /**
   * Callback function that will be called when the simulation is restarted.
   * Default value: `undefined`
   */
  onRestart?: () => void;
}
export interface GraphConfigInterface<N extends CosmosInputNode, L extends CosmosInputLink> {
  /**
   * Do not run the simulation, just render the graph.
   * Cosmos uses the x and y values of the nodes’ data to determine their position in the graph.
   * If x and y values are not specified, the position of the nodes will be assigned randomly.
   * This property will be applied only on component initialization and it
   * can't be changed using the `setConfig` method.
   * Default value: `false`
   */
  disableSimulation?: boolean;
  /**
   * Canvas background color.
   * Default value: '#222222'
   */
  backgroundColor?: string;
  /**
   * Simulation space size (max 8192).
   * Default value: `4096`
   */
  spaceSize?: number;
  /**
   * Node color accessor function or hex value.
   * Default value: '#b3b3b3'
  */
  nodeColor?: ColorAccessor<N>;
  /**
   * Greyed out node opacity value when the selection is active.
   * Default value: `0.1`
  */
  nodeGreyoutOpacity?: number;
  /**
   * Node size accessor function or value in pixels.
   * Default value: `4`
  */
  nodeSize?: NumericAccessor<N>;
  /**
   * Scale factor for the node size.
   * Default value: `1`
   */
  nodeSizeScale?: number;

  /**
   * Turns the node highlight on hover on / off.
   * @deprecated Will be removed from version 2.0. Use property `renderHoveredNodeRing` instead.
   * @todo Remove deprecated type `InputNode` in version 2.0.
   * Default value: `true`
   */
  renderHighlightedNodeRing?: boolean;

  /**
   * Turns ring rendering around a node on hover on / off
   * Default value: `true`
   */
  renderHoveredNodeRing?: boolean;

  /**
   * Highlighted node ring color hex value.
   * @deprecated Will be removed from version 2.0. Use property `hoveredNodeRingColor` or `focusedNodeRingColor` instead.
   * @todo Remove deprecated type `InputNode` in version 2.0.
   * Default value: undefined
   */
  highlightedNodeRingColor?: string;

  /**
   * Hovered node ring color hex value.
   * Default value: `white`
   */
  hoveredNodeRingColor?: string;

  /**
   * Focused node ring color hex value.
   * Default value: `white`
   */
  focusedNodeRingColor?: string;

  /**
   * Turns link rendering on / off.
   * Default value: `true`
   */
  renderLinks?: boolean;
  /**
   * Link color accessor function or hex value.
   * Default value: '#666666'
   */
  linkColor?: ColorAccessor<L>;
  /**
   * Greyed out link opacity value when the selection is active.
   * Default value: `0.1`
  */
  linkGreyoutOpacity?: number;
  /**
   * Link width accessor function or value in pixels.
   * Default value: `1`
  */
  linkWidth?: NumericAccessor<L>;
  /**
   * Scale factor for the link width.
   * Default value: `1`
   */
  linkWidthScale?: number;
  /**
   * If set to true, links are rendered as curved lines.
   * Otherwise as straight lines.
   * Default value: `false`
   */
  curvedLinks?: boolean;
  /**
   * Number of segments in a curved line.
   * Default value: `19`.
   */
  curvedLinkSegments?: number;
  /**
   * Weight affects the shape of the curve.
   * Default value: `0.8`.
   */
  curvedLinkWeight?: number;
  /**
   * Defines the position of the control point of the curve on the normal from the centre of the line.
   * If set to 1 then the control point is at a distance equal to the length of the line.
   * Default value: `0.5`
   */
  curvedLinkControlPointDistance?: number;
  /**
   * Link arrow accessor function or value that controls whether or not to display link arrows.
   * Default value: `true`
   */
  linkArrows?: BooleanAccessor<L>;
  /**
   * Scale factor for the link arrows size.
   * Default value: `1`
   */
  linkArrowsSizeScale?: number;
  /**
   * The range defines the minimum and maximum link visibility distance in pixels.
   * The link will be fully opaque when its length is less than the first number in the array,
   * and will have `linkVisibilityMinTransparency` transparency when its length is greater than
   * the second number in the array.
   * This distance is defined in screen space coordinates and will change as you zoom in and out
   * (e.g. links become longer when you zoom in, and shorter when you zoom out).
   * Default value: `[50, 150]`
   */
  linkVisibilityDistanceRange?: number[];
  /**
   * The transparency value that the link will have when its length reaches
   * the maximum link distance value from `linkVisibilityDistanceRange`.
   * Default value: `0.25`
   */
  linkVisibilityMinTransparency?: number;
  /**
   * Use the classic quadtree algorithm for the Many-Body force.
   * This property will be applied only on component initialization and it
   * can't be changed using the `setConfig` method.
   * Default value: `false`
   */
  useQuadtree?: boolean;
  /** Simulation parameters and event listeners */
  simulation?: GraphSimulationSettings<N>;
  /**
   * Events
   */
  events?: GraphEvents<N>;

  /**
   * Show WebGL performance monitor.
   * Default value: `false`
   */
  showFPSMonitor?: boolean;
  /**
   * Canvas pixel ratio.
   * Default value: `2`
   */
  pixelRatio?: number;
  /**
   * Increase or decrease the size of the nodes when zooming in or out.
   * Default value: true
   */
  scaleNodesOnZoom?: boolean;
  /**
   * Initial zoom level. Can be set once during graph initialization.
   * Default value: `undefined`
   */
  initialZoomLevel?: number;
  /**
   * Disables zooming in and out.
   * Default: `false`
   */
  disableZoom?: boolean;
  /**
   * Whether to center and zoom the view to fit all nodes in the scene on initialization or not.
   * Default: `true`
   */
  fitViewOnInit?: boolean;
  /**
   * Delay in milliseconds before fitting the view.
   * Useful if you want the layout to stabilize a bit before fitting.
   * Default: `250`
   */
  fitViewDelay?: number;
  /**
   * When `fitViewOnInit` is set to `true`, fits the view to show the nodes within a rectangle
   * defined by its two corner coordinates `[[left, bottom], [right, top]]` in the scene space.
   * Default: `undefined`
   */
  fitViewByNodesInRect?: [[number, number], [number, number]] | [number, number][];
  /**
   * Providing a `randomSeed` value allows you to control
   * the randomness of the layout across different simulation runs.
   * It is useful when you want the graph to always look the same on same datasets.
   * This property will be applied only on component initialization and it
   * can't be changed using the `setConfig` method.
   * Default value: undefined
   */
  randomSeed?: number | string;
  /**
   * Node sampling distance in pixels between neighboring nodes when calling the `getSampledNodePositionsMap` method.
   * This parameter determines how many nodes will be included in the sample.
   * Default value: `150`
  */
  nodeSamplingDistance?: number;
}

export class GraphConfig<N extends CosmosInputNode, L extends CosmosInputLink> implements GraphConfigInterface<N, L> {
  public disableSimulation = defaultConfigValues.disableSimulation
  public backgroundColor = defaultBackgroundColor
  public spaceSize = defaultConfigValues.spaceSize
  public nodeColor = defaultNodeColor
  public nodeGreyoutOpacity = defaultGreyoutNodeOpacity
  public nodeSize = defaultNodeSize
  public nodeSizeScale = defaultConfigValues.nodeSizeScale
  public renderHighlightedNodeRing = true
  public highlightedNodeRingColor = undefined
  public renderHoveredNodeRing = true
  public hoveredNodeRingColor = defaultConfigValues.hoveredNodeRingColor
  public focusedNodeRingColor = defaultConfigValues.focusedNodeRingColor
  public linkColor = defaultLinkColor
  public linkGreyoutOpacity = defaultGreyoutLinkOpacity
  public linkWidth = defaultLinkWidth
  public linkWidthScale = defaultConfigValues.linkWidthScale
  public renderLinks = defaultConfigValues.renderLinks
  public curvedLinks = defaultConfigValues.curvedLinks
  public curvedLinkSegments = defaultConfigValues.curvedLinkSegments
  public curvedLinkWeight = defaultConfigValues.curvedLinkWeight
  public curvedLinkControlPointDistance = defaultConfigValues.curvedLinkControlPointDistance
  public linkArrows = defaultConfigValues.arrowLinks
  public linkArrowsSizeScale = defaultConfigValues.arrowSizeScale
  public linkVisibilityDistanceRange = defaultConfigValues.linkVisibilityDistanceRange
  public linkVisibilityMinTransparency = defaultConfigValues.linkVisibilityMinTransparency
  public useQuadtree = defaultConfigValues.useQuadtree

  public simulation: GraphSimulationSettings<N> = {
    decay: defaultConfigValues.simulation.decay,
    gravity: defaultConfigValues.simulation.gravity,
    center: defaultConfigValues.simulation.center,
    repulsion: defaultConfigValues.simulation.repulsion,
    repulsionTheta: defaultConfigValues.simulation.repulsionTheta,
    repulsionQuadtreeLevels: defaultConfigValues.simulation.repulsionQuadtreeLevels,
    linkSpring: defaultConfigValues.simulation.linkSpring,
    linkDistance: defaultConfigValues.simulation.linkDistance,
    linkDistRandomVariationRange: defaultConfigValues.simulation.linkDistRandomVariationRange,
    repulsionFromMouse: defaultConfigValues.simulation.repulsionFromMouse,
    friction: defaultConfigValues.simulation.friction,
    onStart: undefined,
    onTick: undefined,
    onEnd: undefined,
    onPause: undefined,
    onRestart: undefined,
  }

  public events: GraphEvents<N> = {
    onClick: undefined,
    onMouseMove: undefined,
    onNodeMouseOver: undefined,
    onNodeMouseOut: undefined,
    onZoomStart: undefined,
    onZoom: undefined,
    onZoomEnd: undefined,
  }

  public showFPSMonitor = defaultConfigValues.showFPSMonitor

  public pixelRatio = defaultConfigValues.pixelRatio

  public scaleNodesOnZoom = defaultConfigValues.scaleNodesOnZoom
  public initialZoomLevel = undefined
  public disableZoom = defaultConfigValues.disableZoom
  public fitViewOnInit = defaultConfigValues.fitViewOnInit
  public fitViewDelay = defaultConfigValues.fitViewDelay
  public fitViewByNodesInRect = undefined

  public randomSeed = undefined
  public nodeSamplingDistance = defaultConfigValues.nodeSamplingDistance

  public init (config: GraphConfigInterface<N, L>): void {
    (Object.keys(config) as (keyof GraphConfigInterface<N, L>)[])
      .forEach(configParameter => {
        this.deepMergeConfig(this.getConfig(), config, configParameter)
      })
  }

  public deepMergeConfig <T> (current: T, next: T, key: keyof T): void {
    if (isPlainObject(current[key]) && isPlainObject(next[key])) {
      // eslint-disable-next-line @typescript-eslint/ban-types
      (Object.keys(next[key] as Object) as (keyof T[keyof T])[])
        .forEach(configParameter => {
          this.deepMergeConfig(current[key], next[key], configParameter)
        })
    } else current[key] = next[key]
  }

  private getConfig (): GraphConfigInterface<N, L> {
    return this
  }
}
