#include <stdio.h>
#include "utility.h"

int highestPriorityPatient(Graph *g) {

    int maxPriority = -1;
    int patientIndex = -1;

    for(int i=0;i<g->totalNodes;i++) {

        if(g->nodes[i].type == PATIENT) {

            int priority =
            (g->nodes[i].oxygen * 2)
            + g->nodes[i].stability;

            if(priority > maxPriority) {

                maxPriority = priority;
                patientIndex = i;
            }
        }
    }

    return patientIndex;
}

void showAlgorithmInfo() {

    printf("\n=========== ALGORITHMS ===========\n");

    printf("\nBFS (Breadth First Search)\n");
    printf("----------------------------------\n");
    printf("Used for nearest ventilator allocation.\n");
    printf("Finds shortest path in ICU graph.\n");
    printf("Complexity : O(V + E)\n");

    printf("\nDFS (Depth First Search)\n");
    printf("----------------------------------\n");
    printf("Used for ICU network traversal.\n");
    printf("Explores graph deeply.\n");
    printf("Complexity : O(V + E)\n");

    printf("\nGreedy Strategy\n");
    printf("----------------------------------\n");
    printf("Used for selecting highest priority patient.\n");
}