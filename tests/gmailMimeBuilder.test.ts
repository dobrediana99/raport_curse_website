import { describe, it, expect } from "vitest";
import { __test__ } from "../src/mail/gmailApiMailer.js";

describe("Gmail API MIME builder", () => {
  it("builds a simple html message without attachments", async () => {
    const buf = await __test__.buildMimeMessage({
      from: "from@example.com",
      to: ["a@b.com"],
      subject: "Sub",
      html: "<b>Hi</b>",
    });
    const s = buf.toString("utf8");
    expect(s).toContain("From: from@example.com");
    expect(s).toContain("To: a@b.com");
    expect(s).toContain("Subject: Sub");
    expect(s).toContain('Content-Type: text/html; charset="UTF-8"');
    expect(s).toContain("<b>Hi</b>");
  });

  it("builds a multipart message when attachments exist", async () => {
    const buf = await __test__.buildMimeMessage({
      from: "from@example.com",
      to: ["a@b.com"],
      subject: "Sub",
      html: "<b>Hi</b>",
      attachments: [{ filename: "x.txt", content: Buffer.from("hello"), contentType: "text/plain" }],
    });
    const s = buf.toString("utf8");
    expect(s).toContain("multipart/mixed");
    expect(s).toContain('Content-Disposition: attachment; filename="x.txt"');
    expect(s).toContain("aGVsbG8="); // base64 of 'hello'
  });
});

