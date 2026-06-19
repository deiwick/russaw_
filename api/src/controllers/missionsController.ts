import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pool from '../config/db';
import { stripMetadata } from '../utils/metadataStripper';

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Fetch all available missions in Chennai viewport
 */
export const getMissions = async (req: Request, res: Response) => {
  try {
    const queryText = `
      SELECT 
        id, 
        title, 
        description, 
        category, 
        ST_Y(target_geom) as lat, 
        ST_X(target_geom) as lng, 
        radius_meters, 
        points, 
        is_active, 
        created_at 
      FROM missions 
      ORDER BY created_at DESC
    `;
    const dbResult = await pool.query(queryText);
    
    const missions = dbResult.rows.map((row: any) => ({
      ...row,
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
      radius_meters: parseInt(row.radius_meters),
      points: parseInt(row.points)
    }));

    return res.status(200).json({ missions });
  } catch (error: any) {
    console.error('[DB EXCEPTION] Failed to fetch missions:', error);
    return res.status(500).json({ error: 'internal_ledger_error' });
  }
};

/**
 * Verify a mission completion using geofenced coordinates and image proof
 */
export const verifyMission = async (req: Request, res: Response) => {
  try {
    const { mission_id, lat, lng } = req.body;

    if (!mission_id || !lat || !lng) {
      return res.status(400).json({ error: 'missing_required_fields' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const missionId = parseInt(mission_id);

    if (isNaN(latitude) || isNaN(longitude) || isNaN(missionId)) {
      return res.status(400).json({ error: 'invalid_data_format' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'verification_requires_photo_evidence' });
    }

    // 1. Query PostGIS to get geography distance in meters
    const queryText = `
      SELECT 
        title, 
        category,
        radius_meters, 
        points, 
        ST_Distance(
          target_geom::geography, 
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) as distance_meters
      FROM missions 
      WHERE id = $3 AND is_active = TRUE
    `;
    
    const dbResult = await pool.query(queryText, [longitude, latitude, missionId]);
    
    if (dbResult.rows.length === 0) {
      return res.status(404).json({ error: 'mission_not_found_or_inactive' });
    }

    const mission = dbResult.rows[0];
    const distanceMeters = parseFloat(mission.distance_meters);
    const radiusLimit = parseInt(mission.radius_meters);

    // 2. Proximity validation
    if (distanceMeters > radiusLimit) {
      return res.status(400).json({
        error: 'operator_outside_geofence',
        message: 'Spatial distance verification failed. You are outside the mission target zone.',
        diagnostics: {
          computed_distance_meters: Math.round(distanceMeters),
          allowed_radius_meters: radiusLimit
        }
      });
    }

    // 3. Process File Upload (with EXIF scrubbing)
    const fileBuffer = req.file.buffer;
    const mimeType = req.file.mimetype;
    
    const scrubbedBuffer = stripMetadata(fileBuffer, mimeType);
    
    const fileExt = path.extname(req.file.originalname) || (mimeType === 'image/png' ? '.png' : '.jpg');
    const uniqueFilename = `${crypto.randomUUID()}${fileExt}`;
    const destinationPath = path.join(UPLOADS_DIR, uniqueFilename);
    
    fs.writeFileSync(destinationPath, scrubbedBuffer);
    const evidenceUrl = `/uploads/${uniqueFilename}`;

    // 4. Log a verified incident report entry in the system database
    const insertReportQuery = `
      INSERT INTO reports (category, title, description, evidence_url, geom, status)
      VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), 'verified')
      RETURNING id
    `;
    const reportTitle = `[MISSION AUDIT] Verified completion of '${mission.title}'`;
    const reportDesc = `Field operator verified audit zone coordinates successfully. Verified distance: ${Math.round(distanceMeters)}m from target coordinates. Evidence photo scrubbed and archived.`;
    
    const reportResult = await pool.query(insertReportQuery, [
      mission.category,
      reportTitle,
      reportDesc,
      evidenceUrl,
      longitude,
      latitude
    ]);

    // 5. Generate secure invite token upgrade key
    const validationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(validationToken).digest('hex');

    await pool.query(
      'INSERT INTO operator_keys (key_hash, consumed, tier_granted) VALUES ($1, FALSE, 2)',
      [tokenHash]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Mission geofence cleared. Verified report logged.',
      diagnostics: {
        computed_distance_meters: Math.round(distanceMeters),
        allowed_radius_meters: radiusLimit,
        awarded_points: parseInt(mission.points)
      },
      receipt: {
        validation_token: validationToken,
        instructions: 'Use this key in the Operator Network interface to unlock Scout status.'
      }
    });

  } catch (error: any) {
    console.error('[MISSIONS EXCEPTION] Failed to verify mission:', error);
    return res.status(500).json({ error: 'internal_ledger_error' });
  }
};
