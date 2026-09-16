import { execFileSync } from "node:child_process";
import path from "node:path";

// Testing.md §5: e2e tests run against a real backend with a
// reset-per-run test database — reseed to the known Rocket Squad/alice/
// bob/carol fixture before the suite starts, same shape pytest's fixtures use.
export default function globalSetup() {
  const backendDir = path.resolve(__dirname, "../../backend");
  execFileSync(path.join(backendDir, ".venv/Scripts/python.exe"), ["seed.py"], {
    cwd: backendDir,
    stdio: "inherit",
  });
}
