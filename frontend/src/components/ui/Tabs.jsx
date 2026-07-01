// Tabs — controlled. tabs: [{ id, label }]. Used on the librarian dashboard.
export default function Tabs({ tabs = [], active, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          className={["tabs__tab", active === t.id && "tabs__tab--active"].filter(Boolean).join(" ")}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
