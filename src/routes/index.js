import express from 'express';
import { someControllerFunction } from '../controllers/index.js';

const router = express.Router();

router.get('/', (req, res) => {
    res.send('Welcome to the API');
});

router.get('/some-route', someControllerFunction);

export default router;