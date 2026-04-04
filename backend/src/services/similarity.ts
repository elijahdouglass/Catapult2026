import { spawn } from "child_process";
import path from "path";

const PYTHON = path.resolve(__dirname, "../../../.venv/bin/python3");
const SCRIPT = path.resolve(__dirname, "../../../test/word_sim_test.py");

export function computeTagVector(tags: string[]): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const proc = spawn(PYTHON, [SCRIPT, JSON.stringify(tags)]);
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    proc.on("error", (err) => {
      reject(new Error(`Failed to spawn vector process: ${err.message}`));
    });
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Vector computation failed (code ${code}): ${stderr}`));
      } else {
        const floats = JSON.parse(stdout.trim()) as number[];
        const buffer = new ArrayBuffer(floats.length * 4);
        const view = new DataView(buffer);
        floats.forEach((v, i) => view.setFloat32(i * 4, v, true));
        resolve(new Uint8Array(buffer));
      }
    });
  });
}

export function cosineSimilarity(a: Uint8Array, b: Uint8Array): number {
  const viewA = new DataView(a.buffer, a.byteOffset, a.byteLength);
  const viewB = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const len = a.byteLength / 4;
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < len; i++) {
    const va = viewA.getFloat32(i * 4, true);
    const vb = viewB.getFloat32(i * 4, true);
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}
