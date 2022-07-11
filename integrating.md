# Connecting Cosmos with TigerGraph

Use Cosmos to visualize data from your TigerGraph graph database. 

To begin, you will need to spin a TigerGraph on-prem solution. If you use a TigerGraph Cloud solution, be sure to enable CORS or use middleware.

To initialize the connection, run `TigerGraphConnection` with the details of the solution you just provisioned, including the host, the name of the graph, and your username and password. The final parameter of token is optional; if it is not provided, it will be generated when needed.

```
let conn = new TigerGraphConnection(host, graphname, username, password, token);
```

Running `getTigerGraphData` will convert data from specific vertex and edge types to Cosmos-compatible InputNode and InputLink types, and its two parameters are string arrays of vertex and edge types. 

```
getTigerGraphData(vertex_type, edge_type)
```

This will return a Promise with InputNode and InputLink arrays with the vertices, edges, and attributes which can be used to create a graph.

```
conn.getTigerGraphData(["VertexType1", "VertexType2"], ["edge_type_1", "edge_type_2"]).then((data) => {
    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    const graph = new Graph(canvas);
    graph.setData(data.nodes, data.links);
});
```

In addition, users can run installed and interpreted queries and the results will be visualized. Currently, only vertices and edges returned in the form of lists or sets are supported. The syntax for the two are similar.

```
conn.runInterpretedQuery('interpreted_query_string').then((data) => {
    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    const graph = new Graph(canvas);
    graph.setData(data.nodes, data.links);
});
```

```
conn.runInstalledQuery('installed_query_name').then((data) => {
    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    const graph = new Graph(canvas);
    graph.setData(data.nodes, data.links);
});
```
