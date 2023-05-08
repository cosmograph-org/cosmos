<p align="center" style="color: #444">
  <h1 align="center">🌌 Cosmos</h1>
</p>
<p align="center" style="font-size: 1.2rem;">GPU-accelerated Force Graph</p>

Cosmos is a WebGL Force Graph layout algorithm and rendering engine. All the computations and drawing are happening on the GPU in fragment and vertex shaders avoiding expensive memory operations. 

It enables real-time simulation of network graphs consisting of hundreds of thousands of nodes and edges on modern hardware.

![](https://user-images.githubusercontent.com/755708/173392407-9b05cbb6-d39e-4c2c-ab41-50900cfda823.mp4)

[📺 Comparison with other libraries](https://www.youtube.com/watch?v=HWk78hP8aEE)

[🎮 Try Cosmos on CodeSandbox](https://codesandbox.io/s/cosmos-example-fmuf1x?file=/src/index.ts)

### Quick Start

Install the package:

```bash
npm install @cosmograph/cosmos
```

Get the data, [configure](https://github.com/cosmograph-org/cosmos/wiki/Cosmos-configuration) the graph and run the simulation:
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

> **Warning**
> If you're going to create a new graph within the same HTML canvas element that already has a graph, **destroy** the previous graph using `graph.destroy()` to prevent unexpected glitches.

Check out the [Wiki](https://github.com/cosmograph-org/cosmos/wiki) for more information on 🛠 [Configuration](https://github.com/cosmograph-org/cosmos/wiki/Cosmos-configuration) and ⚙️ [API Reference](https://github.com/cosmograph-org/cosmos/wiki/API-Reference).

### Examples
- [Basic Set-Up](https://codesandbox.io/s/cosmos-example-fmuf1x?file=/src/index.ts)
- [Adding Node Labels](https://codesandbox.io/s/cosmos-node-labels-hkfplk) (via [`@interacta/css-labels`](https://www.npmjs.com/package/@interacta/css-labels))

### Showcase (via [cosmograph.app](https://cosmograph.app))
- [Silk Road Case: Bitcoin Transactions](https://cosmograph.app/run/?data=https://cosmograph.app/data/184R7cFG-4lv.csv) ([📄 Read about the case](https://medium.com/@cosmograph.app/visualizing-darknet-6846dec7f1d7))
- [ABACUS Shell](https://cosmograph.app/run/?&decay=100000&link-distance=1&link-spring=2&data=https://cosmograph.app/data/ABACUS_shell_hd.csv) ([source](http://sparse.tamu.edu/Puri/ABACUS_shell_hd))
- [The MathWorks, Inc: symmetric positive definite matrix](https://cosmograph.app/run/?data=https://cosmograph.app/data/Kuu.csv) ([source](https://sparse.tamu.edu/MathWorks/Kuu))
- [4 Tower Silo](https://cosmograph.app/run/?data=https://cosmograph.app/data/pkustk10.csv) ([source](https://sparse.tamu.edu/Chen/pkustk10))
- [Jacobian from Bank of Canada ‘jan99’ model](https://cosmograph.app/run/?data=https://cosmograph.app/data/jan99jac040sc.csv) ([source](https://sparse.tamu.edu/Hollinger/jan99jac040sc))

### Known Issues
Starting from version 15.4, iOS has stopped supporting the key WebGL extension powering our Many-Body force implementation (EXT_float_blend). We're trying to figure out why that happened and hope to find a way to solve the problem in the future.

### License
CC-BY-NC-4.0

Cosmos is free non-commercial usage. If you're a scientist, artist, educator, journalist, student, ..., we would love to hear about your project and how you use Cosmos! If you want to use it in a commercial project, please reach out to us.

### Contact
[📩 hi@cosmograph.app](mailto:hi@cosmograph.app)
