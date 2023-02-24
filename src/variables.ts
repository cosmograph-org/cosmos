export const defaultNodeColor = '#b3b3b3'
export const defaultGreyoutNodeOpacity = 0.1
export const defaultNodeSize = 4
export const defaultLinkColor = '#666666'
export const defaultGreyoutLinkOpacity = 0.1
export const defaultLinkWidth = 1
export const defaultBackgroundColor = '#222222'

export const defaultConfigValues = {
  spaceSize: 4096,
  nodeSizeScale: 1,
  linkWidthScale: 1,
  arrowSizeScale: 1,
  renderLinks: true,
  arrowLinks: true,
  linkVisibilityDistanceRange: [50, 150],
  linkVisibilityMinTransparency: 0.25,
  useQuadtree: false,
  simulation: {
    decay: 1000,
    gravity: 0,
    center: 0,
    repulsion: 0.1,
    repulsionTheta: 1.7,
    repulsionQuadtreeLevels: 12,
    linkSpring: 1,
    linkDistance: 2,
    linkDistRandomVariationRange: [1, 1.2],
    repulsionFromMouse: 2,
    friction: 0.85,
  },
  showFPSMonitor: false,
  pixelRatio: 2,
  scaleNodesOnZoom: true,
}

export const hoveredNodeRingOpacity = 0.7
export const focusedNodeRingOpacity = 0.95
export const defaultScaleToZoom = 3
