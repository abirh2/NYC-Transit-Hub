import { heroui } from "@heroui/react";

// Export the HeroUI Tailwind plugin with MTA-inspired theme
export default heroui({
  prefix: "heroui",
  addCommonColors: true,
  defaultTheme: "dark",
  defaultExtendTheme: "dark",
  themes: {
    dark: {
      colors: {
        background: "#0a0a0a",
        foreground: "#ededed",
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
        success: {
          DEFAULT: "#00933C",
          foreground: "#ffffff",
        },
        warning: {
          DEFAULT: "#FCCC0A",
          foreground: "#000000",
        },
        danger: {
          DEFAULT: "#EE352E",
          foreground: "#ffffff",
        },
      },
    },
    light: {
      colors: {
        background: "#ffffff",
        foreground: "#171717",
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
        success: {
          DEFAULT: "#00933C",
          foreground: "#ffffff",
        },
        warning: {
          DEFAULT: "#FCCC0A",
          foreground: "#000000",
        },
        danger: {
          DEFAULT: "#EE352E",
          foreground: "#ffffff",
        },
      },
    },
  },
});

