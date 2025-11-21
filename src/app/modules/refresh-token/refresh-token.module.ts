import { Module } from '@nestjs/common';
import { RefreshTokenService } from './refresh-token.service';

@Module({
  controllers: [],
  providers: [RefreshTokenService],
  exports: [RefreshTokenService]
})
export class RefreshTokenModule { } 