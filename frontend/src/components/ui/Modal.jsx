// Modal — overlay dialog. Closes on overlay click or the X.
// Usage: {open && <Modal title="Edit book" onClose={close}>...</Modal>}
import { X } from "lucide-react";

export default function Modal({ title, onClose, children, footer }) {
  return (
    <div className="modal__overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="modal__close" aria-label="Close" onClick={onClose}><X size={20} /></button>
        </div>
        {children}
        {footer && (
          <div className="row" style={{ marginTop: 18, justifyContent: "flex-end", gap: 8 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
