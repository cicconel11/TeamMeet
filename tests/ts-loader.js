import ts from "typescript";
import { readFile } from "fs/promises";

export async function load(url, context, defaultLoad) {
  if (!url.endsWith(".ts")) {
    return defaultLoad(url, context, defaultLoad);
  }

  const source = await readFile(new URL(url));
  const transpiled = ts.transpileModule(source.toString(), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: url,
  });

  return {
    format: "module",
    source: transpiled.outputText,
  };
}
