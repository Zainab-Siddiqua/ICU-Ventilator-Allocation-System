#include "graph.h"

Graph* graph_create(void) {
    Graph* g = (Graph*)calloc(1, sizeof(Graph));
    if (!g) { perror("graph_create"); exit(1); }
    for (int i = 0; i < MAX_NODES; i++) g->adj[i] = NULL;
    g->node_count = 0;
    g->edge_count  = 0;
    return g;
}

void graph_destroy(Graph* g) {
    if (!g) return;
    for (int i = 0; i < MAX_NODES; i++) {
        Edge* e = g->adj[i];
        while (e) { Edge* tmp = e->next; free(e); e = tmp; }
    }
    free(g);
}

int graph_add_node(Graph* g, const char* name, int type, int status, int x, int y) {
    if (g->node_count >= MAX_NODES) { fprintf(stderr,"Node limit reached\n"); return -1; }
    int id = g->node_count++;
    Node* n = &g->nodes[id];
    n->id     = id;
    n->type   = type;
    n->status = status;
    n->x      = x;
    n->y      = y;
    strncpy(n->name, name, MAX_NAME - 1);
    n->name[MAX_NAME-1] = '\0';

    // sensible defaults
    if (type == TYPE_PATIENT) {
        n->data.patient.oxygen_level      = 98.0f;
        n->data.patient.lung_stability    = 1.0f;
        n->data.patient.kidney_stability  = 1.0f;
        n->data.patient.heart_stability   = 1.0f;
        n->data.patient.brain_stability   = 1.0f;
        n->data.patient.priority_score    = 0.0f;
        n->data.patient.time_on_ventilator= 0;
        n->data.patient.ventilator_id     = -1;
        n->data.patient.weaning_candidate = 0;
    } else if (type == TYPE_VENTILATOR) {
        n->data.ventilator.patient_id = -1;
        n->data.ventilator.battery_level = 100.0f;
    }
    return id;
}

void graph_add_edge(Graph* g, int u, int v, float weight) {
    // undirected: add both directions
    Edge* eu = (Edge*)malloc(sizeof(Edge));
    eu->to = v; eu->weight = weight; eu->next = g->adj[u]; g->adj[u] = eu;
    Edge* ev = (Edge*)malloc(sizeof(Edge));
    ev->to = u; ev->weight = weight; ev->next = g->adj[v]; g->adj[v] = ev;
    g->edge_count++;
}

Node* graph_get_node(Graph* g, int id) {
    if (id < 0 || id >= g->node_count) return NULL;
    return &g->nodes[id];
}

void graph_print(const Graph* g) {
    printf("\n=== Hospital Graph (%d nodes, %d edges) ===\n", g->node_count, g->edge_count);
    const char* type_names[] = {"Patient","Ventilator","Zone","Staff"};
    const char* stat_names[] = {"Stable","At-Risk","Critical","Free","In-Use","Offline"};
    for (int i = 0; i < g->node_count; i++) {
        const Node* n = &g->nodes[i];
        printf("  [%d] %-20s | %-10s | %-8s | (%d,%d)\n",
               n->id, n->name,
               type_names[n->type < 4 ? n->type : 0],
               stat_names[n->status < 6 ? n->status : 0],
               n->x, n->y);
        printf("       Edges -> ");
        const Edge* e = g->adj[i];
        while (e) { printf("%d(%.1fm) ", e->to, e->weight); e = e->next; }
        printf("\n");
    }
}
