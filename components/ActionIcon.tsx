export default function ActionIcon({ name, className = "h-4 w-4 shrink-0" }: { name: string; className?: string }) {
  const paths: Record<string,string> = {
    add: "M12 5v14M5 12h14", save: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2ZM17 21v-8H7v8M7 3v5h8V3",
    delete: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7",
    edit: "m16 3 5 5-12 12-6 1 1-6ZM14 5l5 5", back: "m12 5-7 7 7 7M5 12h14",
    up: "m5 12 7-7 7 7M12 5v14", down: "m5 12 7 7 7-7M12 5v14",
    check: "m5 12 4 4L19 6", close: "m6 6 12 12M6 18 18 6",
    download: "M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5", upload: "M12 16V4m-5 5 5-5 5 5M5 16v5h14v-5",
    filter: "M4 5h16l-6 7v7l-4-2v-5Z", next: "m9 5 7 7-7 7", previous: "m15 5-7 7 7 7",
    mail: "M3 5h18v14H3Zm0 0 9 7 9-7", key: "M14 7a5 5 0 1 1-3 7L3 22l-2-2 8-8a5 5 0 0 1 5-5Z",
    refresh: "M20 7a8 8 0 1 0 1 8M20 3v5h-5", view: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
    launch: "m9 5 10 7-10 7Z", logout: "M9 4H4v16h5M9 12h12m-4-4 4 4-4 4",
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d={paths[name] || paths.next} /></svg>;
}
