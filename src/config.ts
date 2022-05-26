import { Node, Link, InputNode, InputLink } from '@/graph/types'
import {
  defaultNodeColor,
  defaultNodeSize,
  defaultLinkColor,
  defaultLinkWidth,
  defaultBackgroundColor,
  defaultConfigValues,
} from '@/graph/variables'

export type NumericAccessor<Datum> = ((d: Datum, i?: number, ...rest: unknown[]) => number | null) | number | null | undefined
export type StringAccessor<Datum> = ((d: Datum, i?: number, ...rest: unknown[]) => string | null) | string | null | undefined
export type ColorAccessor<Datum> = ((d: Datum, i?: number, ...rest: unknown[]) => string | [number, number, number, number] | null)
  | string | [number, number, number, number] | null | undefined

export interface Events <N extends InputNode> {
  /**
   * Callback function that will be called on every canvas click.
   * If clicked on a node, its data will be passed as an argument: `(node: Node<N> &vert; undefined) => void`.
   * Default value: `undefined`
   */
  onClick?: (clickedNode: Node<N> | undefined) => void;
}

export interface GraphSimulationSetting {
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
   * Default value: 12
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
   * The value of the argument `alpha` will decrease over time as the simulation "cools down":
   * `(alpha: number) => void`.
   * Default value: `undefined`
   */
  onTick?: (alpha?: number) => void;
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

export interface GraphConfigInterface<N extends InputNode, L extends InputLink> {
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
   * Turns link arrow rendering on / off.
   * Default value: `true`
   */
  linkArrows?: boolean;
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
  simulation?: GraphSimulationSetting;
  /**
   * Events
   */
  events?: Events<N>;

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
}

export class GraphConfig<N extends InputNode, L extends InputLink> implements GraphConfigInterface<Node<N>, Link<N, L>> {
  public backgroundColor = defaultBackgroundColor
  public spaceSize = defaultConfigValues.spaceSize
  public nodeColor = defaultNodeColor
  public nodeSize = defaultNodeSize
  public nodeSizeScale = defaultConfigValues.nodeSizeScale
  public linkColor = defaultLinkColor
  public linkWidth = defaultLinkWidth
  public linkWidthScale = defaultConfigValues.linkWidthScale
  public renderLinks = defaultConfigValues.renderLinks
  public linkArrows = defaultConfigValues.arrowLinks
  public linkArrowsSizeScale = defaultConfigValues.arrowSizeScale
  public linkVisibilityDistanceRange = defaultConfigValues.linkVisibilityDistanceRange
  public linkVisibilityMinTransparency = defaultConfigValues.linkVisibilityMinTransparency
  public useQuadtree = defaultConfigValues.useQuadtree

  public simulation: GraphSimulationSetting = {
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

  public events: Events<N> = {
    onClick: undefined,
  }

  public showFPSMonitor = defaultConfigValues.showFPSMonitor

  public pixelRatio = defaultConfigValues.pixelRatio

  public init (config: GraphConfigInterface<N, L>): GraphConfigInterface<N, L> {
    const currentConfig = this.getConfig()
    const keys = Object.keys(config).map(key => key as keyof GraphConfigInterface<N, L>)
    keys.forEach(key => {
      if (typeof currentConfig[key] === 'object') {
        (currentConfig[key] as Record<string, unknown>) = {
          ...currentConfig[key] as Record<string, unknown>,
          ...config[key] as Record<string, unknown>,
        } as Record<string, unknown>
      } else {
        (currentConfig[key] as keyof GraphConfigInterface<N, L>) =
          config[key] as keyof GraphConfigInterface<N, L>
      }
    })

    return currentConfig
  }

  private getConfig (): GraphConfigInterface<N, L> {
    return this
  }
}
