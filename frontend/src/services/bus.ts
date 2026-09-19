// Bus de eventos simple: cualquier acción que modifique datos (ingreso, validación,
// asignación, movimiento, edición) llama a emitDataChange(), y las páginas que
// muestran listados/dashboard se suscriben para refrescarse automáticamente
// sin necesidad de recargar la pestaña.
type Listener = () => void;
const listeners = new Set<Listener>();

export function onDataChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitDataChange() {
  listeners.forEach((fn) => fn());
}
