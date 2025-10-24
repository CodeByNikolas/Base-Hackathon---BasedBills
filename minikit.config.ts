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
    homeUrl: "https://base-hackathon-based-bills.vercel.app", //done
    iconUrl: "https://base-hackathon-based-bills.vercel.app/basedbills_logo.png", //done
    splashImageUrl: "https://base-hackathon-based-bills.vercel.app/basedbills_logo.png", //done
    primaryCategory: "finance", //done
    splashBackgroundColor: "#0052ff", //done
    webhookUrl: "https://base-hackathon-based-bills.vercel.app/api/webhook", //done
    screenshotUrls: [
      "https://base-hackathon-based-bills.vercel.app/Main-Page.png",
      "https://base-hackathon-based-bills.vercel.app/Fund-Page.png",
      "https://base-hackathon-based-bills.vercel.app/Group-Page.png"
    ],
    subtitle: "Split bills on Base!", //done
    tags: ["finance", "defi", "bills", "splitting", "usdc"],
    imageUrl: "https://base-hackathon-based-bills.vercel.app/basedbills_logo.png", //done
    buttonTitle: "Split Bills Now! 💸", //done
    heroImageUrl: "https://base-hackathon-based-bills.vercel.app/basedbills_logo.png", //done
    tagline: "Settle on-chain! ⚡", //done
    ogTitle: "💰 BasedBills - Split Bills", //done
    ogDescription: "Decentralized bill splitting with USDC settlements on Base! 🚀", //done
    description: "Decentralized bill splitting with USDC settlements on Base. Create groups, split expenses, and settle on-chain with friends.", //done
    ogImageUrl: "https://base-hackathon-based-bills.vercel.app/basedbills_logo.png", //done
    noindex: true
  },
  baseBuilder: {
    ownerAddress: "0x23F5d0A18DafB06247F47a9C41FF39F483CFe060"
  } //ja
} as const;