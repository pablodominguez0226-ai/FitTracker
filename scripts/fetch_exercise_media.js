#!/usr/bin/env node
/**
 * Wrapper Node.js para ejecutar la sincronización de assets multimedia 3D anatómicos.
 * Permite ejecutar indistintamente `python3 scripts/fetch_exercise_media.py` o `node scripts/fetch_exercise_media.js`.
 */
const { execFileSync } = require("child_process");
const path = require("path");

const pyScript = path.join(__dirname, "fetch_exercise_media.py");
execFileSync("python3", [pyScript], { stdio: "inherit" });
