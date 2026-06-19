import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  operator?: {
    id: number;
    alias: string;
    tier_level: number;
  };
}

export const authenticateOperator = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'unauthorized_operator',
      message: 'Access requires secure signature token.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET || 'russaw_underground_jwt_secret_key_2026';
    const decoded = jwt.verify(token, secret) as {
      id: number;
      alias: string;
      tier_level: number;
    };

    req.operator = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      error: 'invalid_signature_token',
      message: 'Operator token signature check failed.'
    });
  }
};
