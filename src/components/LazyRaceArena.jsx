import React, { Suspense } from "react";

const LazyArenaInner = React.lazy(() =>
  import("../DuckRace3D.jsx").then((m) => ({ default: m.RaceArena3D }))
);

function LazyRaceArena(props) {
  // Errors are caught by the app-level ErrorBoundary in main.jsx.
  return (
    <Suspense fallback={<div aria-busy="true">Loading 3D track…</div>}>
      <LazyArenaInner {...props} />
    </Suspense>
  );
}

export default LazyRaceArena;
