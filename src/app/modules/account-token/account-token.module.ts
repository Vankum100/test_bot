import { Module } from '@nestjs/common';
import { AccountTokenService } from './account-token.service';

@Module({
  controllers: [],
  providers: [AccountTokenService],
  exports: [AccountTokenService]
})
export class AccountTokenModule {}
