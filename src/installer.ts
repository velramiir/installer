import fs from "fs";
import clear from "clear";
import chalk from "chalk";
import figlet from "figlet";
import inquirerModule from "inquirer";
import handlebars from "handlebars";
import { uniqueNamesGenerator, adjectives, colors, animals } from "unique-names-generator";
import pwgenerate from "generate-password";
import { exec } from "child_process";

import Inquirer from "./Inquirer";

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
    console.log("and we will have you up and running in no time.");
    console.log();
  }

  private static async initalize() {
    Installer.introduce();

    const config = await Inquirer.inquireConfig();
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

    config.AUTH_CLIENT_SECRET = Installer.generateOidcClientSecret();
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

  private static fillConfigTemplate(filename: string, config: inquirerModule.Answers) {
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

  private static generateOidcClientSecret(): string {
    return pwgenerate.generate({
      length: 32,
      strict: true,
      numbers: true,
    });
  }

  private static async launchDotBase() {
    await Installer.exec(
      `docker app run --parameters-file deployment/parameters.yml --name dot-base ghcr.io/dot-base/dot-base:latest`
    );
  }

  constructor() {
    Installer.initalize();
  }
}

new Installer();
