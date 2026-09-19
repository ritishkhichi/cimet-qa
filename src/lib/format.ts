export function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `${hr}h ago`;
  const days = Math.round(hr / 24);
  if (days < 14) return `${days}d ago`;
  return d.toLocaleDateString();
}

export function formatAge(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Math.max(0, Date.now() - d.getTime());
  const min = Math.floor(diffMs / 60000);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  const rem = min % 60;
  if (hr < 48) return rem ? `${hr}h ${rem}m` : `${hr}h`;
  const days = Math.floor(hr / 24);
  return `${days}d`;
}

export function humanizeLabel(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toUpperCase();
}
