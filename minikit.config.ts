const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');

/**
 * MiniApp configuration object. Must follow the Farcaster MiniApp specification.
 *
 * @see {@link https://miniapps.farcaster.xyz/docs/guides/publishing}
 */
export const minikitConfig = {
  "accountAssociation": {
    header: "eyJmaWQiOjEzOTQ1NTksInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHgyZUYwMjdjZjg0RDc1MjM1NTY2YjEwNzYzMWE2QkY3OEM4ODAxQTQ1In0",
    payload: "eyJkb21haW4iOiJuZXctbWluaS1hcHAtcXVpY2tzdGFydC1jaGktdGhyZWUudmVyY2VsLmFwcCJ9",
    signature: "cdUQ2byphGOwnJEWMhIAcGfoIdn/0iucuAGeOq4BMHlgdXgeSFmQtLrqz35C4qhT9syL3GqGnVMRUwxM6iyuVhw="
  },
  frame: {
    version: "1",
    name: "Example Frame",
    iconUrl: "https://new-mini-app-quickstart-chi-three.vercel.app/icon.png",
    homeUrl: "https://new-mini-app-quickstart-chi-three.vercel.app",
    imageUrl: "https://new-mini-app-quickstart-chi-three.vercel.app/image.png",
    buttonTitle: "Check this out",
    splashImageUrl: "https://new-mini-app-quickstart-chi-three.vercel.app/splash.png",
    splashBackgroundColor: "#eeccff",
    webhookUrl: "https://new-mini-app-quickstart-chi-three.vercel.app/api/webhook"
  },
  baseBuilder: {
    ownerAddress: "0x23F5d0A18DafB06247F47a9C41FF39F483CFe060"
  }
} as const;

