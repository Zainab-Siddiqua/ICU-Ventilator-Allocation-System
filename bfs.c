#include <stdio.h>
#include "bfs.h"

void allocateVentilator(Graph *g, int start) {

    int visited[MAX] = {0};
    int parent[MAX];
    int queue[MAX];

    int front = 0;
    int rear = 0;

    for(int i=0;i<MAX;i++) {
        parent[i] = -1;
    }

    queue[rear++] = start;
    visited[start] = 1;

    while(front < rear) {

        int current = queue[front++];

        if(g->nodes[current].type == VENTILATOR &&
           g->nodes[current].available) {

            printf("\n=================================\n");
            printf("🚨 ICU EMERGENCY ALERT 🚨\n");
            printf("=================================\n");

            printf("Critical Patient : P%d\n", start);

            printf("\nNearest Ventilator : V%d\n", current);

            int path[MAX];
            int k = 0;

            int temp = current;

            while(temp != -1) {
                path[k++] = temp;
                temp = parent[temp];
            }

            printf("\nPath : ");

            for(int i=k-1;i>=0;i--) {

                if(g->nodes[path[i]].type == PATIENT)
                    printf("P%d ", path[i]);

                else if(g->nodes[path[i]].type == VENTILATOR)
                    printf("V%d ", path[i]);

                else
                    printf("Z%d ", path[i]);

                if(i != 0)
                    printf("-> ");
            }

            printf("\nDistance : %d\n", k-1);

            printf("=================================\n");

            return;
        }

        for(int i=0;i<g->totalNodes;i++) {

            if(g->adj[current][i] && !visited[i]) {

                visited[i] = 1;
                parent[i] = current;

                queue[rear++] = i;
            }
        }
    }

    printf("\nNo Ventilator Available!\n");
}