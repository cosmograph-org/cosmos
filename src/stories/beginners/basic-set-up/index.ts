import { Graph } from '@cosmograph/cosmos'
import { generateData } from './data-gen'
import './style.css'

export const BasicSetUpStory = (): { graph: Graph; div: HTMLDivElement} => {
  const div = document.createElement('div')
  div.className = 'app'

  const graphDiv = document.createElement('div')
  graphDiv.className = 'graph'
  div.appendChild(graphDiv)

  const actionsDiv = document.createElement('div')
  actionsDiv.className = 'actions'
  div.appendChild(actionsDiv)

  const actionsHeader = document.createElement('div')
  actionsHeader.className = 'actions-header'
  actionsHeader.textContent = 'Actions'
  actionsDiv.appendChild(actionsHeader)

  const graph = new Graph(graphDiv, {
    spaceSize: 4096,
    backgroundColor: '#151515',
    pointSize: 4,
    pointColor: '#4B5BBF',
    pointGreyoutOpacity: 0.1,
    linkWidth: 0.1,
    linkColor: '#5F74C2',
    linkArrows: false,
    linkGreyoutOpacity: 0,
    curvedLinks: true,
    renderHoveredPointRing: true,
    hoveredPointRingColor: '#4B5BBF',
    enableDrag: true,
    simulationLinkDistance: 1,
    simulationLinkSpring: 2,
    simulationRepulsion: 0.2,
    simulationGravity: 0.1,
    simulationDecay: 100000,
    onClick: (index: number | undefined): void => {
      if (index !== undefined) {
        graph.selectPointByIndex(index)
        graph.zoomToPointByIndex(index)
      } else {
        graph.unselectPoints()
      }
      console.log('Clicked point index: ', index)
    },
  })

  const { pointPositions, links } = generateData()
  graph.setPointPositions(pointPositions)
  graph.setLinks(links)

  graph.zoom(0.9)
  graph.render()

  /* ~ Demo Actions ~ */
  // Start / Pause
  let isPaused = false
  // const pauseButton = document.getElementById('pause') as HTMLDivElement
  const pauseButton = document.createElement('div')
  pauseButton.className = 'action'
  pauseButton.textContent = 'Pause'
  actionsDiv.appendChild(pauseButton)

  function pause (): void {
    isPaused = true
    pauseButton.textContent = 'Start'
    graph.pause()
  }

  function start (): void {
    isPaused = false
    pauseButton.textContent = 'Pause'
    graph.start()
  }

  function togglePause (): void {
    if (isPaused) start()
    else pause()
  }

  pauseButton.addEventListener('click', togglePause)

  // Zoom and Select
  function getRandomPointIndex (): number {
    return Math.floor((Math.random() * pointPositions.length) / 2)
  }

  function getRandomInRange ([min, max]: [number, number]): number {
    return Math.random() * (max - min) + min
  }

  function fitView (): void {
    graph.fitView()
  }

  function zoomIn (): void {
    const pointIndex = getRandomPointIndex()
    graph.zoomToPointByIndex(pointIndex)
    graph.selectPointByIndex(pointIndex)
    pause()
  }

  function selectPoint (): void {
    const pointIndex = getRandomPointIndex()
    graph.selectPointByIndex(pointIndex)
    graph.fitView()
    pause()
  }

  function selectPointsInArea (): void {
    const w = div.clientWidth
    const h = div.clientHeight
    const left = getRandomInRange([w / 4, w / 2])
    const right = getRandomInRange([left, (w * 3) / 4])
    const top = getRandomInRange([h / 4, h / 2])
    const bottom = getRandomInRange([top, (h * 3) / 4])
    pause()
    graph.selectPointsInRange([
      [left, top],
      [right, bottom],
    ])
  }

  const fitViewButton = document.createElement('div')
  fitViewButton.className = 'action'
  fitViewButton.textContent = 'Fit View'
  fitViewButton.addEventListener('click', fitView)
  actionsDiv.appendChild(fitViewButton)

  const zoomButton = document.createElement('div')
  zoomButton.className = 'action'
  zoomButton.textContent = 'Zoom to a point'
  zoomButton.addEventListener('click', zoomIn)
  actionsDiv.appendChild(zoomButton)

  const selectPointButton = document.createElement('div')
  selectPointButton.className = 'action'
  selectPointButton.textContent = 'Select a point'
  selectPointButton.addEventListener('click', selectPoint)
  actionsDiv.appendChild(selectPointButton)

  const selectPointsInAreaButton = document.createElement('div')
  selectPointsInAreaButton.className = 'action'
  selectPointsInAreaButton.textContent = 'Select points in a rectangular area'
  selectPointsInAreaButton.addEventListener('click', selectPointsInArea)
  actionsDiv.appendChild(selectPointsInAreaButton)

  return { div, graph }
}
