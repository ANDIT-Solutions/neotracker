module.exports = {
  "presets": [
    "@babel/preset-react",
    ["@babel/preset-env", {
      "targets": { "node": true },
      "useBuiltIns": false,
      "ignoreBrowserslistConfig": true
    }]
  ],
  "plugins": [
    "babel-plugin-relay",
    "@babel/plugin-proposal-async-generator-functions",
    "@babel/plugin-proposal-class-properties",
    "@babel/plugin-proposal-object-rest-spread",
    "@babel/plugin-proposal-export-namespace-from",
    "@babel/transform-flow-strip-types"
  ],
  "ignore": [
    "node_modules"
  ]
}
