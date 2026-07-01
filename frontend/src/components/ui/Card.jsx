// Card — rounded white surface. Optional title.
export default function Card({ title, action, className = "", children }) {
  return (
    <section className={["card", className].filter(Boolean).join(" ")}>
      {(title || action) && (
        <div className="row row--between" style={{ marginBottom: 14 }}>
          {title && <h3 className="card__title" style={{ margin: 0 }}>{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
