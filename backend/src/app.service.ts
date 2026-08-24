import { Injectable } from '@nestjs/common';
import { HealthDto } from './health.dto';

@Injectable()
export class AppService {
  getHealth(): HealthDto {
    return { status: 'ok' };
  }
}
