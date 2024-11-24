
<p align="center" style="color: #444">
  <h1 align="center">🌌 Cosmos</h1>
</p>
<p align="center" style="font-size: 1.2rem;">GPU-accelerated Force Graph</p>

**Cosmos** is a WebGL Force Graph layout algorithm and rendering engine. All the computations and drawing are happening on the GPU in fragment and vertex shaders, avoiding expensive memory operations.

It enables real-time simulation of network graphs consisting of hundreds of thousands of points and links on modern hardware.

<img src="https://user-images.githubusercontent.com/755708/173392407-9b05cbb6-d39e-4c2c-ab41-50900cfda823.mp4" autoplay controls>
</img>

[📺 Comparison with other libraries](https://www.youtube.com/watch?v=HWk78hP8aEE)

[🎮 Try Cosmos on CodeSandbox](https://stackblitz.com/edit/how-to-use-cosmos?file=src%2Fmain.ts)

---

### Quick Start

Install the package:

```bash
npm install @cosmograph/cosmos
```

Configure the graph, set data, and run the simulation:

```javascript
import { Graph } from '@cosmograph/cosmos';
import { pointPositions, links } from './data';

const canvas = document.querySelector('canvas');
const config = {
  simulation: {
    repulsion: 0.5,
  },
  renderLinks: true,
  events: {
    onClick: (pointIndex) => {
      console.log('Clicked point index: ', pointIndex);
    },
  },
};

const graph = new Graph(canvas, config);

graph.setPointPositions(pointPositions);
graph.setLinks(links);
graph.render();
```

- **`pointPositions`**: An array of `[x1, y1, x2, y2, ..., xN, yN]`.
- **`links`**: An array of `[sourceIndex1, targetIndex1, ..., sourceIndexN, targetIndexN]`.

> **Note**
> If your canvas element has no width and height styles (either CSS or inline), Cosmos will automatically set them to 100%.

---

### What's New in v2.0?

Cosmos v2.0 introduces significant improvements in performance and data handling:

- Enhanced data structures with WebGL-compatible formats.
- Methods like `setPointPositions` and `setLinks` replace `setData` for improved efficiency.
- Direct control over point and link attributes via arrays (e.g., colors, sizes, widths).
- Updated event handling based on indices instead of objects.

Check the [Migration Guide](https://github.com/cosmograph-org/cosmos/tree/next/cosmos-2-0-migration-notes.md) for details.

---

### Examples

- [Basic Set-Up](https://stackblitz.com/edit/how-to-use-cosmos?file=src%2Fmain.ts)

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

- 🛠 [Configuration](https://github.com/cosmograph-org/cosmos/wiki/Cosmos-v2-(Beta-version)-configuration)
- ⚙️ [API Reference](https://github.com/cosmograph-org/cosmos/wiki/Cosmos-v2-(Beta-version)-API-Reference)
- 🚀 [Migration Guide](https://github.com/cosmograph-org/cosmos/tree/next/cosmos-2-0-migration-notes.md)

---

### License

**CC-BY-NC-4.0**

Cosmos is free for non-commercial usage. If you're a scientist, artist, educator, journalist, or student, we'd love to hear how you're using Cosmos! For commercial projects, please [reach out](mailto:hi@cosmograph.app).

---

### Contact

[📩 hi@cosmograph.app](mailto:hi@cosmograph.app)
