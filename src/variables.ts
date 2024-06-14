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
  hoveredPointRingColor: 'white',
  focusedPointRingColor: 'white',
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
  scalePointsOnZoom: true,
  disableZoom: false,
  disableDrag: false,
  fitViewOnInit: true,
  fitViewDelay: 250,
  pointSamplingDistance: 150,
}

export const hoveredPointRingOpacity = 0.7
export const focusedPointRingOpacity = 0.95
export const defaultScaleToZoom = 3
