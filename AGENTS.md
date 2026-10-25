# Repository Guide

- The Next.js App Router frontend lives in `app/`; static files live in `public/`.
- The separate `hardhat/` project owns Solidity contracts and their deployment scripts. Frontend dependency maintenance must not change or deploy contracts.
- Use pnpm for the frontend and its committed `pnpm-lock.yaml`. Install with `pnpm install --frozen-lockfile --ignore-scripts`.
- Verify frontend dependency updates with `pnpm lint`, `pnpm exec tsc --noEmit`, and `pnpm build`. Report existing check failures.
- Keep secrets and environment files out of Git. Use synthetic configuration for local dependency checks; never trigger live wallet transactions or credential-validation endpoints during smoke tests.
