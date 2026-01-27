import { Module, Global } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';

@Global() // Make gateway available globally without importing
@Module({
  providers: [NotificationsGateway],
  exports: [NotificationsGateway],
})
export class NotificationsModule {}
