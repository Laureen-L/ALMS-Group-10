// Breadcrumb — items: [{ label, to }]. Last item renders as current.
import { Link } from "react-router-dom";

export default function Breadcrumb({ items = [] }) {
  return (
    <nav className="crumb" aria-label="Breadcrumb">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} className="row" style={{ gap: 8 }}>
            {last || !item.to
              ? <span className="crumb__current">{item.label}</span>
              : <Link to={item.to}>{item.label}</Link>}
            {!last && <span className="crumb__sep">/</span>}
          </span>
        );
      })}
    </nav>
  );
}
