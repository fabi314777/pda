import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X } from 'lucide-react';

export function CameraScanner({ onResult, onClose }: { onResult: (text: string) => void; onClose: () => void }) {
  const containerId = 'camera-scanner-region';
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;
    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        onResult(decodedText);
        scanner.stop().catch(() => {});
      },
      () => { /* frame sin código, ignorar */ }
    ).catch((err) => setError('No se pudo acceder a la cámara: ' + err));

    return () => {
      scanner.stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-slate-800 flex items-center gap-2"><Camera size={17} /> Escanear con cámara</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        {error && <p className="text-sm text-[var(--color-danger)] mb-2">{error}</p>}
        <div id={containerId} className="rounded-lg overflow-hidden" />
        <p className="text-xs text-slate-400 mt-3 text-center">Apunta la cámara al código QR o de barras del pallet</p>
      </div>
    </div>
  );
}
