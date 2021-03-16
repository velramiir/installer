import fs from "fs";
import clear from "clear";
import chalk from "chalk";
import figlet from "figlet";
import inquirer from "inquirer";
import handlebars from "handlebars";
import { uniqueNamesGenerator, adjectives, colors, animals } from "unique-names-generator";
import pwgenerate from "generate-password";
import { exec } from "child_process";

class Installer {
  private static async exec(command: string): Promise<string> {
    return new Promise(function (resolve, reject) {
      exec(command, function (err, stdout) {
        if (err !== null) reject(err);
        else resolve(stdout);
      });
    });
  }

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

  private static validateNotEmpty(input: string): boolean | string {
    if (input) return true;
    return "This field is required.";
  }

  private static validateHostname(serverAddress: string): boolean | string {
    const isNotEmpty = Installer.validateNotEmpty(serverAddress);
    if (isNotEmpty !== true) return isNotEmpty;

    const isValid = !!serverAddress.match(
      /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\:\-]*[A-Za-z0-9])$/
    );
    return isValid ? true : "Please enter a valid hostname.";
  }

  private static validateAbsolutePath(path: string): boolean | string {
    try {
      const isNotEmpty = Installer.validateNotEmpty(path);
      if (isNotEmpty !== true) return isNotEmpty;

      const isAbsolutePath = !!path.match(/^\/.*\/?$/);
      if (!isAbsolutePath) throw new Error();
      
      const fileExists = fs.lstatSync(path).isFile();
      if (!fileExists) throw new Error();

      return true;
    } catch {
      return "Please enter a valid absolute path.";
    }
  }

  private static get configQuestions(): inquirer.QuestionCollection {
    return [
      {
        name: "HOSTNAME",
        prefix: chalk.green("\n?"),
        message:
          "Which hostname will dot.base run on?" +
          chalk.gray("\n! e.g. dotbase.org or demo.dotbase.org"),
        suffix: chalk.green("\n>"),
        type: "input",
        validate: Installer.validateHostname,
      },

      {
        name: "TLS_CERT_PATH",
        prefix: chalk.green("\n==="),
        message:
          "HTTPS Configuration" +
          chalk.green(" ===") +
          chalk.green("\n\n? ") +
          "Please enter the path of the tls certificate for your domain." +
          chalk.gray("\n! e.g. /etc/letsencrypt/live/<HOSTNAME>/cert.pem"),
        suffix: chalk.green("\n>"),
        type: "input",
        validate: Installer.validateAbsolutePath,
      },
      {
        name: "TLS_KEY_PATH",
        prefix: chalk.green("\n?"),
        message:
          "Please enter the location of the private key for this certificate." +
          chalk.gray("\n! e.g. /etc/letsencrypt/live/<HOSTNAME>/key.pem"),
        suffix: chalk.green("\n>"),
        type: "input",
        validate: Installer.validateAbsolutePath,
      },

      {
        name: "USE_CUSTOM_CA",
        prefix: chalk.green("\n?"),
        message: "Does your organization use a custom certification authority (CA)?",
        suffix: chalk.green("\n>"),
        type: "confirm",
        default: false,
      },
      {
        name: "CUSTOM_CA_PATH",
        prefix: chalk.green("\n?"),
        message: "Please enter the path of the file containing the custom CA chain.",
        suffix: chalk.green("\n>"),
        type: "input",
        when: (answers) => answers.USE_CUSTOM_CA,
        validate: Installer.validateAbsolutePath,
      },

      {
        name: "USE_EXTENSIONS",
        prefix: chalk.green("\n?"),
        message:
          "Do you want to use dot.base extensions to integrate it into your hospital?" +
          chalk.gray("\n! Requires an access key to the private dot.base container registry."),
        suffix: chalk.green("\n>"),
        type: "confirm",
        default: false,
      },
      {
        name: "EXTENSIONS_TO_USE",
        prefix: chalk.green("\n?"),
        message: "Which extension do you want to use?",
        suffix: chalk.green("\n>"),
        when: (answers) => answers.USE_EXTENSIONS,
        type: "checkbox",
        choices: [
          {
            name: "LDAP Single Sign-on",
            value: "ldapServer",
          },
        ],
      },

      {
        name: "LDAP_SERVICE_USER_EMAIL",
        prefix: chalk.green("\n==="),
        message:
          "LDAP Connection" +
          chalk.green(" ===") +
          chalk.gray("\n! Please use a service user for this.") +
          chalk.green("\n\n? ") +
          "DLAP Username:",
        suffix: chalk.green("\n>"),
        type: "input",
        when: (answers) =>
          answers.USE_EXTENSIONS && answers.EXTENSIONS_TO_USE.includes("ldapServer"),
        validate: Installer.validateNotEmpty,
      },
      {
        name: "LDAP_SERVICE_USER_PASSWORD",
        prefix: chalk.green("\n?"),
        message: "DLAP Password:",
        suffix: chalk.green("\n>"),
        type: "input",
        when: (answers) =>
          answers.USE_EXTENSIONS && answers.EXTENSIONS_TO_USE.includes("ldapServer"),
        validate: Installer.validateNotEmpty,
      },

      {
        name: "USE_SENTRY",
        prefix: chalk.green("\n?"),
        message:
          "Do you want to use Sentry to monitor the application state?" +
          chalk.gray("\n! You will need an own sentry account for this."),
        suffix: chalk.green("\n>"),
        type: "confirm",
        default: false,
      },
      {
        name: "SENTRY_ENVIRONMENT",
        prefix: chalk.green("\n?"),
        message: "Which sentry environment do you want to use?",
        suffix: chalk.green("\n>"),
        type: "input",
        when: (answers) => answers.USE_SENTRY,
        validate: Installer.validateNotEmpty,
      },
      {
        name: "MEDICAL_DASHBOARD_SENTRY_DSN",
        prefix: chalk.green("\n==="),
        message:
          "Sentry DSNs" +
          chalk.green(" ===") +
          chalk.gray(
            "\n! Please enter Sentry DSNs for the following applications to monitor them."
          ) +
          chalk.gray(
            "\n! Please see the sentry docs pages on how to create applications and get the DSNs."
          ) +
          chalk.green("\n\n? ") +
          "Medical Dashboard:",
        suffix: chalk.green("\n>"),
        type: "input",
        when: (answers) => answers.USE_SENTRY,
        validate: Installer.validateNotEmpty,
      },
      {
        name: "FHIR_SERVER_SENTRY_DSN",
        prefix: chalk.green("\n?"),
        message: "FHIR Servers:",
        suffix: chalk.green("\n>"),
        type: "input",
        when: (answers) => answers.USE_SENTRY,
        validate: Installer.validateNotEmpty,
      },
      {
        name: "FILE_STORAGE_API_SENTRY_DSN",
        prefix: chalk.green("\n?"),
        message: "File Storage Service:",
        suffix: chalk.green("\n>"),
        type: "input",
        when: (answers) => answers.USE_SENTRY,
        validate: Installer.validateNotEmpty,
      },
      {
        name: "ICD_10_API_SENTRY_DSN",
        prefix: chalk.green("\n?"),
        message: "ICD 10 API:",
        suffix: chalk.green("\n>"),
        type: "input",
        when: (answers) => answers.USE_SENTRY,
        validate: Installer.validateNotEmpty,
      },

      {
        name: "CREATE_INSTANCE",
        prefix: chalk.green("\n?"),
        message:
          "Do you want to create a dot.base instance with this configuration?" +
          chalk.gray("\n! Please double check the information above."),
        suffix: chalk.green("\n>"),
        type: "confirm",
        default: true,
      },
    ];
  }

  private static async inquireConfig(): Promise<inquirer.Answers> {
    return inquirer.prompt(Installer.configQuestions);
  }

  private static async initalize() {
    Installer.introduce();

    const config = await Installer.inquireConfig();
    if (!config.CREATE_INSTANCE) return;

    try {
      Installer.fillConfigTemplate("dotbase-realm.json", config);
      await Installer.createDockerSecret("dotbase-realm.json", "deployment/dotbase-realm.json");

      
      await Installer.createDockerConfig("traefik.toml", "config/traefik.toml");
      await Installer.createDockerSecret("cert.pem", config.TLS_CERT_PATH);
      await Installer.createDockerSecret("key.pem", config.TLS_KEY_PATH);

      if (config.USE_CUSTOM_CA) {
        await Installer.createDockerConfig("custom-ca.crt", config.CUSTOM_CA_PATH);
      } else {
        await Installer.createEmptyDockerConfig("custom-ca.crt");
      }
    } catch (e) {
      console.log(
        chalk.red(
          "Could not create dot.base instance because there are existing dot.base configuration files." +
            "\nAt this time we do not support the installation of multiple dot.base instances on one machine." +
            "\nPlease reach out to our support team at movebase@charite.de to setup more sophisticated systems."
        )
      );
      return;
    }

    config.AUTH_CLIENT_SECRET = Installer.generatePassword();
    config.SIGNING_SECRET = Installer.generatePassword();

    config.KEYCLOAK_USER = Installer.generateUsername();
    config.KEYCLOAK_PASSWORD = Installer.generatePassword();

    config.KEYCLOAK_DB_USER = Installer.generateUsername();
    config.KEYCLOAK_DB_PASSWORD = Installer.generatePassword();

    config.FHIR_DB_USER = Installer.generateUsername();
    config.FHIR_DB_PASSWORD = Installer.generatePassword();

    Installer.fillConfigTemplate("parameters.yml", config);

    await Installer.launchDotBase();
  }

  private static fillConfigTemplate(filename: string, config: inquirer.Answers) {
    const configFileTemplate = fs.readFileSync(`config/templates/${filename}`).toString();
    const configFile = handlebars.compile(configFileTemplate);

    this.createDirectory("deployment");
    fs.writeFileSync(`deployment/${filename}`, configFile(config));
  }

  private static createDirectory(name: string) {
    if (!fs.existsSync(name)) fs.mkdirSync(name);
  }

  private static async createDockerSecret(name: string, file: string) {
    await Installer.exec(`docker secret create ${name} ${file}`);
  }

  private static async createDockerConfig(name: string, file: string) {
    await Installer.exec(`docker config create ${name} ${file}`);
  }

  private static async createEmptyDockerConfig(name: string) {
    await Installer.exec(`echo "" | docker config create ${name} -`);
  }

  private static generateUsername(): string {
    return uniqueNamesGenerator({
      dictionaries: [adjectives, colors, animals],
    });
  }

  private static generatePassword(): string {
    return pwgenerate.generate({
      length: Math.floor(Math.random() * 5) + 50,
      strict: true,
      numbers: true,
    });
  }

  private static async launchDotBase() {
    await Installer.exec(
      `export DOCKER_CLI_EXPERIMENTAL=enabled && docker app run --parameters-file deployment/parameters.yml ghcr.io/dot-base/dot-base:latest`
    );
  }

  constructor() {
    Installer.initalize();
  }
}

new Installer();
