import { phoneArtwork } from "./artwork";

/** Existing painted crane, hook and district floor composed at their gameplay proportions. */
export function CranePreview({ src, name }: { src: string; name: string }) {
  return <div className="crane-preview" aria-label={name}>
    <img src={src} alt={name} className="crane-preview-beam" />
    <span className="crane-preview-rope" />
    <img src={phoneArtwork.hookSrc} alt="" className="crane-preview-hook" />
    <img src={phoneArtwork.b1} alt="" className="crane-preview-block" />
  </div>;
}