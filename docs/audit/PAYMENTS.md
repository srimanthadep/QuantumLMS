# Test payments and reconciliation

Phase 4 adds real persisted payment state using **Razorpay test mode only**. No real money was charged or refunded during implementation. No legacy enrollment was converted to a payment record. Local integration tests use a deterministic PaymentProvider fake and disposable PostgreSQL databases; a real Razorpay account and browser checkout still require the manual sandbox check below.

## Configuration

Set `RAZORPAY_KEY_ID` (must start with `rzp_test_`), `RAZORPAY_KEY_SECRET`, and a separate `RAZORPAY_WEBHOOK_SECRET` in the API environment. Leave credentials unset to keep checkout unavailable. The API rejects live keys. Configure test-mode automatic capture in Razorpay; an authorized-only payment does not admit a learner.

Register `https://YOUR_DOMAIN/api/webhooks/razorpay` for `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`, `refund.created`, `refund.processed`, and `refund.failed`. The webhook verifies HMAC SHA-256 over the original request bytes before parsing or persisting the event. Do not place secrets in frontend variables. API key and webhook secrets must remain available while outstanding orders/events are reconciled; rotation of historical secrets requires an explicit operational plan.

Optional API settings: `PAYMENT_RESERVATION_MINUTES=15`, `PAYMENT_SWEEP_SECONDS=30` (0 disables the background sweep for tests), `PAYMENT_HTTP_TIMEOUT_MS=15000`. Reconciliation uses the API's existing database pool; it does not add a separate pool or long-running database connection.

For AWS, store a JSON secret with the three `RAZORPAY_*` keys in Secrets Manager, then pass its complete ARN using `-c paymentsSecretArn=...` or `PAYMENTS_SECRET_ARN`. Context options `paymentReservationMinutes`, `paymentSweepSeconds`, and `paymentHttpTimeoutMs` configure the non-secret settings. The media worker does not receive payment credentials. No deployment was performed.

Apply reviewed migration `0009_payments_and_reconciliation.sql` through the existing database workflow after migrations 0006–0008. It creates orders, payments, payment_events and refunds, and extends reservations to self-paced offers. It does not backfill financial records. Money in payment tables and API ledger totals is integer paise; offer prices remain integer rupees. The UI explicitly labels all money as test transactions, not actual revenue.

## Recovery and invariants

- Checkout locks the offer and the batch/course admission boundary, snapshots the server price and reserves capacity. A caller-provided price is ignored. `(student_id, idempotency_key)` uniquely identifies a checkout; the same key cannot select a different offer or batch.
- Only the transaction which first creates an order calls the provider's create-order API. A lost response is recovered by the unique local order ID in the provider receipt. If zero or multiple remote orders are found, the order stays visible for review; the system does not blindly create another one. Unexpired reservations count against capacity; expiry releases capacity, never fabricates a payment failure.
- Provider payment IDs and event IDs are separately unique. Duplicate/late event snapshots cannot regress capture or refund state because reconciliation fetches canonical provider state, locks the local order, and merges monetary state monotonically.
- Payment-event and refund work is persisted with leases, bounded batches and retry delays. An API restart reclaims expired leases. Provider requests happen outside database transactions. Multiple API replicas can process the queues safely.
- A late capture must pass admission again. An occupied/closed batch, an already admitted learner, or a duplicate self-paced purchase queues a full refund and does not grant another seat/source. Extra captures on the same order are refunded without revoking the primary payment's access.
- Full refunds use the durable refund ID as `X-Refund-Idempotency` on every attempt. Access and the order's refunded state change only when the provider payment confirms the refunded amount. Until then, the ledger shows pending/processing, including errors. An externally initiated partial refund is reflected in monetary totals; requesting a full refund while a partial refund exists is blocked for manual reconciliation. Automated partial-refund authoring is outside this implementation.
- A provider-rejected refund remains visible as failed, with the order still pending resolution. Investigate it in Razorpay and reconcile; do not change local status to claim a refund happened. Financial records cannot be deleted through the application.
- Refund revocation targets the paid source only, including a registration transferred to another batch; an independent manual/free/other entitlement survives. Bulk underfilled refunds queue provider work and close registration, and cancellation becomes possible after confirmed refunds cancel the paid registrations.

## Manual sandbox acceptance

1. Provision a real test account, set test credentials, apply migrations to a separate staging database, and configure the signed webhook and automatic capture.
2. Publish a paid self-paced offer with ready course content and a recruiting live offer/batch. Student enrollment opens offer selection and test checkout. Confirm the displayed amount equals the server order. Complete a Razorpay test payment; verify the signed callback or webhook admits once.
3. Close checkout, reload, and resume a pending order through offer selection; request its status. Interrupt the API after provider order creation and verify receipt reconciliation binds the original provider order rather than creating a second one.
4. Refund from the admin ledger. Confirm pending is shown until Razorpay confirms, then verify replay/learning access for that source is revoked and an independent grant survives. Check a failed/pending provider refund and inspect the persisted error.
5. Replay the same signed webhook and deliver an older failed/authorized event after a capture. Confirm one payment and one effective paid grant, with no monetary or access regression.

The automated `payments.test.ts` covers duplicate checkout, ownership, signature rejection, amount checks, out-of-order and duplicate events, uncertain creation, lost refund responses, delayed admission, extra captures, self-paced duplicate purchases, live/self-paced last-seat races, free enrollment versus paid reservations, lease recovery, persisted ledger totals, and refusal of live keys. It does not substitute for the real Razorpay browser/network integration check.

Provider references: [Standard Checkout integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/), [idempotent refunds](https://github.com/razorpay/markdown-docs/blob/master/api/refunds/normal-refunds-idempotent.md), [order receipt lookup](https://github.com/razorpay/markdown-docs/blob/master/api/orders/fetch-all.md), [payment event snapshots](https://github.com/razorpay/markdown-docs/blob/master/webhooks/payments.md).
