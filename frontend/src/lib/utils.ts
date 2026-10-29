import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Teach tailwind-merge the custom type scale so `text-h1` is treated as a
// font size (not a colour) and does not drop `text-foreground`.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display", "h1", "h2", "h3", "body", "body-lg", "caption"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const inrFormatter = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })

/** Formats rupees as ₹1,23,456. */
export function formatINR(rupees: number): string {
  return inrFormatter.format(rupees)
}
