import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../common/utils/responseFormatter';
import { addressService } from './address.service';

export class AddressController {
  async autocomplete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = String(req.query.input || '').trim();
      if (input.length < 3) {
        sendSuccess(res, [], 'Type at least 3 characters');
        return;
      }

      const suggestions = await addressService.autocomplete(input);
      sendSuccess(res, suggestions, 'Address suggestions');
    } catch (error) {
      next(error);
    }
  }

  async getPlaceDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const placeId = String(req.body?.placeId || '').trim();
      if (!placeId) {
        sendSuccess(res, null, 'Place details not available');
        return;
      }

      const details = await addressService.getPlaceDetails(placeId);
      sendSuccess(res, details, details ? 'Place details retrieved' : 'Place details not available');
    } catch (error) {
      next(error);
    }
  }
}

export const addressController = new AddressController();
