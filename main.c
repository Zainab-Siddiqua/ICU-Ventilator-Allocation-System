#include <stdio.h>

#include "graph.h"
#include "bfs.h"
#include "dfs.h"
#include "utility.h"

int main() {

    Graph g;

    initGraph(&g);

    // Default Nodes

    Node p1 = {0, PATIENT, 30, 20, 0};
    Node p2 = {1, PATIENT, 50, 40, 0};

    Node v1 = {2, VENTILATOR, 0, 0, 1};
    Node v2 = {3, VENTILATOR, 0, 0, 1};

    Node z1 = {4, ZONE, 0, 0, 0};
    Node z2 = {5, ZONE, 0, 0, 0};

    addNode(&g, p1);
    addNode(&g, p2);

    addNode(&g, v1);
    addNode(&g, v2);

    addNode(&g, z1);
    addNode(&g, z2);

    // Default Connections

    addEdge(&g, 0, 4);
    addEdge(&g, 4, 5);
    addEdge(&g, 5, 2);

    addEdge(&g, 1, 4);
    addEdge(&g, 5, 3);

    int choice;

    while(1) {

        printf("\n====================================\n");
        printf(" ICU Ventilator Allocation System\n");
        printf("====================================\n");

        printf("1. Show ICU Network\n");
        printf("2. Update ICU Network\n");
        printf("3. Trigger Emergency Allocation\n");
        printf("4. Show DFS Traversal\n");
        printf("5. Exit\n");

        printf("\nEnter Choice : ");

        scanf("%d", &choice);

        switch(choice) {

            case 1:

                showNetwork(&g);

                break;

            case 2: {

                int updateChoice;

                while(1) {

                    printf("\n========== UPDATE ICU NETWORK ==========\n");

                    printf("1. Add Patient\n");
                    printf("2. Add Ventilator\n");
                    printf("3. Remove Ventilator\n");
                    printf("4. Add ICU Zone\n");
                    printf("5. Connect Nodes\n");
                    printf("6. Back to Main Menu\n");

                    printf("\nEnter Choice : ");

                    scanf("%d", &updateChoice);

                    if(updateChoice == 1) {

                        Node p;

                        p.type = PATIENT;

                        p.available = 0;

                        printf("\nEnter Patient ID : ");

                        scanf("%d", &p.id);

                        printf("Enter Oxygen Level : ");

                        scanf("%d", &p.oxygen);

                        printf("Enter Stability Score : ");

                        scanf("%d", &p.stability);

                        addNode(&g, p);

                        printf("Patient Added Successfully.\n");
                    }

                    else if(updateChoice == 2) {

                        Node v;

                        v.type = VENTILATOR;

                        v.oxygen = 0;

                        v.stability = 0;

                        printf("\nEnter Ventilator ID : ");

                        scanf("%d", &v.id);

                        printf("Available? (1/0) : ");

                        scanf("%d", &v.available);

                        addNode(&g, v);

                        printf("Ventilator Added Successfully.\n");
                    }

                    else if(updateChoice == 3) {

                        int id;

                        printf("\nEnter Ventilator ID : ");

                        scanf("%d", &id);

                        removeVentilator(&g, id);
                    }

                    else if(updateChoice == 4) {

                        Node z;

                        z.type = ZONE;

                        z.oxygen = 0;

                        z.stability = 0;

                        z.available = 0;

                        printf("\nEnter Zone ID : ");

                        scanf("%d", &z.id);

                        addNode(&g, z);

                        printf("Zone Added Successfully.\n");
                    }

                    else if(updateChoice == 5) {

                        int u, v;

                        printf("\nEnter First Node Index : ");

                        scanf("%d", &u);

                        printf("Enter Second Node Index : ");

                        scanf("%d", &v);

                        addEdge(&g, u, v);

                        printf("Nodes Connected Successfully.\n");
                    }

                    else if(updateChoice == 6) {

                        break;
                    }

                    else {

                        printf("\nInvalid Choice.\n");
                    }
                }

                break;
            }

            case 3: {

                int patient =
                highestPriorityPatient(&g);

                allocateVentilator(&g, patient);

                break;
            }

            case 4: {

                int visited[MAX] = {0};

                printf("\nDFS Traversal:\n");

                dfs(&g, 0, visited);

                printf("\n");

                break;
            }

            case 5:

                printf("\nExiting System...\n");

                return 0;

            default:

                printf("\nInvalid Choice.\n");
        }
    }

    return 0;
}