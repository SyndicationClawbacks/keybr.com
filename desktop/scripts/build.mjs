import webpack from "webpack";
import config from "../webpack.config.mjs";

const compiler = webpack(config);
compiler.run((error, stats) => {
  compiler.close((closeError) => {
    if (error || closeError) {
      console.error(error || closeError);
      process.exitCode = 1;
      return;
    }
    console.log(stats.toString({ colors: process.stdout.isTTY, preset: "errors-warnings" }));
    if (stats.hasErrors()) process.exitCode = 1;
  });
});
