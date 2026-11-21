import Field from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { SegmentedControl } from "@/components/ui/tabs"
import type { Links } from "@/components/live/SessionScheduleForm"

/** Zoom / Google Meet link inputs. Switching provider clears the links, as before. */
export default function MeetingLinkFields({ value, onChange }: { value: Links; onChange: (v: Links) => void }) {
  const zoom = value.provider === "zoom_link"
  return (
    <div className="space-y-3">
      <SegmentedControl
        size="sm"
        aria-label="Meeting provider"
        value={value.provider}
        onChange={(provider) => onChange({ provider, join_url: "", host_url: "", passcode: "" })}
        options={[
          { value: "zoom_link" as Links["provider"], label: "Zoom" },
          { value: "meet_link" as Links["provider"], label: "Google Meet" },
        ]}
      />
      <Field label="Learner join link">
        <Input
          type="url"
          value={value.join_url}
          onChange={(e) => onChange({ ...value, join_url: e.target.value })}
          placeholder={zoom ? "https://zoom.us/j/123456789" : "https://meet.google.com/abc-defg-hij"}
        />
      </Field>
      {zoom && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Host link" hint="Optional">
            <Input type="url" value={value.host_url} onChange={(e) => onChange({ ...value, host_url: e.target.value })} placeholder="https://zoom.us/s/…" />
          </Field>
          <Field label="Passcode" hint="Optional">
            <Input value={value.passcode} onChange={(e) => onChange({ ...value, passcode: e.target.value })} />
          </Field>
        </div>
      )}
    </div>
  )
}
