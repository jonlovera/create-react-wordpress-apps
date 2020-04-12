#!/usr/bin/env node

const os = require("os");
const path = require("path");
const util = require("util");
const fs = require("fs-extra");
const chalk = require("chalk");
const inquirer = require("inquirer");
const commander = require("commander");
const packageJson = require("./package.json");
const runCreateReactApp = () => require("create-react-app");

//
// Installing Wordpress
//
const installWP = ({ projectName, pkg, packagePath }) => {
  console.log();
  console.log(`Creating a new React Wordpress Theme in ${chalk.green(root)}.`);
  console.log();

  Object.keys(pkg.scripts).forEach(name => {
    const script = pkg.scripts[name];
    pkg.scripts[name] = script.replace(
      /react-scripts/g,
      "react-wordpress-scripts"
    );
  });
  pkg.scripts.composer = "react-wordpress-scripts composer";
  pkg.scripts["composer:reset"] = "react-wordpress-scripts composer --reset";
  pkg.scripts.backend = "react-wordpress-scripts backend";
  pkg.scripts["backend:stop"] = "react-wordpress-scripts backend --down";
  pkg.scripts["backend:reset"] = "react-wordpress-scripts backend --reset";
  pkg.scripts.backup = "react-wordpress-scripts backup";
  pkg.devDependencies["react-wordpress-scripts"] = packageJson.version;

  // NOTE for DEV purposes only
  // pkg.devDependencies["react-wordpress-scripts"] = `file:${path.resolve(
  //   __dirname,
  //   "../react-wordpress-scripts"
  // )}`;

  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + os.EOL);

  const wpPath = path.resolve(process.cwd(), ".wp");
  const wpExist = fs.existsSync(wpPath);
  if (!wpExist) fs.copySync(path.join(__dirname, "template/.wp"), wpPath);

  const apiPath = path.resolve(process.cwd(), "api");
  const apiExist = fs.existsSync(apiPath);
  if (!apiExist) {
    fs.copySync(path.join(__dirname, "template/api"), apiPath);
    const styleFile = `/*\n Theme Name: ${projectName} Theme\n Author: Moretape Team\n Author URI: https://www.moretape.com/ \n */`;
    fs.writeFileSync(path.resolve(process.cwd(), "api/style.css"), styleFile);
  }

  console.log("Done.");
};

//
// Intercept create-react-app
//
const stdout = process.stdout;
console.log = text => {
  if (text && typeof text === "string") {
    text = text
      .replace(/create-react-app/g, "create-react-wp-theme")
      .replace(/facebook/g, "moretape");
  }

  if (!text) text = "";
  stdout.write(`${text}\n`);
};

//
// Get project name
//
let projectName;
const program = new commander.Command(packageJson.name)
  .version(packageJson.version)
  .arguments("<project-directory>")
  .usage(`${chalk.green("<project-directory>")} [options]`)
  .action(name => (projectName = name))
  .parse(process.argv);

//
// if there's not project name but it's
// a current wp installation then installWP
//
let root;
if (typeof projectName === "undefined") {
  const packagePath = path.resolve(process.cwd(), "package.json");
  const pkgExist = fs.existsSync(packagePath);

  if (pkgExist) {
    const pkg = require(packagePath);
    const isReact = pkg.dependencies
      ? pkg.dependencies["react-scripts"] ||
        pkg.devDependencies["react-scripts"]
        ? true
        : false
      : false;

    if (isReact) {
      projectName = pkg.name;
      root = path.resolve();

      console.log();
      console.log(
        `Looks like you already have react app on ${chalk.green(projectName)}`
      );
      console.log();
      return inquirer
        .prompt({
          type: "confirm",
          name: "useScript",
          message: `Would you like to install convert this app to a Wordpress Theme?`,
          default: false
        })
        .then(answer => {
          if (!answer.useScript) {
            process.exit(0);
          }

          return installWP({ projectName, root, pkg, packagePath });
        });
    }
  }
}

runCreateReactApp();

// if (projectName) {
//   root = path.resolve(projectName);
//   const appName = path.basename(root);
//   const packagePath = path.join(root, "package.json");
//   const pkg = require(packagePath);
//
//   fs.ensureDirSync(appName);
//   installWP({ projectName, root, pkg, packagePath });
// }
