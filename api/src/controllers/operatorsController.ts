import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../config/db';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

const JWT_SECRET = process.env.JWT_SECRET || 'russaw_underground_jwt_secret_key_2026';

/**
 * Register a new operator by claiming a valid, unconsumed action token
 */
export const registerOperator = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { alias, password, validation_token } = req.body;

    if (!alias || !password || !validation_token) {
      return res.status(400).json({ error: 'missing_required_credentials' });
    }

    // 1. Hash and check the validation key
    const tokenHash = crypto.createHash('sha256').update(validation_token).digest('hex');
    
    // Begin database transaction for atomic key consumption and operator creation
    await client.query('BEGIN');

    const keyResult = await client.query(
      'SELECT consumed, tier_granted FROM operator_keys WHERE key_hash = $1',
      [tokenHash]
    );

    if (keyResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'invalid_validation_key_signature' });
    }

    if (keyResult.rows[0].consumed) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'validation_key_already_consumed' });
    }

    const tierGranted = parseInt(keyResult.rows[0].tier_granted);

    // 2. Check if alias is already taken
    const aliasCheck = await client.query('SELECT id FROM operators WHERE alias = $1', [alias]);
    if (aliasCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'operator_alias_already_compromised' });
    }

    // 3. Hash password and insert operator
    const passwordHash = await bcrypt.hash(password, 10);
    const createOperatorQuery = `
      INSERT INTO operators (alias, password_hash, tier_level)
      VALUES ($1, $2, $3)
      RETURNING id, alias, tier_level
    `;
    const operatorResult = await client.query(createOperatorQuery, [alias, passwordHash, tierGranted]);
    const operator = operatorResult.rows[0];

    // 4. Burn the validation token so it cannot be reused
    await client.query(
      'UPDATE operator_keys SET consumed = TRUE WHERE key_hash = $1',
      [tokenHash]
    );

    await client.query('COMMIT');

    // 5. Sign JWT
    const token = jwt.sign(
      { id: operator.id, alias: operator.alias, tier_level: operator.tier_level },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log(`[AUTH SYSTEM] Operator registered & authenticated: ${operator.alias} (Tier: ${operator.tier_level})`);

    return res.status(201).json({
      status: 'authenticated',
      operator: {
        alias: operator.alias,
        tier_level: operator.tier_level
      },
      token
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('[AUTH EXCEPTION] Registration failed:', error);
    return res.status(500).json({ error: 'internal_ledger_error' });
  } finally {
    client.release();
  }
};

/**
 * Login existing operator
 */
export const loginOperator = async (req: Request, res: Response) => {
  try {
    const { alias, password } = req.body;

    if (!alias || !password) {
      return res.status(400).json({ error: 'missing_credentials' });
    }

    // Retrieve operator
    const dbResult = await pool.query(
      'SELECT id, alias, password_hash, tier_level FROM operators WHERE alias = $1',
      [alias]
    );

    if (dbResult.rows.length === 0) {
      return res.status(401).json({ error: 'invalid_operator_credentials' });
    }

    const operator = dbResult.rows[0];

    // Compare credentials
    const isMatch = await bcrypt.compare(password, operator.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'invalid_operator_credentials' });
    }

    // Sign JWT
    const token = jwt.sign(
      { id: operator.id, alias: operator.alias, tier_level: operator.tier_level },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log(`[AUTH SYSTEM] Operator logged in: ${operator.alias}`);

    return res.status(200).json({
      status: 'authenticated',
      operator: {
        alias: operator.alias,
        tier_level: operator.tier_level
      },
      token
    });

  } catch (error) {
    console.error('[AUTH EXCEPTION] Login failed:', error);
    return res.status(500).json({ error: 'internal_ledger_error' });
  }
};

/**
 * Fetch forum postings (restricted to authenticated operators)
 */
export const getForumPosts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only return the 50 most recent tactical communications
    const queryText = `
      SELECT id, operator_alias, message, created_at
      FROM forum_posts
      ORDER BY created_at DESC
      LIMIT 50
    `;
    const dbResult = await pool.query(queryText);
    return res.status(200).json({ posts: dbResult.rows });
  } catch (error) {
    console.error('[FORUM EXCEPTION] Failed to retrieve postings:', error);
    return res.status(500).json({ error: 'internal_ledger_error' });
  }
};

/**
 * Post a new broadcast message (restricted to authenticated operators)
 */
export const postForumMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { message } = req.body;
    const operator = req.operator;

    if (!message) {
      return res.status(400).json({ error: 'empty_broadcast_message' });
    }

    if (!operator) {
      return res.status(403).json({ error: 'operator_context_not_found' });
    }

    const queryText = `
      INSERT INTO forum_posts (operator_alias, message)
      VALUES ($1, $2)
      RETURNING id, operator_alias, message, created_at
    `;
    
    const dbResult = await pool.query(queryText, [operator.alias, message]);
    const post = dbResult.rows[0];

    console.log(`[FORUM BROADCAST] Post submitted by operator ${operator.alias}`);

    return res.status(201).json({ post });
  } catch (error) {
    console.error('[FORUM EXCEPTION] Failed to record message:', error);
    return res.status(500).json({ error: 'internal_ledger_error' });
  }
};
