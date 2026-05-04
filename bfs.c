#include "graph.h"

// BFS queue helpers
typedef struct { int data[MAX_NODES]; int head, tail; } Queue;
static void q_init(Queue* q) { q->head = q->tail = 0; }
static void q_push(Queue* q, int v) { q->data[q->tail++] = v; }
static int  q_pop (Queue* q) { return q->data[q->head++]; }
static int  q_empty(Queue* q) { return q->head == q->tail; }

// ─── BFS 1: Nearest Available Ventilator ────────────────────────────────────
// Start from patient_id, fan out to find closest free ventilator.
// Returns ventilator node id, or -1 if none reachable.
int bfs_nearest_ventilator(Graph* g, int patient_id, int* out_path, int* out_path_len) {
    if (patient_id < 0 || patient_id >= g->node_count) return -1;

    int visited[MAX_NODES] = {0};
    int parent [MAX_NODES];
    memset(parent, -1, sizeof(parent));
    Queue q; q_init(&q);

    visited[patient_id] = 1;
    q_push(&q, patient_id);

    while (!q_empty(&q)) {
        int cur = q_pop(&q);
        Node* n = &g->nodes[cur];
        // Found a free ventilator
        if (n->type == TYPE_VENTILATOR && n->status == STATUS_FREE) {
            // reconstruct path
            int path[MAX_NODES], len = 0, node = cur;
            while (node != -1) { path[len++] = node; node = parent[node]; }
            // reverse
            for (int i = 0; i < len/2; i++) { int tmp = path[i]; path[i] = path[len-1-i]; path[len-1-i] = tmp; }
            if (out_path) memcpy(out_path, path, len * sizeof(int));
            if (out_path_len) *out_path_len = len;
            return cur;
        }
        for (Edge* e = g->adj[cur]; e; e = e->next) {
            if (!visited[e->to]) {
                visited[e->to] = 1;
                parent[e->to]  = cur;
                q_push(&q, e->to);
            }
        }
    }
    return -1;
}

// ─── BFS 2: Nearest Available Staff member ─────────────────────────────────
int bfs_nearest_staff(Graph* g, int patient_id) {
    if (patient_id < 0 || patient_id >= g->node_count) return -1;
    int visited[MAX_NODES] = {0};
    Queue q; q_init(&q);
    visited[patient_id] = 1;
    q_push(&q, patient_id);
    while (!q_empty(&q)) {
        int cur = q_pop(&q);
        Node* n = &g->nodes[cur];
        if (n->type == TYPE_STAFF && n->data.staff.available) return cur;
        for (Edge* e = g->adj[cur]; e; e = e->next)
            if (!visited[e->to]) { visited[e->to] = 1; q_push(&q, e->to); }
    }
    return -1;
}

// ─── BFS 3: Surge Mapping ──────────────────────────────────────────────────
// Starting from zone_id, do BFS over Zone nodes and fill out_order[]
// with zone ids in the order they'd fill (closest first).
// Returns number of zones reached.
int bfs_surge_map(Graph* g, int start_zone_id, int* out_order, int max_out) {
    int visited[MAX_NODES] = {0};
    Queue q; q_init(&q);
    visited[start_zone_id] = 1;
    q_push(&q, start_zone_id);
    int count = 0;
    while (!q_empty(&q) && count < max_out) {
        int cur = q_pop(&q);
        if (g->nodes[cur].type == TYPE_ZONE) out_order[count++] = cur;
        for (Edge* e = g->adj[cur]; e; e = e->next)
            if (!visited[e->to]) { visited[e->to] = 1; q_push(&q, e->to); }
    }
    return count;
}

// ─── BFS 4: Surge prediction ────────────────────────────────────────────────
// Returns approximate minutes until available ventilators hit 0,
// given arrival_rate patients per minute.
float bfs_surge_time(Graph* g, float arrival_rate) {
    int free_vents = 0;
    for (int i = 0; i < g->node_count; i++)
        if (g->nodes[i].type == TYPE_VENTILATOR && g->nodes[i].status == STATUS_FREE)
            free_vents++;
    if (arrival_rate <= 0) return 1e9f;
    return (float)free_vents / arrival_rate;
}