import chalk from "chalk";

const log = console.log;

export default {
  log,
  chalk,
  info: (msg) => log(chalk.green(`<INFO> ${msg}`)),
  warning: (msg) => log(chalk.yellow(`<WARN> ${msg}`)),
  error: (msg) => log(chalk.red(`<ERROR> ${msg}`)),
};
