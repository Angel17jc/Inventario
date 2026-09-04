import test from "node:test";
import assert from "node:assert/strict";
import { detectImageFormat } from "./image-bytes.js";

const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)]);
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(16)]);
const webp = Buffer.concat([
  Buffer.from("RIFF", "ascii"), Buffer.from([0x20, 0, 0, 0]), Buffer.from("WEBP", "ascii"), Buffer.alloc(16),
]);

test("reads the format from the bytes", () => {
  assert.equal(detectImageFormat(png), "image/png");
  assert.equal(detectImageFormat(jpeg), "image/jpeg");
  assert.equal(detectImageFormat(webp), "image/webp");
});

test("anything that is not one of the three is refused", () => {
  // What the header would have let through: markup, a script, a PDF.
  assert.equal(detectImageFormat(Buffer.from("<svg onload=alert(1)>", "utf8")), null);
  assert.equal(detectImageFormat(Buffer.from("<!doctype html><script>", "utf8")), null);
  assert.equal(detectImageFormat(Buffer.from("%PDF-1.7", "ascii")), null);
  assert.equal(detectImageFormat(Buffer.from("PK\x03\x04", "binary")), null);
});

test("a truncated file is not mistaken for an image", () => {
  assert.equal(detectImageFormat(Buffer.alloc(0)), null);
  assert.equal(detectImageFormat(png.subarray(0, 4)), null);
  // RIFF without the WEBP tag is some other container, an audio file for one.
  assert.equal(detectImageFormat(Buffer.concat([Buffer.from("RIFF", "ascii"), Buffer.alloc(8)])), null);
});
