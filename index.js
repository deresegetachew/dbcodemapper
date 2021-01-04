const { promises: fs } = require("fs");

const path = require("path");

let tableNames = [];
// let files = [];
let dumpFilePath = "./dump.json";

const codeDirectory =
  "/home/dev/Documents/projects/work/ElnetTech/demo/backend/";
const directoriesToIgnore = [
  "bin",
  "config",
  "public",
  "resources",
  "uploads",
  "views",
  "documentation",
  "node_modules",
  ".git",
];

const filesToIgnore = /(.*.json)|(.*.html)|(.*lock)|(.*gitignore)/;
async function getCodeFiles(path = codeDirectory) {
  const entries = await fs.readdir(path, { withFileTypes: true });

  // Get files within the current directory and add a path key to the file objects
  let files = entries
    .filter((file) => !file.isDirectory())
    .filter((file) => !filesToIgnore.test(file.name))
    .map((file) => ({ ...file, path: path + file.name }));

  // Get folders within the current directory
  const folders = entries
    .filter((folder) => folder.isDirectory())
    .filter((folder) => !directoriesToIgnore.includes(folder.name));

  /*
    Add the found files within the subdirectory to the files array by calling the
    current function itself
*/
  // console.log(path, folders);
  for (const folder of folders)
    files.push(...(await getCodeFiles(`${path}${folder.name}/`)));

  return files;
}

const db = require("knex")({
  client: "mysql",
  connection: {
    host: "localhost",
    user: "root",
    password: "rootpassword",
    database: "taxiye_one_db",
  },
});

const init = async () => {
  const files = await getCodeFiles();
  console.log(JSON.stringify(files, null, 4));

  let data = await db.schema.raw(
    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_SCHEMA='taxiye_one_db' "
  );
  if (data) {
    JSON.parse(JSON.stringify(data))[0].map(async (t) => {
      tableNames.push(t["TABLE_NAME"].toString().split("$")[1]);
    });
    await createTableStats(files);
    db.destroy();
    console.log("bye");
  } else {
    db.destroy();
    console.log("bye");
  }
};

const createTableStats = async (files) => {
  let tableStats = [];
  for (let index = 0; index < tableNames.length; index++) {
    const tableName = tableNames[index];

    console.log(
      `${(
        ((index * files.length) / (tableNames.length * files.length)) *
        100
      ).toFixed(2)} %`
    );

    const currentTableStat = { tableName, files: [], count: 0 };

    for (let j = 0; j < files.length; j++) {
      const file = files[j];

      let fileContent = await fs.readFile(file.path, "utf8");

      if (fileContent.search(new RegExp(tableName, "m")) > -1) {
        currentTableStat.files.push(file.path);
        currentTableStat.count += 1;
      }
    }

    tableStats.push(currentTableStat);

    // else console.log("error reading file " + file.path);
  }

  await fs.open(dumpFilePath, "w+");
  await fs.appendFile(dumpFilePath, JSON.stringify(tableStats, null, 4));

  // console.log("===== TABLE STATS ======");
  console.log(tableStats);
};

init();
