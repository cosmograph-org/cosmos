import { InputNode, InputLink } from './types'
import 'btoa'

export class TigerGraphConnection {
  host: string;
  graphname: string;
  username: string;
  password: string;
  token: string;
 
  constructor(host: string, graphname: string, username: string, password: string, token?: string) {
    this.host = host;
    this.graphname = graphname;
    this.username = username;
    this.password = password;
    this.token = "";
  }

  async generateToken() {
    return fetch(`${this.host}:9000/requesttoken`, {
        method: 'POST',
        body: `{"graph": "${this.graphname}"}`,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic '+btoa(`${this.username}:${this.password}`),
        }
    }).then(response => {
        if (!response.ok) {
            throw new Error(`Error! status: ${response.status}`);
        }
    
        return response.json();
    }).then(data => {
        this.token = data.results.token;
        return this.token;
    });
  }

  async getTigerGraphData(vertex_type: Array<string>, edge_type: Array<string>) : Promise<{ nodes: InputNode[]; links: InputLink[]; }> {
    return fetch(`${this.host}:14240/gsqlserver/interpreted_query`, {
        method: 'POST',
        body: `INTERPRET QUERY () FOR GRAPH ${this.graphname} {
          ListAccum<EDGE> @@edges;
          Seed = {${vertex_type.join(".*, ")}.*};
          Res = SELECT d FROM Seed:d - ((${edge_type.join(" | ")}):e) -> :t
                  ACCUM @@edges += e;
          PRINT Seed;
          PRINT @@edges AS edges;
        }`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic '+btoa(`${this.username}:${this.password}`),
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
  
        let vertices = data.results[0]["Seed"];
        let edges = data.results[1]["edges"];
        for (let vertex in vertices) nodes.push({...(vertices[vertex].attributes), ...({id: `${vertices[vertex].v_type}_${vertices[vertex].v_id}`, v_id: `${vertices[vertex].v_id}`, v_type: `${vertices[vertex].v_type}`})});
        for (let edge in edges) links.push({...(edges[edge].attributes), ...{ source: `${edges[edge].from_type}_${edges[edge].from_id}`, target: `${edges[edge].to_type}_${edges[edge].to_id}`}});
  
        return {"nodes": nodes, "links": links};
    });
  }

    async runInterpretedQuery(interpreted_query: string) : Promise<{ nodes: InputNode[]; links: InputLink[]; }> {
        return fetch(`${this.host}:14240/gsqlserver/interpreted_query`, {
            method: 'POST',
            body: interpreted_query,
            headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic '+btoa(`${this.username}:${this.password}`),
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

            data = data.results;
        
            for (let res in data) {
                for (let key in data[res]) {
                    let vertices = data[res][key];
                    for (let vertex in vertices) {
                        if (vertices[vertex].v_type === undefined || vertices[vertex].v_id === undefined) break;
                        nodes.push({...(vertices[vertex].attributes), ...({id: `${vertices[vertex].v_type}_${vertices[vertex].v_id}`, v_id: `${vertices[vertex].v_id}`, v_type: `${vertices[vertex].v_type}`})});          
                    }
                    let edges = data[res][key];
                    for (let edge in edges) {
                        if (edges[edge].from_type === undefined || edges[edge].to_type === undefined) break;
                        links.push({...(edges[edge].attributes), ...{ source: `${edges[edge].from_type}_${edges[edge].from_id}`, target: `${edges[edge].to_type}_${edges[edge].to_id}`}});
                    }
                }
            }
            if (nodes.length === 0) {
                throw new Error("No vertices detected");
            } else if (links.length === 0) {
                throw new Error("No edges detected");
            }
            return {"nodes": nodes, "links": links};
        });
    }

    async runQuery(query_name: string, params?: JSON) : Promise<{ nodes: InputNode[]; links: InputLink[]; }> {
        return fetch(`${this.host}:9000/query/${this.graphname}/${query_name}`, {
            method: 'POST',
            body: params ? JSON.stringify(params) : "{}",
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer '+this.token,
            }
        }).then(response => {
            if (!response.ok) {
                throw new Error(`Error! status: ${response.status}`);
            }
        
            return response.json();
        }).then(data => {
            data = data.results;

            const links: InputLink[] = [];
            const nodes: InputNode[] = [];
        
            for (let res in data) {
                for (let key in data[res]) {
                    let vertices = data[res][key];
                    for (let vertex in vertices) {
                        if (vertices[vertex].v_type === undefined || vertices[vertex].v_id === undefined) break;
                        nodes.push({...(vertices[vertex].attributes), ...({id: `${vertices[vertex].v_type}_${vertices[vertex].v_id}`, v_id: `${vertices[vertex].v_id}`, v_type: `${vertices[vertex].v_type}`})});          
                    }
                    let edges = data[res][key];
                    for (let edge in edges) {
                        if (edges[edge].from_type === undefined || edges[edge].to_type === undefined) break;
                        links.push({...(edges[edge].attributes), ...{ source: `${edges[edge].from_type}_${edges[edge].from_id}`, target: `${edges[edge].to_type}_${edges[edge].to_id}`}});
                    }
                }
            }
            if (nodes.length === 0) {
                throw new Error("No vertices detected");
            } else if (links.length === 0) {
                throw new Error("No edges detected");
            }
            return {"nodes": nodes, "links": links};
        });
    }

    async runInstalledQuery(query_name: string, params?: JSON) : Promise<{ nodes: InputNode[]; links: InputLink[]; }> {
        if (this.token === "") {
            return this.generateToken().then(() => this.runQuery(query_name, params));
        } else return this.runQuery(query_name, params);
    }
}
