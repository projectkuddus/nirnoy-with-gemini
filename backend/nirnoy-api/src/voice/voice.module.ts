import { Module } from '@nestjs/common';
import { VoiceGateway } from './voice.gateway';
import { VoiceService } from './voice.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [VoiceGateway, VoiceService],
  exports: [VoiceService],
})
export class VoiceModule {}

