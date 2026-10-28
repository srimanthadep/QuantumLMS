import { useState, useEffect } from "react"
import ProfilePage, { ProfileHeader } from "./ProfilePage"
import AccountSettingsPage, { AccountSettingsHeader } from "./AccountSettingsPage"

export { ProfileHeader } from "./ProfilePage"
export { AccountSettingsHeader } from "./AccountSettingsPage"

export function SettingsHeader({
  searchQuery,
  setSearchQuery,
  hexColor,
  onChangeHexColor,
  onSavePreferences,
}: {
  searchQuery: string
  setSearchQuery: (q: string) => void
  hexColor: string
  onChangeHexColor: (color: string) => void
  onSavePreferences?: () => void
}) {
  return (
    <AccountSettingsHeader
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      hexColor={hexColor}
      onChangeHexColor={onChangeHexColor}
    />
  )
}

export default function SettingsPage({
  searchQuery = "",
  setSearchQuery,
  hexColor,
  onChangeHexColor,
  onOpenAiModal,
  onSave,
}: {
  searchQuery?: string
  setSearchQuery?: (q: string) => void
  hexColor?: string
  onChangeHexColor?: (color: string) => void
  onOpenAiModal?: () => void
  onSave?: (msg?: string) => void
}) {
  // Determine if viewing "profile" or "account" settings
  const [viewMode, setViewMode] = useState<"profile" | "account">(() => {
    if (typeof window !== "undefined") {
      const s = window.location.search.toLowerCase()
      const p = window.location.pathname.toLowerCase()
      if (s.includes("tab=profile") || s.includes("view=profile") || p.includes("profile")) {
        return "profile"
      }
    }
    return "account"
  })

  // Synchronize with URL / browser history popstate
  useEffect(() => {
    const handleUrlChange = () => {
      const s = window.location.search.toLowerCase()
      const p = window.location.pathname.toLowerCase()
      if (s.includes("tab=profile") || s.includes("view=profile") || p.includes("profile")) {
        setViewMode("profile")
      } else {
        setViewMode("account")
      }
    }
    window.addEventListener("popstate", handleUrlChange)
    return () => window.removeEventListener("popstate", handleUrlChange)
  }, [])

  if (viewMode === "profile") {
    return (
      <ProfilePage
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        hexColor={hexColor}
        onChangeHexColor={onChangeHexColor}
        onOpenAiModal={onOpenAiModal}
        onToast={onSave}
        onSwitchToSettings={() => {
          setViewMode("account")
          if (typeof window !== "undefined" && window.history?.pushState) {
            window.history.pushState(null, "", "/teacher/settings?tab=account")
          }
        }}
      />
    )
  }

  return (
    <AccountSettingsPage
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      hexColor={hexColor}
      onChangeHexColor={onChangeHexColor}
      onOpenAiModal={onOpenAiModal}
      onToast={onSave}
      onSwitchToProfile={() => {
        setViewMode("profile")
        if (typeof window !== "undefined" && window.history?.pushState) {
          window.history.pushState(null, "", "/teacher/settings?tab=profile")
        }
      }}
    />
  )
}
