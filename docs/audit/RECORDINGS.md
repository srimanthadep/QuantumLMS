# Class recordings and replay access

Migration 0012 adds recordings, timestamped chapters, revision history, signed provider notices, per-batch replay enablement, and permanent session scope on media assets. It is additive and is tested from zero in disposable databases. Apply it through the reviewed deployment migration workflow before running this phase against the development or production database. The agent has not applied it to either database.

## Author workflow

After the assigned teacher ends a dated class, open its Manage recording action, the teacher Recordings page, or the admin batch settings recording section. Select the ended class and upload an MP4, WebM, or MOV directly to storage. Finalization verifies ownership, actual size and container signature before enqueuing the durable processing job.

The API never pretends that an external meeting was recorded automatically. Use Zoom/Meet recording controls and obtain the recording file separately. A media worker performs sequential transcoding and transcription; the same lease/retry/fencing mechanism used for course uploads is reused. A successfully processed asset initializes ordered draft chapters once. Titles are transcript excerpts and need human review; they are not represented as verified topic analysis. Processing failures remain visible with an explicit retry action. Docker/full-model inference remains the manual integration check described in MEDIA_PROCESSING.md; the real FFmpeg/missing-transcriber regression is automated.

Review the whole video, transcript, summary and chapter titles/timestamps. Chapter starts/ends must be integers in seconds, ordered, non-overlapping and within the video duration. Save the review, then publish explicitly. The default release is actual session end plus the batch replay delay; default expiry is 12 calendar months after batch end (configured by access_expiry_months). Saved release/expiry fields are persisted. Later batch default changes do not silently rewrite already published recording windows; review existing windows explicitly. Editing a published replay returns it to Draft until republished. Replacement requires a successfully processed asset, retains the previous asset/chapter snapshot, and generates a new draft. One whole-session recording is retained per session; multiple source parts must be combined before upload.

Admins can attach unused media from the course upload flow. Teachers upload media scoped directly to an assigned session. Media already used by a lesson, including legacy URL/quality references, cannot be converted to a replay. A recording asset can never be attached to an ordinary course lesson. Replaced recording assets retain their original session scope and are not playable by learners through generic media paths.

## Student workflow and access

Replays appear on the course Class replays tab and from ended sessions. The player requests an authorized signed link, preserves position when renewing it, and provides chapter jumps. Metadata lists contain no media URLs or transcripts. Student playback requires confirmed registration and an effective entitlement for the exact batch; another batch or self-paced entitlement for the same course does not qualify. Publication, release time, expiry, REPLAY_ENABLED and the batch replay switch are enforced server-side on playback and generic file paths. Signed links expire within five minutes and never beyond the replay expiry; already issued links can remain usable until that short expiry after an administrative revocation.

Set REPLAY_ENABLED=true (default) for platform access. Administrators can toggle each batch from the recording section. Disabling the platform switch does not prevent authors from preparing and reviewing drafts.

## Optional Zoom recording notices

ZOOM_RECORDING_WEBHOOK_ENABLED defaults false. If enabled, set a separate ZOOM_RECORDING_WEBHOOK_SECRET (at least 16 characters). AWS accepts zoomWebhook=true and zoomWebhookSecretArn/ZOOM_WEBHOOK_SECRET_ARN; the raw secret stays in Secrets Manager and is supplied only to the API. replayEnabled configures the platform flag. Configure POST /api/webhooks/zoom/recordings for recording.completed and endpoint validation.

The handler verifies HMAC SHA-256 over the exact raw body using v0:timestamp:body, compares signatures in constant time, and rejects timestamps outside five minutes. The endpoint-validation challenge is signed too. Notices are deduplicated by account + meeting instance UUID + recording file ID. Only non-secret metadata is retained; download URLs, download tokens and the raw payload are not stored. No recording asset or chapter is created by a provider notice. An administrator sees pending notices, verifies the session match, uploads the actual file, and attaches it explicitly before review/publication. This intentionally does not introduce automatic Zoom ingestion.

Protocol references: [Zoom webhook verification and endpoint validation](https://developers.zoom.us/docs/api/webhooks/) and [Zoom recording event documentation](https://developers.zoom.us/docs/api/meetings/events/). No real Zoom account/webhook or provider download was exercised; automated tests sign isolated fixtures and verify rejection/deduplication.

## Verification and data limitations

recordings.test.ts covers direct-upload scoping, durable processing integration, duplicate finish fencing, chapter bounds/order, explicit publication/version checks, cross-batch and unassigned-teacher denial, release/expiry caps, server feature flags, generic media bypass attempts, legacy lesson references, replacement history, failed transcription and signed/deduplicated provider notices.

Old browser-generated recording entries have no durable source asset/session mapping. They are not converted into real replays. Upload the original recording and select its actual ended session; do not infer session identity from demo titles or dates. Existing source-video reconciliation from phase 2 remains unchanged.
