var en = {
  note: "Note", empty: "Your note is empty.", edit: "Edit note", close: "Close",
  retry: "Retry", error: "Could not save or read the note. Unsaved text stays here while the plugin is active.",
  recoveryLimit: "Too many conflict or interrupted-save files. Close external editors, review and remove unneeded conflict and pending files, then retry. Unsaved text remains here while the plugin is active.",
  noteTooLarge: "The note or a recovery copy exceeds 1 MiB (1,048,576 UTF-8 bytes). Reduce the unsaved text, or back up and reduce the oversized file externally, then retry. Unsaved text remains here while the plugin is active.",
  conflict: "The note changed externally. Automatic saving is paused. Choose which version to keep.",
  keepLocal: "Keep local version", loadExternal: "Load external version", externalVersion: "External version",
  loading: "Loading note…",
  about: "About", aboutInfo: "Help & links", settings: "Settings",
  language: "Language", languageSystem: "System", languageEnglish: "English", languageSpanish: "Español",
  github: "GitHub", reportIssue: "Report an issue", changelog: "Changelog", marketplace: "Marketplace (coming soon)",
  subtitle: "YOUR QUICK-LOCAL NOTE",
  aboutDescription: "One local plain-text note, available offline.",
  aboutPrivacy: "Your note is not encrypted. This plugin is not affiliated with the Simplenote service."
}
var es = {
  note: "Nota", empty: "Tu nota está vacía.", edit: "Editar nota", close: "Cerrar",
  retry: "Reintentar", error: "No se ha podido guardar o leer la nota. El texto sin guardar se conserva mientras el plugin esté activo.",
  recoveryLimit: "Hay demasiados archivos de conflicto o guardados interrumpidos. Cierra los editores externos, revisa y elimina los archivos de conflicto y pendientes que no necesites y vuelve a intentarlo. El texto sin guardar se conserva mientras el plugin esté activo.",
  noteTooLarge: "La nota o una copia de recuperación supera 1 MiB (1.048.576 bytes UTF-8). Reduce el texto sin guardar o haz una copia de seguridad y reduce el archivo demasiado grande fuera del plugin; después, reinténtalo. El texto sin guardar se conserva mientras el plugin esté activo.",
  conflict: "La nota ha cambiado fuera del plugin. El guardado automático está en pausa. Elige qué versión conservar.",
  keepLocal: "Conservar versión local", loadExternal: "Cargar versión externa", externalVersion: "Versión externa",
  loading: "Cargando nota…",
  about: "Acerca de", aboutInfo: "Ayuda y enlaces", settings: "Ajustes",
  language: "Idioma", languageSystem: "Sistema", languageEnglish: "English", languageSpanish: "Español",
  github: "GitHub", reportIssue: "Informar de un problema", changelog: "Registro de cambios", marketplace: "Marketplace (próximamente)",
  subtitle: "TU NOTA LOCAL RÁPIDA",
  aboutDescription: "Una nota local de texto sin formato, disponible sin conexión.",
  aboutPrivacy: "Tu nota no está cifrada. Este plugin no está relacionado con el servicio Simplenote."
}
function normalizeOverride(value) {
  return value === "en" || value === "es" ? value : "system"
}
function t(key, locale, override) {
  var language = normalizeOverride(override)
  var catalog = (language === "es" || (language === "system" && /^es(?:[-_.]|$)/i.test(String(locale || "")))) ? es : en
  return catalog[key] || en[key] || key
}
function languageFromBar(config) {
  var layout = config && config.layout ? config.layout : {}
  for (var section in layout) {
    var entries = layout[section]
    if (!Array.isArray(entries)) continue
    for (var i = 0; i < entries.length; i++)
      if (entries[i] && entries[i].id === "danielmrdev.simplenote")
        return normalizeOverride(entries[i].uiLanguage)
  }
  return "system"
}
if (typeof module !== "undefined") module.exports = { en: en, es: es, t: t, normalizeOverride: normalizeOverride, languageFromBar: languageFromBar }
