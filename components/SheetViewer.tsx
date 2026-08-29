type SheetViewerProps = {
  title: string;
  src?: string;
  labels?: string[];
};

export function SheetViewer({ title, src, labels }: SheetViewerProps) {
  return (
    <section className="sheet-block">
      <div className="row-between">
        <h3>{title}</h3>
      </div>
      {src ? (
        <div className="sheet-frame">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={title} className="pixel-img" />
        </div>
      ) : (
        <div className="sheet-empty">시트가 아직 없습니다.</div>
      )}
      {labels && labels.length > 0 && (
        <div className="sheet-labels">
          {labels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      )}
    </section>
  );
}
