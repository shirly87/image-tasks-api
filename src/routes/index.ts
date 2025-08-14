import express from 'express';

const router = express.Router();

router.get('/v1', (_req, res) => {
    const version = process.env.npm_package_version ?? '1.0.0';
    res.json({
        version: `Image Tasks API ${version}`
    });
});

export default router;