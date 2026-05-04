#ifndef GRAPH_H
#define GRAPH_H

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// ─── Node Types ────────────────────────────────────────────────────────────
#define TYPE_PATIENT    0
#define TYPE_VENTILATOR 1
#define TYPE_ZONE       2
#define TYPE_STAFF      3

// ─── Status Codes ──────────────────────────────────────────────────────────
#define STATUS_STABLE   0   // green
#define STATUS_AT_RISK  1   // yellow
#define STATUS_CRITICAL 2   // red
#define STATUS_FREE     3   // grey  (ventilators)
#define STATUS_IN_USE   4
#define STATUS_OFFLINE  5

// ─── Max Limits ────────────────────────────────────────────────────────────
#define MAX_NODES       256
#define MAX_EDGES       1024
#define MAX_NAME        64
#define MAX_ADJ         32

// ─── Patient Data ──────────────────────────────────────────────────────────
typedef struct {
    float oxygen_level;          // SpO2 0-100%
    float lung_stability;        // 0-1
    float kidney_stability;      // 0-1
    float heart_stability;       // 0-1
    float brain_stability;       // 0-1
    float priority_score;        // computed triage score
    int   time_on_ventilator;    // minutes
    int   ventilator_id;         // -1 if not on ventilator
    int   weaning_candidate;     // 1 if stable enough to wean
} PatientData;

// ─── Ventilator Data ───────────────────────────────────────────────────────
typedef struct {
    int   floor;
    char  wing[8];
    int   zone_id;
    int   patient_id;            // -1 if free
    float battery_level;         // 0-100
} VentilatorData;

// ─── Zone Data ─────────────────────────────────────────────────────────────
typedef struct {
    int   floor;
    char  wing[8];
    int   capacity;
    int   current_patients;
    int   available_ventilators;
} ZoneData;

// ─── Staff Data ────────────────────────────────────────────────────────────
typedef struct {
    char role[32];               // "nurse", "respiratory_therapist"
    int  zone_id;
    int  available;
} StaffData;

// ─── Generic Node ──────────────────────────────────────────────────────────
typedef struct {
    int  id;
    char name[MAX_NAME];
    int  type;                   // TYPE_*
    int  status;                 // STATUS_*
    int  x, y;                  // grid position (for visualization)

    union {
        PatientData    patient;
        VentilatorData ventilator;
        ZoneData       zone;
        StaffData      staff;
    } data;
} Node;

// ─── Adjacency List ────────────────────────────────────────────────────────
typedef struct Edge {
    int   to;
    float weight;                // e.g. distance in metres
    struct Edge* next;
} Edge;

// ─── Graph ─────────────────────────────────────────────────────────────────
typedef struct {
    Node   nodes[MAX_NODES];
    Edge*  adj[MAX_NODES];       // adjacency list heads
    int    node_count;
    int    edge_count;
} Graph;

// ─── API ────────────────────────────────────────────────────────────────────
Graph* graph_create(void);
void   graph_destroy(Graph* g);
int    graph_add_node(Graph* g, const char* name, int type, int status, int x, int y);
void   graph_add_edge(Graph* g, int u, int v, float weight);
Node*  graph_get_node(Graph* g, int id);
void   graph_print(const Graph* g);

#endif // GRAPH_H
