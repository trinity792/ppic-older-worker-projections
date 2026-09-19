interface DataStatusProps {
  status: "loading" | "error";
  message?: string;
  onRetry?: () => void;
}

export default function DataStatus({ status, message, onRetry }: DataStatusProps) {
  if (status === "loading") {
    return (
      <section className="section-card" role="status" aria-live="polite">
        <p>Loading the projection dataset…</p>
      </section>
    );
  }

  return (
    <section className="section-card" role="alert">
      <p>{message ?? "Unable to load the projection dataset."}</p>
      {onRetry && (
        <button type="button" className="button outline" onClick={onRetry}>
          Retry
        </button>
      )}
    </section>
  );
}
