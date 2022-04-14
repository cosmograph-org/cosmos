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

export interface GraphConfigInterface<N extends InputNode, L extends InputLink> {
  /**
   * Canvas background color.
   * Default value: '#222222'
   */
  backgroundColor?: string;
  /**
   * Simulation space side length.
   * Default value: 4096
   */
  spaceSize?: number;
  /**
   * Node color accessor function or value.
   * Default value: '#b3b3b3'
  */
  nodeColor?: ColorAccessor<N>;
  /**
   * Node size accessor function or value in pixels.
   * Default value: 4
  */
  nodeSize?: NumericAccessor<N>;
  /**
   * The number by which nodeSize is multiplied.
   * Default value: 1
   */
  nodeSizeMultiplier?: number;

  /**
   * Link color accessor function or value.
   * Default value: '#666666'
   */
  linkColor?: ColorAccessor<L>;
  /**
   * Link width accessor function or value in pixels.
   * Default value: 1
  */
  linkWidth?: NumericAccessor<L>;
  /**
   * The number by which linkWidth is multiplied.
   * Default value: 1
   */
  linkWidthMultiplier?: number;
  /**
   * Whether to render links or not.
   * Default value: true
   */
  renderLinks?: boolean;
  /**
   * Whether to render link's arrows or not.
   * Default value: true
   */
  arrowLinks?: boolean;
  /**
   * The number by which arrow size is multiplied.
   * Default value: 1
   */
  arrowSizeMultiplier?: number;
  /**
   * The minimum link distance in which link color do not loose transparency.
   * Default value: 50
   */
  minOpaqueLinkDist?: number;
  /**
   * The maximum link distance in which link color will reach clampLinkMinOpacity value.
   * Default value: 150
   */
  maxTransparentLinkDist?: number;
  /**
   * The transparency value for maxTransparentLinkDist.
   * Default value: 0.25
   */
  clampLinkMinOpacity?: number;

  /** Simulation parameters */
  simulation?: {
    /**
     * Decay coefficient. Small values for quick simulation.
     * Default value: 1000
     */
    decay?: number;
    /**
     * Gravity force coefficient.
     * Default value: 0
     */
    gravity?: number;
    /**
     * Centering to center mass force coefficient.
     * Default value: 0
     */
    center?: number;
    /**
     * Repulsion force coefficient.
     * Default value: 0.1
     */
    repulsion?: number;
    /**
     * Barnes–Hut approximation criterion.
     * Default value: 1.7
     */
    repulsionTheta?: number;
    /**
     * Barnes–Hut approximation depth.
     * Default value: 12
     */
    repulsionQuadtreeLevels?: number;
    /**
     * Link spring force coefficient.
     * Default value: 1
     */
     linkSpring?: number;
    /**
     * Minimum link distance.
     * Default value: 2
     */
    linkDistance?: number;
    /**
     * Range of random link distance values.
     * Default value: [1, 1.2]
     */
    linkDistRandomVariationRange?: number[];
    /**
     * Repulsion coefficient from mouse position.
     * Default value: 2
     */
    repulsionFromMouse?: number;
    /**
     * Friction value from 0 to 1.
     * Default value: 0.85
     */
    friction?: number;
    /**
     * On start simulation callback function.
     * Default value: () => undefined
     */
    onStart?: () => void;
    /**
     * On tick simulation callback function.
     * Default value: (alpha) => undefined
     */
    onTick?: (alpha?: number) => void;
    /**
     * On end simulation callback function.
     * Default value: () => undefined
     */
    onEnd?: () => void;
    /**
     * On pause simulation callback function.
     * Default value: () => undefined
     */
    onPause?: () => void;
    /**
     * On restart simulation callback function.
     * Default value: () => undefined
     */
    onRestart?: () => void;
  };
  /**
   * Events
   */
  events?: {
    /**
     * On click callback function.
     * Default value: (clickedNode) => undefined
     */
    onClick?: (clickedNode?: Node<N> | undefined) => void;
  };

  /**
   * Whether to show WebGL performance monitor or not.
   * Default value: false
   */
   showFPSMonitor?: boolean;
  /**
   * Canvas pixel ratio.
   * Default value: 2
   */
  pixelRatio?: number;
}

export class GraphConfig<N extends InputNode, L extends InputLink> implements GraphConfigInterface<Node<N>, Link<N, L>> {
  public backgroundColor = defaultBackgroundColor
  public spaceSize = defaultConfigValues.spaceSize
  public nodeColor = defaultNodeColor
  public nodeSize = defaultNodeSize
  public nodeSizeMultiplier = defaultConfigValues.nodeSizeMultiplier
  public linkColor = defaultLinkColor
  public linkWidth = defaultLinkWidth
  public linkWidthMultiplier = defaultConfigValues.linkWidthMultiplier
  public renderLinks = defaultConfigValues.renderLinks
  public arrowLinks = defaultConfigValues.arrowLinks
  public arrowSizeMultiplier = defaultConfigValues.arrowSizeMultiplier
  public minOpaqueLinkDist = defaultConfigValues.minOpaqueLinkDist
  public maxTransparentLinkDist = defaultConfigValues.maxTransparentLinkDist
  public clampLinkMinOpacity = defaultConfigValues.clampLinkMinOpacity

  public simulation = {
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
    onStart: (): void => undefined,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onTick: (alpha?: number): void => undefined,
    onEnd: (): void => undefined,
    onPause: (): void => undefined,
    onRestart: (): void => undefined,
  }

  public events = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onClick: (clickedNode?: Node<N>): void => undefined,
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
