import express from 'express';
import { getTerms, getTermByType, updateTerm } from '../controllers/termController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

router.get('/', getTerms);
router.get('/type/:type', getTermByType);

router.use(protect);
router.use(authorize('admin', 'staff'));

router.route('/:id')
    .put(updateTerm);

export default router;
