import clear from "clear";
import chalk from "chalk";
import figlet from "figlet";
import inquirer, { QuestionCollection } from "inquirer";

class Installer {
  private static introduce(): void {
    clear();

    Installer.printLogo();
    Installer.printWelcome();
  }

  private static printLogo(): void {
    const divider = "-------------------------------------------";
    const coloredDivider = chalk.hex("#ee6b3b")(divider);
    const logo = figlet.textSync("dot.base");
    const coloredLogo = chalk.hex("#ee6b3b")(logo);

    console.log(coloredDivider);
    console.log(coloredLogo);
    console.log(coloredDivider);
  }

  private static printWelcome(): void {
    console.log();
    console.log("Welcome to the dot.base installer! This tool will walk you through");
    console.log("the installation and configuration of dot.base. Just follow the steps");
    console.log("and we got you up and running in no time.");
    console.log();
  }

  constructor() {
    this.initalize();
  }

  private async initalize() {
    Installer.introduce();
    await this.queryCoreConfig();
  }

  private static validateServerAddress(input: string): boolean {
    return !!input.match(
      /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/
    );
  }

  private async queryCoreConfig() {
    const questions: QuestionCollection = [
      {
        type: "input",
        name: "serverAddress",
        message: "Please enter the server address dot.base will run on (e.g. demo.dotbase.org): ",
        validate: Installer.validateServerAddress,
      },
      {
        type: "input",
        name: "test",
        message: "Do you want to use extensions: ",
      },
    ];
    const answers = await inquirer.prompt(questions);
    console.log(answers);
  }
}

new Installer();
