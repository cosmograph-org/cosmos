<p align="center" style="color: #444">
  <h1 align="center">🌌 Cosmos</h1>
</p>
<p align="center" style="font-size: 1.2rem;">GPU-accelerated Force Graph</p>

Cosmos is a WebGL Force Graph layout algorithm and rendering engine. All the computations and drawing are happening on the GPU in fragment and vertex shaders avoiding expensive memory operations. 

It enables real time simulation of network graphs consisting of hundreds thousands of nodes and edges on modern hardware.

https://user-images.githubusercontent.com/755708/165214913-40701c64-afc5-498f-a92e-db10e6caa19d.mp4

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
| nodeSize | Node size accessor function or value in pixels | `4`
| nodeSizeScale | Scale factor for the node size | `1`
| renderLinks | Turns link rendering on / off | `true`
| linkColor | Link color accessor function or hex value | `#666666`
| linkWidth | Link width accessor function or value in pixels | `1`
| linkWidthScale | Scale factor for the link width | `1`
| linkArrows | Turns link arrow rendering on / off | `true`
| linkArrowsSizeScale | Scale factor for the link arrows size | `1`
| linkVisibilityDistanceRange | The range defines the minimum and maximum link visibility distance in pixels. <br /><br />The link will be fully opaque when its length is less than the first number in the array, and will have `linkVisibilityMinTransparency` transparency when its length is greater than the second number in the array. <br /><br />This distance is defined in screen space coordinates and will change as you zoom in and out (e.g. links become longer when you zoom in, and shorter when you zoom out). | `[50, 150]`
| linkVisibilityMinTransparency | The transparency value that the link will have when its length reaches the maximum link distance value from `linkVisibilityDistanceRange`. | `0.25`
| useQuadtree | Use the classic [quadtree algorithm](https://en.wikipedia.org/wiki/Barnes%E2%80%93Hut_simulation) for the Many-Body force. This property will be applied only on component initialization and it can't be changed using the `setConfig` method. <br /><br /> ⚠ The algorithm might not work on some GPUs (e.g. Nvidia) and on Windows (unless you disable ANGLE in the browser settings). | `false`
| simulation | Simulation parameters and event listeners | See [Simulation configuration](#simulation_configuration) table for more details
| events.onClick | Callback function that will be called on every canvas click. If clicked on a node, its data will be passed as an argument: <code>(node: Node<N> &vert; undefined) => void</code> | `undefined`
| showFPSMonitor | Show WebGL performance monitor | `false`
| pixelRatio | Canvas pixel ratio | `2`



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
| repulsionFromMouse | Repulsion from the mouse pointer force coefficient | 0.0 – 5.0 | `2.0`
| simulation.onStart | Callback function that will be called when the simulation starts | | `undefined`
| simulation.onTick | Callback function that will be called on every simulation tick. <br /><br />The value of the argument `alpha` will decrease over time as the simulation "cools down": `(alpha: number) => void` | | `undefined`
| simulation.onEnd | Callback function that will be called when the simulation stops | | `undefined`
| simulation.onPause | Callback function that will be called when the simulation gets paused | | `undefined`
| simulation.onRestart | Callback function that will be called when the simulation is restarted | | `undefined`

### Known Issues
Starting from version 15.4, iOS has stopped supporting the key WebGL extension powering our Many-Body force implementation (EXT_float_blend). We're trying to figure out why that happened and hope to find a way to solve the problem in the future.

### License
CC-BY-NC-4.0

Cosmos is free non-commercial usage. If you're a scientist, artist, educator, journalist, student, ..., we would love to hear about your project and how you use Cosmos! If you want to use it in a commercial project, please reach out to us.

### Contact
Write us!

[📩 hi@cosmograph.app](mailto:hi@cosmograph.app)
