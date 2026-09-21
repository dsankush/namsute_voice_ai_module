import nextConfig from "eslint-config-next";

export default [
  ...nextConfig,
  {
    rules: {
      "react-hooks/immutability": "warn",
    },
  },
  {
    ignores: [".next/**", "node_modules/**"]
  }
];
