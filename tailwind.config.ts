import type { Config } from "tailwindcss";

/**
 * Amazon-inspired design tokens.
 * Components reference these names (bg-squid, text-zest, …) — never raw hex —
 * so the whole UI stays consistent and themeable from one place.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Amazon core palette
        squid: "#131921", // dark navy header
        slate: "#232f3e", // secondary nav
        slateHover: "#37475a",
        zest: "#febd69", // signature amazon yellow/orange (search btn)
        zestDark: "#f3a847",
        ember: "#ff9900", // CTA orange
        link: "#007185", // teal link
        linkHover: "#c7511f", // orange-red link hover
        amzYellow: "#ffd814", // Add to Cart
        amzYellowDark: "#f7ca00",
        amzOrange: "#ffa41c", // Buy Now
        amzOrangeDark: "#fa8900",
        priceRed: "#b12704",
        star: "#de7921",
        // Neutrals
        ink: "#0f1111",
        storm: "#565959",
        cloud: "#f7f8f8",
        mist: "#eaeded", // amazon page background
        line: "#d5d9d9",
        // Status / grades
        gradeA: "#067d62",
        gradeB: "#2e7d32",
        gradeC: "#b06f00",
        gradeD: "#c0392b",
        success: "#067d62",
        warn: "#b06f00",
        danger: "#c0392b",
      },
      fontFamily: {
        sans: [
          "Amazon Ember",
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        card: "12px",
      },
      boxShadow: {
        card: "0 2px 8px rgba(15,17,17,0.08)",
        cardHover: "0 4px 16px rgba(15,17,17,0.14)",
      },
    },
  },
  plugins: [],
};

export default config;
