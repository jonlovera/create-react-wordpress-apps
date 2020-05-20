#!/usr/bin/env node

const clearConsole = require("react-dev-utils/clearConsole");
const fs = require("fs-extra");
const path = require("path");
const sh = require("shelljs");
const { argv } = require("yargs");
const pkg = require(`${process.cwd()}/package.json`);
const child_process = require("child_process");
const dateFormat = require("dateformat");
const chalk = require("chalk");
const onExit = require("./src/onExit");
const projectName = pkg.name;

clearConsole();

const [action] = argv._;
let parameters = "";
Object.keys(argv).map(name => {
  if (["$0", "_"].includes(name)) return;
  const value = argv[name];
  const valueString = typeof value !== "string" ? `=${value}` : "";
  parameters += ` --${name}${valueString}`;
});

const p = file => path.join(__dirname, file || "");
const rootPath = process.cwd();

const runDocker = (path, action, options = {}) => {
  const debug = process.env.DEBUG || argv.debug;
  const debugOptions = debug ? " DEBUG=json-file" : " DEBUG=none";
  const child = sh.exec(
    `cross-env ROOT_PATH=${rootPath}${debugOptions} docker-compose -p ${projectName} -f ${p(
      path
    )}.yml ${action}`,
    options
  );

  if (options.async) {
    child.on("error", process.stdout.write);
    child.on("exit", process.exit);

    child.stdout.on("data", data => {
      let output = data;
      if (data.includes("composer_1  |")) {
        output = output.replace(/composer_1  /g, "");
      }
      if (data.includes("wp_1   |") && !debug) {
        output = output.replace(/wp_1   /g, "");
      }

      // const messageDebugOff =
      //   " WARNING: no logs are available with the 'none' log driver";
      // if (data.includes("db_1   |") && data.includes(messageDebugOff)) {
      //   output = output
      //     .replace(/db_1   |/g, "")
      //     .replace(/|/g, "")
      //     .replace(messageDebugOff, "");
      // }
      // if (data.includes("pma_1  |") && data.includes(messageDebugOff)) {
      //   output = output
      //     .replace(/pma_1  |/g, "")
      //     .replace(/|/g, "")
      //     .replace(messageDebugOff, "");
      // }

      process.stdout.write(output);
    });
  }

  return child;
};
const execDocker = action => {
  return sh.exec(`docker-compose -p ${projectName} exec ${action}`);
};

switch (action) {
  case "composer":
    if (argv.reset) {
      runDocker("docker-compose.setup", "down -v");
    } else {
      onExit(() => runDocker("docker-compose.setup", "stop"));
      runDocker("docker-compose.setup", "stop");
      runDocker("docker-compose.setup", "up", { async: true, silent: true });
    }
    break;

  case "backup":
    const date = dateFormat(new Date(), "yyyy_mm_dd");
    const file = path.join(process.cwd(), `/.wp/backups/database.sql`);
    const command = 'exec mysqldump "wp" -uroot -p"password"';
    console.log("Backing up database...");

    process.env.ROOT_PATH = rootPath;
    const child = child_process.spawn(
      `docker-compose`,
      ["-p", projectName, "exec", "db", "sh", "-c", command],
      {
        stdio: ["inherit", "pipe", "pipe"],
        cwd: p()
      }
    );

    const error = [];
    const output = [];

    child.stdout.on("data", d => {
      const text = d
        .toString()
        .replace(
          "mysqldump: [Warning] Using a password on the command line interface can be insecure.\r\n",
          ""
        );

      output.push(text);
    });

    child.stderr.on("data", d => {
      error.push(d.toString());
    });

    child.stdout.on("end", async () => {
      if (error.length) {
        return console.log(error.join(""));
      }

      await fs.outputFile(file, output.join(""));

      console.log("✔ Database backup has been done.");
    });
    break;

  case "backend":
    if (argv.stop) {
      runDocker("docker-compose", "stop");
    } else if (argv.down) {
      runDocker("docker-compose", "down");
    } else if (argv.reset) {
      runDocker("docker-compose", "down -v");
    } else {
      onExit(() =>
        runDocker("docker-compose", "stop", { async: false, silent: false })
      );
      runDocker("docker-compose", "stop");
      runDocker("docker-compose", "up", { async: true, silent: true });
    }
    break;

  case "start":
    const configOverrides = p("config-overrides");
    // console.log("configOverrides", configOverrides);
    sh.exec(
      `react-app-rewired start --color=always --config-overrides ${configOverrides} ${parameters}`
    );

    break;

  case "build":
    (async function() {
      const { stdout, stderr, code } = await sh.exec(
        `cross-env PUBLIC_URL=/wp-content/themes/${projectName}/build react-scripts build --color=always ${parameters}`,
        { silent: false }
      );

      const success = code === 0;
      if (success) {
        console.log("Preparing wordpress files...");
        console.log("");

        sh.mkdir("-p", `./build/themes/${projectName}/build/`);
        sh.mv("./build/!(themes)", `./build/themes/${projectName}/build/`);
        sh.cp("-r", "./api/.", `./build/themes/${projectName}`);
        sh.cp("-rf", "./.wp/plugins/", "./build/");
        sh.cp("-rf", "./.wp/themes/", "./build/");

        // .wp theme folder
        // sh.mkdir("-p", `./build/themes/${projectName}/.wp/`);
        // sh.cp("-rf", "./.wp/*.php", "./build/themes/${projectName}/.wp/");

        sh.rm("-rf", `./build/themes/${projectName}/.gitignore`);
        sh.rm("-rf", "./build/**/.git");

        // TODO: add done build message customized to react-wordpress-scripts
        console.log("=============");
        console.log(chalk.green("✔ Build completed successfully."));
        console.log("");
        process.exit(0);
      }

      process.exit(1);
    })();

    break;
}
