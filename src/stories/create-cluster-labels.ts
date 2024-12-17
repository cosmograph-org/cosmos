import { Graph } from '@cosmograph/cosmos'

export const createClusterLabels = (props: { div: HTMLDivElement }): (graph: Graph) => void => {
  const clusterLabelDivs: HTMLDivElement[] = []
  return function updateClusterLabels (graph: Graph): void {
    const clusterPositions = graph.getClusterPositions()
    const nClusters = clusterPositions.length / 2
    if (nClusters === 0) return
    if (clusterLabelDivs.length === 0) {
      for (let i = 0; i < nClusters; i++) {
        const clusterLabelDiv = document.createElement('div')
        const contentLabel = document.createElement('p')
        clusterLabelDiv.appendChild(contentLabel)
        clusterLabelDiv.style.position = 'absolute'
        clusterLabelDiv.style.pointerEvents = 'none'

        contentLabel.style.fontFamily = [
          '"Nunito Sans"',
          '-apple-system',
          '".SFNSText-Regular"',
          '"San Francisco"',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          '"Helvetica Neue"',
          'Helvetica',
          'Arial',
          'sans-serif',
        ].join(', ')
        contentLabel.style.fontWeight = 'bold'
        contentLabel.style.color = 'white'
        contentLabel.style.transform = 'translate(-50%, -100%)'
        contentLabel.innerText = `Cluster ${i + 1}`

        props.div.appendChild(clusterLabelDiv)
        clusterLabelDivs[i] = clusterLabelDiv
      }
    }

    for (let i = 0; i < nClusters; i++) {
      const clusterPosition = clusterPositions.slice(i * 2, i * 2 + 2)
      const x = clusterPosition[0]
      const y = clusterPosition[1]
      const clusterLabelDiv = clusterLabelDivs[i] as HTMLDivElement
      const screenXY = graph.spaceToScreenPosition([x ?? 0, y ?? 0])
      clusterLabelDiv.style.top = `${screenXY[1]}px`
      clusterLabelDiv.style.left = `${screenXY[0]}px`
    }
  }
}
