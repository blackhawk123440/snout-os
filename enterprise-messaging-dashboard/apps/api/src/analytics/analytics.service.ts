import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getResponseTimes(orgId: string, params: {
    startDate: Date;
    endDate: Date;
    groupBy: 'thread' | 'sitter';
  }) {
    // Get all threads in date range
    const threads = await this.prisma.thread.findMany({
      where: {
        orgId,
        lastActivityAt: {
          gte: params.startDate,
          lte: params.endDate,
        },
      },
      include: {
        client: true,
        sitter: true,
        messages: {
          where: {
            createdAt: {
              gte: params.startDate,
              lte: params.endDate,
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Calculate response times
    const responseTimes: Array<{
      id: string;
      name: string;
      avgResponseTimeMinutes: number;
      responseCount: number;
      slaCompliant: number; // Count of responses within SLA
    }> = [];

    for (const thread of threads) {
      let totalResponseTime = 0;
      let responseCount = 0;
      let slaCompliant = 0;
      const slaMinutes = 15; // Default SLA

      // Group messages by conversation turn
      const messages = thread.messages;
      for (let i = 1; i < messages.length; i++) {
        const prev = messages[i - 1];
        const curr = messages[i];

        // If direction changed, it's a response
        if (prev.direction !== curr.direction) {
          const responseTime = (curr.createdAt.getTime() - prev.createdAt.getTime()) / (1000 * 60);
          totalResponseTime += responseTime;
          responseCount++;
          if (responseTime <= slaMinutes) {
            slaCompliant++;
          }
        }
      }

      if (responseCount > 0) {
        const key = params.groupBy === 'thread' ? thread.id : thread.sitterId || 'unassigned';
        const name = params.groupBy === 'thread'
          ? thread.client.name
          : thread.sitter?.name || 'Unassigned';

        responseTimes.push({
          id: key,
          name,
          avgResponseTimeMinutes: totalResponseTime / responseCount,
          responseCount,
          slaCompliant,
        });
      }
    }

    return responseTimes;
  }

  async getMessageVolume(orgId: string, params: {
    startDate: Date;
    endDate: Date;
    groupBy: 'day' | 'class';
  }) {
    if (params.groupBy === 'day') {
      // Group by day
      const messages = await this.prisma.message.findMany({
        where: {
          orgId,
          createdAt: {
            gte: params.startDate,
            lte: params.endDate,
          },
        },
        include: {
          thread: {
            include: {
              messageNumber: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      // Group by day
      const byDay: Record<string, number> = {};
      for (const msg of messages) {
        const day = msg.createdAt.toISOString().split('T')[0];
        byDay[day] = (byDay[day] || 0) + 1;
      }

      return Object.entries(byDay).map(([date, count]) => ({
        date,
        count,
      }));
    } else {
      // Group by number class
      const messages = await this.prisma.message.findMany({
        where: {
          orgId,
          createdAt: {
            gte: params.startDate,
            lte: params.endDate,
          },
        },
        include: {
          thread: {
            include: {
              messageNumber: true,
            },
          },
        },
      });

      const byClass: Record<string, number> = {};
      for (const msg of messages) {
        const numberClass = msg.thread.messageNumber.class;
        byClass[numberClass] = (byClass[numberClass] || 0) + 1;
      }

      return Object.entries(byClass).map(([class_, count]) => ({
        class: class_,
        count,
      }));
    }
  }
}
