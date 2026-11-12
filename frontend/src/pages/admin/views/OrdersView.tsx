import PaymentLedger from "@/components/admin/PaymentLedger"
import type { useAdminStore } from "@/data/adminStore"
export default function OrdersView(_props: { store: ReturnType<typeof useAdminStore>; onToast: (message: string) => void }) {
  return <PaymentLedger />
}
