import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { BehavioralTemplate } from '../entities/behavioral-template.entity.js';
import { BehavioralTemplateVersion } from '../entities/behavioral-template-version.entity.js';
import { BehavioralSection } from '../entities/behavioral-section.entity.js';
import { BehavioralQuestion } from '../entities/behavioral-question.entity.js';
import { BehavioralChoiceOption } from '../entities/behavioral-choice-option.entity.js';
import { CreateBehavioralTemplateDto } from '../dtos/create-behavioral-template.dto.js';
import { QuestionDto, SectionDto } from '../dtos/behavioral-section.dto.js';
import { UpdateBehavioralTemplateDto } from '../dtos/update-behavioral-template.dto.js';
import type { TemplateTree } from '../types/template-tree.types.js';

@Injectable()
export class BehavioralAssessmentService {
  constructor(
    @InjectRepository(BehavioralTemplate)
    private readonly templates: Repository<BehavioralTemplate>,
    @InjectRepository(BehavioralTemplateVersion)
    private readonly versions: Repository<BehavioralTemplateVersion>,
    @InjectRepository(BehavioralSection)
    private readonly sections: Repository<BehavioralSection>,
    @InjectRepository(BehavioralQuestion)
    private readonly questions: Repository<BehavioralQuestion>,
    @InjectRepository(BehavioralChoiceOption)
    private readonly options: Repository<BehavioralChoiceOption>,
  ) {}

  async create(
    dto: CreateBehavioralTemplateDto,
    creatorId: string | null,
  ): Promise<TemplateTree> {
    const templateId = randomUUID();
    const versionId = randomUUID();

    const template = this.templates.create({
      templateId,
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

    await this.saveSections(dto.sections, versionId);

    return this.findTree(templateId);
  }

  async update(
    templateId: string,
    dto: UpdateBehavioralTemplateDto,
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

    await this.clearContent(activeVersion.versionId);
    await this.saveSections(dto.sections, activeVersion.versionId);

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

    activeVersion.frozenAt = new Date();
    await this.versions.save(activeVersion);

    template.status = 'published';
    template.publishedBy = publisherId;
    template.publishedAt = new Date();
    await this.templates.save(template);

    return this.findTree(templateId);
  }

  async getById(templateId: string): Promise<TemplateTree> {
    await this.findTemplate(templateId);
    return this.findTree(templateId);
  }

  async list(): Promise<BehavioralTemplate[]> {
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
      throw new NotFoundException('Behavioral template not found');
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
    const sections = version
      ? await this.sections.find({
          where: { versionId: version.versionId },
          order: { sortOrder: 'ASC' },
        })
      : [];
    const sectionIds = sections.map((s) => s.sectionId);
    const questions = sectionIds.length
      ? await this.questions.find({
          where: { sectionId: In(sectionIds) },
          order: { sortOrder: 'ASC' },
        })
      : [];
    const questionIds = questions.map((q) => q.questionId);
    const options = questionIds.length
      ? await this.options.find({ where: { questionId: In(questionIds) } })
      : [];

    return { template, version, sections, questions, options };
  }

  private async saveSections(
    sectionDtos: SectionDto[],
    versionId: string,
  ): Promise<void> {
    for (const [index, sectionDto] of sectionDtos.entries()) {
      const sectionId = sectionDto.sectionId ?? randomUUID();

      const section = this.sections.create({
        sectionId,
        versionId,
        title: sectionDto.title,
        sortOrder: sectionDto.sortOrder ?? index,
      });
      await this.sections.save(section);

      await this.saveQuestions(sectionDto.questions ?? [], sectionId);
    }
  }

  private async saveQuestions(
    questionDtos: QuestionDto[],
    sectionId: string,
  ): Promise<void> {
    for (const [index, questionDto] of questionDtos.entries()) {
      if (
        questionDto.questionType === 'multiple_choice' &&
        (!questionDto.choiceOptions || questionDto.choiceOptions.length < 2)
      ) {
        throw new BadRequestException(
          'multiple_choice questions require at least two choice options',
        );
      }

      const questionId = questionDto.questionId ?? randomUUID();
      const allowNotObserved =
        questionDto.questionType === 'rating_scale'
          ? questionDto.allowNotObserved ?? false
          : null;

      const question = this.questions.create({
        questionId,
        sectionId,
        prompt: questionDto.prompt,
        questionType: questionDto.questionType,
        isRequired: questionDto.isRequired ?? true,
        allowNotObserved,
        sortOrder: questionDto.sortOrder ?? index,
      });
      await this.questions.save(question);

      const options = (questionDto.choiceOptions ?? []).map((o) =>
        this.options.create({
          optionId: randomUUID(),
          questionId,
          label: o.label,
        }),
      );
      if (options.length) {
        await this.options.save(options);
      }
    }
  }

  private async clearContent(versionId: string): Promise<void> {
    const sectionEntities = await this.sections.find({
      where: { versionId },
    });
    if (!sectionEntities.length) {
      return;
    }
    const sectionIds = sectionEntities.map((s) => s.sectionId);
    const questionEntities = await this.questions.find({
      where: { sectionId: In(sectionIds) },
    });
    const questionIds = questionEntities.map((q) => q.questionId);

    if (questionIds.length) {
      await this.options.delete({ questionId: In(questionIds) });
    }
    if (questionIds.length) {
      await this.questions.delete({ sectionId: In(sectionIds) });
    }
    await this.sections.delete({ sectionId: In(sectionIds) });
  }
}
