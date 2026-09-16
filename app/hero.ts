import { heroui } from "@heroui/react";

// Export the HeroUI Tailwind plugin with MTA-inspired theme.
//
// HeroUI semantic slots are the Layer-2 home for intent that maps naturally to
// HeroUI's own theming (see design.md "Token Architecture"). They are kept in
// lockstep with the CSS design tokens in `app/globals.css` so the two never
// diverge:
//
//   HeroUI slot            CSS token           Palette (Layer 1)   Semantic_State
//   ---------------------  ------------------  ------------------  ---------------
//   background (DEFAULT) ← --surface-app                           (app surface)
//   foreground           ← readable text on --surface-app
//   primary    (DEFAULT) ← --state-selected  ← --mta-blue   #0039A6  selected
//   secondary  (DEFAULT)                       --mta-orange #FF6319  (delay accent)
//   success    (DEFAULT) ← --state-normal    ← --mta-green  #00933C  normal
//   warning    (DEFAULT) ← --state-advisory  ← --mta-yellow #FCCC0A  advisory
//   danger     (DEFAULT) ← --state-severe    ← --mta-red    #EE352E  severe
//
// Design-system-only tokens (spacing, radii, depth, and the extra surfaces
// --surface-panel/elevated/floating/selected/hover, plus the --state-delay/
// unavailable/stale tokens) stay in `globals.css`; they have no HeroUI slot.
// Transit route-family colors are theme-independent and live in
// `lib/transit/route-colors.ts`, never here.
export default heroui({
  prefix: "heroui",
  addCommonColors: true,
  defaultTheme: "dark",
  defaultExtendTheme: "dark",
  themes: {
    dark: {
      colors: {
        // background ← --surface-app (dark baseline)
        background: "#0a0a0a",
        foreground: "#ededed",
        // primary ← --state-selected ← --mta-blue
        primary: {
          50: "#e6f0ff",
          100: "#b3d1ff",
          200: "#80b3ff",
          300: "#4d94ff",
          400: "#1a75ff",
          500: "#0039A6",
          600: "#002d85",
          700: "#002164",
          800: "#001542",
          900: "#000a21",
          DEFAULT: "#0039A6",
          foreground: "#ffffff",
        },
        // secondary ← --mta-orange (delay accent)
        secondary: {
          50: "#fff5e6",
          100: "#ffe0b3",
          200: "#ffcc80",
          300: "#ffb84d",
          400: "#ffa31a",
          500: "#FF6319",
          600: "#cc4f14",
          700: "#993b0f",
          800: "#66280a",
          900: "#331405",
          DEFAULT: "#FF6319",
          foreground: "#ffffff",
        },
        // success ← --state-normal ← --mta-green
        success: {
          DEFAULT: "#00933C",
          foreground: "#ffffff",
        },
        // warning ← --state-advisory ← --mta-yellow
        warning: {
          DEFAULT: "#FCCC0A",
          foreground: "#000000",
        },
        // danger ← --state-severe ← --mta-red
        danger: {
          DEFAULT: "#EE352E",
          foreground: "#ffffff",
        },
      },
    },
    light: {
      colors: {
        // background ← --surface-app (light override)
        background: "#f5f5f5",
        foreground: "#171717",
        // primary ← --state-selected ← --mta-blue
        primary: {
          50: "#e6f0ff",
          100: "#b3d1ff",
          200: "#80b3ff",
          300: "#4d94ff",
          400: "#1a75ff",
          500: "#0039A6",
          600: "#002d85",
          700: "#002164",
          800: "#001542",
          900: "#000a21",
          DEFAULT: "#0039A6",
          foreground: "#ffffff",
        },
        // secondary ← --mta-orange (delay accent)
        secondary: {
          50: "#fff5e6",
          100: "#ffe0b3",
          200: "#ffcc80",
          300: "#ffb84d",
          400: "#ffa31a",
          500: "#FF6319",
          600: "#cc4f14",
          700: "#993b0f",
          800: "#66280a",
          900: "#331405",
          DEFAULT: "#FF6319",
          foreground: "#ffffff",
        },
        // success ← --state-normal ← --mta-green
        success: {
          DEFAULT: "#00933C",
          foreground: "#ffffff",
        },
        // warning ← --state-advisory ← --mta-yellow
        warning: {
          DEFAULT: "#FCCC0A",
          foreground: "#000000",
        },
        // danger ← --state-severe ← --mta-red
        danger: {
          DEFAULT: "#EE352E",
          foreground: "#ffffff",
        },
      },
    },
  },
});
