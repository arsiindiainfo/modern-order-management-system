import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { ApiOkEnvelope } from './common/decorators/api-ok-envelope.decorator';
import { HealthDto } from './health.dto';

@ApiTags('health')
@Controller('health')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOkEnvelope(HealthDto)
  getHealth(): HealthDto {
    return this.appService.getHealth();
  }
}
