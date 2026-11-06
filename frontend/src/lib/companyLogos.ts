export interface CompanyBrand {
  id: string
  name: string
  aliases: readonly string[]
  logo: string
  color: string
  domain: string
}

export const COMPANY_BRANDS: readonly CompanyBrand[] = [
  {
    id: "meesho",
    name: "Meesho",
    aliases: ["meesho"],
    logo: "/logos/meesho.svg",
    color: "#9b1b6e",
    domain: "meesho.com",
  },
  {
    id: "uber",
    name: "Uber",
    aliases: ["uber"],
    logo: "/logos/uber.svg",
    color: "#111111",
    domain: "uber.com",
  },
  {
    id: "zs",
    name: "ZS",
    aliases: ["zs", "zs associates"],
    logo: "/logos/zs.svg",
    color: "#e0701a",
    domain: "zs.com",
  },
  {
    id: "ibm",
    name: "IBM",
    aliases: ["ibm", "international business machines"],
    logo: "/logos/ibm.svg",
    color: "#1f5fbf",
    domain: "ibm.com",
  },
  {
    id: "byborg",
    name: "Byborg",
    aliases: ["byborg", "byborg enterprises"],
    logo: "/logos/byborg.svg",
    color: "#2a2f9e",
    domain: "byborg.com",
  },
  {
    id: "hexaware",
    name: "Hexaware",
    aliases: ["hexaware", "hexaware technologies"],
    logo: "/logos/hexaware.svg",
    color: "#e8541a",
    domain: "hexaware.com",
  },
  {
    id: "amazon",
    name: "Amazon",
    aliases: ["amazon", "aws"],
    logo: "/logos/amazon.svg",
    color: "#e47911",
    domain: "amazon.com",
  },
  {
    id: "optum",
    name: "Optum Global",
    aliases: ["optum", "optum global", "unitedhealth", "unitedhealth group"],
    logo: "/logos/optum.svg",
    color: "#e87722",
    domain: "optum.com",
  },
  {
    id: "sigmoid",
    name: "Sigmoid Analytics",
    aliases: ["sigmoid", "sigmoid analytics"],
    logo: "/logos/sigmoid.png",
    color: "#2b6cb0",
    domain: "sigmoid.com",
  },
  {
    id: "flipkart",
    name: "Flipkart",
    aliases: ["flipkart"],
    logo: "/logos/flipkart.svg",
    color: "#2874f0",
    domain: "flipkart.com",
  },
  {
    id: "ltimindtree",
    name: "LTIMindtree",
    aliases: ["ltimindtree", "lti mindtree", "l&t infotech"],
    logo: "/logos/ltimindtree.svg",
    color: "#1b6fa8",
    domain: "ltimindtree.com",
  },
  {
    id: "razorpay",
    name: "Razorpay",
    aliases: ["razorpay"],
    logo: "/logos/razorpay.svg",
    color: "#2b6ae0",
    domain: "razorpay.com",
  },
  {
    id: "ey",
    name: "EY",
    aliases: ["ey", "ernst & young", "ernst and young"],
    logo: "/logos/ey.svg",
    color: "#c9a400",
    domain: "ey.com",
  },
  {
    id: "cognizant",
    name: "Cognizant",
    aliases: ["cognizant", "cts"],
    logo: "/logos/cognizant.svg",
    color: "#2459a6",
    domain: "cognizant.com",
  },
  {
    id: "dpworld",
    name: "DP World",
    aliases: ["dp world", "dpworld"],
    logo: "/logos/dpworld.svg",
    color: "#1c2b5a",
    domain: "dpworld.com",
  },
  {
    id: "indigo",
    name: "IndiGo",
    aliases: ["indigo", "indigo airlines", "interglobe aviation"],
    logo: "/logos/indigo.svg",
    color: "#2a2f9e",
    domain: "goindigo.in",
  },
  {
    id: "mrcooper",
    name: "Mr. Cooper",
    aliases: ["mr. cooper", "mr cooper", "nationstar"],
    logo: "/logos/mrcooper.svg",
    color: "#2a6f4e",
    domain: "mrcooper.com",
  },
  {
    id: "curefit",
    name: "Cure.fit",
    aliases: ["cure.fit", "cult.fit", "curefit", "cultfit"],
    logo: "/logos/curefit.svg",
    color: "#d63a3a",
    domain: "cult.fit",
  },
  {
    id: "myntra",
    name: "Myntra",
    aliases: ["myntra"],
    logo: "/logos/myntra.svg",
    color: "#e0338a",
    domain: "myntra.com",
  },
  {
    id: "zepto",
    name: "Zepto",
    aliases: ["zepto"],
    logo: "/logos/zepto.svg",
    color: "#e52243",
    domain: "zeptonow.com",
  },
  {
    id: "1ds",
    name: "1DS",
    aliases: ["1ds", "1ds logistics"],
    logo: "/logos/1ds.svg",
    color: "#2563eb",
    domain: "1ds.com",
  },
  {
    id: "bhanzu",
    name: "Bhanzu",
    aliases: ["bhanzu"],
    logo: "/logos/bhanzu.svg",
    color: "#f97316",
    domain: "bhanzu.com",
  },
] as const

const BRAND_MAP = new Map<string, CompanyBrand>()

for (const brand of COMPANY_BRANDS) {
  BRAND_MAP.set(brand.name.toLowerCase(), brand)
  BRAND_MAP.set(brand.id.toLowerCase(), brand)
  for (const alias of brand.aliases) {
    BRAND_MAP.set(alias.toLowerCase(), brand)
  }
}

/** Lookup official brand metadata by company name or alias. */
export function getCompanyBrand(rawName?: string | null): CompanyBrand | undefined {
  if (!rawName) return undefined
  const key = rawName.trim().toLowerCase()
  return BRAND_MAP.get(key)
}

/** Get official logo URL for any company name, falling back to a favicon generator if unknown. */
export function getCompanyLogoUrl(rawName?: string | null): string {
  const brand = getCompanyBrand(rawName)
  if (brand?.logo) return brand.logo
  const query = encodeURIComponent((rawName || "company").trim())
  return `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${query}.com&size=128`
}

