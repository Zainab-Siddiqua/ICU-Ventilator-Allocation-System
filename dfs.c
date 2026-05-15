#include <stdio.h>
#include "dfs.h"

void dfs(Graph *g, int node, int visited[]) {

    visited[node] = 1;

    if(g->nodes[node].type == PATIENT)
        printf("P%d ", node);

    else if(g->nodes[node].type == VENTILATOR)
        printf("V%d ", node);

    else
        printf("Z%d ", node);

    for(int i=0;i<g->totalNodes;i++) {

        if(g->adj[node][i] && !visited[i]) {
            dfs(g, i, visited);
        }
    }
}