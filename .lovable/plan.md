
## What changed and why it matters

When I "locked the threshold at 0.4," I replaced the `useState` for `semanticThreshold` with a `const`. That part is fine. But let me re-check the diagnostic numbers against what you saw before locking it.

Before locking (your earlier 400-highlight run with scaling): you said density looked closer to 300.
After locking at 0.4: edges=293, connected=139/400, avgDeg=4.22 → **261 isolated singletons floating in space**.

So the graph isn't actually sparser in *edges* — scaling is working. It *looks* sparse because **65% of nodes have zero connections** and float around the periphery, visually diluting the dense core.

## Why did locking at 0.4 trigger this?

I need to verify: was the threshold previously lower? Let me check git/history clues in the file.
