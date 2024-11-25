export const defaultPointColor = '#b3b3b3'
export const defaultGreyoutPointOpacity = 0.1
export const defaultPointSize = 4
export const defaultLinkColor = '#666666'
export const defaultGreyoutLinkOpacity = 0.1
export const defaultLinkWidth = 1
export const defaultBackgroundColor = '#222222'

export const defaultConfigValues = {
  disableSimulation: false,
  spaceSize: 4096,
  pointSizeScale: 1,
  linkWidthScale: 1,
  arrowSizeScale: 1,
  renderLinks: true,
  curvedLinks: false,
  curvedLinkSegments: 19,
  curvedLinkWeight: 0.8,
  curvedLinkControlPointDistance: 0.5,
  arrowLinks: false,
  linkVisibilityDistanceRange: [50, 150],
  linkVisibilityMinTransparency: 0.25,
  hoveredPointCursor: 'auto',
  renderHoveredPointRing: false,
  hoveredPointRingColor: 'white',
  focusedPointRingColor: 'white',
  focusedPointIndex: undefined,
  useQuadtree: false,
  simulation: {
    decay: 5000,
    gravity: 0.25,
    center: 0,
    repulsion: 1.0,
    repulsionTheta: 1.15,
    repulsionQuadtreeLevels: 12,
    linkSpring: 1,
    linkDistance: 10,
    linkDistRandomVariationRange: [1, 1.2],
    repulsionFromMouse: 2,
    friction: 0.85,
    cluster: 0.1,
  },
  showFPSMonitor: false,
  pixelRatio: 2,
  scalePointsOnZoom: true,
  disableZoom: false,
  enableDrag: false,
  fitViewOnInit: true,
  fitViewDelay: 250,
  fitViewPadding: 0.1,
  fitViewDuration: 250,
  pointSamplingDistance: 150,
}

export const hoveredPointRingOpacity = 0.7
export const focusedPointRingOpacity = 0.95
export const defaultScaleToZoom = 3
