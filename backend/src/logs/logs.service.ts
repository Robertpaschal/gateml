import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface WriteLogDto {
  apiKeyId:         string;
  userId:           string;
  model:            string;
  provider:         string;
  status:           number;
  latencyMs:        number;
  promptTokens:     number;
  completionTokens: number;
  costUsd:          number;
  path:             string;
  isTestMode:       boolean;
}

@Injectable()
export class LogsService {
  constructor(private readonly prisma: PrismaService) {}

  write(dto: WriteLogDto) {
    return this.prisma.requestLog.create({ data: dto });
  }

  list(userId: string, limit: number, offset: number) {
    return this.prisma.requestLog.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      take:    limit,
      skip:    offset,
    });
  }
}
