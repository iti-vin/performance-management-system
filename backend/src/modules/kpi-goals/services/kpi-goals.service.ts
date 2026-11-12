import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { KpiGoalTemplate } from '../entities/kpi-goal-template.entity.js';
import { KpiTemplateVersion } from '../entities/kpi-template-version.entity.js';
import { KpiIndicator } from '../entities/kpi-indicator.entity.js';
import { KpiIndicatorScale } from '../entities/kpi-indicator-scale.entity.js';
import { KpiIndicatorMatrixRow } from '../entities/kpi-indicator-matrix-row.entity.js';
import { KpiIndicatorMatrixColumn } from '../entities/kpi-indicator-matrix-column.entity.js';
import { CreateKpiGoalTemplateDto } from '../dtos/create-kpi-goal-template.dto.js';
import { IndicatorDto } from '../dtos/kpi-indicator.dto.js';
import { UpdateKpiGoalTemplateDto } from '../dtos/update-kpi-goal-template.dto.js';
import type { TemplateTree } from '../types/template-tree.types.js';

@Injectable()
export class KpiGoalsService {
  constructor(
    @InjectRepository(KpiGoalTemplate)
    private readonly templates: Repository<KpiGoalTemplate>,
    @InjectRepository(KpiTemplateVersion)
    private readonly versions: Repository<KpiTemplateVersion>,
    @InjectRepository(KpiIndicator)
    private readonly indicators: Repository<KpiIndicator>,
    @InjectRepository(KpiIndicatorScale)
    private readonly scales: Repository<KpiIndicatorScale>,
    @InjectRepository(KpiIndicatorMatrixRow)
    private readonly matrixRows: Repository<KpiIndicatorMatrixRow>,
    @InjectRepository(KpiIndicatorMatrixColumn)
    private readonly matrixColumns: Repository<KpiIndicatorMatrixColumn>,
  ) {}

  async create(
    dto: CreateKpiGoalTemplateDto,
    creatorId: string | null,
  ): Promise<TemplateTree> {
    const templateId = randomUUID();
    const versionId = randomUUID();

    const template = this.templates.create({
      templateId,
      positionId: dto.positionId ?? null,
      companyId: dto.companyId,
      status: 'draft',
      currentVersion: 1,
      publishedBy: null,
      publishedAt: null,
      archivedAt: null,
    });
    await this.templates.save(template);

    const version = this.versions.create({
      versionId,
      templateId,
      version: 1,
      frozenAt: null,
      createdBy: creatorId,
    });
    await this.versions.save(version);

    await this.saveIndicators(dto.indicators, versionId);

    return this.findTree(templateId);
  }

  async update(
    templateId: string,
    dto: UpdateKpiGoalTemplateDto,
  ): Promise<TemplateTree> {
    const template = await this.findTemplate(templateId);
    if (template.status !== 'draft') {
      throw new ConflictException(
        'Only draft templates can be updated. Publish or archive first.',
      );
    }

    const activeVersion = await this.findActiveDraftVersion(templateId);
    if (!activeVersion) {
      throw new NotFoundException('No active draft version found for template');
    }

    if (dto.positionId !== undefined) {
      template.positionId = dto.positionId;
      await this.templates.save(template);
    }

    await this.clearContent(activeVersion.versionId);
    await this.saveIndicators(dto.indicators, activeVersion.versionId);

    return this.findTree(templateId);
  }

  async publish(
    templateId: string,
    publisherId: string | null,
  ): Promise<TemplateTree> {
    const template = await this.findTemplate(templateId);
    if (template.status !== 'draft') {
      throw new ConflictException(
        'Only draft templates can be published. The template is already ' +
          template.status + '.',
      );
    }

    const activeVersion = await this.findActiveDraftVersion(templateId);
    if (!activeVersion) {
      throw new NotFoundException('No active draft version found for template');
    }

    const indicators = await this.indicators.find({
      where: { versionId: activeVersion.versionId },
    });
    if (!indicators || indicators.length === 0) {
      throw new BadRequestException(
        'Cannot publish template without indicators',
      );
    }

    activeVersion.frozenAt = new Date();
    await this.versions.save(activeVersion);

    template.status = 'published';
    template.publishedBy = publisherId;
    template.publishedAt = new Date();
    await this.templates.save(template);

    return this.findTree(templateId);
  }

  async archive(templateId: string): Promise<TemplateTree> {
    const template = await this.findTemplate(templateId);
    if (template.status !== 'draft' && template.status !== 'published') {
      throw new ConflictException(
        'Only draft or published templates can be archived. The template is already ' +
          template.status + '.',
      );
    }

    template.status = 'archived';
    template.archivedAt = new Date();
    await this.templates.save(template);

    return this.findTree(templateId);
  }

  async getById(templateId: string): Promise<TemplateTree> {
    await this.findTemplate(templateId);
    return this.findTree(templateId);
  }

  async list(): Promise<KpiGoalTemplate[]> {
    return this.templates.find({
      order: { updatedAt: 'DESC' },
    });
  }

  // ---- private helpers ------------------------------------------------

  private async findTemplate(templateId: string) {
    const template = await this.templates.findOne({
      where: { templateId },
    });
    if (!template) {
      throw new NotFoundException('KPI goal template not found');
    }
    return template;
  }

  private async findActiveDraftVersion(templateId: string) {
    return this.versions
      .findOne({ where: { templateId, frozenAt: IsNull() } })
      .catch(() => null);
  }

  private async findTree(templateId: string): Promise<TemplateTree> {
    const template = await this.findTemplate(templateId);
    const version = await this.versions.findOne({
      where: { templateId },
      order: { version: 'DESC' },
    });
    const indicators = version
      ? await this.indicators.find({
          where: { versionId: version.versionId },
        })
      : [];
    const indicatorIds = indicators.map((i) => i.indicatorId);
    const scales = indicatorIds.length
      ? await this.scales.find({ where: { indicatorId: In(indicatorIds) } })
      : [];
    const matrixRows = indicatorIds.length
      ? await this.matrixRows.find({ where: { indicatorId: In(indicatorIds) } })
      : [];
    const matrixColumns = indicatorIds.length
      ? await this.matrixColumns.find({ where: { indicatorId: In(indicatorIds) } })
      : [];

    return { template, version, indicators, scales, matrixRows, matrixColumns };
  }

  private async saveIndicators(
    indicatorDtos: IndicatorDto[],
    versionId: string,
  ): Promise<void> {
    for (const indicatorDto of indicatorDtos) {
      if (indicatorDto.scoreTargetMet < indicatorDto.scoreBelowTarget) {
        throw new BadRequestException(
          'scoreTargetMet must be greater than or equal to scoreBelowTarget',
        );
      }

      const indicatorId = indicatorDto.indicatorId ?? randomUUID();

      const indicator = this.indicators.create({
        indicatorId,
        versionId,
        name: indicatorDto.name,
        description: indicatorDto.description ?? null,
        unit: indicatorDto.unit ?? null,
        target: indicatorDto.target ?? null,
        direction: indicatorDto.direction,
        weight: indicatorDto.weight,
        scoreTargetMet: indicatorDto.scoreTargetMet,
        scoreBelowTarget: indicatorDto.scoreBelowTarget,
        useForScoring: indicatorDto.useForScoring ?? true,
      });
      await this.indicators.save(indicator);

      if (indicatorDto.scales && indicatorDto.scales.length) {
        const scales = indicatorDto.scales.map((s) =>
          this.scales.create({
            scaleId: randomUUID(),
            indicatorId,
            lowerBound: s.lowerBound,
            upperBound: s.upperBound ?? null,
            score: s.score,
          }),
        );
        await this.scales.save(scales);
      }

      if (indicatorDto.matrixRows && indicatorDto.matrixRows.length) {
        const rows = indicatorDto.matrixRows.map((r) =>
          this.matrixRows.create({
            rowId: randomUUID(),
            indicatorId,
            rowLabel: r.rowLabel,
          }),
        );
        await this.matrixRows.save(rows);
      }

      if (indicatorDto.matrixColumns && indicatorDto.matrixColumns.length) {
        const cols = indicatorDto.matrixColumns.map((c) =>
          this.matrixColumns.create({
            colId: randomUUID(),
            indicatorId,
            colLabel: c.colLabel,
          }),
        );
        await this.matrixColumns.save(cols);
      }
    }
  }

  private async clearContent(versionId: string): Promise<void> {
    const indicatorEntities = await this.indicators.find({
      where: { versionId },
    });
    if (!indicatorEntities.length) {
      return;
    }
    const indicatorIds = indicatorEntities.map((i) => i.indicatorId);

    if (indicatorIds.length) {
      await this.scales.delete({ indicatorId: In(indicatorIds) });
    }
    if (indicatorIds.length) {
      await this.matrixRows.delete({ indicatorId: In(indicatorIds) });
    }
    if (indicatorIds.length) {
      await this.matrixColumns.delete({ indicatorId: In(indicatorIds) });
    }
    await this.indicators.delete({ indicatorId: In(indicatorIds) });
  }
}
