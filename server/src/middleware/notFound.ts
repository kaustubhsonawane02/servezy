import type { RequestHandler } from 'express';

export const notFound: RequestHandler = (req, res) => {
  const message = 'Route not found: ' + req.method + ' ' + req.originalUrl;
  res.status(404).json({
    success: false,
    error: message,
  });
};
