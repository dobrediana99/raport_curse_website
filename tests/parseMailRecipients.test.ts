import { describe, it, expect } from "vitest";
import {
  formatRecipientsForNodemailer,
  parseMailRecipients,
} from "../src/mail/parseMailRecipients.js";

describe("parseMailRecipients", () => {
  it("parses a single address", () => {
    expect(parseMailRecipients("a@b.com")).toEqual(["a@b.com"]);
  });

  it("parses two comma-separated addresses and trims spaces", () => {
    expect(
      parseMailRecipients(
        "rafael.o@crystal-logistics-services.com, alin.l@crystal-logistics-services.com",
      ),
    ).toEqual([
      "rafael.o@crystal-logistics-services.com",
      "alin.l@crystal-logistics-services.com",
    ]);
  });

  it("supports semicolons and ignores empty segments", () => {
    expect(parseMailRecipients(" x@y.com ; ; z@z.com ")).toEqual(["x@y.com", "z@z.com"]);
  });
});

describe("formatRecipientsForNodemailer", () => {
  it("joins with comma-space for SMTP-friendly header", () => {
    expect(formatRecipientsForNodemailer(["a@b.com", "c@d.com"])).toBe("a@b.com, c@d.com");
  });
});
