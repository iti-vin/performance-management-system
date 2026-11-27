import { Test, type TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { Mock } from 'vitest';
import { BehavioralAssessmentService } from './behavioral-assessment.service.js';
import { BehavioralAssessmentController } from '../controllers/behavioral-assessment.controller.js';
import { BehavioralTemplate } from '../entities/behavioral-template.entity.js';
import { BehavioralTemplateVersion } from '../entities/behavioral-template-version.entity.js';
import { BehavioralSection } from '../entities/behavioral-section.entity.js';
import { BehavioralQuestion } from '../entities/behavioral-question.entity.js';
import { BehavioralChoiceOption } from '../entities/behavioral-choice-option.entity.js';
import { CreateBehavioralTemplateDto } from '../dtos/create-behavioral-template.dto.js';
import { CompanyResolver } from '../../kpi-goals/services/company-resolver.service.js';

const ACTOR_ID = '00000000-0000-0000-0000-000000000021';

type MockRepo<T> = {
  create: Mock<(data: Partial<T>) => T>;
  save: Mock<(entity: T) => Promise<T>>;
  find: Mock<(...args: unknown[]) => Promise<T[]>>;
  findOne: Mock<(...args: unknown[]) => Promise<T | null>>;
  delete: Mock<(...args: unknown[]) => Promise<unknown>>;
};

function createRepo<T>(): MockRepo<T> {
  return {
    create: vi.fn((d: Partial<T>) => d as T),
    save: vi.fn(async (e: T) => e),
    find: vi.fn(async () => []),
    findOne: vi.fn(async () => null),
    delete: vi.fn(async () => undefined),
  };
}

describe('BehavioralAssessmentService', () => {
  let service: BehavioralAssessmentService;
  let templates: MockRepo<BehavioralTemplate>;
  let versions: MockRepo<BehavioralTemplateVersion>;
  let sections: MockRepo<BehavioralSection>;
  let questions: MockRepo<BehavioralQuestion>;
  let options: MockRepo<BehavioralChoiceOption>;
  const resolver = { resolveAccount: vi.fn() };
  // The transaction of createVersion: its manager hands out the same repository mocks.
  const manager = {
    findOne: vi.fn(),
    save: vi.fn(async (entity: unknown) => entity),
    create: vi.fn((_entity: unknown, data: unknown) => data),
    delete: vi.fn(),
    getRepository: vi.fn(),
  };
  const dataSource = {
    transaction: vi.fn(async (run: (m: typeof manager) => Promise<unknown>) => run(manager)),
    manager: { find: vi.fn(async (): Promise<unknown[]> => []) },
  };

  async function build() {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        BehavioralAssessmentService,
        {
          provide: getRepositoryToken(BehavioralTemplate),
          useValue: templates,
        },
        {
          provide: getRepositoryToken(BehavioralTemplateVersion),
          useValue: versions,
        },
        {
          provide: getRepositoryToken(BehavioralSection),
          useValue: sections,
        },
        {
          provide: getRepositoryToken(BehavioralQuestion),
          useValue: questions,
        },
        {
          provide: getRepositoryToken(BehavioralChoiceOption),
          useValue: options,
        },
        { provide: CompanyResolver, useValue: resolver },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = moduleRef.get(BehavioralAssessmentService);
  }

  beforeEach(async () => {
    templates = createRepo();
    versions = createRepo();
    sections = createRepo();
    questions = createRepo();
    options = createRepo();
    manager.findOne.mockReset();
    manager.save.mockReset().mockImplementation(async (entity: unknown) => entity);
    manager.create.mockReset().mockImplementation((_entity: unknown, data: unknown) => data);
    manager.delete.mockReset();
    manager.getRepository.mockReset().mockImplementation((entity: unknown) => {
      if (entity === BehavioralTemplate) return templates;
      if (entity === BehavioralTemplateVersion) return versions;
      if (entity === BehavioralSection) return sections;
      if (entity === BehavioralQuestion) return questions;
      if (entity === BehavioralChoiceOption) return options;
      return undefined;
    });
    dataSource.transaction.mockClear();
    resolver.resolveAccount
      .mockReset()
      .mockResolvedValue({ company: 'Example Company', actorId: ACTOR_ID });
    await build();
  });

  describe('create', () => {
    it('creates a draft template with one draft version and its sections', async () => {
      templates.findOne.mockResolvedValue({
        templateId: 't-1',
        status: 'draft',
        currentVersion: 1,
      } as BehavioralTemplate);
      versions.findOne.mockResolvedValue({
        versionId: 'v-1',
        version: 1,
        frozenAt: null,
        createdBy: ACTOR_ID,
      } as BehavioralTemplateVersion);

      const dto = {
        name: 'Quarterly Review',
        description: ' Reflect on observable behaviors ',
        category: 'general_performance',
        reviewType: 'self',
        sections: [
          {
            title: 'Leadership',
            questions: [
              {
                prompt: 'Meets deadlines?',
                questionType: 'rating_scale' as const,
              },
            ],
          },
        ],
      } as unknown as CreateBehavioralTemplateDto;

      const result = await service.create(dto, 'user-1');

      expect(templates.create).toHaveBeenCalledWith(
        expect.objectContaining({
          company: 'Example Company',
          name: 'Quarterly Review',
          description: 'Reflect on observable behaviors',
          category: 'general_performance',
          reviewType: 'self',
        }),
      );
      expect(result.template.status).toBe('draft');
      expect(result.template.currentVersion).toBe(1);
      expect(result.version?.version).toBe(1);
      expect(result.version?.frozenAt).toBeNull();
      expect(result.version?.createdBy).toBe(ACTOR_ID);
      expect(resolver.resolveAccount).toHaveBeenCalledWith('user-1');
      expect(versions.create).toHaveBeenCalledWith(
        expect.objectContaining({ createdBy: ACTOR_ID }),
      );
      expect(sections.create).toHaveBeenCalledTimes(1);
      expect(questions.create).toHaveBeenCalledTimes(1);
    });

    it('takes the company from the account and refuses an account with no company, before any write', async () => {
      resolver.resolveAccount.mockRejectedValue(new ForbiddenException());
      const dto = { sections: [] } as unknown as CreateBehavioralTemplateDto;

      await expect(service.create(dto, 'user-1')).rejects.toThrow(ForbiddenException);

      expect(templates.save).not.toHaveBeenCalled();
      expect(versions.save).not.toHaveBeenCalled();
    });

    it('rejects multiple_choice questions without two options', async () => {
      const dto = {
        sections: [
          {
            title: 'Section',
            questions: [
              {
                prompt: 'Pick one',
                questionType: 'multiple_choice' as const,
                choiceOptions: [{ label: 'Only one' }],
              },
            ],
          },
        ],
      } as unknown as CreateBehavioralTemplateDto;

      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('saves the template, the version, and the content in one transaction', async () => {
      templates.findOne.mockResolvedValue({ templateId: 't-1', status: 'draft' } as BehavioralTemplate);
      const dto = {
        name: 'Quarterly Review',
        sections: [{ title: 'S', questions: [{ prompt: 'Q', questionType: 'short_answer' as const }] }],
      } as unknown as CreateBehavioralTemplateDto;

      await service.create(dto, 'user-1');

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['the same label twice', ['Yes', 'Yes']],
      ['labels that differ only by case', ['Yes', 'yes']],
      ['labels that differ only by spaces', ['Yes', ' Yes ']],
      ['a blank label', ['Yes', '   ']],
    ])('refuses %s with a 400 before any write', async (_label, labels) => {
      const dto = {
        sections: [
          {
            title: 'S',
            questions: [
              { prompt: 'Pick', questionType: 'multiple_choice' as const, choiceOptions: labels.map((label) => ({ label })) },
            ],
          },
        ],
      } as unknown as CreateBehavioralTemplateDto;

      await expect(service.create(dto, 'user-1')).rejects.toThrow(BadRequestException);

      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(templates.save).not.toHaveBeenCalled();
      expect(versions.save).not.toHaveBeenCalled();
      expect(sections.save).not.toHaveBeenCalled();
    });

    it('saves no options for a question that is not multiple choice, even when the request carries some', async () => {
      templates.findOne.mockResolvedValue({ templateId: 't-1', status: 'draft' } as BehavioralTemplate);
      const dto = {
        sections: [
          {
            title: 'S',
            questions: [
              { prompt: 'Rate', questionType: 'rating_scale', choiceOptions: [{ label: 'Yes' }, { label: 'Yes' }] },
            ],
          },
        ],
      } as unknown as CreateBehavioralTemplateDto;

      await service.create(dto, 'user-1');

      expect(options.create).not.toHaveBeenCalled();
      expect(options.save).not.toHaveBeenCalled();
    });

    it('still saves a draft with no section: only a published version needs content', async () => {
      templates.findOne.mockResolvedValue({ templateId: 't-1', status: 'draft' } as BehavioralTemplate);
      const dto = { name: 'Empty draft', sections: [] } as unknown as CreateBehavioralTemplateDto;

      await expect(service.create(dto, 'user-1')).resolves.toBeDefined();
    });

    it('stores allowNotObserved only for rating_scale questions', async () => {
      templates.findOne.mockResolvedValue({
        templateId: 't-1',
        status: 'draft',
        currentVersion: 1,
      } as BehavioralTemplate);
      versions.find.mockResolvedValue([
        { versionId: 'v-1', version: 1, frozenAt: null } as BehavioralTemplateVersion,
      ]);

      const dto = {
        sections: [
          {
            title: 'Section',
            questions: [
              {
                prompt: 'Rate',
                questionType: 'rating_scale' as const,
                allowNotObserved: true,
              },
              {
                prompt: 'Answer',
                questionType: 'short_answer' as const,
                allowNotObserved: true,
              },
            ],
          },
        ],
      } as unknown as CreateBehavioralTemplateDto;

      await service.create(dto, 'user-1');

      const first = (questions.create as unknown as Mock).mock.calls[0]?.[0] as {
        questionType: string;
        allowNotObserved: boolean | null;
      };
      const second = (questions.create as unknown as Mock).mock.calls[1]?.[0] as {
        questionType: string;
        allowNotObserved: boolean | null;
      };
      expect(first.allowNotObserved).toBe(true);
      expect(second.allowNotObserved).toBeNull();
    });
  });

  describe('update', () => {
    it('rejects updates on non-draft templates', async () => {
      templates.findOne.mockResolvedValue({
        templateId: 't-1',
        status: 'published',
      } as BehavioralTemplate);

      await expect(
        service.update('t-1', { sections: [] } as unknown as never, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('refuses duplicate options with a 400 before it deletes the old content of the draft', async () => {
      templates.findOne.mockResolvedValue({ templateId: 't-1', status: 'draft' } as BehavioralTemplate);
      versions.findOne.mockResolvedValue({ versionId: 'v-1', frozenAt: null } as BehavioralTemplateVersion);
      const dto = {
        sections: [
          {
            title: 'S',
            questions: [
              { prompt: 'Pick', questionType: 'multiple_choice', choiceOptions: [{ label: 'Yes' }, { label: 'yes' }] },
            ],
          },
        ],
      } as unknown as never;

      await expect(service.update('t-1', dto, 'user-1')).rejects.toThrow(BadRequestException);

      expect(sections.delete).not.toHaveBeenCalled();
      expect(questions.delete).not.toHaveBeenCalled();
      expect(options.delete).not.toHaveBeenCalled();
      expect(templates.save).not.toHaveBeenCalled();
    });

    it('replaces the details and the content in one transaction, with the template row locked', async () => {
      templates.findOne.mockResolvedValue({ templateId: 't-1', status: 'draft' } as BehavioralTemplate);
      versions.findOne.mockResolvedValue({ versionId: 'v-1', frozenAt: null } as BehavioralTemplateVersion);

      await service.update('t-1', { sections: [] } as unknown as never, 'user-1');

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(templates.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
      );
    });

    it('changes the details of a draft only for the fields it is given', async () => {
      const template = {
        templateId: 't-1',
        status: 'draft',
        name: 'Old name',
        description: 'Old description',
        category: 'general_performance',
        reviewType: 'self',
      } as BehavioralTemplate;
      templates.findOne.mockResolvedValue(template);
      versions.findOne.mockResolvedValue({
        versionId: 'v-1',
        frozenAt: null,
      } as BehavioralTemplateVersion);

      await service.update('t-1', {
        name: ' New name ',
        category: 'peer_feedback',
        sections: [],
      } as unknown as never, 'user-1');

      expect(templates.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New name',
          description: 'Old description',
          category: 'peer_feedback',
          reviewType: 'self',
        }),
      );
    });
  });

  describe('audit rows (PRD 5.7)', () => {
    const rows = () =>
      manager.save.mock.calls.map((call) => call[0] as Record<string, unknown>).filter((value) => value.eventId);
    const stored = (status: string) =>
      templates.findOne.mockResolvedValue({
        templateId: 't-1',
        company: 'Example Company',
        name: 'Old',
        description: null,
        category: 'general_performance',
        reviewType: 'self',
        status,
        currentVersion: 1,
      } as BehavioralTemplate);
    const draftVersion = () => versions.findOne.mockResolvedValue({ versionId: 'v-1', frozenAt: null } as BehavioralTemplateVersion);
    const row = (action: string, before: object, after: object) =>
      expect.objectContaining({
        entityType: 'behavioral_template',
        entityId: 't-1',
        action,
        actorId: ACTOR_ID,
        beforeJson: expect.objectContaining(before),
        afterJson: expect.objectContaining(after),
      });

    it('writes one row for a creation', async () => {
      stored('draft');

      await service.create({ name: 'New', category: 'general_performance', reviewType: 'self', sections: [] } as never, 'user-1');

      expect(rows()).toEqual([
        expect.objectContaining({ entityType: 'behavioral_template', action: 'created', actorId: ACTOR_ID, beforeJson: null }),
      ]);
    });

    it('writes one row for an update, with the values before and after', async () => {
      stored('draft');
      draftVersion();

      await service.update('t-1', { name: 'Renamed', sections: [] } as never, 'user-1');

      expect(rows()).toEqual([row('updated', { name: 'Old' }, { name: 'Renamed' })]);
    });

    it('writes one row for a publication', async () => {
      stored('draft');
      draftVersion();
      sections.find.mockResolvedValue([{ sectionId: 's-1' } as BehavioralSection]);
      questions.find.mockResolvedValue([{ questionId: 'q-1', sectionId: 's-1' } as BehavioralQuestion]);

      await service.publish('t-1', 'user-1');

      expect(rows()).toEqual([row('published', { status: 'draft' }, { status: 'published', currentVersion: 1 })]);
    });

    it('writes one row for a new version', async () => {
      stored('published');
      manager.findOne.mockResolvedValue(await templates.findOne());

      await service.createVersion(
        't-1',
        { sections: [{ title: 'A', questions: [{ prompt: 'Q', questionType: 'paragraph' }] }] } as never,
        'user-1',
      );

      expect(rows()).toEqual([row('version_published', { currentVersion: 1 }, { currentVersion: 2 })]);
    });
  });

  describe('an older version (PRD 5.9)', () => {
    it('answers 404 for a draft version', async () => {
      templates.findOne.mockResolvedValue({ templateId: 't-1' } as BehavioralTemplate);
      versions.findOne.mockResolvedValue({ versionId: 'v-2', frozenAt: null } as BehavioralTemplateVersion);

      await expect(service.getVersion('t-1', 2, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('answers the sections of that version, after the company check', async () => {
      templates.findOne.mockResolvedValue({ templateId: 't-1' } as BehavioralTemplate);
      versions.findOne.mockResolvedValue({ versionId: 'v-1', version: 1, frozenAt: new Date() } as BehavioralTemplateVersion);

      await service.getVersion('t-1', 1, 'user-1');

      expect(templates.findOne).toHaveBeenCalledWith({ where: { templateId: 't-1', company: 'Example Company' } });
      expect(versions.findOne).toHaveBeenCalledWith({ where: { templateId: 't-1', version: 1 } });
      expect(sections.find).toHaveBeenCalledWith({ where: { versionId: 'v-1' }, order: { sortOrder: 'ASC' } });
    });

    it('shows the name, category, and review type as that version was published', async () => {
      templates.findOne.mockResolvedValue({ templateId: 't-1', name: 'Today', category: 'leadership', reviewType: 'hr', currentVersion: 2 } as never);
      versions.findOne.mockResolvedValue({ versionId: 'v-1', version: 1, frozenAt: new Date() } as BehavioralTemplateVersion);
      dataSource.manager.find.mockResolvedValueOnce([
        { afterJson: { currentVersion: 1, name: 'Then', description: 'Old', category: 'general_performance', reviewType: 'self' } },
      ]);

      const { template } = await service.getVersion('t-1', 1, 'user-1');

      expect(template).toMatchObject({ name: 'Then', description: 'Old', category: 'general_performance', reviewType: 'self', currentVersion: 2 });
    });

    it('answers 404 to the list of a template outside the company', async () => {
      templates.findOne.mockResolvedValue(null);

      await expect(service.listVersions('t-1', 'user-1')).rejects.toThrow(NotFoundException);
      expect(versions.find).not.toHaveBeenCalled();
    });
  });

  describe('archive (Tpl-B-001)', () => {
    const stored = (status: string) =>
      templates.findOne.mockResolvedValue({ templateId: 't-1', status, currentVersion: 1 } as BehavioralTemplate);

    it.each(['draft', 'published'])('archives a %s template under a row lock, with its audit row', async (status) => {
      stored(status);

      await service.archive('t-1', 'user-1');

      expect(templates.findOne).toHaveBeenCalledWith({
        where: { templateId: 't-1', company: 'Example Company' },
        lock: { mode: 'pessimistic_write' },
      });
      expect(templates.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'archived', archivedAt: expect.any(Date) }));
      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'archived', beforeJson: expect.objectContaining({ status }) }),
      );
    });

    it('refuses a template that is already archived, and writes nothing', async () => {
      stored('archived');

      await expect(service.archive('t-1', 'user-1')).rejects.toThrow(ConflictException);
      expect(templates.save).not.toHaveBeenCalled();
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('answers 404 for a template outside the company', async () => {
      templates.findOne.mockResolvedValue(null);

      await expect(service.archive('t-1', 'user-1')).rejects.toThrow(NotFoundException);
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('is served at POST :id/archived', () => {
      expect(Reflect.getMetadata('path', BehavioralAssessmentController.prototype.archive)).toBe(':id/archived');
    });
  });

  describe('ids from the request (CWE-639, Tpl-G-006)', () => {
    const body = {
      name: 'Quarterly',
      category: 'general_performance',
      reviewType: 'self',
      sections: [{ sectionId: 'foreign-section', title: 'S', questions: [{ questionId: 'foreign-question', prompt: 'P', questionType: 'short_answer' }] }],
    } as unknown as CreateBehavioralTemplateDto;
    const used = () => [
      (sections.create.mock.calls[0]?.[0] as { sectionId: string } | undefined)?.sectionId,
      (questions.create.mock.calls[0]?.[0] as { questionId: string } | undefined)?.questionId,
    ];

    it('gives a new template its own section and question ids: an id of the request could move a row of another version', async () => {
      templates.findOne.mockResolvedValue({ templateId: 't-1', company: 'Example Company', status: 'draft' } as BehavioralTemplate);

      await service.create(body, 'user-1');

      expect(used()).not.toContain('foreign-section');
      expect(used()).not.toContain('foreign-question');
    });

    it('does the same when a draft is replaced', async () => {
      manager.findOne.mockResolvedValue({ templateId: 't-1', company: 'Example Company', status: 'draft' } as BehavioralTemplate);
      templates.findOne.mockResolvedValue({ templateId: 't-1', company: 'Example Company', status: 'draft' } as BehavioralTemplate);
      versions.findOne.mockResolvedValue({ versionId: 'v-1', frozenAt: null } as unknown as BehavioralTemplateVersion);

      await service.update('t-1', body, 'user-1');

      expect(used()).not.toContain('foreign-section');
      expect(used()).not.toContain('foreign-question');
    });
  });

  describe('createVersion', () => {
    const published = () =>
      ({
        templateId: 't-1',
        company: 'Example Company',
        name: 'Old name',
        description: 'Old description',
        category: 'general_performance',
        reviewType: 'self',
        status: 'published',
        currentVersion: 1,
        publishedBy: 'someone',
        publishedAt: new Date('2026-11-01'),
      }) as BehavioralTemplate;
    const body = (overrides: Record<string, unknown> = {}) =>
      ({
        sections: [
          {
            sectionId: 'client-section',
            title: 'Leadership',
            questions: [
              {
                questionId: 'client-question',
                prompt: 'Meets deadlines?',
                questionType: 'multiple_choice',
                choiceOptions: [{ label: 'Yes' }, { label: 'No' }],
              },
            ],
          },
        ],
        ...overrides,
      }) as unknown as never;

    beforeEach(() => {
      manager.findOne.mockResolvedValue(published());
      // The answer is the tree of the latest version.
      templates.findOne.mockResolvedValue({ ...published(), currentVersion: 2 });
      versions.findOne.mockResolvedValue({ versionId: 'v-2', version: 2 } as BehavioralTemplateVersion);
    });

    it('publishes the next version, frozen at once, by the account actor', async () => {
      await service.createVersion('t-1', body(), 'user-1');

      expect(resolver.resolveAccount).toHaveBeenCalledWith('user-1');
      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({ templateId: 't-1', currentVersion: 2, publishedBy: ACTOR_ID, status: 'published' }),
      );
      const version = manager.create.mock.calls.find(([entity]) => entity === BehavioralTemplateVersion)?.[1] as
        | Record<string, unknown>
        | undefined;
      expect(version).toMatchObject({ templateId: 't-1', version: 2, createdBy: ACTOR_ID });
      expect(version?.frozenAt).toBeInstanceOf(Date);
    });

    it('locks the template row, and keeps the version that was published: nothing is deleted', async () => {
      await service.createVersion('t-1', body(), 'user-1');

      expect(manager.findOne).toHaveBeenCalledWith(
        BehavioralTemplate,
        expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
      );
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(manager.delete).not.toHaveBeenCalled();
      expect(sections.delete).not.toHaveBeenCalled();
      expect(questions.delete).not.toHaveBeenCalled();
      expect(options.delete).not.toHaveBeenCalled();
    });

    it('gives the new sections, questions, and options new ids, whatever ids the request carries', async () => {
      await service.createVersion('t-1', body(), 'user-1');

      const section = sections.create.mock.calls[0]?.[0] as { sectionId: string; versionId: string };
      const question = questions.create.mock.calls[0]?.[0] as { questionId: string; sectionId: string };
      expect(section.sectionId).not.toBe('client-section');
      expect(question.questionId).not.toBe('client-question');
      expect(question.sectionId).toBe(section.sectionId);
      expect(section.versionId).not.toBe('v-1');
      expect(options.save).toHaveBeenCalled();
    });

    it('changes the details only for the fields it is given', async () => {
      await service.createVersion('t-1', body({ name: ' New name ', category: 'peer_feedback' }), 'user-1');

      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New name',
          category: 'peer_feedback',
          description: 'Old description',
          reviewType: 'self',
        }),
      );
    });

    it.each(['draft', 'archived'] as const)('refuses a %s template with a 409, and writes nothing', async (status) => {
      manager.findOne.mockResolvedValue({ ...published(), status });

      await expect(service.createVersion('t-1', body(), 'user-1')).rejects.toThrow(ConflictException);

      expect(manager.save).not.toHaveBeenCalled();
      expect(sections.save).not.toHaveBeenCalled();
    });

    it('answers 404 for a template that does not exist, and writes nothing', async () => {
      manager.findOne.mockResolvedValue(null);

      await expect(service.createVersion('t-1', body(), 'user-1')).rejects.toThrow(NotFoundException);

      expect(manager.save).not.toHaveBeenCalled();
    });

    it.each([
      ['no section', { sections: [] }],
      ['a section with no question', { sections: [{ title: 'Empty', questions: [] }] }],
    ])('refuses %s with a 400 before it opens a transaction: a frozen version needs content', async (_label, overrides) => {
      await expect(service.createVersion('t-1', body(overrides), 'user-1')).rejects.toThrow(BadRequestException);

      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('refuses a multiple choice question with fewer than two options, and never reports success', async () => {
      const oneOption = body({
        sections: [
          {
            title: 'S',
            questions: [{ prompt: 'Pick', questionType: 'multiple_choice', choiceOptions: [{ label: 'Yes' }] }],
          },
        ],
      });

      await expect(service.createVersion('t-1', oneOption, 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('publish', () => {
    const draftWithContent = () => {
      templates.findOne.mockResolvedValue({
        templateId: 't-1',
        status: 'draft',
      } as BehavioralTemplate);
      versions.findOne.mockResolvedValue({
        versionId: 'v-1',
        frozenAt: null,
      } as BehavioralTemplateVersion);
      sections.find.mockResolvedValue([{ sectionId: 's-1' } as BehavioralSection]);
      questions.find.mockResolvedValue([{ questionId: 'q-1', sectionId: 's-1' } as BehavioralQuestion]);
    };

    it.each([
      ['no section', [], []],
      ['a section with no question', [{ sectionId: 's-1' }], []],
    ])('refuses a draft with %s with a 400, and freezes nothing', async (_label, sectionRows, questionRows) => {
      draftWithContent();
      sections.find.mockResolvedValue(sectionRows as BehavioralSection[]);
      questions.find.mockResolvedValue(questionRows as BehavioralQuestion[]);

      await expect(service.publish('t-1', 'user-1')).rejects.toThrow(BadRequestException);

      expect(versions.save).not.toHaveBeenCalled();
      expect(templates.save).not.toHaveBeenCalled();
    });

    it('freezes the version and publishes the template in one transaction, with the row locked', async () => {
      draftWithContent();

      await service.publish('t-1', 'user-1');

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(templates.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
      );
    });

    it('freezes the active version and publishes the draft', async () => {
      draftWithContent();

      const result = await service.publish('t-1', 'user-1');

      expect(result.template.status).toBe('published');
      expect(result.template.publishedBy).toBe(ACTOR_ID);
      expect(resolver.resolveAccount).toHaveBeenCalledWith('user-1');
      expect(result.template.publishedAt).toBeInstanceOf(Date);
      expect(result.version?.frozenAt).toBeInstanceOf(Date);
    });

    it('rejects publishing an archived template', async () => {
      templates.findOne.mockResolvedValue({
        templateId: 't-1',
        status: 'archived',
      } as BehavioralTemplate);

      await expect(service.publish('t-1', 'user-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getById', () => {
    it('throws NotFoundException for missing templates', async () => {
      templates.findOne.mockResolvedValue(null);

      await expect(service.getById('missing', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('list', () => {
    it('returns templates ordered by updatedAt descending', async () => {
      templates.find.mockResolvedValue([]);

      const result = await service.list('user-1');
      expect(templates.find).toHaveBeenCalled();
      expect(result).toEqual([]);
      expect(versions.find).not.toHaveBeenCalled();
    });

    it('counts the questions of the current version of each template, with one query for each table', async () => {
      templates.find.mockResolvedValue([
        { templateId: 't-1', currentVersion: 2 },
        { templateId: 't-2', currentVersion: 1 },
      ] as BehavioralTemplate[]);
      versions.find.mockResolvedValue([
        { versionId: 'v-old', templateId: 't-1', version: 1 },
        { versionId: 'v-now', templateId: 't-1', version: 2 },
        { versionId: 'v-empty', templateId: 't-2', version: 1 },
      ] as BehavioralTemplateVersion[]);
      sections.find.mockResolvedValue([
        { sectionId: 's-1', versionId: 'v-now' },
        { sectionId: 's-2', versionId: 'v-now' },
      ] as BehavioralSection[]);
      questions.find.mockResolvedValue([{ sectionId: 's-1' }, { sectionId: 's-2' }, { sectionId: 's-2' }] as BehavioralQuestion[]);

      const result = await service.list('user-1');

      expect(result.map((row) => [row.templateId, row.questionCount])).toEqual([['t-1', 3], ['t-2', 0]]);
      // The old version is not counted, so its sections are not read.
      const sectionQuery = sections.find.mock.calls[0]?.[0] as { where: { versionId: { value: string[] } } };
      expect(sectionQuery.where.versionId.value.sort()).toEqual(['v-empty', 'v-now']);
      for (const repo of [versions, sections, questions]) expect(repo.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('company scope (CWE-639)', () => {
    const OWN = { where: { templateId: 't-1', company: 'Example Company' } };
    const dto = { sections: [{ title: 'S', questions: [{ prompt: 'P', questionType: 'short_answer' as const }] }] } as unknown as CreateBehavioralTemplateDto;

    it('lists the templates of the company of the account only', async () => {
      await service.list('user-1');

      expect(templates.find).toHaveBeenCalledWith(expect.objectContaining({ where: { company: 'Example Company' } }));
    });

    it('reads one template by its id and the company, and answers 404 otherwise', async () => {
      await expect(service.getById('t-1', 'user-1')).rejects.toThrow(NotFoundException);

      expect(templates.findOne).toHaveBeenCalledWith(OWN);
    });

    it.each([
      ['an update', () => service.update('t-1', dto, 'user-1')],
      ['a publication', () => service.publish('t-1', 'user-1')],
    ])('locks the template of the company only for %s, and writes nothing otherwise', async (_what, act) => {
      await expect(act()).rejects.toThrow(NotFoundException);

      expect(templates.findOne).toHaveBeenCalledWith(expect.objectContaining(OWN));
      expect(templates.save).not.toHaveBeenCalled();
    });

    it('gives a new version to a template of the company only', async () => {
      manager.findOne.mockResolvedValue(null);

      await expect(service.createVersion('t-1', dto, 'user-1')).rejects.toThrow(NotFoundException);

      expect(manager.findOne).toHaveBeenCalledWith(BehavioralTemplate, expect.objectContaining(OWN));
      expect(manager.save).not.toHaveBeenCalled();
    });
  });
});
