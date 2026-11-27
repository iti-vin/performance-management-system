import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import {
  PERCENTAGE_TARGET_MESSAGE,
  WEIGHTS_TOTAL_MESSAGE,
  indicatorMatrixErrors,
  targetExceedsUnit,
  weightsTotalHundred,
  type IndicatorMatrixInput,
} from '@pms/shared-types';
import type { TemplateVersionDto } from '@pms/shared-types';
import { detailsOfVersion, publicationHistory } from './publication-history.js';
import { writeAudit } from '../../../common/audit/write-audit.js';
import { KpiGoalTemplate } from '../entities/kpi-goal-template.entity.js';
import { KpiTemplateVersion } from '../entities/kpi-template-version.entity.js';
import { KpiIndicator } from '../entities/kpi-indicator.entity.js';
import { KpiIndicatorScale } from '../entities/kpi-indicator-scale.entity.js';
import { KpiIndicatorMatrixRow } from '../entities/kpi-indicator-matrix-row.entity.js';
import { KpiIndicatorMatrixCell } from '../entities/kpi-indicator-matrix-cell.entity.js';
import { KpiIndicatorMatrixColumn } from '../entities/kpi-indicator-matrix-column.entity.js';
import { CreateKpiGoalTemplateDto } from '../dtos/create-kpi-goal-template.dto.js';
import { IndicatorDto } from '../dtos/kpi-indicator.dto.js';
import { UpdateKpiGoalTemplateDto } from '../dtos/update-kpi-goal-template.dto.js';
import type { TemplateTree } from '../types/template-tree.types.js';
import { CompanyResolver } from './company-resolver.service.js';

/** Reject an indicator whose met score is below its below-target score. */
function assertIndicatorScores(indicators: IndicatorDto[]): void {
  for (const indicator of indicators) {
    if (targetExceedsUnit(indicator.unit ?? "", indicator.target ?? null)) {
      throw new BadRequestException(PERCENTAGE_TARGET_MESSAGE);
    }
    if (indicator.scoreTargetMet < indicator.scoreBelowTarget) {
      throw new BadRequestException(
        'scoreTargetMet must be greater than or equal to scoreBelowTarget',
      );
    }
  }
}

function toMatrixInput(indicator: IndicatorDto): IndicatorMatrixInput {
  return {
    matrixKind: indicator.matrixKind ?? 'none',
    matrixTitle: indicator.matrixTitle ?? null,
    scaleBound: indicator.scaleBound ?? null,
    useForScoring: indicator.useForScoring ?? false,
    scales: (indicator.scales ?? []).map((scale) => ({
      lowerBound: scale.lowerBound ?? null,
      upperBound: scale.upperBound ?? null,
      label: scale.label,
      score: scale.score,
    })),
    matrixColumns: (indicator.matrixColumns ?? []).map((column) => ({
      label: column.label,
    })),
    matrixRows: (indicator.matrixRows ?? []).map((row) => ({ cells: row.cells })),
  };
}

/**
 * Reject an indicator whose matrix breaks the rules of Tpl-G-004 and Tpl-G-005.
 * The rules are the ones the editor uses, in @pms/shared-types.
 */
function assertIndicatorMatrices(indicators: IndicatorDto[]): void {
  indicators.forEach((indicator, index) => {
    const [problem] = indicatorMatrixErrors(toMatrixInput(indicator));
    if (problem) {
      throw new BadRequestException(`Indicator ${index + 1}: ${problem}`);
    }
  });
}

/** A published template needs indicators with a unit and a target (Tpl-G-002) that total 100 percent (Tpl-G-003). */
function assertPublishable(indicators: { weight: number; unit?: string | null; target?: number | null }[]): void {
  if (indicators.length === 0) {
    throw new BadRequestException('Cannot publish template without indicators');
  }
  if (indicators.some(({ unit, target }) => !unit?.trim() || target === null || target === undefined)) {
    throw new BadRequestException('Set a unit and a target for every indicator before you publish.');
  }
  if (!weightsTotalHundred(indicators.map(({ weight }) => Number(weight)))) {
    throw new BadRequestException(WEIGHTS_TOTAL_MESSAGE);
  }
}

/**
 * The unit and the direction of an indicator that is already published do not change:
 * evaluations and snapshots read them. A new indicator chooses its own.
 */
function assertPublishedIndicatorsKeepUnitAndDirection(
  indicators: IndicatorDto[],
  previous: Pick<KpiIndicator, 'indicatorId' | 'unit' | 'direction'>[],
): void {
  indicators.forEach((indicator, index) => {
    const before = previous.find((row) => row.indicatorId === indicator.indicatorId);
    if (!before) return;
    if (
      (indicator.unit ?? null) !== (before.unit ?? null) ||
      indicator.direction !== before.direction
    ) {
      throw new BadRequestException(
        `Indicator ${index + 1}: the measurement unit and achievement direction of a published indicator cannot change.`,
      );
    }
  });
}

/**
 * A position must be one that an employee of the template's company holds. A null
 * position is company-wide. The position a template already has stays valid: an
 * edit must not fail because the last employee in that role left.
 */
async function assertPositionInCompany(
  manager: EntityManager,
  position: string | null | undefined,
  company: string,
  current: string | null = null,
): Promise<void> {
  if (position === null || position === undefined || position === current) return;

  const rows: unknown[] = await manager.query(
    'SELECT 1 FROM pms.employees WHERE company = $1 AND position = $2 LIMIT 1',
    [company, position],
  );
  if (rows.length === 0) {
    throw new BadRequestException('No employee of your company holds that position.');
  }
}

/** What an audit row keeps of a template. A frozen version keeps its own content. */
const factsOf = ({ name, description, position, status, currentVersion }: KpiGoalTemplate) => ({
  name,
  description,
  position,
  status,
  currentVersion,
});

/** One audit row of a change of a template (PRD 4.7). */
const auditTemplate = (
  manager: EntityManager,
  action: string,
  template: KpiGoalTemplate,
  actorId: string | null,
  beforeJson: Record<string, unknown> | null,
) =>
  writeAudit(manager, {
    entityType: 'kpi_template',
    entityId: template.templateId,
    action,
    actorId,
    beforeJson,
    afterJson: factsOf(template),
  });

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
    @InjectRepository(KpiIndicatorMatrixCell)
    private readonly cells: Repository<KpiIndicatorMatrixCell>,
    private readonly dataSource: DataSource,
    private readonly companies: CompanyResolver,
  ) {}

  /** The positions that employees of the caller's company hold, for the template editor. */
  async listPositions(userId: string) {
    const company = await this.companies.resolveCompany(userId);
    const rows: { position: string }[] = await this.dataSource.manager.query(
      `SELECT DISTINCT position FROM pms.employees
        WHERE company = $1 AND position IS NOT NULL AND position <> ''
        ORDER BY position`,
      [company],
    );
    return rows.map((row) => row.position);
  }

  async create(
    dto: CreateKpiGoalTemplateDto,
    creatorId: string,
  ): Promise<TemplateTree> {
    assertIndicatorScores(dto.indicators);
    assertIndicatorMatrices(dto.indicators);

    const { company, actorId } = await this.companies.resolveAccount(creatorId);
    await assertPositionInCompany(
      this.dataSource.manager,
      dto.position,
      company,
    );

    const templateId = randomUUID();
    const versionId = randomUUID();

    await this.dataSource.transaction(async (manager) => {
      const template = manager.create(KpiGoalTemplate, {
        templateId,
        position: dto.position ?? null,
        company,
        name: dto.name,
        description: dto.description?.trim() || null,
        status: 'draft',
        currentVersion: 1,
        publishedBy: null,
        publishedAt: null,
        archivedAt: null,
      });
      await manager.save(template);
      await manager.save(
        manager.create(KpiTemplateVersion, {
          versionId,
          templateId,
          version: 1,
          frozenAt: null,
          createdBy: actorId,
        }),
      );
      await this.saveIndicators(manager, dto.indicators, versionId);
      await auditTemplate(manager, 'created', template, actorId, null);
    });

    return this.findTree(templateId);
  }

  async update(
    templateId: string,
    dto: UpdateKpiGoalTemplateDto,
    userId: string,
  ): Promise<TemplateTree> {
    assertIndicatorScores(dto.indicators);
    assertIndicatorMatrices(dto.indicators);
    const { company, actorId } = await this.companies.resolveAccount(userId);

    await this.dataSource.transaction(async (manager) => {
      const template = await this.lockTemplate(manager, templateId, company);
      if (template.status !== 'draft') {
        throw new ConflictException(
          'Only draft templates can be updated. Publish or archive first.',
        );
      }
      const before = factsOf(template);

      const activeVersion = await this.findActiveDraftVersionIn(
        manager,
        templateId,
      );

      if (dto.position !== undefined) {
        await assertPositionInCompany(
          manager,
          dto.position,
          template.company,
          template.position,
        );
        template.position = dto.position;
      }
      template.name = dto.name;
      template.description = dto.description?.trim() || null;
      await manager.save(template);

      const replaced = await manager.find(KpiIndicator, { where: { versionId: activeVersion.versionId } });
      const replacedIds = replaced.map((indicator) => indicator.indicatorId);
      await this.clearContent(manager, replacedIds);
      await this.saveIndicators(manager, dto.indicators, activeVersion.versionId, replacedIds);
      await auditTemplate(manager, 'updated', template, actorId, before);
    });

    return this.findTree(templateId);
  }

  /**
   * An edit of a published template: version N+1, published at once. The published
   * version is immutable (Tpl-G-006), so the old version and its rows stay as they
   * are, and the indicators of the new version get new ids. The template row is
   * locked, so two edits at once get version numbers in turn.
   */
  async createVersion(
    templateId: string,
    dto: UpdateKpiGoalTemplateDto,
    userId: string,
  ): Promise<TemplateTree> {
    assertIndicatorScores(dto.indicators);
    assertIndicatorMatrices(dto.indicators);
    assertPublishable(dto.indicators);
    const { company, actorId } = await this.companies.resolveAccount(userId);

    await this.dataSource.transaction(async (manager) => {
      const template = await this.lockTemplate(manager, templateId, company);
      if (template.status !== 'published') {
        throw new ConflictException(
          'Only a published template gets a new version. Update a draft instead.',
        );
      }

      const current = await manager.findOne(KpiTemplateVersion, {
        where: { templateId },
        order: { version: 'DESC' },
      });
      const previous = current
        ? await manager.find(KpiIndicator, { where: { versionId: current.versionId } })
        : [];
      assertPublishedIndicatorsKeepUnitAndDirection(dto.indicators, previous);
      const before = factsOf(template);

      if (dto.position !== undefined) {
        await assertPositionInCompany(manager, dto.position, template.company, template.position);
        template.position = dto.position;
      }
      template.name = dto.name;
      template.description = dto.description?.trim() || null;
      template.currentVersion += 1;
      template.publishedBy = actorId;
      template.publishedAt = new Date();
      await manager.save(template);

      const versionId = randomUUID();
      await manager.save(
        manager.create(KpiTemplateVersion, {
          versionId,
          templateId,
          version: template.currentVersion,
          frozenAt: new Date(),
          createdBy: actorId,
        }),
      );
      await this.saveIndicators(manager, dto.indicators, versionId);
      await auditTemplate(manager, 'version_published', template, actorId, before);
    });

    return this.findTree(templateId);
  }

  async publish(templateId: string, userId: string): Promise<TemplateTree> {
    const { company, actorId } = await this.companies.resolveAccount(userId);

    await this.dataSource.transaction(async (manager) => {
      const template = await this.lockTemplate(manager, templateId, company);
      if (template.status !== 'draft') {
        throw new ConflictException(
          'Only draft templates can be published. The template is already ' +
            template.status + '.',
        );
      }

      const activeVersion = await this.findActiveDraftVersionIn(
        manager,
        templateId,
      );

      const indicators = await manager.find(KpiIndicator, {
        where: { versionId: activeVersion.versionId },
      });
      assertPublishable(indicators);

      activeVersion.frozenAt = new Date();
      await manager.save(activeVersion);

      const before = factsOf(template);
      template.status = 'published';
      template.publishedBy = actorId;
      template.publishedAt = new Date();
      await manager.save(template);
      await auditTemplate(manager, 'published', template, actorId, before);
    });

    return this.findTree(templateId);
  }

  async archive(templateId: string, userId: string): Promise<TemplateTree> {
    const { company, actorId } = await this.companies.resolveAccount(userId);

    await this.dataSource.transaction(async (manager) => {
      const template = await this.lockTemplate(manager, templateId, company);
      if (template.status !== 'draft' && template.status !== 'published') {
        throw new ConflictException(
          'Only draft or published templates can be archived. The template is already ' +
            template.status + '.',
        );
      }

      const before = factsOf(template);
      template.status = 'archived';
      template.archivedAt = new Date();
      await manager.save(template);
      await auditTemplate(manager, 'archived', template, actorId, before);
    });

    return this.findTree(templateId);
  }

  /** A template of another company answers like one that does not exist. */
  async getById(templateId: string, userId: string): Promise<TemplateTree> {
    const company = await this.companies.resolveCompany(userId);
    await this.findTemplate(templateId, this.dataSource.manager, company);
    return this.findTree(templateId);
  }

  /**
   * Every template of the company of the account, with the indicator count of its latest
   * version (the same version `findTree` shows), in one query.
   */
  async list(userId: string) {
    const company = await this.companies.resolveCompany(userId);
    const rows: Record<string, unknown>[] = await this.dataSource.manager.query(
      `SELECT t.template_id, t.position, t.company, t.name, t.description,
              t.status, t.current_version,
              t.published_by, t.published_at, t.archived_at, t.created_at, t.updated_at,
              (SELECT count(*)
                 FROM pms.kpi_indicators i
                WHERE i.version_id = (SELECT v.version_id
                                        FROM pms.kpi_template_versions v
                                       WHERE v.template_id = t.template_id
                                       ORDER BY v.version DESC
                                       LIMIT 1)) AS indicator_count
         FROM pms.kpi_goal_templates t
        WHERE t.company = $1
        ORDER BY t.updated_at DESC`,
      [company],
    );
    return rows.map((row) => ({
      templateId: row.template_id,
      position: row.position,
      company: row.company,
      name: row.name,
      description: row.description,
      status: row.status,
      currentVersion: row.current_version,
      publishedBy: row.published_by,
      publishedAt: row.published_at,
      archivedAt: row.archived_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      indicatorCount: Number(row.indicator_count),
    }));
  }

  /** The content of one published version, to read only (PRD 4.9). */
  async getVersion(templateId: string, version: number, userId: string): Promise<TemplateTree> {
    const company = await this.companies.resolveCompany(userId);
    await this.findTemplate(templateId, this.dataSource.manager, company);
    const found = await this.versions.findOne({ where: { templateId, version } });
    if (!found?.frozenAt) throw new NotFoundException('Version not found');
    const [tree, details] = await Promise.all([
      this.findTree(templateId, found),
      detailsOfVersion(this.dataSource.manager, { entityType: 'kpi_template', templateId, version, keys: ['name', 'description', 'position'] }),
    ]);
    return { ...tree, template: { ...tree.template, ...details } };
  }

  async listVersions(templateId: string, userId: string): Promise<TemplateVersionDto[]> {
    const company = await this.companies.resolveCompany(userId);
    const template = await this.findTemplate(templateId, this.dataSource.manager, company);
    const versions = await this.versions.find({ where: { templateId } });
    return publicationHistory(this.dataSource.manager, { entityType: 'kpi_template', company, template, versions });
  }

  // ---- private helpers ------------------------------------------------

  /**
   * Pass the transaction manager inside a transaction, so the read joins it. A caller that
   * acts for an account passes its company: the read of a tree comes after that check.
   */
  private async findTemplate(
    templateId: string,
    manager: EntityManager = this.dataSource.manager,
    company?: string,
  ) {
    const template = await manager.findOne(KpiGoalTemplate, {
      where: company === undefined ? { templateId } : { templateId, company },
    });
    if (!template) {
      throw new NotFoundException('KPI goal template not found');
    }
    return template;
  }

  /** Reads the template row of the company with a write lock, so two writers wait for each other. */
  private async lockTemplate(manager: EntityManager, templateId: string, company: string) {
    const template = await manager.findOne(KpiGoalTemplate, {
      where: { templateId, company },
      lock: { mode: 'pessimistic_write' },
    });
    if (!template) throw new NotFoundException('KPI goal template not found');
    return template;
  }

  private async findActiveDraftVersionIn(
    manager: EntityManager,
    templateId: string,
  ) {
    const version = await manager.findOne(KpiTemplateVersion, {
      where: { templateId, frozenAt: IsNull() },
    });
    if (!version) {
      throw new NotFoundException('No active draft version found for template');
    }
    return version;
  }

  /** The template with the content of one version: the latest, unless the caller names one. */
  private async findTree(templateId: string, shown?: KpiTemplateVersion): Promise<TemplateTree> {
    const template = await this.findTemplate(templateId);
    const version =
      shown ??
      (await this.versions.findOne({
        where: { templateId },
        order: { version: 'DESC' },
      }));
    const indicators = version
      ? await this.indicators.find({
          where: { versionId: version.versionId },
        })
      : [];
    const indicatorIds = indicators.map((i) => i.indicatorId);
    // Rows of a scale are in threshold order: a minimum scale by its lower bound, a
    // maximum scale by its upper bound, with the unbounded final row last.
    const scales = indicatorIds.length
      ? await this.scales.find({
          where: { indicatorId: In(indicatorIds) },
          order: {
            lowerBound: 'ASC',
            upperBound: { direction: 'ASC', nulls: 'LAST' },
          },
        })
      : [];
    const matrixRows = indicatorIds.length
      ? await this.matrixRows.find({
          where: { indicatorId: In(indicatorIds) },
          order: { position: 'ASC' },
        })
      : [];
    const matrixColumns = indicatorIds.length
      ? await this.matrixColumns.find({
          where: { indicatorId: In(indicatorIds) },
          order: { position: 'ASC' },
        })
      : [];
    const rowIds = matrixRows.map((row) => row.rowId);
    const matrixCells = rowIds.length
      ? await this.cells.find({ where: { rowId: In(rowIds) } })
      : [];

    return {
      template,
      version,
      indicators,
      scales,
      matrixRows,
      matrixColumns,
      matrixCells,
    };
  }

  private async saveIndicators(
    manager: EntityManager,
    indicatorDtos: IndicatorDto[],
    versionId: string,
    replacedIds: readonly string[] = [],
  ): Promise<void> {
    // An id of the request stays only when it names an indicator of the draft that this save
    // replaces, and only once. Any other id may belong to a row of another version, which a
    // save would move and overwrite (CWE-639, Tpl-G-006).
    const unused = new Set(replacedIds);
    for (const indicatorDto of indicatorDtos) {
      const asked = indicatorDto.indicatorId;
      const indicatorId = asked && unused.delete(asked) ? asked : randomUUID();

      await manager.save(
        manager.create(KpiIndicator, {
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
          matrixKind: indicatorDto.matrixKind ?? 'none',
          matrixTitle: indicatorDto.matrixTitle?.trim() || null,
          scaleBound: indicatorDto.scaleBound ?? null,
          useForScoring: indicatorDto.useForScoring ?? false,
        }),
      );

      if (indicatorDto.scales && indicatorDto.scales.length) {
        const scales = indicatorDto.scales.map((s) =>
          manager.create(KpiIndicatorScale, {
            scaleId: randomUUID(),
            indicatorId,
            lowerBound: s.lowerBound ?? null,
            upperBound: s.upperBound ?? null,
            label: s.label.trim(),
            score: s.score,
          }),
        );
        await manager.save(scales);
      }

      await this.saveReferenceTable(manager, indicatorDto, indicatorId);
    }
  }

  /** Columns first, then rows, then the cells that join them. The array order is the position. */
  private async saveReferenceTable(
    manager: EntityManager,
    indicatorDto: IndicatorDto,
    indicatorId: string,
  ): Promise<void> {
    const columnDtos = indicatorDto.matrixColumns ?? [];
    const rowDtos = indicatorDto.matrixRows ?? [];
    if (columnDtos.length === 0 || rowDtos.length === 0) return;

    const columns = columnDtos.map((column, position) =>
      manager.create(KpiIndicatorMatrixColumn, {
        colId: randomUUID(),
        indicatorId,
        colLabel: column.label.trim(),
        position,
      }),
    );
    await manager.save(columns);

    const rows = rowDtos.map((_row, position) =>
      manager.create(KpiIndicatorMatrixRow, {
        rowId: randomUUID(),
        indicatorId,
        rowLabel: null,
        position,
      }),
    );
    await manager.save(rows);

    const cells = rowDtos.flatMap((row, rowIndex) =>
      columns.map((column, columnIndex) =>
        manager.create(KpiIndicatorMatrixCell, {
          rowId: rows[rowIndex]!.rowId,
          colId: column.colId,
          value: row.cells[columnIndex] ?? '',
        }),
      ),
    );
    await manager.save(cells);
  }

  private async clearContent(manager: EntityManager, indicatorIds: string[]): Promise<void> {
    if (!indicatorIds.length) return;

    // A cell belongs to a row and a column, so the cells go first.
    await manager.query(
      'DELETE FROM pms.kpi_indicator_matrix_cells WHERE row_id IN (SELECT row_id FROM pms.kpi_indicator_matrix_rows WHERE indicator_id = ANY($1::uuid[]))',
      [indicatorIds],
    );
    await manager.delete(KpiIndicatorScale, { indicatorId: In(indicatorIds) });
    await manager.delete(KpiIndicatorMatrixRow, { indicatorId: In(indicatorIds) });
    await manager.delete(KpiIndicatorMatrixColumn, {
      indicatorId: In(indicatorIds),
    });
    await manager.delete(KpiIndicator, { indicatorId: In(indicatorIds) });
  }
}
