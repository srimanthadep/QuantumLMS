import { z } from "zod"
import type { Config } from "../config.js"
import type { PaymentProvider } from "./provider.js"

const order = z.object({ id: z.string(), receipt: z.string(), amount: z.number().int(), currency: z.string(), status: z.string() })
const payment = z.object({ id: z.string(), order_id: z.string(), amount: z.number().int(), currency: z.string(), status: z.string(), method: z.string().optional(), amount_refunded: z.number().int().default(0), created_at: z.number() })
const refund = z.object({ id: z.string(), payment_id: z.string(), amount: z.number().int(), currency: z.string(), status: z.string() })
function resource(id: string, prefix: string) {
  if (!new RegExp(`^${prefix}_[a-zA-Z0-9]+$`).test(id)) throw new Error("Invalid provider resource identifier")
  return id
}

/** Test-mode adapter. Provider responses are validated; secrets and response bodies are never logged. */
export function createRazorpay(config: Config): PaymentProvider | undefined {
  if (!config.RAZORPAY_KEY_ID || !config.RAZORPAY_KEY_SECRET) return
  if (!config.RAZORPAY_KEY_ID.startsWith("rzp_test_")) throw new Error("Live payments are disabled")
  const authorization = `Basic ${Buffer.from(`${config.RAZORPAY_KEY_ID}:${config.RAZORPAY_KEY_SECRET}`).toString("base64")}`
  async function request(path: string, body?: unknown, headers?: Record<string, string>) {
    const response = await fetch(`https://api.razorpay.com/v1/${path}`, { method: body ? "POST" : "GET", headers: { authorization, "content-type": "application/json", ...headers },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(config.PAYMENT_HTTP_TIMEOUT_MS) })
    if (!response.ok) throw new Error(`Payment provider request failed (${response.status})`)
    return response.json()
  }
  return {
    name: "razorpay", publicKey: config.RAZORPAY_KEY_ID,
    async createOrder(input) { return order.parse(await request("orders", { ...input, notes: { quantum_order_id: input.receipt } })) },
    async findOrders(receipt) {
      const data = z.object({ items: z.array(order) }).parse(await request(`orders?receipt=${encodeURIComponent(receipt)}&count=100`))
      return data.items.filter(o => o.receipt === receipt)
    },
    async fetchPayment(id) { return payment.parse(await request(`payments/${resource(id, "pay")}`)) },
    async orderPayments(id) { return z.object({ items: z.array(payment) }).parse(await request(`orders/${resource(id, "order")}/payments`)).items },
    async refund(input) { return refund.parse(await request(`payments/${resource(input.paymentId, "pay")}/refund`, { amount: input.amount, speed: "normal" }, { "X-Refund-Idempotency": input.idempotencyKey })) },
    async fetchRefund(id) { return refund.parse(await request(`refunds/${resource(id, "rfnd")}`)) },
  }
}
