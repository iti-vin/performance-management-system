import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { Mock } from 'vitest';
import { BehavioralAssessmentService } from './behavioral-assessment.service.js';
import { BehavioralTemplate } from '../entities/behavioral-template.entity.js';
import { BehavioralTemplateVersion } from '../entities/behavioral-template-version.entity.js';
import { BehavioralSection } from '../entities/behavioral-section.entity.js';
import { BehavioralQuestion } from '../entities/behavioral-question.entity.js';
import { BehavioralChoiceOption } from '../entities/behavioral-choice-option.entity.js';
import { CreateBehavioralTemplateDto } from '../dtos/create-behavioral-template.dto.js';

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
        createdBy: 'user-1',
      } as BehavioralTemplateVersion);

      const dto = {
        companyId: 'c-1',
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

      expect(result.template.status).toBe('draft');
      expect(result.template.currentVersion).toBe(1);
      expect(result.version?.version).toBe(1);
      expect(result.version?.frozenAt).toBeNull();
      expect(result.version?.createdBy).toBe('user-1');
      expect(sections.create).toHaveBeenCalledTimes(1);
      expect(questions.create).toHaveBeenCalledTimes(1);
    });

    it('rejects multiple_choice questions without two options', async () => {
      const dto = {
        companyId: 'c-1',
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
        companyId: 'c-1',
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
        service.update('t-1', { sections: [] } as unknown as never),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('publish', () => {
    it('freezes the active version and publishes the draft', async () => {
      templates.findOne.mockResolvedValue({
        templateId: 't-1',
        status: 'draft',
      } as BehavioralTemplate);
      versions.findOne.mockResolvedValue({
        versionId: 'v-1',
        frozenAt: null,
      } as BehavioralTemplateVersion);

      const result = await service.publish('t-1', 'user-1');

      expect(result.template.status).toBe('published');
      expect(result.template.publishedBy).toBe('user-1');
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

      await expect(service.getById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('list', () => {
    it('returns templates ordered by updatedAt descending', async () => {
      templates.find.mockResolvedValue([]);

      const result = await service.list();
      expect(templates.find).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});
