# Capability Map: Specific Train Detail Experience

| Module id | Responsibility | Depends on |
|---|---|---|
| train-context | Preserve URL/deep-link context and derive selected-trip rider metrics | existing realtime snapshot and Nearby departure contracts |
| focused-detail | Render the rider-focused train hero, focused map framing, progress, alerts, and lifecycle states | train-context, existing realtime components |
| service-following | Render same-route and same-direction departures while retaining trip identity | train-context, existing departure queries |
| transition-coverage | Preserve Nearby/back behavior and explicit transition into the full tracker | train-context, focused-detail |

Build order: train-context → focused-detail, service-following → transition-coverage
