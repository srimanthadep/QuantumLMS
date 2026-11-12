export interface ProviderOrder { id: string; receipt: string; amount: number; currency: string; status: string }
export interface ProviderPayment { id: string; order_id: string; amount: number; currency: string; status: string; method?: string; amount_refunded: number; created_at: number }
export interface ProviderRefund { id: string; payment_id: string; amount: number; currency: string; status: string }
export interface PaymentProvider {
  readonly name: string
  readonly publicKey: string
  createOrder(input: { receipt: string; amount: number; currency: string }): Promise<ProviderOrder>
  findOrders(receipt: string): Promise<ProviderOrder[]>
  fetchPayment(id: string): Promise<ProviderPayment>
  orderPayments(id: string): Promise<ProviderPayment[]>
  refund(input: { paymentId: string; amount: number; idempotencyKey: string }): Promise<ProviderRefund>
  fetchRefund(id: string): Promise<ProviderRefund>
}
