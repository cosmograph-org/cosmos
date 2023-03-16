<p align="center" style="color: #444">
  <h1 align="center">🌌 Cosmos</h1>
</p>
<p align="center" style="font-size: 1.2rem;">GPU-accelerated Force Graph</p>

Cosmos is a WebGL Force Graph layout algorithm and rendering engine. All the computations and drawing are happening on the GPU in fragment and vertex shaders avoiding expensive memory operations. 

It enables real-time simulation of network graphs consisting of hundreds of thousands of nodes and edges on modern hardware.

https://user-images.githubusercontent.com/755708/173392407-9b05cbb6-d39e-4c2c-ab41-50900cfda823.mp4

[📺 Comparison with other libraries](https://www.youtube.com/watch?v=HWk78hP8aEE)

[🎮 Try Cosmos on CodeSandbox](https://codesandbox.io/s/cosmos-example-fmuf1x?file=/src/index.ts)

### Quick Start

Install the package:

```bash
npm install @cosmograph/cosmos
```

Get the data, [configure](#cosmos_configuration) the graph and run the simulation:
```javascript
import { Graph } from '@cosmograph/cosmos'
import { nodes, links } from './data'

const canvas = document.querySelector('canvas')
const config = {
  simulation: {
    repulsion: 0.5,
  },
  renderLinks: true,
  linkColor: link => link.color,
  nodeColor: node => node.color,
  events: {
    onClick: node => { console.log('Clicked node: ', node) },
  },
  /* ... */
}

const graph = new Graph(canvas, config)

graph.setData(nodes, links)
```

> **Note**
> If your canvas element has no width and height styles (either CSS or inline) Cosmos will automatically set them to 100%.

### Examples

- [Silk Road Case: Bitcoin Transactions](https://cosmograph.app/run/?data=https://cosmograph.app/data/184R7cFG-4lv.csv) ([📄 Read about the case](https://medium.com/@cosmograph.app/visualizing-darknet-6846dec7f1d7))
- [ABACUS Shell](https://cosmograph.app/run/?&decay=100000&link-distance=1&link-spring=2&data=https://cosmograph.app/data/ABACUS_shell_hd.csv) ([source](http://sparse.tamu.edu/Puri/ABACUS_shell_hd))
- [The MathWorks, Inc: symmetric positive definite matrix](https://cosmograph.app/run/?data=https://cosmograph.app/data/Kuu.csv) ([source](https://sparse.tamu.edu/MathWorks/Kuu))
- [4 Tower Silo](https://cosmograph.app/run/?data=https://cosmograph.app/data/pkustk10.csv) ([source](https://sparse.tamu.edu/Chen/pkustk10))
- [Jacobian from Bank of Canada ‘jan99’ model](https://cosmograph.app/run/?data=https://cosmograph.app/data/jan99jac040sc.csv) ([source](https://sparse.tamu.edu/Hollinger/jan99jac040sc))



### <a name="cosmos_configuration" href="#cosmos_configuration">#</a> Cosmos configuration
| Property | Description | Default |
|---|---|---|
| backgroundColor | Canvas background color | `#222222`
| spaceSize | Simulation space size (max 8192) | `4096`
| nodeColor | Node color accessor function or hex value | `#b3b3b3`
| nodeGreyoutOpacity | Greyed out node opacity value when the selection is active | `0.1`
| nodeSize | Node size accessor function or value in pixels | `4`
| nodeSizeScale | Scale factor for the node size | `1`
| renderHighlightedNodeRing | Turns the node highlight on hover on / off | `true`
| highlightedNodeRingColor | Highlighted node ring color | `undefined`
| renderLinks | Turns link rendering on / off | `true`
| linkColor | Link color accessor function or hex value | `#666666`
| linkGreyoutOpacity | Greyed out link opacity value when the selection is active | `0.1`
| linkWidth | Link width accessor function or value in pixels | `1`
| linkWidthScale | Scale factor for the link width | `1`
| linkArrows | Turns link arrow rendering on / off | `true`
| linkArrowsSizeScale | Scale factor for the link arrows size | `1`
| linkVisibilityDistanceRange | The range defines the minimum and maximum link visibility distance in pixels. <br /><br />The link will be fully opaque when its length is less than the first number in the array, and will have `linkVisibilityMinTransparency` transparency when its length is greater than the second number in the array. <br /><br />This distance is defined in screen space coordinates and will change as you zoom in and out (e.g. links become longer when you zoom in, and shorter when you zoom out). | `[50, 150]`
| linkVisibilityMinTransparency | The transparency value that the link will have when its length reaches the maximum link distance value from `linkVisibilityDistanceRange`. | `0.25`
| useQuadtree | Use the classic [quadtree algorithm](https://en.wikipedia.org/wiki/Barnes%E2%80%93Hut_simulation) for the Many-Body force. This property will be applied only on component initialization and it can't be changed using the `setConfig` method. <br /><br /> ⚠ The algorithm might not work on some GPUs (e.g. Nvidia) and on Windows (unless you disable ANGLE in the browser settings). | `false`
| simulation | Simulation parameters and event listeners | See [Simulation configuration](#simulation_configuration) table for more details
| events.onClick | Callback function that will be called on every canvas click. If clicked on a node, its data will be passed as the first argument, index as the second argument, position as the third argument and the corresponding mouse event as the forth argument: <code>(node: Node &vert; undefined, index: number &vert; undefined, nodePosition: [number, number] &vert; undefined, event: MouseEvent) => void</code> | `undefined`
| events.onMouseMove | Callback function that will be called when mouse movement happens. If the mouse moves over a node, its data will be passed as the first argument, index as the second argument, position as the third argument and the corresponding mouse event as the forth argument: <code>(node: Node &vert; undefined, index: number &vert; undefined, nodePosition: [number, number] &vert; undefined, event: MouseEvent) => void</code> | `undefined`
| events.onNodeMouseOver | Callback function that will be called when a node appears under the mouse as a result of a mouse event, zooming and panning, or movement of nodes. The node data will be passed as the first argument, index as the second argument, position as the third argument and the corresponding mouse event or D3's zoom event as the forth argument: <code>(node: Node, index: number, nodePosition: [number, number], event: MouseEvent &vert; D3ZoomEvent &vert; undefined) => void</code> | `undefined`
| events.onNodeMouseOut | Callback function that will be called when node is no longer underneath the mouse pointer because of a mouse event, zoom/pan event, or movement of nodes. The corresponding mouse event or D3's zoom event will be passed as the first argument: <code>(event: MouseEvent &vert; D3ZoomEvent &vert; undefined) => void</code> | `undefined`
| events.onZoomStart | Callback function that will be called when zooming or panning starts. First argument is a D3 Zoom Event and second indicates whether the event has been initiated by a user interaction (e.g. a mouse event): <code>(event: D3ZoomEvent, userDriven: boolean) => void</code> | `undefined`
| events.onZoom | Callback function that will be called continuously during zooming or panning. First argument is a D3 Zoom Event and second indicates whether the event has been initiated by a user interaction (e.g. a mouse event): <code>(event: D3ZoomEvent, userDriven: boolean) => void</code> | `undefined`
| events.onZoomEnd | Callback function that will be called when zooming or panning ends. First argument is a D3 Zoom Event and second indicates whether the event has been initiated by a user interaction (e.g. a mouse event): <code>(event: D3ZoomEvent, userDriven: boolean) => void</code> | `undefined`
| showFPSMonitor | Show WebGL performance monitor | `false`
| pixelRatio | Canvas pixel ratio | `2`
| scaleNodesOnZoom | Scale the nodes when zooming in or out | `true`
| randomSeed | Providing a `randomSeed` value allows you to control the randomness of the layout across different simulation runs. It is useful when you want the graph to always look the same on same datasets. <br /><br /> This property will be applied only on component initialization and it can't be changed using the `setConfig` method. | `undefined`


### <a name="simulation_configuration" href="#simulation_configuration">#</a> Simulation configuration

Cosmos layout algorithm was inspired by the [d3-force](https://github.com/d3/d3-force#forces) simulation forces: Link, Many-Body, Gravitation, and Centering.
It provides several simulation settings to adjust the layout. Each of them can be changed in real time, while the simulation is in progress.


| Property | Description  | Recommended range | Default |
|---|---|---|---|
| repulsion | Repulsion force coefficient | 0.0 – 2.0 | `0.1` |
| repulsionTheta | Decreases / increases the detalization of the Many-Body force calculations. <br /><br /> When `useQuadtree` is set to `true`, this property corresponds to the Barnes–Hut approximation criterion. | 0.3 – 2.0 | `1.7` |
| repulsionQuadtreeLevels | Barnes–Hut approximation depth. <br /><br />Can only be used when `useQuadtree` is set `true`.  | 5 – 12 | `12` | 
| linkSpring | Link spring force coefficient | 0.0 – 2.0 | `1.0` |
| linkDistance | Minimum link distance | 1 – 20 | `2` |
| linkDistRandomVariationRange | Link distance randomness multiplier range | [0.8 – 1.2,<br/> 1.2 – 2.0] | `[1.0, 1.2]` |
| gravity | Gravity force coefficient | 0.0 – 1.0 | `0.0` |
| center | Centering force coefficient | 0.0 – 1.0 | `0.0` |
| friction | Friction coefficient| 0.8 – 1.0 | `0.85` |
| decay | Force simulation decay coefficient. <br /><br />Use smaller values if you want the simulation to "cool down" slower.| 100 – 10 000| `1000` |
| repulsionFromMouse | Repulsion from the mouse pointer force coefficient. The repulsion force is activated by pressing the right mouse button. | 0.0 – 5.0 | `2.0`
| simulation.onStart | Callback function that will be called when the simulation starts | | `undefined`
| simulation.onTick | Callback function that will be called on every simulation tick. <br /><br />The value of the argument `alpha` will decrease over time as the simulation "cools down": `(alpha: number) => void` | | `undefined`
| simulation.onEnd | Callback function that will be called when the simulation stops | | `undefined`
| simulation.onPause | Callback function that will be called when the simulation gets paused | | `undefined`
| simulation.onRestart | Callback function that will be called when the simulation is restarted | | `undefined`

### <a name="api_reference" href="#api_reference">#</a> API Reference

<a name="set_config" href="#set_config">#</a> graph.<b>setConfig</b>(<i>config</i>)

Set [Cosmos configuration](#cosmos_configuration). The changes will be applied in real time.

<a name="set_data" href="#set_data">#</a> graph.<b>setData</b>(<i>nodes</i>, <i>links</i>, [<i>runSimulation</i>])

Pass data to Cosmos: an array of <i>nodes</i> and an array of <i>links</i>. When <i>runSimulation</i> is set to `false`, the simulation won't be started automatically (`true` by default).

<a name="zoom_to_node_by_id" href="#zoom_to_node_by_id">#</a> graph.<b>zoomToNodeById</b>(<i>id</i>, [<i>duration</i>], [<i>scale</i>], [<i>canZoomOut</i>])

Center the view on the specified node (by its <i>id</i>) and zoom in with given animation <i>duration</i> and <i>scale</i> value. The default <i>duration</i> is 700 and the default <i>scale</i> is 3. To zoom in closer set a greater scale value. If the <i>scale</i> value is less than the current scale value, the view will be zoomed out. To prevent zooming out from the node, set <i>canZoomOut</i> value to `false`.

<a name="zoom_to_node_by_index" href="#zoom_to_node_by_index">#</a> graph.<b>zoomToNodeByIndex</b>(<i>index</i>, [<i>duration</i>], [<i>scale</i>], [<i>canZoomOut</i>])

Center the view on the specified node (by its <i>index</i>) and zoom in with given animation <i>duration</i> and <i>scale</i> value. The default <i>duration</i> is 700 and the default <i>scale</i> is 3. To zoom in closer set a greater scale value. If the <i>scale</i> value is less than the current scale value, the view will be zoomed out. To prevent zooming out from the node, set <i>canZoomOut</i> value to `false`.

<a name="set_zoom_level" href="#set_zoom_level">#</a> graph.<b>setZoomLevel</b>(<i>value</i>, [<i>duration</i>])

Zoom the view in or out to the specified zoom level <i>value</i> with given animation <i>duration</i>. The default <i>duration</i> is 0.

<a name="fit_view" href="#fit_view">#</a> graph.<b>fitView</b>(<i>duration</i>)

Center and zoom in/out the view to fit all nodes in the scene with given animation <i>duration</i>. The default <i>duration</i> is 250 ms.

<a name="fit_view_by_node_ids" href="#fit_view_by_node_ids">#</a> graph.<b>fitViewByNodeIds</b>(<i>ids</i>, [<i>duration</i>])

Center and zoom in/out the view to fit nodes by their <i>ids</i> in the scene with given animation <i>duration</i>. The default <i>duration</i> is 250 ms.

<a name="select_nodes_in_range" href="#select_nodes_in_range">#</a> graph.<b>selectNodesInRange</b>(<i>selection</i>)

Select nodes inside a rectangular area defined by two corner points `[[left, top], [right, bottom]]`.
The `left` and `right` values should be from 0 to the width of the canvas in pixels.

The `top` and `bottom` values should be from 0 to the height of the canvas in pixels.

<a name="select_node_by_id" href="#select_node_by_id">#</a> graph.<b>selectNodeById</b>(<i>id</i>, [<i>selectAdjacentNodes</i>])

Select a node by <i>id</i>. If you want the adjacent nodes to get selected too, provide `true` as the second argument.

<a name="select_node_by_index" href="#select_node_by_index">#</a> graph.<b>selectNodeByIndex</b>(<i>index</i>, [<i>selectAdjacentNodes</i>])

Select a node by <i>index</i>. If you want the adjacent nodes to get selected too, provide `true` as the second argument.

<a name="select_node_by_ids" href="#select_node_by_ids">#</a> graph.<b>selectNodesByIds</b>(<i>ids</i>)

Select multiple nodes by an array of their <i>ids</i>.

<a name="select_node_by_indices" href="#select_node_by_indices">#</a> graph.<b>selectNodesByIndices</b>(<i>indices</i>)

Select multiple nodes by an array of their <i>indices</i>.

<a name="unselect_nodes" href="#unselect_nodes">#</a> graph.<b>unselectNodes</b>()

Unselect all nodes.

<a name="get_selected_nodes" href="#get_selected_nodes">#</a> graph.<b>getSelectedNodes</b>()

Get an array of currently selected nodes.

<a name="get_adjacent_nodes_to_node_id" href="#get_adjacent_nodes_to_node_id">#</a> graph.<b>getAdjacentNodes</b>(<i>id</i>)

Get nodes that are adjacent to a specific node by its <i>id</i>.

<a name="get_node_radius_by_index" href="#get_node_radius_by_index">#</a> graph.<b>getNodeRadiusByIndex</b>(<i>index</i>)

Get node radius by its <i>index</i>.

<a name="get_node_radius_by_id" href="#get_node_radius_by_id">#</a> graph.<b>getNodeRadiusById</b>(<i>id</i>)

Get node radius by its <i>id</i>.

<a name="track_node_positions_by_ids" href="#track_node_positions_by_ids">#</a> graph.<b>trackNodePositionsByIds</b>(<i>ids</i>)

Track multiple node positions by their _ids_ on each Cosmos tick. Use the [**getTrackedNodePositionsMap**](#get_tracked_node_positions_map) method to get a `Map` object with node coordinates.

<a name="track_node_positions_by_indices" href="#track_node_positions_by_indices">#</a> graph.<b>trackNodePositionsByIndices</b>(<i>indices</i>)
Track multiple node positions by their _indices_ on each Cosmos tick. Use the [**getTrackedNodePositionsMap**](#get_tracked_node_positions_map) method to get a `Map` object with node coordinates.

<a name="get_tracked_node_positions_map" href="#get_tracked_node_positions_map">#</a> graph.<b>getTrackedNodePositionsMap</b>()

If node positions are tracked, get a `Map` object with node coordinates. The keys of the `Map` are the _ids_ of the nodes being tracked and the values are their X and Y coordinates in the `[number, number]` format. Works in pairs with the [**trackNodePositionsByIds**](#track_node_positions_by_ids) or [**trackNodePositionsByIndices**](#track_node_positions_by_indices) method.

<a name="start" href="#start">#</a> graph.<b>start</b>([<i>alpha</i>])

Start the simulation. The <i>alpha</i> value can be from 0 to 1 (1 by default). The higher the value, the more initial energy the simulation will get.

<a name="pause" href="#pause">#</a> graph.<b>pause</b>()

Pause the simulation.

<a name="restart" href="#restart">#</a> graph.<b>restart</b>()

Restart the simulation.

<a name="step" href="#step">#</a> graph.<b>step</b>()

Render only one frame of the simulation. The simulation will be paused if it was active.

<a name="destroy" href="#destroy">#</a> graph.<b>destroy</b>()

Destroy this Cosmos instance.


<a name="get_zoom_level" href="#get_zoom_level">#</a> graph.<b>getZoomLevel</b>()

Get current zoom level of the view.

<a name="get_node_positions" href="#get_node_positions">#</a> graph.<b>getNodePositions</b>()

Get an object with node coordinates, where keys are the _ids_ of the nodes and values are their X and Y coordinates in the `{ x: number; y: number }` format.

<a name="get_node_positions_map" href="#get_node_positions_map">#</a> graph.<b>getNodePositionsMap</b>()

Get a `Map` object with node coordinates, where keys are the _ids_ of the nodes and the values are their X and Y coordinates in the `[number, number]` format.

<a name="get_node_positions_array" href="#get_node_positions_array">#</a> graph.<b>getNodePositionsArray</b>()

Get an array of `[number, number]` arrays corresponding to the X and Y coordinates of the nodes.

<a name="space_to_screen_position" href="#space_to_screen_position">#</a> graph.<b>spaceToScreenPosition</b>(<i>coordinates</i>)

Converts the X and Y node <i>coordinates</i> in the `[number, number]` format from the space coordinate system to the screen coordinate system.

<a name="space_to_screen_radius" href="#space_to_screen_radius">#</a> graph.<b>spaceToScreenRadius</b>(<i>radius</i>)

Converts the node <i>radius</i> value from the space coordinate system to the screen coordinate system.

<a name="is_simulation_running" href="#is_simulation_running">#</a> graph.<b>isSimulationRunning</b>

A boolean value showing whether the simulation is active or not.

<a name="max_point_size" href="#max_point_size">#</a> graph.<b>maxPointSize</b>

The maximum point size the user's hardware can render. This value is a limitation of the `gl.POINTS` primitive of WebGL and differs from GPU to GPU.


### Known Issues
Starting from version 15.4, iOS has stopped supporting the key WebGL extension powering our Many-Body force implementation (EXT_float_blend). We're trying to figure out why that happened and hope to find a way to solve the problem in the future.

### License
CC-BY-NC-4.0

Cosmos is free non-commercial usage. If you're a scientist, artist, educator, journalist, student, ..., we would love to hear about your project and how you use Cosmos! If you want to use it in a commercial project, please reach out to us.

### Contact
Write us!

[📩 hi@cosmograph.app](mailto:hi@cosmograph.app)
