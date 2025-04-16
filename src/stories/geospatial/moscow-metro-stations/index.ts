import { Graph } from '@cosmograph/cosmos'
import { moscowMetroCoords } from './moscow-metro-coords'
import { getPointColors } from './point-colors'
import './style.css'

/**
 * This example demonstrates the importance of rescaling positions by Cosmos.
 * The Moscow Metro station coordinates are are normalized (0-1 range in both dimensions).
 * By default, Cosmos rescales these positions to fit the canvas.
 * When disabling rescaling (`rescalePositions: false`):
 * - Points render using raw coordinates
 * - The entire graph occupies a tiny 1x1 area in WebGL's clip space (-1 to 1)
 * - This causes visual artifacts due to WebGL's floating-point precision limitations
 * - Points cluster in the center and may exhibit rendering glitches
 */
export const moscowMetroStations = (): {graph: Graph; div: HTMLDivElement} => {
  const div = document.createElement('div')
  div.className = 'app'

  const graphDiv = document.createElement('div')
  graphDiv.className = 'graph'
  div.appendChild(graphDiv)

  const actionsDiv = document.createElement('div')
  actionsDiv.className = 'actions'
  div.appendChild(actionsDiv)

  let rescalePositions = true

  const graph = new Graph(graphDiv, {
    backgroundColor: '#2d313a',
    scalePointsOnZoom: false,
    rescalePositions,
    pointColor: '#FEE08B',
    enableSimulation: false,
    enableDrag: false,
    fitViewOnInit: true,
  })

  const pointColors = getPointColors(moscowMetroCoords)

  graph.setPointPositions(new Float32Array(moscowMetroCoords))
  graph.setPointColors(pointColors)
  graph.render()

  const disableEnableRescaleButton = document.createElement('div')
  disableEnableRescaleButton.className = 'action'
  disableEnableRescaleButton.textContent = 'Disable Rescale'
  actionsDiv.appendChild(disableEnableRescaleButton)

  disableEnableRescaleButton.addEventListener('click', () => {
    rescalePositions = !rescalePositions
    disableEnableRescaleButton.textContent = rescalePositions ? 'Disable Rescale' : 'Enable Rescale'
    graph.setConfig({ rescalePositions })
    graph.setPointPositions(new Float32Array(moscowMetroCoords))
    graph.render()
    graph.fitView()
  })

  return { div, graph }
}
