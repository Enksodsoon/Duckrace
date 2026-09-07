import LazyDuckPreview from "./LazyDuckPreview.jsx";

export default function DuckPreviewBadge({ index, variant }) {
  return (
    <LazyDuckPreview variant={variant} index={index} />
  );
}
