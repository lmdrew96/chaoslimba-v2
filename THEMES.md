# Themes carried over from ChaosLimbă v1

Copied on 2026-10-16 from `chaos/apps/chaoslimba`. Only the theme system was brought over; everything else starts fresh. The full rebuild plan is in the "ChaosLimbă v2 — Error Garden Rebuild Spec" doc.

## Files (same paths as v1)
- `src/app/globals.css`: every theme's colors (default, 7 named themes, and Chaos Suite, each with light and dark) plus the font-scale classes
- `src/lib/theme-init.ts`: applies the saved theme, reduce-motion and font scale before the page loads
- `src/components/theme-provider.tsx`: wrapper around next-themes that handles light/dark
- `src/components/features/settings/ThemeSelector.tsx`: the theme picker UI (uses lucide-react)

## Packages
- tailwindcss v4 (the CSS uses `@theme inline`, so it won't work on Tailwind 3)
- tw-animate-css
- next-themes
- lucide-react (for ThemeSelector)

## What goes in layout.tsx (v1's lines, minus Clerk / Footer / PWA)
```tsx
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { themeInitScript } from "@/lib/theme-init";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// inside RootLayout:
<html lang="en" suppressHydrationWarning>
  <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
    <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
    <ThemeProvider attribute="class" defaultTheme="dark" storageKey="chaoslimba-mode" disableTransitionOnChange>
      {children}
    </ThemeProvider>
  </body>
</html>
```

## To do on setup
- [x] Rename the old `--adhd-*` tokens in the Chaos Suite theme to the 2026 ADHDesigns names (done 2026-10-17; also switched to the 2026 hex values, so Lab Notebook became "ADHDesigns Arcade")
- [ ] If the app gets a new name, update the `chaoslimba-*` storage keys in theme-init.ts, ThemeSelector.tsx and the ThemeProvider `storageKey`
