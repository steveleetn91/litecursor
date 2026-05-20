import chalk from "chalk";
import figlet from "figlet";
import gradient from "gradient-string";

export function drawHeader() {
  console.clear();

  const title = figlet.textSync("LiteCursor", {
    horizontalLayout: "default",
    verticalLayout: "default"
  });

  console.log(gradient.pastel.multiline(title));
  console.log(chalk.gray("AI Coding Assistant CLI"));
  console.log(chalk.gray("Type /clear to clear history, /exit to quit"));
  console.log(chalk.gray("────────────────────────────────────────────\n"));
}

export function userLine(text) {
  console.log(chalk.cyan.bold("\nYou: ") + chalk.white(text));
}

export function assistantLine(text) {
  console.log(chalk.green.bold("\nLiteCursor:\n") + chalk.white(text));
}

export function info(text) {
  console.log(chalk.blue("ℹ ") + chalk.gray(text));
}

export function error(text) {
  console.log(chalk.red("✖ ") + chalk.white(text));
}

export function divider() {
  console.log(chalk.gray("\n────────────────────────────────────────────\n"));
}