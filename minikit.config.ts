const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');

/**
 * MiniApp configuration object. Must follow the Farcaster MiniApp specification.
 *
 * @see {@link https://miniapps.farcaster.xyz/docs/guides/publishing}
 */
export const minikitConfig = {
  accountAssociation: {
    header: "eyJmaWQiOjEzOTQ1NTksInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHgyZUYwMjdjZjg0RDc1MjM1NTY2YjEwNzYzMWE2QkY3OEM4ODAxQTQ1In0",
    payload: "eyJkb21haW4iOiJiYXNlLWhhY2thdGhvbi1iYXNlZC1iaWxscy52ZXJjZWwuYXBwIn0",
    signature: "2p0gPbn0t2/J+Iuyz3KRcEmzapxoA+cCMLi0HV+et5c/BrzTMt4ixNvFnKjbLKva8L5882PDqZXO0rrAHRIV6xw="
  },
  frame: {
    version: "1",
    name: "💰 BasedBills",
    homeUrl: "https://base-hackathon-based-bills.vercel.app",
    iconUrl: "https://base-hackathon-based-bills.vercel.app/basedbills_logo.png",
    splashImageUrl: "https://base-hackathon-based-bills.vercel.app/basedbills_logo.png",
    primaryCategory: "finance",
    splashBackgroundColor: "#eeccff",
    webhookUrl: "https://base-hackathon-based-bills.vercel.app/api/webhook",
    screenshotUrls: [
      "https://base-hackathon-based-bills.vercel.app/screenshot1.png",
      "https://base-hackathon-based-bills.vercel.app/screenshot2.png",
      "https://base-hackathon-based-bills.vercel.app/screenshot3.png"
    ],
    subtitle: "Split bills on Base!",
    tags: ["finance", "defi", "bills", "splitting", "usdc"],
    imageUrl: "https://base-hackathon-based-bills.vercel.app/basedbills_logo.png",
    buttonTitle: "Split Bills Now! 💸",
    heroImageUrl: "https://base-hackathon-based-bills.vercel.app/basedbills_logo.png",
    tagline: "Settle on-chain! ⚡",
    ogTitle: "💰 BasedBills - Split Bills",
    ogDescription: "Decentralized bill splitting with USDC settlements on Base! 🚀",
    description: "Decentralized bill splitting with USDC settlements on Base! Create groups, split expenses, and settle on-chain with friends. Features gamble mode, custom splits, and transparent transactions!",
    ogImageUrl: "https://base-hackathon-based-bills.vercel.app/basedbills_logo.png",
    noindex: true
  },
  baseBuilder: {
    ownerAddress: "0x23F5d0A18DafB06247F47a9C41FF39F483CFe060"
  }
} as const;