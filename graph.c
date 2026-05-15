#include <stdio.h>
#include "graph.h"

void initGraph(Graph *g) {

    g->totalNodes = 0;

    for(int i=0;i<MAX;i++) {

        for(int j=0;j<MAX;j++) {

            g->adj[i][j] = 0;
        }
    }
}

void addNode(Graph *g, Node node) {

    g->nodes[g->totalNodes++] = node;
}

void addEdge(Graph *g, int u, int v) {

    g->adj[u][v] = 1;
    g->adj[v][u] = 1;
}

void showNetwork(Graph *g) {

    printf("\n========= ICU NETWORK =========\n");

    for(int i=0;i<g->totalNodes;i++) {

        Node n = g->nodes[i];

        printf("Node %d : ", n.id);

        if(n.type == PATIENT) {

            printf("PATIENT ");

            printf("[Oxygen=%d Stability=%d]",
                    n.oxygen,
                    n.stability);
        }

        else if(n.type == VENTILATOR) {

            printf("VENTILATOR ");

            printf("[Available=%s]",
                    n.available ? "YES" : "NO");
        }

        else {

            printf("ZONE");
        }

        printf("\n");
    }

    printf("\nConnections:\n");

    for(int i=0;i<g->totalNodes;i++) {

        for(int j=i+1;j<g->totalNodes;j++) {

            if(g->adj[i][j]) {

                printf("%d <--> %d\n", i, j);
            }
        }
    }
}

void removeVentilator(Graph *g, int id) {

    for(int i=0;i<g->totalNodes;i++) {

        if(g->nodes[i].id == id &&
           g->nodes[i].type == VENTILATOR) {

            g->nodes[i].available = 0;

            printf("\nVentilator V%d removed.\n", id);

            return;
        }
    }

    printf("\nVentilator not found.\n");
}