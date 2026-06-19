import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pool from '../config/db';
import { stripMetadata } from '../utils/metadataStripper';

// Ensure uploads folder exists in-service
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Chennai Metropolitan boundary validation limits
const CHENNAI_LIMITS = {
  minLat: 12.80,
  maxLat: 13.25,
  minLng: 80.10,
  maxLng: 80.35,
};

/**
 * Handle creation of an anonymous action report
 */
export const createReport = async (req: Request, res: Response) => {
  try {
    const { title, description, category, lat, lng } = req.body;

    // 1. Validation
    if (!title || !description || !category || !lat || !lng) {
      return res.status(400).json({ error: 'missing_required_fields' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'invalid_coordinates_format' });
    }

    // Chennai geo-fencing constraint check
    if (
      latitude < CHENNAI_LIMITS.minLat ||
      latitude > CHENNAI_LIMITS.maxLat ||
      longitude < CHENNAI_LIMITS.minLng ||
      longitude > CHENNAI_LIMITS.maxLng
    ) {
      return res.status(400).json({
        error: 'coordinates_outside_operational_grid',
        message: 'Reports must be located within Chennai metropolitan bounds.'
      });
    }

    let evidenceUrl: string | null = null;

    // 2. Process File Upload (with in-memory EXIF scrubbing)
    if (req.file) {
      const fileBuffer = req.file.buffer;
      const mimeType = req.file.mimetype;

      // Strip EXIF / binary tracking headers
      const scrubbedBuffer = stripMetadata(fileBuffer, mimeType);

      // Generate a completely randomized filename (uuid) to eliminate original file trace leakage
      const fileExt = path.extname(req.file.originalname) || (mimeType === 'image/png' ? '.png' : '.jpg');
      const uniqueFilename = `${crypto.randomUUID()}${fileExt}`;
      const destinationPath = path.join(UPLOADS_DIR, uniqueFilename);

      // Write scrubbed image buffer to local storage
      fs.writeFileSync(destinationPath, scrubbedBuffer);
      evidenceUrl = `/uploads/${uniqueFilename}`;

      console.log(`[VOID GATEWAY] Stored anonymous report attachment: ${evidenceUrl} (Metadata Stripped)`);
    }

    // 3. Database Insertion (Injecting PostGIS Coordinate Point)
    const queryText = `
      INSERT INTO reports (category, title, description, evidence_url, geom)
      VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326))
      RETURNING id, category, title, status, created_at
    `;
    const values = [category, title, description, evidenceUrl, longitude, latitude];
    const dbResult = await pool.query(queryText, values);
    const newReport = dbResult.rows[0];

    // 4. Generate verification token receipt
    // Return to user for tracking validation tier upgrades.
    // The key hash is logged in operator_keys to allow later claim, keeping identity decoupled.
    const validationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(validationToken).digest('hex');

    await pool.query(
      'INSERT INTO operator_keys (key_hash, consumed, tier_granted) VALUES ($1, FALSE, 2)',
      [tokenHash]
    );

    return res.status(201).json({
      status: 'submitted',
      message: 'Anonymous report accepted into the ledger.',
      report: newReport,
      receipt: {
        validation_token: validationToken,
        instructions: 'Retain this token. Once operators verify this report, consume it in the network portal to upgrade your status.'
      }
    });

  } catch (error: any) {
    console.error('[VOID EXCEPTION] Failed to submit report:', error);
    return res.status(500).json({ error: 'internal_ledger_error' });
  }
};

/**
 * Retrieve all reports with their raw coordinates
 */
export const getReports = async (req: Request, res: Response) => {
  try {
    const queryText = `
      SELECT 
        id, 
        category, 
        title, 
        description, 
        evidence_url, 
        status, 
        upvotes, 
        ST_Y(geom) as lat, 
        ST_X(geom) as lng, 
        created_at 
      FROM reports 
      ORDER BY created_at DESC
    `;
    const dbResult = await pool.query(queryText);
    
    // Parse numeric outputs
    const reports = dbResult.rows.map((row: any) => ({
      ...row,
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng)
    }));

    return res.status(200).json({ reports });
  } catch (error: any) {
    console.error('[DB EXCEPTION] Failed to fetch report ledger:', error);
    return res.status(500).json({ error: 'internal_ledger_error' });
  }
};
