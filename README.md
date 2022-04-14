<p align="center" style="color: #444">
  <h1 align="center">🌌 Cosmos</h1>
</p>
<p align="center" style="font-size: 1.2rem;">GPU-accelerated Force Graph</p>

Cosmos is a WebGL Force Graph layout algorithm and rendering engine. All the computations and drawing are happening on the GPU in fragment and vertex shaders avoiding expensive memory operations. That enables real time simulation of network graphs consisting of more than a million of nodes and edges on a modern hardware.

> ⚠️ **If you are a Windows user, you'll need to take a few extra steps to make Cosmos work.** Here's our [step-by-step guide](https://medium.com/@cosmograph.app/how-to-make-cosmograph-work-on-windows-d02291093b7a) for Chrome and Firefox.

[🎮 Try Cosmos on CodeSandbox](https://codesandbox.io/s/cosmos-example-fmuf1x?file=/src/index.ts)

### Quick Start

Install the package

```bash
npm install @cosmograph/cosmos
```

Get your data and run the simulation
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

> **NOTE**: If your canvas element has no width and height styles (either CSS or inline) Cosmos will automatically set them to 100%.

### Examples

- [Silk Road Case: Bitcoin Transactions](https://cosmograph.app/run/?data=https://cosmograph.app/data/184R7cFG-4lv.csv) ([📄 Read about the case](https://medium.com/@cosmograph.app/visualizing-darknet-6846dec7f1d7))
- [ABACUS Shell](https://cosmograph.app/run/?&decay=100000&link-distance=1&link-spring=2&data=https://cosmograph.app/data/ABACUS_shell_hd.csv) ([source](http://sparse.tamu.edu/Puri/ABACUS_shell_hd))
- [The MathWorks, Inc: symmetric positive definite matrix](https://cosmograph.app/run/?data=https://cosmograph.app/data/Kuu.csv) ([source](https://sparse.tamu.edu/MathWorks/Kuu))
- [4 Tower Silo](https://cosmograph.app/run/?data=https://cosmograph.app/data/pkustk10.csv) ([source](https://sparse.tamu.edu/Chen/pkustk10))
- [Jacobian from Bank of Canada ‘jan99’ model](https://cosmograph.app/run/?data=https://cosmograph.app/data/jan99jac040sc.csv) ([source](https://sparse.tamu.edu/Hollinger/jan99jac040sc))



### Layout configuration

Cosmos layout algorithm was inspired by the [d3-force](https://github.com/d3/d3-force#forces) simulation forces: Link, Many-Body, Gravitation, and Centering.
It provides several simulation settings to adjust the layout. Each of them can be changed in real time, while the simulation is in progress.

Repulsion force works as a repulsion part of the classic many-body force. Its implementation was heavily inspired by quadtrees and the [Barnes-Hut simulation approximation algorithm](https://en.wikipedia.org/wiki/Barnes%E2%80%93Hut_simulation) adapted for WebGL technology.

| Property | Description  | Recommended range | Default |
|---|---|---|---|
repulsion | Repulsion force coefficient | 0.0 – 2.0 | 0.1 |
repulsionTheta | Barnes–Hut approximation criterion | 0.3 – 2.0 | 1.7 |
repulsionQuadtreeLevels | Barnes–Hut approximation depth | 5 – 12 | 12 | 
linkSpring | Link spring force coefficient | 0.0 – 2.0 | 1.0 |
linkDistance | Minimum link distance | 1 – 20 | 2 |
linkDistRandomVariationRange | Link distance randomness multiplier range | [0.8 – 1.2, 1.2 – 2.0] | [1.0, 1.2] |
gravity | Gravity force coefficient | 0.0 – 1.0 | 0.0 |
center | Centering force coefficient | 0.0 – 1.0 | 0.0 |
friction | Friction value from 0.0 to 1.0 | 0.8 – 1.0 | 0.85 |
decay | Force simulation decay coefficient. Smaller the values faster the simulation goes| 100 – 10 000| 1000 |
repulsionFromMouse | Repulsion from the mouse pointer force coefficient | 0.0 – 5.0 | 2.0
### License
CC-BY-NC-3.0

Cosmos is free non-commercial usage. If you're a scientist, artist, educator, journalist, student, ..., we would love to hear about your project and how you use Cosmos! If you want to use it in a commercial project, please reach out to us.

### Contact
Write us!

[📩 hi@cosmograph.app](mailto:hi@cosmograph.app)
