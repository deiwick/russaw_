/**
 * RUSSAW Cryptographic & Operational Utilities: Metadata Stripper
 * Purges EXIF, GPS, camera, and author signatures from uploaded JPEGs and PNGs
 * at the binary level. Zero library dependencies.
 */

/**
 * Strips metadata from a JPEG buffer by omitting APP1 (EXIF) and ancillary markers.
 */
function stripJpegMetadata(buffer: Buffer): Buffer {
  if (buffer.length < 4 || buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
    // Not a valid JPEG or too small; return as-is
    return buffer;
  }

  const chunks: Buffer[] = [];
  chunks.push(buffer.subarray(0, 2)); // Add SOI (Start of Image) [FF D8]

  let offset = 2;
  while (offset < buffer.length) {
    // End of image or out of bounds
    if (offset + 1 >= buffer.length) break;

    // Check for marker start
    if (buffer[offset] !== 0xFF) {
      // Missing marker alignment; search for next 0xFF or return
      offset++;
      continue;
    }

    const marker = buffer[offset + 1];

    // SOS (Start of Scan) [FF DA] marks the end of header segments.
    // The compressed image data follows immediately. Copy the rest of the file.
    if (marker === 0xDA) {
      chunks.push(buffer.subarray(offset));
      break;
    }

    // EOI (End of Image) [FF D9]
    if (marker === 0xD9) {
      chunks.push(buffer.subarray(offset, offset + 2));
      break;
    }

    // Standalone markers that have no length parameters (RST0-RST7, SOI, etc.)
    if (marker >= 0xD0 && marker <= 0xD7) {
      chunks.push(buffer.subarray(offset, offset + 2));
      offset += 2;
      continue;
    }

    // Read segment length (2 bytes, big-endian)
    if (offset + 3 >= buffer.length) break;
    const segmentLength = buffer.readUInt16BE(offset + 2);
    const nextOffset = offset + 2 + segmentLength;

    if (nextOffset > buffer.length) break;

    // Markers to strip:
    // - 0xE1: APP1 (EXIF, GPS, XMP metadata)
    // - 0xE2: APP2 (ICC Profile - optional, but strip to minimize footprint)
    // - 0xFE: COM (Comment segment)
    const shouldStrip = marker === 0xE1 || marker === 0xE2 || marker === 0xFE;

    if (!shouldStrip) {
      // Copy intact segment
      chunks.push(buffer.subarray(offset, nextOffset));
    } else {
      console.log(`[STRIPPER] Purged JPEG Marker Segment: FF ${marker.toString(16).toUpperCase()} (${segmentLength} bytes)`);
    }

    offset = nextOffset;
  }

  return Buffer.concat(chunks);
}

/**
 * Strips metadata from a PNG buffer by omitting ancillary text/EXIF chunks.
 */
function stripPngMetadata(buffer: Buffer): Buffer {
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (buffer.length < 8 || !buffer.subarray(0, 8).equals(pngSignature)) {
    // Not a valid PNG
    return buffer;
  }

  const chunks: Buffer[] = [];
  chunks.push(pngSignature);

  let offset = 8;
  while (offset < buffer.length) {
    if (offset + 8 >= buffer.length) break;

    const chunkLength = buffer.readUInt32BE(offset);
    const chunkType = buffer.toString('ascii', offset + 4, offset + 8);
    const nextOffset = offset + 8 + chunkLength + 4; // length + type + data + CRC

    if (nextOffset > buffer.length) break;

    // Critical chunks to keep: IHDR (Header), PLTE (Palette), IDAT (Image Data), IEND (End)
    // Ancillary chunks to strip: eXIf, tEXt (text), zTXt (compressed text), iTXt (UTF-8 text), tIME (last mod time)
    const isCritical = ['IHDR', 'PLTE', 'IDAT', 'IEND'].includes(chunkType);
    const isAllowedAncillary = ['tRNS'].includes(chunkType); // Keep transparency if present

    if (isCritical || isAllowedAncillary) {
      chunks.push(buffer.subarray(offset, nextOffset));
    } else {
      console.log(`[STRIPPER] Purged PNG Chunk: ${chunkType} (${chunkLength} bytes)`);
    }

    offset = nextOffset;
  }

  return Buffer.concat(chunks);
}

/**
 * Main scrub entry point. Determines file type and strips metadata.
 */
export function stripMetadata(buffer: Buffer, mimeType: string): Buffer {
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return stripJpegMetadata(buffer);
  }
  if (mimeType === 'image/png') {
    return stripPngMetadata(buffer);
  }
  // For other file types, return buffer unmodified
  return buffer;
}
