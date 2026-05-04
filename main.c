// ICU Ventilator Allocation System - Main Driver
// Compile: gcc -Wall -o icu main.c graph.c bfs.c dfs.c priority.c -lm
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "graph.h"

// Forward declarations from other translation units
float compute_priority(Node*);
int   rank_patients(Graph*, int*);
int   find_weaning_candidate(Graph*);
int   bfs_nearest_ventilator(Graph*, int, int*, int*);
int   bfs_nearest_staff(Graph*, int);
int   bfs_surge_map(Graph*, int, int*, int);
float bfs_surge_time(Graph*, float);
void  dfs_organ_cascade(Graph*, int);
void  dfs_dependency_chain(Graph*, int);
int   dfs_detect_cycles(Graph*);
int   dfs_find_weaning_candidates(Graph*, int*, int);

// ─── Build Demo Hospital Graph ────────────────────────────────────────────
static Graph* build_demo_hospital(void) {
    Graph* g = graph_create();

    // ── Zones ──────────────────────────────────────────────────
    int z_icu  = graph_add_node(g, "ICU Ward A",      TYPE_ZONE, STATUS_AT_RISK, 2, 2);
    int z_icu2 = graph_add_node(g, "ICU Ward B",      TYPE_ZONE, STATUS_STABLE,  2, 5);
    int z_step = graph_add_node(g, "Step-Down Unit",  TYPE_ZONE, STATUS_STABLE,  5, 2);
    int z_er   = graph_add_node(g, "Emergency Room",  TYPE_ZONE, STATUS_CRITICAL,8, 2);

    // ── Ventilators ────────────────────────────────────────────
    int v0 = graph_add_node(g, "Vent-01", TYPE_VENTILATOR, STATUS_IN_USE, 1, 1);
    int v1 = graph_add_node(g, "Vent-02", TYPE_VENTILATOR, STATUS_FREE,   2, 1);
    int v2 = graph_add_node(g, "Vent-03", TYPE_VENTILATOR, STATUS_FREE,   3, 1);
    int v3 = graph_add_node(g, "Vent-04", TYPE_VENTILATOR, STATUS_IN_USE, 2, 4);
    int v4 = graph_add_node(g, "Vent-05", TYPE_VENTILATOR, STATUS_FREE,   5, 3);

    g->nodes[v0].data.ventilator.floor = 2; strcpy(g->nodes[v0].data.ventilator.wing, "A");
    g->nodes[v1].data.ventilator.floor = 2; strcpy(g->nodes[v1].data.ventilator.wing, "A");
    g->nodes[v2].data.ventilator.floor = 2; strcpy(g->nodes[v2].data.ventilator.wing, "A");
    g->nodes[v3].data.ventilator.floor = 2; strcpy(g->nodes[v3].data.ventilator.wing, "B");
    g->nodes[v4].data.ventilator.floor = 3; strcpy(g->nodes[v4].data.ventilator.wing, "C");

    // ── Patients ────────────────────────────────────────────────
    int p0 = graph_add_node(g, "Alice Chen",   TYPE_PATIENT, STATUS_CRITICAL, 1, 2);
    int p1 = graph_add_node(g, "Bob Martinez", TYPE_PATIENT, STATUS_AT_RISK,  2, 3);
    int p2 = graph_add_node(g, "Carol Singh",  TYPE_PATIENT, STATUS_STABLE,   3, 2);
    int p3 = graph_add_node(g, "David Wu",     TYPE_PATIENT, STATUS_CRITICAL, 4, 2);
    int p4 = graph_add_node(g, "Eva Patel",    TYPE_PATIENT, STATUS_AT_RISK,  2, 5);

    // Configure patient data
    // Alice — critical, poor lungs & heart
    g->nodes[p0].data.patient.oxygen_level     = 72.0f;
    g->nodes[p0].data.patient.lung_stability   = 0.25f;
    g->nodes[p0].data.patient.heart_stability  = 0.40f;
    g->nodes[p0].data.patient.kidney_stability = 0.60f;
    g->nodes[p0].data.patient.brain_stability  = 0.80f;
    g->nodes[p0].data.patient.ventilator_id    = v0;
    g->nodes[p0].data.patient.time_on_ventilator = 480; // 8 hours

    // Bob — at risk
    g->nodes[p1].data.patient.oxygen_level     = 88.0f;
    g->nodes[p1].data.patient.lung_stability   = 0.55f;
    g->nodes[p1].data.patient.heart_stability  = 0.65f;
    g->nodes[p1].data.patient.kidney_stability = 0.70f;
    g->nodes[p1].data.patient.brain_stability  = 0.85f;
    g->nodes[p1].data.patient.ventilator_id    = v3;
    g->nodes[p1].data.patient.time_on_ventilator = 120;

    // Carol — stable, weaning candidate
    g->nodes[p2].data.patient.oxygen_level     = 96.0f;
    g->nodes[p2].data.patient.lung_stability   = 0.85f;
    g->nodes[p2].data.patient.heart_stability  = 0.88f;
    g->nodes[p2].data.patient.kidney_stability = 0.90f;
    g->nodes[p2].data.patient.brain_stability  = 0.95f;
    g->nodes[p2].data.patient.ventilator_id    = -1;
    g->nodes[p2].data.patient.time_on_ventilator = 60;

    // David — critical, no ventilator yet (new arrival)
    g->nodes[p3].data.patient.oxygen_level     = 68.0f;
    g->nodes[p3].data.patient.lung_stability   = 0.20f;
    g->nodes[p3].data.patient.heart_stability  = 0.35f;
    g->nodes[p3].data.patient.kidney_stability = 0.50f;
    g->nodes[p3].data.patient.brain_stability  = 0.75f;
    g->nodes[p3].data.patient.ventilator_id    = -1;
    g->nodes[p3].data.patient.time_on_ventilator = 0;

    // Eva — moderate
    g->nodes[p4].data.patient.oxygen_level     = 91.0f;
    g->nodes[p4].data.patient.lung_stability   = 0.70f;
    g->nodes[p4].data.patient.heart_stability  = 0.72f;
    g->nodes[p4].data.patient.kidney_stability = 0.68f;
    g->nodes[p4].data.patient.brain_stability  = 0.88f;
    g->nodes[p4].data.patient.ventilator_id    = -1;

    // ── Staff ────────────────────────────────────────────────────
    int s0 = graph_add_node(g, "Nurse Rita",    TYPE_STAFF, STATUS_STABLE, 2, 2);
    int s1 = graph_add_node(g, "RT James",      TYPE_STAFF, STATUS_STABLE, 3, 3);
    g->nodes[s0].data.staff.available = 1; strcpy(g->nodes[s0].data.staff.role, "nurse");
    g->nodes[s1].data.staff.available = 1; strcpy(g->nodes[s1].data.staff.role, "respiratory_therapist");

    // ── Edges (physical connections / proximity) ──────────────────
    // Zone connectivity
    graph_add_edge(g, z_icu, z_icu2, 5.0f);
    graph_add_edge(g, z_icu, z_step, 10.0f);
    graph_add_edge(g, z_step, z_er,  8.0f);
    graph_add_edge(g, z_icu2, z_er, 12.0f);

    // Patients to their zone
    graph_add_edge(g, p0, z_icu,  1.0f);
    graph_add_edge(g, p1, z_icu,  1.5f);
    graph_add_edge(g, p2, z_step, 1.0f);
    graph_add_edge(g, p3, z_er,   1.0f);
    graph_add_edge(g, p4, z_icu2, 1.0f);

    // Ventilators to their zone / patient proximity
    graph_add_edge(g, v0, p0, 0.5f);
    graph_add_edge(g, v0, z_icu, 1.0f);
    graph_add_edge(g, v1, z_icu, 1.0f);
    graph_add_edge(g, v2, z_icu, 1.5f);
    graph_add_edge(g, v3, p1, 0.5f);
    graph_add_edge(g, v3, z_icu2, 1.0f);
    graph_add_edge(g, v4, z_step, 1.0f);

    // Patients adjacent to each other (proximity / shared sedation)
    graph_add_edge(g, p0, p1, 2.0f);
    graph_add_edge(g, p1, p2, 3.0f);
    graph_add_edge(g, p3, p4, 4.0f);

    // Staff proximity
    graph_add_edge(g, s0, z_icu,  1.0f);
    graph_add_edge(g, s1, z_step, 1.0f);
    graph_add_edge(g, s0, p0,     2.0f);
    graph_add_edge(g, s1, p2,     2.0f);

    return g;
}

// ─── Divider ─────────────────────────────────────────────────────────────
static void divider(const char* title) {
    printf("\n\033[1;36m╔══════════════════════════════════════════════════════════╗\n");
    printf("║  %-56s║\n", title);
    printf("╚══════════════════════════════════════════════════════════╝\033[0m\n");
}

int main(void) {
    printf("\033[1;33m");
    printf("██╗ ██████╗██╗   ██╗    ██╗   ██╗███████╗███╗   ██╗████████╗\n");
    printf("╚═╝██╔════╝██║   ██║    ██║   ██║██╔════╝████╗  ██║╚══██╔══╝\n");
    printf("   ██║     ██║   ██║    ██║   ██║█████╗  ██╔██╗ ██║   ██║   \n");
    printf("   ██║     ██║   ██║    ╚██╗ ██╔╝██╔══╝  ██║╚██╗██║   ██║   \n");
    printf("   ╚██████╗╚██████╔╝     ╚████╔╝ ███████╗██║ ╚████║   ██║   \n");
    printf("    ╚═════╝ ╚═════╝       ╚═══╝  ╚══════╝╚═╝  ╚═══╝   ╚═╝   \n");
    printf("     ICU VENTILATOR ALLOCATION SYSTEM  — Graph Algorithms\n\033[0m\n");

    Graph* g = build_demo_hospital();
    graph_print(g);

    // ── 1. Triage Priority Scoring ────────────────────────────────
    divider("1. TRIAGE PRIORITY SCORING");
    int ranked[MAX_NODES];
    int cnt = rank_patients(g, ranked);
    printf("  %-4s %-20s %-10s %-10s\n", "Rank", "Patient", "Score", "Wean?");
    printf("  ────────────────────────────────────────────\n");
    for (int i = 0; i < cnt; i++) {
        Node* n = &g->nodes[ranked[i]];
        printf("  #%-3d %-20s %-10.1f %s\n",
               i+1, n->name,
               n->data.patient.priority_score,
               n->data.patient.weaning_candidate ? "YES ✓" : "No");
    }

    // ── 2. BFS: Nearest Ventilator for critical patient David ─────
    divider("2. BFS — NEAREST VENTILATOR (David Wu, new arrival)");
    int path[MAX_NODES], plen = 0;
    // David Wu is node index 3 (p3)
    int david_id = -1;
    for (int i = 0; i < g->node_count; i++)
        if (strcmp(g->nodes[i].name, "David Wu") == 0) { david_id = i; break; }

    int vent_id = bfs_nearest_ventilator(g, david_id, path, &plen);
    if (vent_id >= 0) {
        printf("  ✓ Found: %s\n", g->nodes[vent_id].name);
        printf("  BFS path: ");
        for (int i = 0; i < plen; i++) printf("%s%s", g->nodes[path[i]].name, i<plen-1?" → ":"");
        printf("\n  %d hops away\n", plen - 1);
    } else {
        printf("  ✗ No ventilator reachable — SURGE CRITICAL\n");
    }

    // ── 3. BFS: Nearest Staff ─────────────────────────────────────
    divider("3. BFS — NEAREST STAFF for Alice Chen");
    int alice_id = -1;
    for (int i = 0; i < g->node_count; i++)
        if (strcmp(g->nodes[i].name, "Alice Chen") == 0) { alice_id = i; break; }
    int staff_id = bfs_nearest_staff(g, alice_id);
    if (staff_id >= 0)
        printf("  ✓ Dispatching: %s (%s)\n", g->nodes[staff_id].name,
               g->nodes[staff_id].data.staff.role);
    else
        printf("  ✗ No staff available!\n");

    // ── 4. BFS: Surge Prediction ─────────────────────────────────
    divider("4. BFS — SURGE PREDICTION");
    float arrival = 0.15f; // patients/minute
    float mins    = bfs_surge_time(g, arrival);
    printf("  Current arrival rate: %.2f patients/min\n", arrival);
    printf("  Estimated time until ventilators depleted: \033[1;31m%.0f minutes\033[0m\n", mins);

    // ── 5. BFS: Zone Surge Map ────────────────────────────────────
    divider("5. BFS — ZONE SURGE MAP (from ER outwards)");
    int er_id = -1;
    for (int i = 0; i < g->node_count; i++)
        if (strcmp(g->nodes[i].name, "Emergency Room") == 0) { er_id = i; break; }
    int surge_order[MAX_NODES], slen = bfs_surge_map(g, er_id, surge_order, MAX_NODES);
    printf("  Zones will fill in this order:\n");
    for (int i = 0; i < slen; i++) {
        Node* z = &g->nodes[surge_order[i]];
        printf("  %d. %s\n", i+1, z->name);
    }

    // ── 6. DFS: Organ Failure Cascade ────────────────────────────
    divider("6. DFS — ORGAN FAILURE CASCADE (Alice Chen loses ventilator)");
    dfs_organ_cascade(g, alice_id);

    // ── 7. DFS: Dependency Chain ──────────────────────────────────
    divider("7. DFS — VENTILATOR DEPENDENCY CHAIN");
    dfs_dependency_chain(g, alice_id);

    // ── 8. DFS: Cycle / Deadlock Detection ───────────────────────
    divider("8. DFS — CYCLE / DEADLOCK DETECTION");
    dfs_detect_cycles(g);

    // ── 9. Weaning Candidate + Cascade Combo ─────────────────────
    divider("9. THE CRITICAL COMBO — WEANING CANDIDATE + CASCADE");
    int wean_ids[MAX_NODES];
    int wcount = dfs_find_weaning_candidates(g, wean_ids, MAX_NODES);
    if (wcount > 0) {
        printf("  \033[1;32mWeaning candidate(s) found:\033[0m\n");
        for (int i = 0; i < wcount; i++)
            printf("    → %s (priority score: %.1f)\n",
                   g->nodes[wean_ids[i]].name,
                   g->nodes[wean_ids[i]].data.patient.priority_score);
    } else {
        printf("  \033[1;31mNo safe weaning candidate — IMPOSSIBLE DECISION\033[0m\n");
        printf("  Cascade consequence if we don't act:\n");
        dfs_organ_cascade(g, alice_id);
    }

    printf("\n\033[1;32m  Open index.html in your browser for the visual dashboard.\033[0m\n\n");
    graph_destroy(g);
    return 0;
}
