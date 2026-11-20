import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { FastifyPluginAsync } from 'fastify';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { audit, requireRole } from '../auth.ts';
import type { Ctx } from '../app.ts';
import { config } from '../config.ts';

const MAX_BYTES = 8 * 1024 * 1024;
// Raster images only. SVG is refused because it can carry script.
const TYPES: Record<string, { ext: string; magic: (b: Buffer) => boolean }> = {
  'image/jpeg': { ext: 'jpg', magic: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': { ext: 'png', magic: b => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'image/webp': { ext: 'webp', magic: b => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP' },
  'image/gif': { ext: 'gif', magic: b => b.subarray(0, 4).toString('ascii') === 'GIF8' },
};

export const uploadRoutes = ({ db }: Ctx): FastifyPluginAsync => async app => {
  fs.mkdirSync(config.uploadDir, { recursive: true });
  await app.register(multipart, { limits: { fileSize: MAX_BYTES, files: 1 } });
  await app.register(fastifyStatic, {
    root: config.uploadDir, prefix: '/uploads/', decorateReply: false, index: false, list: false,
    setHeaders: res => { res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); },
  });

  app.post('/api/admin/uploads', { preHandler: requireRole('admin') }, async (req, reply) => {
    const file = await req.file();
    if (!file) return reply.code(400).send({ error: 'Choose an image to upload.' });
    const type = TYPES[file.mimetype];
    if (!type) return reply.code(415).send({ error: 'Use a JPEG, PNG, WebP or GIF image.' });
    const buf = await file.toBuffer().catch(() => null);
    if (!buf || file.file.truncated) return reply.code(413).send({ error: 'Images must be 8 MB or smaller.' });
    if (!type.magic(buf)) return reply.code(415).send({ error: "That file isn't a valid image of its type." });
    const storedAs = `${crypto.randomBytes(12).toString('hex')}.${type.ext}`;
    fs.writeFileSync(path.join(config.uploadDir, storedAs), buf);
    await db.insertInto('uploads').values({ file_name: file.filename.slice(0, 200), stored_as: storedAs, mime: file.mimetype, size: buf.length, uploaded_by: req.user!.id, at: new Date().toISOString() }).execute();
    await audit(db, req.user!.id, 'content.upload', storedAs, { name: file.filename });
    return reply.code(201).send({ url: `/uploads/${storedAs}` });
  });
};
