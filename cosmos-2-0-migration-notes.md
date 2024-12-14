### Migration Guide @cosmograph/cosmos v2.0 

#### Introduction

Welcome to the updated @cosmograph/cosmos library! Version 2.0 introduces significant improvements in data handling and performance, marking a major milestone for the library. This guide will help you transition to the new version smoothly.

#### Key Changes in Data Handling

This update is centered on enhancing data performance by utilizing formats directly compatible with WebGL. Since WebGL operates with buffers and framebuffers created from arrays of numbers, we have introduced new methods to handle data more efficiently.

#### Replacing `setData`

The `setData` method has been replaced with `setPointPositions` and `setLinks`. These new methods accept Float32Array, which are directly used to create WebGL textures.

**Before:**
```js
graph.setData(
  [{ id: 'a' }, { id: 'b' }], // Nodes
  [{ source: 'a', target: 'b' }] // Links
);
```

**After:**
```js
graph.setPointPositions(new Float32Array([
  400, 400, // x and y of the first point
  500, 500, // x and y of the second point
]));
graph.setLinks(new Float32Array([
  0, 1 // Link between the first and second point
]));
```

#### Configuration Updates

Accessor functions for styling such as `nodeColor`, `nodeSize`, `linkColor`, `linkWidth`, and `linkArrows`, are eliminated. You can now set these attributes directly using Float32Array.

**Old Method for Setting Node Color:**
```js
config.nodeColor = node => node.color;
```

**New Method for Setting Point Colors:**
```js
graph.setPointColors(new Float32Array([
  0.5, 0.5, 1, 1, // r, g, b, alpha for the first point
  0.5, 1, 0.5, 1, // r, g, b, alpha for the second point
]));
```

**Flat Configuration Object:**

The configuration object is now flat instead of nested.

**Old Config:**
```js
const config = {
  backgroundColor: 'black',
  simulation: {
    repulsion: 0.5,
  },
  events: {
    onNodeMouseOver: (node, index, pos) => console.log(`Hovered over node ${node.id}`)
  }
}
```

**New config:**
```js
const config = {
  backgroundColor: 'black',
  simulationRepulsion: 0.5,
  onPointMouseOver: (index, pos) => console.log(`Hovered over point at index ${index}`);
}
```

**Initialization Change: From Canvas to Div**

In version 2.0, the initialization of the graph now requires a div element instead of a canvas element.

**Before**
```js
const canvas = document.getElementById('myCanvas')
const graph = new Graph(canvas, config)
```

**After**
```js
const div = document.getElementById('myDiv')
const graph = new Graph(div, config)
```

**Summary of Additional Changes**

- **Terminology Update:** "Node" is now "Point," but "Link" remains unchanged.
- **API Modifications:** All methods that focused on node objects have been updated or replaced to handle indices.
- **Manual Rendering:** After setting data or updating point/link properties, remember to run `graph.render()` to update WebGL textures and render the graph with the new data.

