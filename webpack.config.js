import path from "path";
import { fileURLToPath } from "url";
import { readFileSync, existsSync } from "fs";
import webpack from "webpack";
import HtmlWebpackPlugin from "html-webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Read .env at build time ───────────────────────────────────────────────────
// Keys are inlined by DefinePlugin — the .env file is gitignored and never
// ends up in the repository or the final bundle as a readable string variable.
function loadEnv() {
  const envPath = path.resolve(__dirname, ".env");
  if (!existsSync(envPath)) return {};
  const vars = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return vars;
}

const env = loadEnv();

export default (env_, argv) => ({
  entry: {
    popup:      path.resolve(__dirname, "src/popup/main.tsx"),
    background: path.resolve(__dirname, "src/background/index.ts"),
    content:    path.resolve(__dirname, "src/content/index.ts"),
  },
  output: {
    path:     path.resolve(__dirname, "dist"),
    filename: "[name].js",
    clean:    true,
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },
  module: {
    rules: [
      {
        test:    /\.tsx?$/,
        use:     "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use:  ["style-loader", "css-loader"],
      },
      {
        test: /\.svg$/,
        type: "asset/resource",
      },
    ],
  },
  optimization: {
    runtimeChunk: false,
  },
  plugins: [
    // Inline API keys at bundle time so they are never stored as named variables
    // that a source-map or bundle analyser could trivially extract.
    new webpack.DefinePlugin({
      "process.env.OCRS_API_KEY":      JSON.stringify(env["OCRS_API_KEY"]      ?? ""),
      "process.env.ANTHROPIC_API_KEY": JSON.stringify(env["ANTHROPIC_API_KEY"] ?? ""),
      "process.env.API_BASE_URL":      JSON.stringify(env["API_BASE_URL"]      ?? ""),
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "index.html"),
      filename: "popup.html",
      chunks:   ["popup"],
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from:            path.resolve(__dirname, "public"),
          to:              path.resolve(__dirname, "dist"),
          noErrorOnMissing: true,
        },
      ],
    }),
  ],
  devtool: argv.mode === "development" ? "inline-source-map" : "source-map",
  devServer: {
    static: path.resolve(__dirname, "dist"),
    port:   3000,
    hot:    true,
    open:   true,
  },
});
