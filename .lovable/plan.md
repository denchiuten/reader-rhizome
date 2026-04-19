
The user is comparing two URLs:
- Preview window (sparse): likely the small embedded iframe at viewport 636x1218
- External tab (correct): full browser window, much wider

This is a **viewport-driven node count**, not a data problem. The graph's `simplified` mode and `maxNodes` prop almost certainly scale with width/mobile detection.

Let me confirm by checking `Index.tsx` for how `simplified` and `maxNodes` are passed.
