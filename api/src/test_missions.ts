import pool from './config/db';

async function runSpatialTest() {
  console.log('[TEST] Initializing PostGIS Proximity Validation Tests...');

  try {
    // 1. Fetch the Central Station Mission from the DB
    const findMissionQuery = `
      SELECT id, title, ST_X(target_geom) as lng, ST_Y(target_geom) as lat, radius_meters
      FROM missions
      WHERE title LIKE '%Central Station%'
      LIMIT 1
    `;
    const findRes = await pool.query(findMissionQuery);
    
    if (findRes.rows.length === 0) {
      console.error('❌ FAIL: Could not find Central Station seed mission in database.');
      process.exit(1);
    }

    const mission = findRes.rows[0];
    const targetLng = parseFloat(mission.lng);
    const targetLat = parseFloat(mission.lat);
    const radiusLimit = parseInt(mission.radius_meters);
    
    console.log(`[TEST] Target Location Locked: '${mission.title}'`);
    console.log(`[TEST] Coordinates: (${targetLat}N, ${targetLng}E) | Geofence Radius: ${radiusLimit}m`);

    // 2. Proximity test helper query
    const checkProximity = async (lat: number, lng: number): Promise<number> => {
      const distanceQuery = `
        SELECT ST_Distance(
          target_geom::geography, 
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) as distance_meters
        FROM missions
        WHERE id = $3
      `;
      const res = await pool.query(distanceQuery, [lng, lat, mission.id]);
      return parseFloat(res.rows[0].distance_meters);
    };

    // CASE A: Geolocation is IN RANGE (very close offset)
    const inRangeLat = targetLat + 0.0005; // ~50 meters away
    const inRangeLng = targetLng + 0.0005;
    const distanceA = await checkProximity(inRangeLat, inRangeLng);
    
    console.log(`[TEST CASE A - IN RANGE] Operator coords: (${inRangeLat}N, ${inRangeLng}E)`);
    console.log(`[TEST CASE A] Computed distance: ${distanceA.toFixed(2)} meters.`);
    
    if (distanceA <= radiusLimit) {
      console.log('✅ CASE A PASS: Operator cleared the geofence successfully.');
    } else {
      console.error(`❌ CASE A FAIL: Distance ${distanceA}m exceeds radius limit of ${radiusLimit}m!`);
      process.exit(1);
    }

    // CASE B: Geolocation is OUT OF RANGE (offset 2km away)
    const outRangeLat = targetLat + 0.02; // ~2.2 kilometers away
    const outRangeLng = targetLng + 0.02;
    const distanceB = await checkProximity(outRangeLat, outRangeLng);
    
    console.log(`[TEST CASE B - OUT OF RANGE] Operator coords: (${outRangeLat}N, ${outRangeLng}E)`);
    console.log(`[TEST CASE B] Computed distance: ${distanceB.toFixed(2)} meters.`);

    if (distanceB > radiusLimit) {
      console.log('✅ CASE B PASS: Operator was correctly blocked outside geofence.');
    } else {
      console.error(`❌ CASE B FAIL: Operator cleared geofence at distance ${distanceB}m, radius limit ${radiusLimit}m!`);
      process.exit(1);
    }

    console.log('✅ ALL SPATIAL TESTS PASSED: PostGIS geography queries are computing geodesic distances accurately.');
    process.exit(0);

  } catch (error) {
    console.error('❌ TEST FAILED WITH EXCEPTION:', error);
    process.exit(1);
  }
}

runSpatialTest();
