/**
 * What the file actually is, rather than what the request said it was.
 *
 * The content type on a logo upload is a header the caller writes, and the
 * bucket is public: whatever is stored there is served to anyone with the URL.
 * Trusting the header means the shop can put any bytes at a stable, guessable
 * address under an image's extension.
 *
 * Kept apart from the route so it can be tested without booting the server.
 */

export type ImageFormat = "image/png" | "image/jpeg" | "image/webp";

/**
 * The format these bytes really are, or null when they are none of the three.
 *
 * Read from the signature at the head of the file — the same few bytes every
 * decoder looks at first.
 */
export function detectImageFormat(bytes: Buffer): ImageFormat | null {
  // \x89 P N G \r \n \x1a \n
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }

  // JPEG opens with the start-of-image marker and ends with end-of-image.
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  // RIFF....WEBP: the size sits between the two tags, so they are read apart.
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}
