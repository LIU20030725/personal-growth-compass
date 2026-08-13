import { describe, expect, it } from "vitest";
import { createMemoryHealthMediaStore } from "./healthMediaStore";

describe("health media store", () => {
  it("stores, reads, exports and deletes local meal photos", async () => {
    const store = createMemoryHealthMediaStore();
    const blob = new Blob(["photo"], { type: "image/jpeg" });
    await store.put("photo-1", blob);
    expect(await store.get("photo-1")).toBe(blob);
    expect((await store.exportAll())[0]).toMatchObject({
      id: "photo-1",
      type: "image/jpeg",
    });
    await store.remove("photo-1");
    expect(await store.get("photo-1")).toBeUndefined();
  });
});
