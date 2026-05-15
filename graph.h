#ifndef GRAPH_H
#define GRAPH_H

#define MAX 50

typedef enum {
    PATIENT,
    VENTILATOR,
    ZONE
} NodeType;

typedef struct {
    int id;
    NodeType type;

    int oxygen;
    int stability;

    int available;
} Node;

typedef struct {
    int adj[MAX][MAX];
    Node nodes[MAX];
    int totalNodes;
} Graph;

void initGraph(Graph *g);
void addNode(Graph *g, Node node);
void addEdge(Graph *g, int u, int v);
void showNetwork(Graph *g);
void removeVentilator(Graph *g, int id);

#endif