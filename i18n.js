var en = {
  note: "Note", empty: "Your note is empty.", edit: "Edit note", close: "Close",
  retry: "Retry", error: "Could not save or read the note. Unsaved text stays here while the plugin is active.",
  conflict: "The note changed externally. Automatic saving is paused. Keep this window open and recover both versions manually.",
  loading: "Loading note…"
}
var es = {
  note: "Nota", empty: "Tu nota está vacía.", edit: "Editar nota", close: "Cerrar",
  retry: "Reintentar", error: "No se ha podido guardar o leer la nota. El texto sin guardar se conserva mientras el plugin esté activo.",
  conflict: "La nota ha cambiado fuera del plugin. El guardado automático está en pausa. Mantén esta ventana abierta y recupera ambas versiones manualmente.",
  loading: "Cargando nota…"
}
function t(key, locale) {
  var catalog = /^es(?:[-_.]|$)/i.test(String(locale || "")) ? es : en
  return catalog[key] || en[key] || key
}
if (typeof module !== "undefined") module.exports = { en: en, es: es, t: t }
