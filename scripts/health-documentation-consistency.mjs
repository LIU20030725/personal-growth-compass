import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const read = (path) => readFileSync(path, "utf8");

test("V1 health backup documentation matches the shipped replacement flow", () => {
  const documents = [
    read("docs/健康模块/01-PRD-Dice-Life-健康状况模块-v1.0.md"),
    read("docs/健康模块/03-健康状况模块实施验收记录-v1.0.md"),
    read("src/health/HealthModule.tsx"),
  ].join("\n");
  assert.match(documents, /单文件 JSON\s+bundle/);
  assert.match(documents, /整体替换/);
  assert.match(documents, /V1\.1/);
  assert.doesNotMatch(documents, /默认导出 ZIP/);
  assert.doesNotMatch(documents, /冲突默认按实体 ID 与 `updatedAt` 合并/);
  assert.doesNotMatch(documents, /逐条合并已实现/);
});
