#include "graph.h"

// ─── Organ Failure Timeline constants (minutes per stage) ──────────────────
static const float CASCADE_DELAYS[] = {
    0.0f,   // Lungs fail immediately
    2.0f,   // Blood oxygen drops (2 min)
    8.0f,   // Kidneys stressed (8 min)
    20.0f,  // Heart strain (20 min)
    45.0f   // Brain damage (45 min)
};
static const char* CASCADE_LABELS[] = {
    "Lungs fail → ventilator removed",
    "Blood oxygen drops critically",
    "Kidneys under severe stress",
    "Heart strain / arrhythmia",
    "Brain damage / irreversible"
};
#define CASCADE_STEPS 5

// DFS colour states
#define WHITE 0
#define GREY  1
#define BLACK 2

// ─── DFS 1: Organ Failure Cascade ─────────────────────────────────────────
// Simulate the physiological DFS when a patient (patient_id) loses ventilator.
void dfs_organ_cascade(Graph* g, int patient_id) {
    Node* n = graph_get_node(g, patient_id);
    if (!n || n->type != TYPE_PATIENT) return;
    PatientData* p = &n->data.patient;

    printf("\n╔══════════════════════════════════════════════════════╗\n");
    printf("║  ORGAN FAILURE CASCADE — Patient: %-18s║\n", n->name);
    printf("╚══════════════════════════════════════════════════════╝\n");

    float organs[5] = {
        p->lung_stability,
        p->oxygen_level / 100.0f,
        p->kidney_stability,
        p->heart_stability,
        p->brain_stability
    };

    for (int step = 0; step < CASCADE_STEPS; step++) {
        float degradation = 0.15f * (step + 1);
        organs[step] = organs[step] - degradation;
        if (organs[step] < 0) organs[step] = 0;

        printf("  T+%.0f min  [%s]\n", CASCADE_DELAYS[step], CASCADE_LABELS[step]);
        printf("            Stability after: %.0f%%\n", organs[step] * 100.0f);
        if (organs[step] == 0) printf("            ⚠  ORGAN FAILURE IRREVERSIBLE\n");
        printf("\n");
    }
}

// ─── DFS 2: Dependency Chain ─────────────────────────────────────────────
// Trace which other patients depend on this patient's ventilator (shared
// sedation / pool logic). Uses recursive DFS.
static int color[MAX_NODES];

static void dfs_dependency_visit(Graph* g, int cur, int depth) {
    color[cur] = GREY;
    Node* n = &g->nodes[cur];
    if (n->type == TYPE_PATIENT) {
        printf("%*s→ [%d] %s (priority %.1f)\n",
               depth*3, "", cur, n->name, n->data.patient.priority_score);
    }
    for (Edge* e = g->adj[cur]; e; e = e->next) {
        int nb = e->to;
        if (color[nb] == WHITE && g->nodes[nb].type == TYPE_PATIENT) {
            dfs_dependency_visit(g, nb, depth + 1);
        }
    }
    color[cur] = BLACK;
}

void dfs_dependency_chain(Graph* g, int start_patient) {
    memset(color, WHITE, sizeof(color));
    printf("\n─── Ventilator Dependency Chain from patient [%d] ───\n", start_patient);
    dfs_dependency_visit(g, start_patient, 0);
}

// ─── DFS 3: Cycle Detection (Deadlock) ───────────────────────────────────
// Detect "Patient A waits for B, B waits for A" deadlocks in wean-off ordering.
static int dcol[MAX_NODES];
static int cycle_found;

static void dfs_cycle_visit(Graph* g, int cur, int parent_node) {
    dcol[cur] = GREY;
    for (Edge* e = g->adj[cur]; e; e = e->next) {
        int nb = e->to;
        if (g->nodes[nb].type != TYPE_PATIENT) continue;
        if (dcol[nb] == GREY && nb != parent_node) {
            printf("  ⚠  DEADLOCK DETECTED: Patient [%d] %s ↔ Patient [%d] %s\n",
                   cur, g->nodes[cur].name, nb, g->nodes[nb].name);
            cycle_found = 1;
        } else if (dcol[nb] == WHITE) {
            dfs_cycle_visit(g, nb, cur);
        }
    }
    dcol[cur] = BLACK;
}

int dfs_detect_cycles(Graph* g) {
    memset(dcol, WHITE, sizeof(dcol));
    cycle_found = 0;
    printf("\n─── Cycle / Deadlock Detection ───\n");
    for (int i = 0; i < g->node_count; i++) {
        if (g->nodes[i].type == TYPE_PATIENT && dcol[i] == WHITE)
            dfs_cycle_visit(g, i, -1);
    }
    if (!cycle_found) printf("  ✓ No deadlocks found.\n");
    return cycle_found;
}

// ─── DFS 4: Find all weaning candidates via DFS traversal ─────────────────
int dfs_find_weaning_candidates(Graph* g, int* out_ids, int max_out) {
    int visited[MAX_NODES] = {0};
    int stack[MAX_NODES], top = 0, count = 0;

    // Push all patients as starting points
    for (int i = 0; i < g->node_count; i++)
        if (g->nodes[i].type == TYPE_PATIENT) {
            stack[top++] = i;
        }

    while (top > 0 && count < max_out) {
        int cur = stack[--top];
        if (visited[cur]) continue;
        visited[cur] = 1;
        Node* n = &g->nodes[cur];
        if (n->type == TYPE_PATIENT && n->data.patient.weaning_candidate && n->data.patient.ventilator_id >= 0)
            out_ids[count++] = cur;
        for (Edge* e = g->adj[cur]; e; e = e->next)
            if (!visited[e->to]) stack[top++] = e->to;
    }
    return count;
}
