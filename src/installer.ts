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

  private static validateHostname(serverAddress: string): boolean | string {
    const isValid = !!serverAddress.match(
      /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/
    );
    return isValid ? isValid : "Please enter a valid hostname.";
  }

  private async queryCoreConfig() {
    const questions: QuestionCollection = [
      {
        type: "input",
        name: "hostname",
        message: "Please enter the hostname dot.base will run on (e.g. demo.dotbase.org): ",
        validate: Installer.validateHostname,
      },
      {
        type: "input",
        name: "test",
        message:
          "Do you want to use dot.base extensions\n to integrate it into your hospital? (Requires)",
      },
    ];
    const answers = await inquirer.prompt(questions);
    console.log(answers);
  }
}

new Installer();
