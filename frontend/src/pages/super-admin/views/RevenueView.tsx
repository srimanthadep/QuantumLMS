import PaymentLedger from "@/components/admin/PaymentLedger"
import type { useSuperAdminStore } from "@/data/adminStore"
export default function RevenueView(_props: { store: ReturnType<typeof useSuperAdminStore> }) {
  return <PaymentLedger title="Revenue & reconciliation" />
}
