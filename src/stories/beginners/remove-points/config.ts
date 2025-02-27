import { GraphConfigInterface } from '@cosmograph/cosmos'

export const config: GraphConfigInterface = {
  spaceSize: 4096,
  backgroundColor: '#2d313a',
  pointSize: 4,
  pointColor: '#4B5BBF',
  pointGreyoutOpacity: 0.1,
  linkWidth: 0.1,
  linkColor: '#5F74C2',
  linkArrows: false,
  linkGreyoutOpacity: 0,
  hoveredPointCursor: 'pointer',
  renderHoveredPointRing: true,
  fitViewDuration: 1000,
  fitViewPadding: 0.3,
  enableSimulationDuringZoom: true,
  simulationLinkDistance: 1,
  simulationLinkSpring: 2,
  simulationRepulsion: 0.2,
  simulationGravity: 0.1,
  simulationDecay: 100000,
}
