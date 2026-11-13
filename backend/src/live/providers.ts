import { AppError, badRequest } from "../errors.js"

export type LiveProviderName = "zoom_link" | "meet_link" | "own_stream"
export interface LiveProvider {
  name: LiveProviderName
  available: boolean
  validate(link: string, purpose: "join" | "host"): string
  join(session: { join_url: string | null; passcode: string | null }): { url: string; passcode: string | null }
  host(session: { join_url: string | null; host_url: string | null; passcode: string | null }): { url: string; passcode: string | null }
}
const unavailable = () => { throw new AppError(503, "provider_unavailable", "This live provider is not available yet") }
function httpsUrl(raw: string) {
  let url: URL
  try { url = new URL(raw) } catch { throw badRequest("Paste a valid HTTPS meeting link") }
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash) throw badRequest("Use an HTTPS meeting link without credentials, a custom port, or a fragment")
  return url
}
function linkProvider(name: "zoom_link" | "meet_link"): LiveProvider {
  const validate: LiveProvider["validate"] = (raw, purpose) => {
    const url = httpsUrl(raw)
    if (name === "zoom_link") {
      const domain = url.hostname === "zoom.us" || url.hostname.endsWith(".zoom.us")
      const path = /^\/j\/\d{6,15}\/?$/.test(url.pathname) || /^\/my\/[a-zA-Z0-9._-]{1,100}\/?$/.test(url.pathname) || (purpose === "host" && /^\/s\/\d{6,15}\/?$/.test(url.pathname))
      if (!domain || !path) throw badRequest("Use a zoom.us meeting link, such as https://us02web.zoom.us/j/123456789")
      for (const [key, value] of url.searchParams) if (!["pwd", ...(purpose === "host" ? ["zak"] : [])].includes(key) || !value || value.length > 2048 || url.searchParams.getAll(key).length > 1) throw badRequest("Keep only the meeting passcode parameter (and host token for a host link)")
    } else if (url.hostname !== "meet.google.com" || !/^\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(url.pathname) || url.search) throw badRequest("Use a link in the form https://meet.google.com/abc-defg-hij")
    return url.toString()
  }
  return { name, available: true, validate,
    join(session) { if (!session.join_url) throw badRequest("The instructor has not configured the meeting link yet"); return { url: validate(session.join_url, "join"), passcode: session.passcode } },
    host(session) { const link = session.host_url ?? session.join_url; if (!link) throw badRequest("Configure the meeting link before opening the class"); return { url: validate(link, "host"), passcode: session.passcode } },
  }
}
const providers: Record<LiveProviderName, LiveProvider> = {
  zoom_link: linkProvider("zoom_link"), meet_link: linkProvider("meet_link"),
  own_stream: { name: "own_stream", available: false, validate: unavailable, join: unavailable, host: unavailable },
}
export function liveProvider(name: string): LiveProvider {
  if (!Object.hasOwn(providers, name)) throw badRequest("Choose Zoom or Google Meet")
  return providers[name as LiveProviderName]
}
export function validatedLinks(input: { provider: string; join_url?: string | null; host_url?: string | null; passcode?: string | null }) {
  const provider = liveProvider(input.provider)
  if (!provider.available) unavailable()
  return { provider: provider.name, join_url: input.join_url ? provider.validate(input.join_url, "join") : null,
    host_url: input.host_url ? provider.validate(input.host_url, "host") : null, passcode: input.passcode?.trim() || null }
}
