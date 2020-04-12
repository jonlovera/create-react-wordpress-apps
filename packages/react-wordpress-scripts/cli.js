#!/usr/bin/env node

const clearConsole = require("react-dev-utils/clearConsole");
const fs = require("fs-extra");
const path = require("path");
const sh = require("shelljs");
const { argv } = require("yargs");
const pkg = require(`${process.cwd()}/package.json`);
const child_process = require("child_process");
const dateFormat = require("dateformat");
const projectName = pkg.name;

clearConsole();

const [action] = argv._;
const p = file => path.join(__dirname, file || "");
const rootPath = process.cwd();

const runDocker = (path, action) => {
  return sh.exec(
    `ROOT_PATH=${rootPath} docker-compose -p ${projectName} -f ${p(
      path
    )}.yml ${action}`
  );
};
const execDocker = action => {
  return sh.exec(`docker-compose -p ${projectName} exec ${action}`);
};

switch (action) {
  case "composer":
    if (argv.reset) {
      runDocker("docker-compose.setup", "down -v");
    } else {
      runDocker("docker-compose.setup", "down");
      runDocker("docker-compose.setup", "up");
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
      runDocker("docker-compose", "down");
      runDocker("docker-compose", "up");
    }
    break;

  case "start":
    sh.exec(`react-scripts start --color=always`);

    break;

  case "build":
    console.log("Creating an optimized production build...");

    const { stdout, stderr, code } = sh.exec(
      `PUBLIC_URL=/wp-content/themes/${projectName}/build react-scripts build --color=always`,
      { silent: true }
    );

    const message = stdout.replace(
      "Creating an optimized production build...\n",
      ""
    );

    const success = code === 0;
    if (success) {
      sh.mkdir("-p", `./build/themes/${projectName}/build/`);
      sh.mv("./build/!(themes)", `./build/themes/${projectName}/build/`);
      sh.cp("-r", "./api/.", `./build/themes/${projectName}`);
      sh.cp("-rf", "./.wp/plugins/", "./build/");

      // .wp theme folder
      // sh.mkdir("-p", `./build/themes/${projectName}/.wp/`);
      // sh.cp("-rf", "./.wp/*.php", "./build/themes/${projectName}/.wp/");

      sh.rm("-rf", `./build/themes/${projectName}/.gitignore`);
      sh.rm("-rf", "./build/**/.git");

      console.log(message);
      // TODO: add done build message
      // customized to create-react-wp-app
      // console.log("✔ Build done.");
    } else {
      console.log(stderr || message);
    }

    break;
}
