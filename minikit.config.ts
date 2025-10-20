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
    name: "Example Frame",
    iconUrl: "https://base-hackathon-based-bills.vercel.app/icon.png",
    homeUrl: "https://base-hackathon-based-bills.vercel.app",
    imageUrl: "https://base-hackathon-based-bills.vercel.app/image.png",
    buttonTitle: "Check this out",
    splashImageUrl: "https://base-hackathon-based-bills.vercel.app/splash.png",
    splashBackgroundColor: "#eeccff",
    webhookUrl: "https://base-hackathon-based-bills.vercel.app/api/webhook"
  },
  baseBuilder: {
    ownerAddress: "0x23F5d0A18DafB06247F47a9C41FF39F483CFe060"
  }
} as const;

