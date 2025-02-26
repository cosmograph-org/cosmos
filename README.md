
<p align="center" style="color: #444">
  <h1 align="center">🌌 Cosmos</h1>
</p>
<p align="center" style="font-size: 1.2rem;">GPU-accelerated Force Graph</p>

**Cosmos** is a WebGL Force Graph layout algorithm and rendering engine. All the computations and drawing are happening on the GPU in fragment and vertex shaders, avoiding expensive memory operations.

It enables real-time simulation of network graphs consisting of hundreds of thousands of points and links on modern hardware.

<video src="https://user-images.githubusercontent.com/755708/173392407-9b05cbb6-d39e-4c2c-ab41-50900cfda823.mp4" autoplay controls alt="Demo of Cosmos GPU-accelerated Force Graph">
</video>

[📺 Comparison with other libraries](https://www.youtube.com/watch?v=HWk78hP8aEE)

[🎮 Try Cosmos on StackBlitz](https://stackblitz.com/edit/how-to-use-cosmos?file=src%2Fmain.ts)

---

### Quick Start

Install the package:

```bash
npm install @cosmograph/cosmos
```

Get the data, [configure](../?path=/docs/configuration--docs) the graph and run the simulation:

```javascript
import { Graph } from '@cosmograph/cosmos'

const div = document.querySelector('div')
const config = {
  simulationFriction: 0.1, // keeps the graph inert
  simulationGravity: 0, // disables gravity
  simulationRepulsion: 0.5, // increases repulsion between points
  curvedLinks: true, // curved links
  fitViewDelay: 1000, // wait 1 second before fitting the view
  disableRescalePositions: false, // rescale positions
  enableDrag: true, // enable dragging points
  onClick: pointIndex => { console.log('Clicked point index: ', pointIndex) },
  /* ... */
}

const graph = new Graph(div, config)

// Points: [x1, y1, x2, y2, x3, y3]
const pointPositions = new Float32Array([
  0.0, 0.0,    // Point 1 at (0,0)
  1.0, 0.0,    // Point 2 at (1,0)
  0.5, 1.0,    // Point 3 at (0.5,1)
]);

graph.setPointPositions(pointPositions)

// Links: [sourceIndex1, targetIndex1, sourceIndex2, targetIndex2]
const links = new Float32Array([
  0, 1,    // Link from point 0 to point 1
  1, 2,    // Link from point 1 to point 2
  2, 0,    // Link from point 2 to point 0
]);

graph.setLinks(links)

graph.render()
```

---

### What's New in v2.0?

Cosmos v2.0 introduces significant improvements in performance and data handling:

- Enhanced data structures with WebGL-compatible formats.
- Methods like `setPointPositions` and `setLinks` replace `setData` for improved efficiency.
- Direct control over point and link attributes via Float32Array (e.g., colors, sizes, widths).
- Updated event handling based on indices instead of objects.
- New Clustering Feature (`setPointClusters`, `setClusterPositions` and `setPointClusterStrength`).
- Ability to drag points.

Check the [Migration Guide](./cosmos-2-0-migration-notes.md) for details.

---

### Examples

- [Basic Set-Up](https://cosmograph-org.github.io/cosmos/?path=/story/examples-beginners--basic-set-up)

---

### Showcase (via [cosmograph.app](https://cosmograph.app))

- [Silk Road Case: Bitcoin Transactions](https://cosmograph.app/run/?data=https://cosmograph.app/data/184R7cFG-4lv.csv) ([📄 Read more](https://medium.com/@cosmograph.app/visualizing-darknet-6846dec7f1d7))
- [ABACUS Shell](https://cosmograph.app/run/?data=https://cosmograph.app/data/ABACUS_shell_hd.csv) ([source](http://sparse.tamu.edu/Puri/ABACUS_shell_hd))
- [The MathWorks, Inc: symmetric positive definite matrix](https://cosmograph.app/run/?data=https://cosmograph.app/data/Kuu.csv) ([source](https://sparse.tamu.edu/MathWorks/Kuu))

---

### Known Issues

- Starting from version 15.4, iOS has stopped supporting the key WebGL extension powering our Many-Body force implementation (`EXT_float_blend`). We're investigating this issue and exploring solutions.

---

### Documentation
- 🧑‍💻 [Quick Start](https://cosmograph-org.github.io/cosmos/?path=/docs/welcome-to-cosmos--docs)
- 🛠 [Configuration](https://cosmograph-org.github.io/cosmos/?path=/docs/configuration--docs)
- ⚙️ [API Reference](https://cosmograph-org.github.io/cosmos/?path=/docs/api-reference--docs)
- 🚀 [Migration Guide](./cosmos-2-0-migration-notes.md)

---

### License

**MIT**

---

### Contact

[📩 hi@cosmograph.app](mailto:hi@cosmograph.app)
