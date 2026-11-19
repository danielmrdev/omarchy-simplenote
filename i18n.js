var en = {
  note: "Note", empty: "Your note is empty.", edit: "Edit note", close: "Close",
  retry: "Retry", error: "Could not save or read the note. Unsaved text stays here while the plugin is active.",
  recoveryLimit: "Too many conflict or interrupted-save files. Close external editors, review and remove unneeded conflict and pending files, then retry. Unsaved text remains here while the plugin is active.",
  displacedConflict: "A concurrent change was saved in a conflict file. Recover it manually before retrying; local text remains here while the plugin is active.",
  conflict: "The note changed externally. Automatic saving is paused. Choose which version to keep.",
  keepLocal: "Keep local version", loadExternal: "Load external version",
  loading: "Loading note…",
  about: "About", aboutInfo: "About this plugin",
  aboutDescription: "One local plain-text note, available offline.",
  aboutPrivacy: "Your note is not encrypted. This plugin is not affiliated with the Simplenote service."
}
var es = {
  note: "Nota", empty: "Tu nota está vacía.", edit: "Editar nota", close: "Cerrar",
  retry: "Reintentar", error: "No se ha podido guardar o leer la nota. El texto sin guardar se conserva mientras el plugin esté activo.",
  recoveryLimit: "Hay demasiados archivos de conflicto o guardados interrumpidos. Cierra los editores externos, revisa y elimina los archivos de conflicto y pendientes que no necesites y vuelve a intentarlo. El texto sin guardar se conserva mientras el plugin esté activo.",
  displacedConflict: "Un cambio simultáneo se ha guardado en un archivo de conflicto. Recupéralo manualmente antes de reintentar; el texto local se conserva mientras el plugin esté activo.",
  conflict: "La nota ha cambiado fuera del plugin. El guardado automático está en pausa. Elige qué versión conservar.",
  keepLocal: "Conservar versión local", loadExternal: "Cargar versión externa",
  loading: "Cargando nota…",
  about: "Acerca de", aboutInfo: "Acerca de este plugin",
  aboutDescription: "Una nota local de texto sin formato, disponible sin conexión.",
  aboutPrivacy: "Tu nota no está cifrada. Este plugin no está relacionado con el servicio Simplenote."
}
function t(key, locale) {
  var catalog = /^es(?:[-_.]|$)/i.test(String(locale || "")) ? es : en
  return catalog[key] || en[key] || key
}
if (typeof module !== "undefined") module.exports = { en: en, es: es, t: t }
