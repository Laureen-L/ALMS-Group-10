// Camera barcode scanner (ISBN / EAN-13) using ZXing. Renders inside a modal;
// calls onDetected(code) with the first barcode it reads, then stops the camera.
import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import Modal from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";

export default function BarcodeScanner({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const reader = new BrowserMultiFormatReader();

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result, _err, controls) => {
        controlsRef.current = controls;
        if (cancelled) { controls.stop(); return; }
        if (result) {
          controls.stop();
          onDetected(result.getText());
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setError(
          e?.name === "NotAllowedError"
            ? "Camera access was blocked. Allow camera permission and try again."
            : "Couldn’t start the camera. You can type the ISBN instead."
        );
      });

    return () => {
      cancelled = true;
      try { controlsRef.current?.stop(); } catch { /* already stopped */ }
    };
  }, [onDetected]);

  return (
    <Modal title="Scan ISBN barcode" onClose={onClose}
      footer={<Button variant="ghost" onClick={onClose}>Cancel</Button>}>
      {error ? (
        <p className="field__error">{error}</p>
      ) : (
        <>
          <div style={{ position: "relative", borderRadius: "var(--radius)", overflow: "hidden", background: "#000", aspectRatio: "4 / 3" }}>
            <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted playsInline />
            <div style={{ position: "absolute", left: "10%", right: "10%", top: "50%", height: 2, background: "var(--green-500, #22c55e)" }} />
          </div>
          <p className="page-sub" style={{ marginTop: 12, marginBottom: 0 }}>
            Hold the book’s barcode steady inside the frame.
          </p>
        </>
      )}
    </Modal>
  );
}
