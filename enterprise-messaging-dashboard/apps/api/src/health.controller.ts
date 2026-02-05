import { Controller, Get } from '@nestjs/common';

/**
 * Public Health Check Controller
 * 
 * Provides a public /health endpoint that returns 200 without authentication.
 * Used by Render and other monitoring tools.
 */
@Controller()
export class HealthController {
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'snout-os-api',
    };
  }
}
