export function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="kv">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
