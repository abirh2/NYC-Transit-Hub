# ADR-002: Use official GTFS shapes for subway map geometry

## Status

Accepted

## Context

The realtime subway model contains individual trips and ordered stop updates,
but a map drawn by joining station centroids produces straight-line shortcuts,
especially on curves and branches. The MTA static subway feed provides ordered
`shapes.txt` points and trip-to-shape references that can improve visual
accuracy without changing realtime identity or progress semantics.

## Decision

Generate compact, route-scoped artifacts offline from the official MTA static
feed. Each artifact contains simplified shape coordinates, direction/pattern
stop anchors, and aliases derived from static trip IDs. The client resolves a
realtime trip by exact alias first, then by embedded shape ID and ordered stop
matching. Shape-aware interpolation is used only for subway map projection;
the existing station-based projector remains the fallback for missing or
unresolved data. Bus GTFS shapes and rail geometry are unchanged.

## Consequences

- Subway curves and branch selection are materially more faithful.
- Raw GTFS archives and parser cost stay out of the browser bundle.
- Feed refreshes are explicit and reviewable through generated route artifacts.
- A stale or incomplete static artifact cannot block realtime data; the map
  degrades to the existing inferred station geometry.
