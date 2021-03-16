import fs from 'fs';
import clear from "clear";
import chalk from "chalk";
import figlet from "figlet";
import inquirer from "inquirer";
import handlebars from "handlebars";
import cmd from 'node-cmd';
import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator';
import pwgenerate from 'generate-password';
import { stream } from 'winston';

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
      /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\:\-]*[A-Za-z0-9])$/
    );
    return isValid ? isValid : "Please enter a valid hostname.";
  }

  private static validateNotEmpty(input: string): boolean | string {
    if (input) return true;
    return 'This field is required.';
  }

  private static validateAbsolutePath(path: string): boolean | string {
    const isValid = !!path.match(/^\/.*\/?$/);
    return isValid ? isValid : "Please enter a valid absolute path.";
  }

  private static get configQuestions(): inquirer.QuestionCollection {
    return [
      {
        name: "HOSTNAME",
        message:
          "Which hostname will dot.base run on (e.g. demo.dotbase.org)?" +
          chalk.gray("\n  (e.g. dotbase.org // demo.dotbase.org)"),
        type: "input",
        validate: Installer.validateNotEmpty ?? Installer.validateHostname,
      },

      {
        name: "USE_HTTPS",
        message:
          "Do you want to use HTTPS?" +
          chalk.gray("\n  (Requires tls certificate files for your domain.)"),
        type: "confirm",
        default: true,
      },
      {
        name: "TLS_CERT_PATH",
        message:
          "Please enter the path of the tls certificate for your domain." +
          chalk.gray("\n  (e.g. /etc/letsencrypt/live/<HOSTNAME>/cert.pem)"),
        type: "input",
        when: (answers) => answers.USE_HTTPS,
        validate: Installer.validateNotEmpty ?? Installer.validateAbsolutePath,
      },
      {
        name: "TLS_KEY_PATH",
        message:
          "Please enter the location of the private key for this certificate." +
          chalk.gray("\n  (e.g. /etc/letsencrypt/live/<HOSTNAME>/key.pem)"),
        type: "input",
        when: (answers) => answers.USE_HTTPS,
        validate: Installer.validateNotEmpty ?? Installer.validateAbsolutePath,
      },

      {
        name: "USE_CUSTOM_CA",
        message: "Does your organization use a custom certification authority (CA)?",
        type: "confirm",
        default: false,
      },
      {
        name: "CUSTOM_CA_PATH",
        message: "Please enter the path of the file containing the custom CA chain.",
        type: "input",
        when: (answers) => answers.USE_CUSTOM_CA,
        validate: Installer.validateNotEmpty ?? Installer.validateAbsolutePath,
      },

      {
        name: "USE_EXTENSIONS",
        message:
          "Do you want to use dot.base extensions to integrate it into your hospital?" +
          chalk.gray("\n  (Requires an access key to the private dot.base container registry.)"),
        type: "confirm",
        default: false,
      },
      {
        name: "EXTENSIONS_TO_USE",
        message: "Which extension do you want to use?",
        when: (answers) => answers.USE_EXTENSIONS,
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
        name: "GITHUB_ACCESS_TOKEN",
        message:
          "Please enter your personal access token to the GitHub container registry (ghcr.io)." +
          chalk.gray("\n  (Please also verify that you have access to the dot.base organization on GitHub.)"),
        type: "input",
        when: (answers) => answers.USE_EXTENSIONS,
        validate: Installer.validateNotEmpty,
      },

      {
        name: "LDAP_SERVICE_USER_EMAIL",
        message:
          "LDAP Credentials" +
          chalk.gray("\n  (Please use a service user for this.)") +
          "\n  DLAP Username:",
        type: "input",
        when: (answers) => answers.USE_EXTENSIONS && answers.EXTENSIONS_TO_USE.includes('ldapServer'),
        validate: Installer.validateNotEmpty,
      },
      {
        name: "LDAP_SERVICE_USER_PASSWORD",
        message: "DLAP Password:",
        type: "input",
        when: (answers) => answers.USE_EXTENSIONS && answers.EXTENSIONS_TO_USE.includes('ldapServer'),
        validate: Installer.validateNotEmpty,
      },

      {
        name: "USE_SENTRY",
        message:
          "Do you want to use Sentry to monitor the application state?" +
          chalk.gray("\n  You will need an own sentry account for this."),
        type: "confirm",
        default: false,
      },
      {
        name: "SENTRY_ENVIRONMENT",
        message: "Which sentry environment do you want to use?",
        type: "input",
        when: (answers) => answers.USE_SENTRY,
        validate: Installer.validateNotEmpty,
      },
      {
        name: "MEDICAL_DASHBOARD_SENTRY_DSN",
        message:
          "Please enter Sentry DSNs for the following applications to monitor them." +
          chalk.gray("\n  Please see the sentry docs pages on how to create applications and get the DSNs.") +
          "\n Medical Dashboard:",
        type: "input",
        when: (answers) => answers.USE_SENTRY,
        validate: Installer.validateNotEmpty,
      },
      {
        name: "FHIR_SERVER_SENTRY_DSN",
        message: "FHIR Servers:",
        type: "input",
        when: (answers) => answers.USE_SENTRY,
        validate: Installer.validateNotEmpty,
      },
      {
        name: "FILE_STORAGE_API_SENTRY_DSN",
        message: "File Storage Service:",
        type: "input",
        when: (answers) => answers.USE_SENTRY,
        validate: Installer.validateNotEmpty,
      },
      {
        name: "ICD_10_API_SENTRY_DSN",
        message: "ICD 10 API:",
        type: "input",
        when: (answers) => answers.USE_SENTRY,
        validate: Installer.validateNotEmpty,
      },
      {
        name: "COMM_SERVER_ADAPTER_SENTRY_DSN",
        message: "Comm Server Adapter:",
        type: "input",
        when: (answers) => answers.USE_SENTRY && answers.USE_EXTENSIONS && answers.EXTENSIONS_TO_USE.includes('commServerAdapter'),
        validate: Installer.validateNotEmpty,
      },
      {
        name: "HDP_ADAPTER_SENTRY_DSN",
        message: "HDP Adapter:",
        type: "input",
        when: (answers) => answers.USE_SENTRY && answers.USE_EXTENSIONS && answers.EXTENSIONS_TO_USE.includes('hdpAdapter'),
        validate: Installer.validateNotEmpty,
      },
      {
        name: "MEDTRONIC_DBS_API_SENTRY_DSN",
        message: "Medtronic DBS API:",
        type: "input",
        when: (answers) => answers.USE_SENTRY && answers.USE_EXTENSIONS && answers.EXTENSIONS_TO_USE.includes('medtronicDbsApi'),
        validate: Installer.validateNotEmpty,
      },


      {
        name: "CREATE_INSTANCE",
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

  private static async initalize() {
    Installer.introduce();

    const config = await Installer.inquireConfig();
    if (!config.CREATE_INSTANCE) return;

    Installer.fillConfigTemplate('dotbase-realm.json', config);
    Installer.createDockerSecret('dotbase-realm.json', 'deployment/dotbase-realm.json');

    if (config.USE_HTTPS) {
      Installer.createDockerConfig('traefik.toml', 'src/config/traefik.toml');
      Installer.createDockerSecret('cert.pem', config.TLS_CERT_PATH);
      Installer.createDockerSecret('key.pem', config.TLS_KEY_PATH);
    } else {
      Installer.createEmptyDockerConfig('traefik.toml');
      Installer.createEmptyDockerSecret('cert.pem');
      Installer.createEmptyDockerSecret('key.pem');
    }

    if (config.USE_CUSTOM_CA) {
      Installer.createDockerConfig('custom-ca.crt', config.CUSTOM_CA_PATH);
    } else {
      Installer.createEmptyDockerConfig('custom-ca.crt');
    }

    config.AUTH_CLIENT_SECRET = Installer.generatePassword();
    config.SIGNING_SECRET = Installer.generatePassword();

    config.KEYCLOAK_USER = Installer.generateUsername();
    config.KEYCLOAK_PASSWORD = Installer.generatePassword();

    config.KEYCLOAK_DB_USER = Installer.generateUsername();
    config.KEYCLOAK_DB_PASSWORD = Installer.generatePassword();

    config.FHIR_DB_USER = Installer.generateUsername();
    config.FHIR_DB_PASSWORD = Installer.generatePassword();

    Installer.fillConfigTemplate('parameters.yml', config);

    Installer.enableExperimentalDockerFeatures();
    Installer.launchDotBase();
  }

  private static fillConfigTemplate(filename: string, config: inquirer.Answers) {
    const configFileTemplate = fs.readFileSync(`src/config/templates/${filename}`).toString();
    const configFile = handlebars.compile(configFileTemplate);
    
    this.createDirectory('deployment');
    fs.writeFileSync(`deployment/${filename}`, configFile(config));
  }

  private static createDirectory(name: string) {
    if (!fs.existsSync(name)) fs.mkdirSync(name);
  }

  private static createDockerSecret(name: string, file: string) {
    cmd.runSync(`docker secret rm ${name}`);
    cmd.runSync(`docker secret create ${name} ${file}`);
  }

  private static createDockerConfig(name: string, file: string) {
    cmd.runSync(`docker config rm ${name}`);
    cmd.runSync(`docker config create ${name} ${file}`);
  }

  private static createEmptyDockerSecret(name: string) {
    cmd.runSync(`docker secret rm ${name}`);
    cmd.runSync(`echo "" | docker secret create ${name} -`);
  }

  private static createEmptyDockerConfig(name: string) {
    cmd.runSync(`docker config rm ${name}`);
    cmd.runSync(`echo "" | docker config create ${name} -`);
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
      })
  }

  private static enableExperimentalDockerFeatures() {
    cmd.runSync('export DOCKER_CLI_EXPERIMENTAL=enabled');
  }

  private static launchDotBase() {
    const output = cmd.runSync(`docker app run --parameters-file deployment/parameters.yml ghcr.io/dot-base/dot-base:latest`);
    console.log(output);
  }

  constructor() {
    Installer.initalize();
  }
}

new Installer();
