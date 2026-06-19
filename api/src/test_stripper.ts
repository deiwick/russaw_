import { stripMetadata } from './utils/metadataStripper';

function runTest() {
  console.log('[TEST] Starting JPEG EXIF metadata stripper test...');

  // Create a mock JPEG buffer containing APP0, APP1 (EXIF), and SOS segments
  const soi = Buffer.from([0xFF, 0xD8]);
  const app0 = Buffer.from([0xFF, 0xE0, 0x00, 0x0A, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x00, 0x00]); // Length 12 (parameter 10)
  const app1 = Buffer.from([0xFF, 0xE1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00]); // Length 10 (parameter 8)
  const app2 = Buffer.from([0xFF, 0xE2, 0x00, 0x06, 0x49, 0x43, 0x43, 0x00]); // Length 8 (parameter 6)
  const sos = Buffer.from([0xFF, 0xDA, 0x00, 0x06, 0x00, 0x01, 0x02, 0x03]); // SOS segment (parameter 6)
  const imageBytes = Buffer.from([0xAA, 0xBB, 0xCC, 0xDD]);
  const eoi = Buffer.from([0xFF, 0xD9]);

  const mockJpeg = Buffer.concat([soi, app0, app1, app2, sos, imageBytes, eoi]);
  
  console.log(`[TEST] Mock JPEG size before stripping: ${mockJpeg.length} bytes`);
  console.log('[TEST] Binary contents:', mockJpeg.toString('hex').toUpperCase());

  // Execute stripper
  const stripped = stripMetadata(mockJpeg, 'image/jpeg');

  console.log(`[TEST] Mock JPEG size after stripping: ${stripped.length} bytes`);
  console.log('[TEST] Binary contents:', stripped.toString('hex').toUpperCase());

  // Verification checks
  const hasApp1 = stripped.includes(Buffer.from([0xFF, 0xE1]));
  const hasApp2 = stripped.includes(Buffer.from([0xFF, 0xE2]));
  const hasApp0 = stripped.includes(Buffer.from([0xFF, 0xE0]));
  const hasSos = stripped.includes(Buffer.from([0xFF, 0xDA]));
  const hasSoi = stripped.subarray(0, 2).equals(soi);
  const hasEoi = stripped.subarray(stripped.length - 2).equals(eoi);

  if (hasApp1) {
    console.error('❌ FAIL: Stripped buffer still contains APP1 (EXIF) segment!');
    process.exit(1);
  }
  if (hasApp2) {
    console.error('❌ FAIL: Stripped buffer still contains APP2 segment!');
    process.exit(1);
  }
  if (!hasApp0) {
    console.error('❌ FAIL: Stripped buffer accidentally removed standard APP0 header!');
    process.exit(1);
  }
  if (!hasSoi || !hasEoi || !hasSos) {
    console.error('❌ FAIL: JPEG structural markers (SOI, SOS, EOI) were corrupted!');
    process.exit(1);
  }

  console.log('✅ SUCCESS: Metadata Stripper successfully purged APP1 and APP2 segments while keeping image structures intact.');
}

try {
  runTest();
} catch (e) {
  console.error('[TEST FATAL ERROR]', e);
  process.exit(1);
}
