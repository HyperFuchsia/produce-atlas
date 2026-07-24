# Shipping NEON VAULT to the App Store

The game is a self-contained WebGL build wrapped in a native iOS shell by
Capacitor. It renders through WKWebView, which has hardware-accelerated WebGL
on every iOS version this project supports. Everything below is the real, ordered checklist — the parts that
need a Mac are called out, because they cannot be done from Linux or CI
without one.

---

## 1. What you need

| Requirement | Notes |
| --- | --- |
| Apple Developer Program | $99/year, required to ship. |
| A Mac with Xcode 15+ | Required to build, sign and upload an iOS binary. |
| Node 20+ | For the web build. |
| Bundle ID | `com.neonvault.game` is the default in `capacitor.config.ts`. Change it to a domain you own **before** first upload — a bundle ID cannot be changed afterwards. |

## 2. Create the native project (once, on the Mac)

```bash
git clone <this repo> && cd neon-vault
npm install
npm run build          # produces dist/
npx cap add ios        # creates ios/ — commit it after this step
npm run ios:sync       # build + copy web assets into the shell
npm run ios:open       # opens ios/App/App.xcworkspace in Xcode
```

`npx cap add ios` generates the `ios/` directory. It is intentionally not
checked in here because it is machine-generated; once you create it, commit it
so signing settings and icons live with the project.

## 3. Xcode settings

In **Signing & Capabilities**:

- Team: your Apple Developer team.
- Bundle Identifier: matches `appId` in `capacitor.config.ts`.
- Automatically manage signing: on (simplest for a first release).

In **General → Deployment Info**:

- Minimum Deployment: **iOS 14.0** (Capacitor 6's floor).
- Device Orientation: check **all four** — the 3-D camera adapts to both, and
  portrait widens the lens to keep the same road ahead.
- Status Bar Style: Light, "Hide status bar" checked.

In **Info.plist**, add:

```xml
<key>UIRequiresFullScreen</key><true/>
<key>ITSAppUsesNonExemptEncryption</key><false/>
```

The second one saves you an export-compliance questionnaire on every upload.

## 4. Icons and launch screen

`npm run icons` regenerates every mark from vector code into `public/assets`:

| File | Use |
| --- | --- |
| `icon-1024.png` | App Store listing icon. Drag into Xcode's AppIcon slot. |
| `icon-512.png` / `icon-192.png` | PWA + favicon. |
| `splash-2732.png` | Launch screen. Set as `Splash` in `App/Assets.xcassets`. |

The App Store icon **must not** have transparency or rounded corners — the
generated 1024 is a full-bleed square, which is correct.

## 5. Privacy — what to declare

The game collects nothing. There is no analytics SDK, no ad SDK, no network
call of any kind; progress lives in `localStorage` on the device. In App Store
Connect → App Privacy, select **"Data Not Collected"**.

If you later add ads or analytics, that answer changes and you will also need
`NSUserTrackingUsageDescription` and an ATT prompt.

## 6. Store listing

Suggested metadata (edit to taste):

- **Name:** Neon Vault
- **Subtitle:** One path. Infinite momentum.
- **What's new / hook:** a 3-D endless runner with a two-tap control scheme
- **Category:** Games → Arcade (secondary: Action)
- **Age rating:** 4+ (no violence, no user content, no purchases by default)
- **Keywords:** runner, endless runner, parkour, vault, arcade, neon, cyberpunk, one tap, reflex, freerun
- **Promotional text:** Vault it, dive through it, or lose the run. Marcus Vale runs the Conduit — the only road out of the stacks.

**Description draft:**

> The Conduit runs one way, and so do you.
>
> Marcus Vale is a kinetic courier in the vertical city of New Lagos, and every
> job is the same shape: a single forward path and everything the city puts on
> it. Vault the barriers. Dive through the glass. Slide under the scanners.
> Miss one read and the run is over.
>
> • **Three verbs, no menus.** Tap high to vault, tap low to dive. That's the
>   whole control scheme, and it's deep enough to chase for months.
> • **Full 3-D.** The camera rides your shoulder down a lit deck strung through
>   the city, and every hazard arrives in depth.
> • **A course that scales with you.** Obstacles are spaced by reaction time,
>   not distance, so the Conduit stays exactly as readable at full speed.
> • **Flow State.** Chain perfect vaults and close calls to double your score
>   and shrug off a hit.
> • **Four zones.** The Conduit, the Undercity in permanent rain, the Solar
>   Spine above the smog line, and the Void Line.
> • **Everything unlockable with play.** Six upgrades, five outfits, rotating
>   contracts. No energy timers.
>
> No ads. No tracking. No internet required.

Screenshots: capture at 6.7" (1290×2796) and 6.5" (1242×2688). `npm run smoke`
writes usable frames to `screenshots/` — retake them on a real device or the
iPhone 15 Pro Max simulator for submission.

## 7. Upload

```bash
npm run ios:sync
npm run ios:open
```

In Xcode: select **Any iOS Device (arm64)** → Product → Archive → Distribute
App → App Store Connect → Upload.

## 8. Review notes that matter for this app

- **Guideline 4.2 (minimum functionality):** a complete arcade game with
  progression clears this comfortably; the review notes field is a good place
  to say "no login, no network, everything is playable immediately".
- **Guideline 2.1:** reviewers open the app cold. The first launch goes
  straight to a playable title screen with a HOW TO PLAY sheet, so there is
  nothing to explain.
- **Sign in with Apple:** not required — there are no accounts.

## 9. If you add monetisation later

The code is structured so this is additive, not a rewrite:

- **Consumable shards / remove-ads IAP:** add `@capacitor-community/in-app-purchases`,
  then credit `profile.shards` through the existing `meta.ts` helpers — every
  currency mutation already funnels through `bankRun`, `buyUpgrade`, `buySkin`
  and `claimDaily`.
- **Rewarded revive:** `src/game/app.ts` already has the revive flow behind a
  single `case 'revive'` action that currently spends shards. Swap the cost
  check for an ad callback and keep the rest.
- Anything you add here changes your App Privacy answers.
