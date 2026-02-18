import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';
import { CreateTagDto, UpdateTagDto, TagQueryDto } from './tags.dto';

export class TagsRepository {
  async create(tenantId: string, data: CreateTagDto) {
    return prisma.tag.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  async findById(id: string, tenantId: string) {
    return prisma.tag.findFirst({
      where: { id, tenantId },
    });
  }

  async findByName(name: string, tenantId: string, excludeId?: string) {
    return prisma.tag.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        tenantId,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
  }

  async findMany(tenantId: string, query: TagQueryDto) {
    const { page = 1, limit = 50, search } = query;

    const where: Prisma.TagWhereInput = {
      tenantId,
      ...(search && {
        name: { contains: search, mode: 'insensitive' },
      }),
    };

    const [data, total] = await Promise.all([
      prisma.tag.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.tag.count({ where }),
    ]);

    return { data, total };
  }

  async findAll(tenantId: string) {
    return prisma.tag.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async update(id: string, tenantId: string, data: UpdateTagDto) {
    return prisma.tag.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, tenantId: string) {
    // Delete tag associations first
    await prisma.leadTag.deleteMany({ where: { tagId: id } });
    await prisma.taskTag.deleteMany({ where: { tagId: id } });
    await prisma.fileTag.deleteMany({ where: { tagId: id } });

    return prisma.tag.deleteMany({
      where: { id, tenantId },
    });
  }

  async hasAssociations(id: string): Promise<boolean> {
    const [leadCount, taskCount, fileCount] = await Promise.all([
      prisma.leadTag.count({ where: { tagId: id } }),
      prisma.taskTag.count({ where: { tagId: id } }),
      prisma.fileTag.count({ where: { tagId: id } }),
    ]);

    return leadCount + taskCount + fileCount > 0;
  }
}

export const tagsRepository = new TagsRepository();