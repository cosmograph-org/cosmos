### Migration Guide @cosmograph/cosmos v2.0 

#### Introduction

Welcome to the updated @cosmograph/cosmos library! Version 2.0 introduces significant improvements in data handling and performance, marking a major milestone for the library. This guide will help you transition to the new version smoothly.

#### Key Changes in Data Handling

This update is centered on enhancing data performance by utilizing formats directly compatible with WebGL. Since WebGL operates with buffers and framebuffers created from arrays of numbers, we have introduced new methods to handle data more efficiently.

#### Replacing `setData`

The `setData` method has been replaced with `setPointPositions` and `setLinks`. These new methods accept arrays of numbers, which are directly used to create WebGL textures.

**Before:**
```js
graph.setData(
  [{ id: 'a' }, { id: 'b' }], // Nodes
  [{ source: 'a', target: 'b' }] // Links
);
```

**After:**
```js
graph.setPointPositions([
  400, 400, // x and y of the first point
  500, 500, // x and y of the second point
]);
graph.setLinks([
  0, 1 // Link between the first and second point
]);
```

#### Configuration Updates

Accessor functions for styling such as `nodeColor`, `nodeSize`, `linkColor`, `linkWidth`, and `linkArrows`, are eliminated. You can now set these attributes directly using arrays of numbers.

**Old Method for Setting Node Color:**
```js
config.nodeColor = node => node.color;
```

**New Method for Setting Point Colors:**
```js
graph.setPointColors([
  0.5, 0.5, 1, 1, // r, g, b, alpha for the first point
  0.5, 1, 0.5, 1, // r, g, b, alpha for the second point
]);
```

If you don't set point colors, sizes, link colors, widths, or arrows, default values from the new config parameters (`defaultPointColor`, `defaultPointSize`, `defaultLinkColor`, `defaultLinkWidth`, and `defaultLinkArrow`) will be applied.

**Example:**
```js
const config = {
  defaultPointColor: 'navajowhite'
};
```

**Modifying Event Handling**

Event handling now focuses on point indices instead of node objects.

**Old Event Handling:**
```js
config.events.onNodeMouseOver = (node, index, pos) => console.log(`Hovered over node ${node.id}`);
```

**New Event Handling:**
```js
config.events.onPointMouseOver = (index, pos) => console.log(`Hovered over point at index ${index}`);
```

**Summary of Additional Changes**

- **Terminology Update:** "Node" is now "Point," but "Link" remains unchanged.
- **API Modifications:** All methods that focused on node objects have been updated or replaced to handle indices.
- **Manual Rendering:** After setting data or updating point/link properties, remember to run `graph.render()` to update WebGL textures and render the graph with the new data.

