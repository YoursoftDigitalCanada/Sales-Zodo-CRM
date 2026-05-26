import { Router } from 'express';
import { addressController } from './address.controller';
import { loadEmployee } from '../../common/middleware/auth.middleware';

const router = Router();

router.use(loadEmployee);

router.get('/autocomplete', addressController.autocomplete.bind(addressController));
router.post('/place-details', addressController.getPlaceDetails.bind(addressController));

export default router;
