import express from 'express';
import { createRecipient, getAllRecipients } from '../controllers/recipients.js';

const router = express.Router();

router.post('/', createRecipient);
router.get('/', getAllRecipients);

export default router;
