import fs from "fs";
import chalk from "chalk";
import inquirerModule from "inquirer";

export default class Inquirer {
    private static validateNotEmpty(input: string): boolean | string {
        if (input) return true;
        return "This field is required.";
      }
    
      private static validateHostname(serverAddress: string): boolean | string {
        const isNotEmpty = Inquirer.validateNotEmpty(serverAddress);
        if (isNotEmpty !== true) return isNotEmpty;
    
        const isValid = !!serverAddress.match(
          /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\:\-]*[A-Za-z0-9])$/
        );
        return isValid ? true : "Please enter a valid hostname.";
      }
    
      private static validateAbsolutePath(path: string): boolean | string {
        try {
          const isNotEmpty = Inquirer.validateNotEmpty(path);
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
    
      private static get configQuestions(): inquirerModule.QuestionCollection {
        return [
          {
            name: "HOSTNAME",
            prefix: chalk.green("\n?"),
            message:
              "Which hostname will dot.base run on?" +
              chalk.gray("\n! e.g. dotbase.org or demo.dotbase.org"),
            suffix: chalk.green("\n>"),
            type: "input",
            validate: Inquirer.validateHostname,
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
            validate: Inquirer.validateAbsolutePath,
          },
          {
            name: "TLS_KEY_PATH",
            prefix: chalk.green("\n?"),
            message:
              "Please enter the location of the private key for this certificate." +
              chalk.gray("\n! e.g. /etc/letsencrypt/live/<HOSTNAME>/key.pem"),
            suffix: chalk.green("\n>"),
            type: "input",
            validate: Inquirer.validateAbsolutePath,
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
            validate: Inquirer.validateAbsolutePath,
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
            validate: Inquirer.validateNotEmpty,
          },
          {
            name: "LDAP_SERVICE_USER_PASSWORD",
            prefix: chalk.green("\n?"),
            message: "DLAP Password:",
            suffix: chalk.green("\n>"),
            type: "input",
            when: (answers) =>
              answers.USE_EXTENSIONS && answers.EXTENSIONS_TO_USE.includes("ldapServer"),
            validate: Inquirer.validateNotEmpty,
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
            validate: Inquirer.validateNotEmpty,
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
            validate: Inquirer.validateNotEmpty,
          },
          {
            name: "FHIR_SERVER_SENTRY_DSN",
            prefix: chalk.green("\n?"),
            message: "FHIR Servers:",
            suffix: chalk.green("\n>"),
            type: "input",
            when: (answers) => answers.USE_SENTRY,
            validate: Inquirer.validateNotEmpty,
          },
          {
            name: "FILE_STORAGE_API_SENTRY_DSN",
            prefix: chalk.green("\n?"),
            message: "File Storage Service:",
            suffix: chalk.green("\n>"),
            type: "input",
            when: (answers) => answers.USE_SENTRY,
            validate: Inquirer.validateNotEmpty,
          },
          {
            name: "ICD_10_API_SENTRY_DSN",
            prefix: chalk.green("\n?"),
            message: "ICD 10 API:",
            suffix: chalk.green("\n>"),
            type: "input",
            when: (answers) => answers.USE_SENTRY,
            validate: Inquirer.validateNotEmpty,
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
    
      public static async inquireConfig(): Promise<inquirerModule.Answers> {
        return inquirerModule.prompt(Inquirer.configQuestions);
      }
}