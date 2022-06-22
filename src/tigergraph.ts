import { InputNode, InputLink } from './types'
import 'btoa'

export async function getTigerGraphData(vertex_type: Array<string>, edge_type: Array<string>, host: string, graphname: string, username: string, password: string) : Promise<{ nodes: InputNode[]; links: InputLink[]; }> {
    return fetch(`${host}:443/gsqlserver/interpreted_query`, {
        method: 'POST',
        body: `INTERPRET QUERY () FOR GRAPH ${graphname} {
          ListAccum<EDGE> @@edges;
          docs = {${vertex_type.join(".*, ")}.*};
          Res = SELECT d FROM docs:d - ((${edge_type.join(" | ")}):e) -> :t
                  ACCUM @@edges += e;
          PRINT docs;
          PRINT @@edges AS edges;
        }`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic '+btoa(`${username}:${password}`),
        }
    }).then(response => {
        if (!response.ok) {
          throw new Error(`Error! status: ${response.status}`);
        }
    
        return response.json();
    }).then(data => {
  
        const links: InputLink[] = [];
        const nodes: InputNode[] = [];
  
        if (data.error) {
          throw new Error(`Error! status: ${data.message}`);
        }
  
        let vertices = data.results[0]["docs"];
        let edges = data.results[1]["edges"];
        for (let vertex in vertices) nodes.push({...(vertices[vertex].attributes), ...({id: `${vertices[vertex].v_type}_${vertices[vertex].v_id}`, v_id: `${vertices[vertex].v_id}`, v_type: `${vertices[vertex].v_type}`})});
        for (let edge in edges) links.push({...(edges[edge].attributes), ...{ source: `${edges[edge].from_type}_${edges[edge].from_id}`, target: `${edges[edge].to_type}_${edges[edge].to_id}`}});
  
        return {"nodes": nodes, "links": links};
    });
}