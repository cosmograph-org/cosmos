# Connecting Cosmos with TigerGraph

Use Cosmos to visualize data from your TigerGraph graph database. 

To begin, you will need to spin a TigerGraph on-prem solution. If you use a TigerGraph Cloud solution, be sure to enable CORS or use middleware.

Running `getTigerGraphData` will convert data from specific vertex and edge types to Cosmos-compatible InputNode and InputLink types. The first two parameters are string arrays of vertex and edge types. The final parameters are the TigerGraph database host name, graphname, username, and password.

```
getTigerGraphData(vertex_type, edge_type, host, graphname, username, password)
```

This will return a Promise with InputNode and InputLink arrays with the vertices, edges, and attributes which can be used to create a graph.

```
getTigerGraphData(["VertexType1", "VertexType2"], ["edge_type_1", "edge_type_2"], "https://tg_host.i.tgcloud.io", "GraphName", "tg_username", "tg_password").then((data) => {
    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    const graph = new Graph(canvas);
    graph.setData(data.nodes, data.links);
});
```
