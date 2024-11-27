import { Device } from "@luma.gl/core";
import { GraphConfigInterface } from "@/graph/config";
import { GraphData } from "@/graph/modules/GraphData";
import { Points } from "@/graph/modules/Points";
import { Store } from "@/graph/modules/Store";

export class CoreModule {
  public readonly device: Device;
  public readonly config: GraphConfigInterface;
  public readonly store: Store;
  public readonly data: GraphData;
  public readonly points: Points | undefined;

  public constructor(
    device: Device,
    config: GraphConfigInterface,
    store: Store,
    data: GraphData,
    points?: Points
  ) {
    this.device = Device;
    this.config = config;
    this.store = store;
    this.data = data;
    if (points) this.points = points;
  }
}
