import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { intlTransformer } from "@keybr/scripts/intl-transformer.js";
import HtmlWebpackPlugin from "html-webpack-plugin";
import { transform } from "lightningcss";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import webpack from "webpack";

const here = dirname(fileURLToPath(import.meta.url));
const repo = dirname(here);
const require = createRequire(import.meta.url);
const tauri = JSON.parse(
  readFileSync(join(here, "src-tauri/tauri.conf.json"), "utf8"),
);
const browserTargets = { safari: "15.0" };
const babel = {
  loader: require.resolve("babel-loader"),
  options: {
    babelrc: false,
    configFile: false,
    presets: [
      [
        require.resolve("@babel/preset-env"),
        {
          targets: browserTargets,
          modules: false,
          bugfixes: true,
          useBuiltIns: "entry",
          corejs: "3.45",
        },
      ],
    ],
  },
};

class DesktopAuditPlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap("DesktopAudit", (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: "DesktopAudit",
          stage: webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE,
        },
        (assets) => {
          for (const [name, source] of Object.entries(assets)) {
            if (name.endsWith(".css")) {
              const result = transform({
                filename: name,
                code: Buffer.from(source.source()),
                minify: true,
                targets: { safari: 15 << 16 },
              });
              compilation.updateAsset(
                name,
                new webpack.sources.RawSource(result.code),
              );
            }
          }
        },
      );
      compilation.hooks.processAssets.tap(
        {
          name: "DesktopAudit",
          stage: webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT,
        },
        () => {
          const modules = [...compilation.modules]
            .map((module) => module.resource)
            .filter(Boolean)
            .map((path) => relative(repo, path).replaceAll("\\", "/"))
            .sort();
          const forbidden = modules.filter((path) =>
            /(?:^|\/)packages\/(?:thirdparties(?:-[^/]+)?|server|server-cli)\//.test(
              path,
            ),
          );
          if (forbidden.length) {
            compilation.errors.push(
              new Error(
                `Online-only modules in desktop build:\n${forbidden.join("\n")}`,
              ),
            );
          }
          const assets = compilation
            .getAssets()
            .map(({ name }) => name)
            .sort();
          if (!assets.some((name) => name.endsWith(".data"))) {
            compilation.errors.push(
              new Error(
                "No bundled phonetic models; refusing an incomplete offline build.",
              ),
            );
          }
          compilation.emitAsset(
            "bundle-audit.json",
            new webpack.sources.RawSource(
              JSON.stringify(
                { offline: forbidden.length === 0, modules, assets },
                null,
                2,
              ),
            ),
          );
          compilation.emitAsset(
            "LICENSE.txt",
            new webpack.sources.RawSource(readFileSync(join(repo, "LICENSE"))),
          );
        },
      );
    });
  }
}

export default {
  mode: "production",
  target: ["web", "es2020"],
  context: repo,
  entry: { desktop: join(here, "src/entry.ts") },
  output: {
    path: join(here, "dist"),
    clean: true,
    publicPath: "./",
    filename: "[name].[contenthash:12].js",
    chunkFilename: "[name].[contenthash:12].js",
    assetModuleFilename: "assets/[name].[contenthash:12][ext]",
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".mjs", ".json"],
    modules: [
      join(here, "node_modules"),
      join(repo, "node_modules"),
      "node_modules",
    ],
  },
  resolveLoader: {
    modules: [join(here, "node_modules"), join(repo, "node_modules")],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        type: "javascript/auto",
        use: [
          babel,
          {
            loader: "ts-loader",
            options: {
              configFile: join(here, "tsconfig.json"),
              transpileOnly: true,
              onlyCompileBundledFiles: true,
              compilerOptions: {
                noEmit: false,
                allowImportingTsExtensions: false,
              },
              getCustomTransformers: () => ({ before: [intlTransformer()] }),
            },
          },
        ],
      },
      { test: /\.[cm]?jsx?$/, exclude: /[\\/]core-js[\\/]/, use: [babel] },
      {
        test: /\.less$/,
        // @keybr/themes declares sideEffects:false. Its global CSS still MUST run.
        sideEffects: true,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: "css-loader",
            options: {
              modules: {
                auto: true,
                namedExport: true,
                exportGlobals: true,
                exportLocalsConvention: "dashesOnly",
                localIdentName: "[name]__[local]__[hash:base64:5]",
              },
            },
          },
          "less-loader",
        ],
      },
      {
        test: /\.css$/,
        sideEffects: true,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
      {
        // Upstream includes binary .stats examples as well as phonetic .data files.
        test: /\.(?:data|stats|woff2?|ttf|otf|svg|png|jpe?g|gif|webp|ico|wav|mp3|ogg)$/i,
        type: "asset/resource",
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      "typeof window": JSON.stringify("object"),
      "process.env.GOOGLE_TAG_MANAGER_ID": "undefined",
      "process.env.CLOUDFLARE_ANALYTICS_ID": "undefined",
      "process.env.COOKIEBOT_CLIENT_ID": "undefined",
      "process.env.PADDLE_TOKEN": "undefined",
      "process.env.PADDLE_PRICE_ID": "undefined",
    }),
    new MiniCssExtractPlugin({
      filename: "[name].[contenthash:12].css",
      ignoreOrder: true,
    }),
    new HtmlWebpackPlugin({
      template: join(here, "index.html"),
      favicon: join(here, "icon.svg"),
      scriptLoading: "defer",
      meta: {
        "Content-Security-Policy": {
          "http-equiv": "Content-Security-Policy",
          "content": tauri.app.security.csp,
        },
      },
    }),
    new DesktopAuditPlugin(),
  ],
  devtool: false,
  performance: false,
  optimization: {
    splitChunks: {
      chunks: "all",
      cacheGroups: {
        // Link one complete local stylesheet in index.html, before React starts.
        // This includes fonts, theme variables and lazy lesson-page styles.
        desktopStyles: {
          name: "desktop-styles",
          type: "css/mini-extract",
          chunks: "all",
          enforce: true,
        },
      },
    },
  },
  stats: "errors-warnings",
};
