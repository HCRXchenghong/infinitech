module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "script",
  },
  rules: {
    // Keep CI strict on real errors while allowing common Express signatures.
    "no-unused-vars": ["warn", { args: "none", ignoreRestSiblings: true }],
  },
};
