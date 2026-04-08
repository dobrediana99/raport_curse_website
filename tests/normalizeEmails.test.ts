import { describe, it, expect } from "vitest";
import {
  normalizeEmails,
  normalizeAndFilterValidEmails,
  isProbablyValidEmail,
} from "../src/domain/email/normalizeEmails.js";

describe("normalizeEmails", () => {
  it("handles a simple email", () => {
    expect(normalizeEmails("a@b.co")).toEqual(["a@b.co"]);
  });

  it("lowercases and trims", () => {
    expect(normalizeEmails("  Foo@BAR.com  ")).toEqual(["foo@bar.com"]);
  });

  it("splits on semicolon and comma", () => {
    expect(normalizeEmails("A@b.com; c@d.com, e@f.com")).toEqual(["a@b.com", "c@d.com", "e@f.com"]);
  });

  it("dedupes", () => {
    expect(normalizeEmails("a@b.com, a@b.com; A@B.COM")).toEqual(["a@b.com"]);
  });

  it("drops empty segments", () => {
    expect(normalizeEmails(";;a@b.com,, ;")).toEqual(["a@b.com"]);
  });

  it("returns empty for null/empty", () => {
    expect(normalizeEmails(null)).toEqual([]);
    expect(normalizeEmails("")).toEqual([]);
  });
});

describe("normalizeAndFilterValidEmails", () => {
  it("filters out tokens that are not emails", () => {
    expect(normalizeAndFilterValidEmails("not-an-email; ok@x.com")).toEqual(["ok@x.com"]);
  });
});

describe("isProbablyValidEmail", () => {
  it("accepts basic shape", () => {
    expect(isProbablyValidEmail("x@y.zz")).toBe(true);
  });
});
