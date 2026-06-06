import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PromptsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.prompt.findMany({
      where:   { userId },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getWithVersions(id: string, userId: string) {
    const prompt = await this.prisma.prompt.findUnique({
      where:   { id },
      include: { versions: { orderBy: { version: 'desc' } } },
    });
    if (!prompt) throw new NotFoundException('Prompt not found.');
    if (prompt.userId !== userId) throw new ForbiddenException();
    return prompt;
  }

  create(userId: string, name: string, model: string) {
    return this.prisma.prompt.create({ data: { userId, name, model } });
  }

  async createVersion(promptId: string, userId: string, body: string, note: string) {
    const prompt = await this.prisma.prompt.findUnique({ where: { id: promptId } });
    if (!prompt) throw new NotFoundException('Prompt not found.');
    if (prompt.userId !== userId) throw new ForbiddenException();

    const latest = await this.prisma.promptVersion.findFirst({
      where:   { promptId },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    return this.prisma.promptVersion.create({
      data: { promptId, version: nextVersion, body, note },
    });
  }

  async setActive(promptId: string, versionId: string, userId: string) {
    const prompt = await this.prisma.prompt.findUnique({ where: { id: promptId } });
    if (!prompt) throw new NotFoundException();
    if (prompt.userId !== userId) throw new ForbiddenException();

    await this.prisma.$transaction([
      this.prisma.promptVersion.updateMany({ where: { promptId }, data: { isActive: false } }),
      this.prisma.promptVersion.update({ where: { id: versionId }, data: { isActive: true } }),
      this.prisma.prompt.update({ where: { id: promptId }, data: { status: 'production' } }),
    ]);
    return { ok: true };
  }
}
