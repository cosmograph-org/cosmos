import { D3ZoomEvent } from 'd3-zoom'
import { D3DragEvent } from 'd3-drag'
import {
  defaultPointColor,
  defaultGreyoutPointOpacity,
  defaultPointSize,
  defaultLinkColor,
  defaultGreyoutLinkOpacity,
  defaultLinkWidth,
  defaultBackgroundColor,
  defaultConfigValues,
} from '@/graph/variables'
import { isPlainObject } from '@/graph/helper'
import { type Hovered } from '@/graph/modules/Store'

export interface GraphEvents {
  /**
   * Callback function that will be called on every canvas click.
   * If clicked on a point, its index will be passed as the first argument,
   * position as the second argument and the corresponding mouse event as the third argument:
   * `(index: number | undefined, pointPosition: [number, number] | undefined, event: MouseEvent) => void`.
   * Default value: `undefined`
   */
  onClick?: (
      index: number | undefined, pointPosition: [number, number] | undefined, event: MouseEvent
    ) => void;
  /**
   * Callback function that will be called when mouse movement happens.
   * If the mouse moves over a point, its index will be passed as the first argument,
   * position as the second argument and the corresponding mouse event as the third argument:
   * `(index: number | undefined, pointPosition: [number, number] | undefined, event: MouseEvent) => void`.
   * Default value: `undefined`
   */
  onMouseMove?: (
      index: number | undefined, pointPosition: [number, number] | undefined, event: MouseEvent
    ) => void;
  /**
   * Callback function that will be called when a point appears under the mouse
   * as a result of a mouse event, zooming and panning, or movement of points.
   * The point index will be passed as the first argument, position as the second argument
   * and the corresponding mouse event or D3's zoom event as the third argument:
   * `(index: number, pointPosition: [number, number], event: MouseEvent | D3DragEvent<HTMLCanvasElement, undefined, Hovered>
   * | D3ZoomEvent<HTMLCanvasElement, undefined> | undefined) => void`.
   * Default value: `undefined`
   */
  onPointMouseOver?: (
      index: number,
      pointPosition: [number, number],
      event: MouseEvent | D3DragEvent<HTMLCanvasElement, undefined, Hovered> | D3ZoomEvent<HTMLCanvasElement, undefined> | undefined
    ) => void;
  /**
   * Callback function that will be called when a point is no longer underneath
   * the mouse pointer because of a mouse event, zoom/pan event, or movement of points.
   * The corresponding mouse event or D3's zoom event will be passed as the first argument:
   * `(event: MouseEvent | D3ZoomEvent<HTMLCanvasElement, undefined> | D3DragEvent<HTMLCanvasElement, undefined, Hovered> | undefined) => void`.
   * Default value: `undefined`
   */
  onPointMouseOut?: (event: MouseEvent | D3ZoomEvent<HTMLCanvasElement, undefined> | D3DragEvent<HTMLCanvasElement, undefined, Hovered> | undefined) => void;
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
  /**
   * Callback function that will be called when dragging starts.
   * First argument is a D3 Drag Event:
   * `(event: D3DragEvent) => void`.
   * Default value: `undefined`
   */
  onDragStart?: (e: D3DragEvent<HTMLCanvasElement, undefined, Hovered>) => void;
  /**
   * Callback function that will be called continuously during dragging.
   * First argument is a D3 Drag Event:
   * `(event: D3DragEvent) => void`.
   * Default value: `undefined`
   */
  onDrag?: (e: D3DragEvent<HTMLCanvasElement, undefined, Hovered>) => void;
  /**
   * Callback function that will be called when dragging ends.
   * First argument is a D3 Drag Event:
   * `(event: D3DragEvent) => void`.
   * Default value: `undefined`
   */
  onDragEnd?: (e: D3DragEvent<HTMLCanvasElement, undefined, Hovered>) => void;
}

export interface GraphSimulationSettings {
  /**
   * Decay coefficient. Use smaller values if you want the simulation to "cool down" slower.
   * Default value: `5000`
   */
  decay?: number;
  /**
   * Gravity force coefficient.
   * Default value: `0.25`
   */
  gravity?: number;
  /**
   * Centering to center mass force coefficient.
   * Default value: `0`
   */
  center?: number;
  /**
   * Repulsion force coefficient.
   * Default value: `1.0`
   */
  repulsion?: number;
  /**
   * Decreases / increases the detalization of the Many-Body force calculations.
   * When `useQuadtree` is set to `true`, this property corresponds to the Barnes–Hut approximation criterion.
   * Default value: `1.15`
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
   * Default value: `10`
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
   * If there's a point under the mouse pointer, its index will be passed as the second argument
   * and position as the third argument:
   * `(alpha: number, hoveredIndex: number | undefined, pointPosition: [number, number] | undefined) => void`.
   * Default value: `undefined`
   */
  onTick?: (
    alpha: number, hoveredIndex?: number, pointPosition?: [number, number]
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
export interface GraphConfigInterface {
  /**
   * TODO: rethink the logic of `disableSimulation` param 👇.
   * Do not run the simulation, just render the graph.
   * Cosmos uses the x and y values of the points’ data to determine their position in the graph.
   * If x and y values are not specified, the position of the points will be assigned randomly.
   * This property will be applied only on component initialization and it
   * can't be changed using the `setConfig` method.
   * Default value: `false`
   */
  disableSimulation?: boolean;
  /**
   * Canvas background color.
   * Can be either a hex color string (e.g., '#b3b3b3') or an array of RGBA values.
   * Default value: '#222222'
   */
  backgroundColor?: string | [number, number, number, number];
  /**
   * Simulation space size (max 8192).
   * Default value: `4096`
   */
  spaceSize?: number;

  /**
   * The default color to use for points when no point colors are provided,
   * or if the color value in the array is `undefined` or `null`.
   * This can be either a hex color string (e.g., '#b3b3b3') or an array of RGBA values
   * in the format `[red, green, blue, alpha]` where each value is a number between 0 and 255.
   * Default value: '#b3b3b3'
   */
  defaultPointColor?: string | [number, number, number, number];

  /**
   * Greyed out point opacity value when the selection is active.
   * Default value: `0.1`
  */
  pointGreyoutOpacity?: number;
  /**
   * The default size value to use for points when no point sizes are provided or
   * if the size value in the array is `undefined` or `null`.
   * Default value: `4`
  */
  defaultPointSize?: number;
  /**
   * Scale factor for the point size.
   * Default value: `1`
   */
  pointSizeScale?: number;

  /**
   * Cursor style to use when hovering over a point
   * Default value: `auto`
   */
  hoveredPointCursor?: string;

  /**
   * Turns ring rendering around a point on hover on / off
   * Default value: `false`
   */
  renderHoveredPointRing?: boolean;

  /**
   * Hovered point ring color hex value.
   * Can be either a hex color string (e.g., '#b3b3b3') or an array of RGBA values.
   * Default value: `white`
   */
  hoveredPointRingColor?: string | [number, number, number, number];

  /**
   * Focused point ring color hex value.
   * Can be either a hex color string (e.g., '#b3b3b3') or an array of RGBA values.
   * Default value: `white`
   */
  focusedPointRingColor?: string | [number, number, number, number];

  /**
   * Set focus on a point by index.  A ring will be highlighted around the focused point.
   * Has priority over the `setFocusedPointByIndex` method.
   * When set to `undefined`, no point is focused.
   * Default value: `undefined`
   */
  focusedPointIndex?: number;

  /**
   * Turns link rendering on / off.
   * Default value: `true`
   */
  renderLinks?: boolean;

  /**
   * The default color to use for links when no link colors are provided,
   * or if the color value in the array is `undefined` or `null`.
   * This can be either a hex color string (e.g., '#666666') or an array of RGBA values
   * in the format `[red, green, blue, alpha]` where each value is a number between 0 and 255.
   * Default value: '#666666'
   */
  defaultLinkColor?: string | [number, number, number, number];

  /**
   * Greyed out link opacity value when the selection is active.
   * Default value: `0.1`
  */
  linkGreyoutOpacity?: number;
  /**
   * The default width value to use for links when no link widths are provided or if the width value in the array is `undefined` or `null`.
   * Default value: `1`
  */
  defaultLinkWidth?: number;
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
   * The default link arrow value that controls whether or not to display link arrows.
   * Default value: `false`
   */
  defaultLinkArrows?: boolean;
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
  simulation?: GraphSimulationSettings;
  /**
   * Events
   */
  events?: GraphEvents;

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
   * Increase or decrease the size of the points when zooming in or out.
   * Default value: true
   */
  scalePointsOnZoom?: boolean;
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
   * Enables or disables dragging of points in the graph.
   * Default value: `false`
   */
  enableDrag?: boolean;
  /**
   * Whether to center and zoom the view to fit all points in the scene on initialization or not.
   * Default: `true`
   */
  fitViewOnInit?: boolean;
  /**
   * Delay in milliseconds before fitting the view when `fitViewOnInit` is enabled.
   * Useful if you want the layout to stabilize a bit before fitting.
   * Default: `250`
   */
  fitViewDelay?: number;
  /**
   * Padding to apply when fitting the view to show all points.
   * This value is added to the calculated bounding box to provide some extra space around the points.
   * This is used when the `fitViewOnInit` option is enabled.
   * Default: `0.1`
   */
  fitViewPadding?: number;
  /**
   * Duration in milliseconds for fitting the view to show all points when fitViewOnInit is enabled.
   * Default: `250`
   */
  fitViewDuration?: number;
  /**
   * When `fitViewOnInit` is set to `true`, fits the view to show the points within a rectangle
   * defined by its two corner coordinates `[[left, bottom], [right, top]]` in the scene space.
   * Default: `undefined`
   */
  fitViewByPointsInRect?: [[number, number], [number, number]] | [number, number][];
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
   * Point sampling distance in pixels between neighboring points when calling the `getSampledPointPositionsMap` method.
   * This parameter determines how many points will be included in the sample.
   * Default value: `150`
  */
  pointSamplingDistance?: number;
}

export class GraphConfig implements GraphConfigInterface {
  public disableSimulation = defaultConfigValues.disableSimulation
  public backgroundColor = defaultBackgroundColor
  public spaceSize = defaultConfigValues.spaceSize
  public defaultPointColor = defaultPointColor
  public pointGreyoutOpacity = defaultGreyoutPointOpacity
  public defaultPointSize = defaultPointSize
  public pointSizeScale = defaultConfigValues.pointSizeScale
  public hoveredPointCursor = defaultConfigValues.hoveredPointCursor
  public renderHoveredPointRing = defaultConfigValues.renderHoveredPointRing
  public hoveredPointRingColor = defaultConfigValues.hoveredPointRingColor
  public focusedPointRingColor = defaultConfigValues.focusedPointRingColor
  public focusedPointIndex = defaultConfigValues.focusedPointIndex
  public defaultLinkColor = defaultLinkColor
  public linkGreyoutOpacity = defaultGreyoutLinkOpacity
  public defaultLinkWidth = defaultLinkWidth
  public linkWidthScale = defaultConfigValues.linkWidthScale
  public renderLinks = defaultConfigValues.renderLinks
  public curvedLinks = defaultConfigValues.curvedLinks
  public curvedLinkSegments = defaultConfigValues.curvedLinkSegments
  public curvedLinkWeight = defaultConfigValues.curvedLinkWeight
  public curvedLinkControlPointDistance = defaultConfigValues.curvedLinkControlPointDistance
  public defaultLinkArrows = defaultConfigValues.arrowLinks
  public linkArrowsSizeScale = defaultConfigValues.arrowSizeScale
  public linkVisibilityDistanceRange = defaultConfigValues.linkVisibilityDistanceRange
  public linkVisibilityMinTransparency = defaultConfigValues.linkVisibilityMinTransparency
  public useQuadtree = defaultConfigValues.useQuadtree

  public simulation: GraphSimulationSettings = {
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

  public events: GraphEvents = {
    onClick: undefined,
    onMouseMove: undefined,
    onPointMouseOver: undefined,
    onPointMouseOut: undefined,
    onZoomStart: undefined,
    onZoom: undefined,
    onZoomEnd: undefined,
    onDragStart: undefined,
    onDrag: undefined,
    onDragEnd: undefined,
  }

  public showFPSMonitor = defaultConfigValues.showFPSMonitor

  public pixelRatio = defaultConfigValues.pixelRatio

  public scalePointsOnZoom = defaultConfigValues.scalePointsOnZoom
  public initialZoomLevel = undefined
  public disableZoom = defaultConfigValues.disableZoom
  public enableDrag = defaultConfigValues.enableDrag
  public fitViewOnInit = defaultConfigValues.fitViewOnInit
  public fitViewDelay = defaultConfigValues.fitViewDelay
  public fitViewPadding = defaultConfigValues.fitViewPadding
  public fitViewDuration = defaultConfigValues.fitViewDuration
  public fitViewByPointsInRect = undefined

  public randomSeed = undefined
  public pointSamplingDistance = defaultConfigValues.pointSamplingDistance

  public init (config: GraphConfigInterface): void {
    (Object.keys(config) as (keyof GraphConfigInterface)[])
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

  private getConfig (): GraphConfigInterface {
    return this
  }
}
