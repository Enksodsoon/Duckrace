import React, { Suspense } from "react";

const LazyPreviewInner = React.lazy(() =>
  import("../DuckRace3D.jsx").then((m) => ({ default: m.DuckPreview3D }))
);

function LazyDuckPreview(props) {
  return (
    <Suspense fallback={<div aria-busy="true">Loading duck…</div>}>
      <LazyPreviewInner {...props} />
    </Suspense>
  );
}

export default LazyDuckPreview;
