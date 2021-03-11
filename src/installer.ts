import fs from 'fs';
import clear from "clear";
import chalk from "chalk";
import figlet from "figlet";
import inquirer from "inquirer";
import handlebars from "handlebars";
import cmd from 'node-cmd';

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

  private static validateHostname(serverAddress: string): boolean | string {
    const isValid = !!serverAddress.match(
      /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/
    );
    return isValid ? isValid : "Please enter a valid hostname.";
  }

  private static get configQuestions(): inquirer.QuestionCollection {
    return [
      {
        name: "hostname",
        message:
          "Which hostname will dot.base run on (e.g. demo.dotbase.org)?" +
          chalk.gray("\n  (e.g. dotbase.org // demo.dotbase.org)"),
        type: "input",
        validate: Installer.validateHostname,
      },

      {
        name: "useExtensions",
        message:
          "Do you want to use dot.base extensions to integrate it into your hospital?" +
          chalk.gray("\n  (Requires an access key to the private dot.base container registry.)"),
        type: "confirm",
        default: false,
      },
      {
        name: "extensionsToUse",
        message: "Which extension do you want to use?",
        when: (answers) => answers.useExtensions === true,
        type: "checkbox",
        choices: [
          {
            name: "Health Data Platform",
            value: "hdpAdapter",
          },
          {
            name: "Medtronic - Deep Brain Stimulation",
            value: "medtronicDbsApi",
          },
          {
            name: "Comm Server (ish. med)",
            value: "commServerAdapter",
          },
          {
            name: "LDAP Server",
            value: "ldapServer",
          },
        ],
      },
      {
        name: "githubAccessToken",
        message:
          "Please enter your personal access token to the GitHub container registry (ghcr.io)." +
          chalk.gray("\n  (Please also verify that you have access to the dot.base organization on GitHub.)"),
        type: "input",
        when: (answers) => answers.useExtensions === true,
      },

      {
        name: "useSentry",
        message:
          "Do you want to use Sentry to monitor the application state?" +
          chalk.gray("\n  You will need an own sentry account for this."),
        type: "confirm",
        default: false,
      },
      {
        name: "sentryEnvironment",
        message: "Which sentry environment do you want to use?",
        type: "input",
        when: (answers) => answers.useSentry === true,
      },
      {
        name: "sentryDsnMedicalDashboard",
        message:
          "Please enter Sentry DSNs for the following applications to monitor them." +
          chalk.gray("\n  Please see the sentry docs pages on how to create applications and get the DSNs.") +
          "Medical Dashboard:",
        type: "input",
        when: (answers) => answers.useSentry === true,
      },
      {
        name: "sentryDsnFhirServer",
        message: "FHIR Servers:",
        type: "input",
        when: (answers) => answers.useSentry === true,
      },
      {
        name: "sentryDsnFileStorageApi",
        message: "File Storage Service:",
        type: "input",
        when: (answers) => answers.useSentry === true,
      },
      {
        name: "sentryDsnIcdApi",
        message: "ICD 10 API:",
        type: "input",
        when: (answers) => answers.useSentry === true,
      },
      {
        name: "sentryDsnCommServerAdapter",
        message: "Comm Server Adapter:",
        type: "input",
        when: (answers) => answers.useSentry === true && answers.extensionsToUse.includes('commServerAdapter'),
      },
      {
        name: "sentryDsnHdpAdapter",
        message: "HDP Adapter:",
        type: "input",
        when: (answers) => answers.useSentry === true && answers.extensionsToUse.includes('hdpAdapter'),
      },
      {
        name: "sentryDsnMedtronicDbsApi",
        message: "Medtronic DBS API:",
        type: "input",
        when: (answers) => answers.useSentry === true && answers.extensionsToUse.includes('medtronicDbsApi'),
      },


      {
        name: "createInstance",
        message:
          "Do you want to create a dot.base instance with this configuration?" +
          chalk.gray("\n  Please double check the information above."),
        type: "confirm",
        default: true,
      },
    ];
  }

  private static async inquireConfig(): Promise<inquirer.Answers> {
    return inquirer.prompt(Installer.configQuestions);
  }

  private static registerServices(type: string): void {
    const serviceDirectory = `src/stack/services/${type}`
    const serviceFileNames = fs.readdirSync(serviceDirectory);

    for (const serviceFileName of serviceFileNames) {
      const serviceTemplate = fs.readFileSync(`${serviceDirectory}/${serviceFileName}`).toString();
      const partialName = serviceFileName.replace(".yml", "");
      handlebars.registerPartial(partialName, serviceTemplate);
    }
  }

  private static registerNetworks(): void {
    const networksTemplate = fs.readFileSync('src/stack/networks.yml').toString();
    handlebars.registerPartial('networks', networksTemplate);
  }

  private static registerVolumes(): void {
    const volumesTemplate = fs.readFileSync('src/stack/volumes.yml').toString();
    handlebars.registerPartial('volumes', volumesTemplate);
  }

  private static createDirectory(name: string) {
    if (!fs.existsSync(name)) fs.mkdirSync(name);
  }

  private static createDockerStackFile(config: inquirer.Answers): void {
    Installer.registerServices('core');
    Installer.registerServices('extensions');
    Installer.registerNetworks();
    Installer.registerVolumes();
    const stackTemplate = fs.readFileSync('src/stack/stack.yml').toString();
    const stack = handlebars.compile(stackTemplate);
    
    const stackContext: any = {};
    if (config.useExtensions) {
      stackContext.hdpAdapter = config.extensionsToUse.includes('hdpAdapter');
      stackContext.commServerAdapter = config.extensionsToUse.includes('commServerAdapter');
      stackContext.medtronicDbsApi = config.extensionsToUse.includes('medtronicDbsApi');
    }
    
    this.createDirectory('deployment');
    fs.writeFileSync('deployment/dotbase-stack.yml', stack(stackContext));
  }

  constructor() {
    this.initalize();
  }

  private async initalize() {
    Installer.introduce();

    const config = await Installer.inquireConfig();
    if (!config.createInstance) return;

    Installer.createDockerStackFile(config);
  }
}

new Installer();
