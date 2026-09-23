import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Testing.md §5: e2e tests run against a real backend with a
// reset-per-run test database — reseed to the known Rocket Squad/alice/
// bob/carol fixture before the suite starts, same shape pytest's fixtures use.
const dirname = path.dirname(fileURLToPath(import.meta.url));

export default function globalSetup() {
  const backendDir = path.resolve(dirname, "../../backend");
  execFileSync(path.join(backendDir, ".venv/Scripts/python.exe"), ["seed.py"], {
    cwd: backendDir,
    stdio: "inherit",
  });
}
