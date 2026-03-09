import { logger } from '../../common/utils/logger';
import { PushPayload, PushProvider } from './push.types';

/**
 * Placeholder provider for web push delivery.
 *
 * This intentionally does not hardcode a specific vendor (FCM/APNs/etc).
 * Wire this class to your push gateway implementation.
 */
export class WebPushProvider implements PushProvider {
  async send(userId: string, payload: PushPayload): Promise<void> {
    logger.info('[Push] Web push dispatched (placeholder)', {
      userId,
      title: payload.title,
      messagePreview: payload.message.slice(0, 120),
      hasData: Boolean(payload.data),
    });
  }
}
