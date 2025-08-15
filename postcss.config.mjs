const config = {
  plugins: {
    "@tailwindcss/postcss": {
      sources: {
        include: [
          "./app/**/*.{js,ts,jsx,tsx,mdx}",
          "./components/**/*.{js,ts,jsx,tsx,mdx}",
          "./lib/**/*.{js,ts,jsx,tsx,mdx}",
        ],
        negated: []
      }
    }
  },
};

export default config;
