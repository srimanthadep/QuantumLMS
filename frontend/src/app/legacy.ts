/**
 * Temporary bridge for portals that still accept the old per-user background
 * colour props. The theme/accent system replaced the hex picker; each portal's
 * redesign phase deletes these props and this file.
 */
export const LEGACY_BG = "transparent"

export const noopHexChange = (_hex: string) => {}
