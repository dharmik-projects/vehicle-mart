import { Request, Response, NextFunction } from 'express';
import zlib from 'zlib';

/**
 * Gzip JSON responses without any npm dependency (Node's built-in zlib).
 *
 * Only wraps `res.json` — non-JSON responses (res.send of buffers/streams,
 * res.end, file downloads) pass through untouched, so non-JSON payloads are
 * never compressed. Applied once per request; if gzipping fails we fall back
 * to Express' original `res.json` behaviour.
 */
const compress = (req: Request, res: Response, next: NextFunction): void => {
  const acceptEncoding = req.headers['accept-encoding'];
  if (typeof acceptEncoding !== 'string' || !acceptEncoding.includes('gzip')) {
    next();
    return;
  }

  const originalJson = res.json.bind(res);
  let handled = false;

  res.json = function json(body: any): Response {
    // Empty bodies and repeat calls: delegate to Express' original behaviour
    if (handled || res.headersSent || body === undefined || body === null) {
      return originalJson(body);
    }
    handled = true;

    let payload: string | undefined;
    try {
      payload = JSON.stringify(body);
    } catch {
      payload = undefined;
    }
    if (typeof payload !== 'string') {
      // Stringify failed (circular refs etc.) — clear any header and fall back
      res.removeHeader('Content-Encoding');
      return originalJson(body);
    }

    zlib.gzip(payload, (err, buffer) => {
      if (err || !buffer || buffer.length === 0) {
        if (!res.headersSent) res.removeHeader('Content-Encoding');
        originalJson(body);
        return;
      }

      const varyHeader = res.getHeader('Vary');
      const varyValue = Array.isArray(varyHeader)
        ? varyHeader.join(', ')
        : varyHeader === undefined
          ? undefined
          : String(varyHeader);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Encoding', 'gzip');
      if (varyValue === undefined) {
        res.setHeader('Vary', 'Accept-Encoding');
      } else if (!/accept-encoding/i.test(varyValue)) {
        res.setHeader('Vary', `${varyValue}, Accept-Encoding`);
      }
      res.setHeader('Content-Length', buffer.length);
      res.end(buffer);
    });

    return res;
  };

  next();
};

export default compress;
