import regl from 'regl'
import { GraphConfigInterface } from '@/graph/config'
import { GraphData } from '@/graph/modules/GraphData'
import { Points } from '@/graph/modules/Points'
import { Store } from '@/graph/modules/Store'
import { Node, Link, InputNode, InputLink } from '@/graph/types'

export class CoreModule<N extends InputNode, L extends InputLink> {
  public readonly reglInstance: regl.Regl
  public readonly config: GraphConfigInterface<Node<N>, Link<N, L>>
  public readonly store: Store
  public readonly data: GraphData<N, L>
  public readonly points: Points<N, L> | undefined

  public constructor (
    reglInstance: regl.Regl,
    config: GraphConfigInterface<Node<N>, Link<N, L>>,
    store: Store,
    data: GraphData<N, L>,
    points?: Points<N, L>
  ) {
    this.reglInstance = reglInstance
    this.config = config
    this.store = store
    this.data = data
    if (points) this.points = points
  }
}
