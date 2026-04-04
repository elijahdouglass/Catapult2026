import { spawn } from "child_process";
import path from "path";

const PYTHON = path.resolve(__dirname, "../../../.venv/bin/python3");
const SCRIPT = path.resolve(__dirname, "../../../test/tesseract_test.py");

export function extractTags(imagePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(PYTHON, [SCRIPT, imagePath]);
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    proc.on("error", (err) => {
      reject(new Error(`Failed to spawn OCR process: ${err.message}`));
    });
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`OCR failed (code ${code}): ${stderr}`));
      } else {
        resolve(stdout.trim());
      }
    });
  });
}
