import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  // SupabaseModule is global, no need to import
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
