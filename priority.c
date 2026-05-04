#include "graph.h"

// ─── Compute Triage Priority Score for a single patient ───────────────────
// Returns a score 0-100 (higher = more urgent / allocate first)
float compute_priority(Node* patient) {
    if (!patient || patient->type != TYPE_PATIENT) return 0.0f;
    PatientData* p = &patient->data.patient;

    // Weighted sum punishing low stability
    float organ_risk = 1.0f - (
        0.35f * p->lung_stability   +
        0.25f * p->heart_stability  +
        0.20f * p->kidney_stability +
        0.20f * p->brain_stability
    );

    float oxygen_risk = (100.0f - p->oxygen_level) / 100.0f;  // 0-1
    float time_bonus  = (float)p->time_on_ventilator / 1440.0f; // days (up to 1 day)
    if (time_bonus > 1.0f) time_bonus = 1.0f;

    // Critical weighting: organ risk > oxygen > time
    float score = (organ_risk * 50.0f) + (oxygen_risk * 35.0f) + (time_bonus * 15.0f);
    p->priority_score = score;

    // Mark weaning candidate: stable organs, good oxygen
    if (p->oxygen_level >= 94.0f &&
        p->lung_stability   >= 0.80f &&
        p->heart_stability  >= 0.80f &&
        p->kidney_stability >= 0.75f)
    {
        p->weaning_candidate = 1;
    } else {
        p->weaning_candidate = 0;
    }

    return score;
}

// ─── Rank all patients, return sorted IDs (most urgent first) ─────────────
// out_ids must be at least g->node_count ints
int rank_patients(Graph* g, int* out_ids) {
    int count = 0;
    // collect all on ventilator or critical
    for (int i = 0; i < g->node_count; i++) {
        Node* n = &g->nodes[i];
        if (n->type == TYPE_PATIENT) {
            compute_priority(n);
            out_ids[count++] = i;
        }
    }
    // bubble sort descending by priority_score
    for (int i = 0; i < count - 1; i++) {
        for (int j = i + 1; j < count; j++) {
            float si = g->nodes[out_ids[i]].data.patient.priority_score;
            float sj = g->nodes[out_ids[j]].data.patient.priority_score;
            if (sj > si) { int tmp = out_ids[i]; out_ids[i] = out_ids[j]; out_ids[j] = tmp; }
        }
    }
    return count;
}

// ─── Find best weaning candidate: highest stability lowest priority ────────
int find_weaning_candidate(Graph* g) {
    int best = -1;
    float best_score = 1e9f;
    for (int i = 0; i < g->node_count; i++) {
        Node* n = &g->nodes[i];
        if (n->type == TYPE_PATIENT && n->data.patient.weaning_candidate &&
            n->data.patient.ventilator_id >= 0)
        {
            compute_priority(n);
            if (n->data.patient.priority_score < best_score) {
                best_score = n->data.patient.priority_score;
                best = i;
            }
        }
    }
    return best;
}
