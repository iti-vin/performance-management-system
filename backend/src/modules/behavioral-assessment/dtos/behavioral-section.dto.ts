import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export const BEHAVIORAL_QUESTION_TYPES = [
  'rating_scale',
  'short_answer',
  'paragraph',
  'multiple_choice',
] as const;

export type BehavioralQuestionType =
  (typeof BEHAVIORAL_QUESTION_TYPES)[number];

export class ChoiceOptionDto {
  @ApiProperty({ example: 'Strongly disagrees' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label: string;
}

export class QuestionDto {
  @ApiProperty({ description: 'Optional. Generated on create when missing.' })
  @IsOptional()
  @IsString()
  questionId?: string;

  @ApiProperty({ example: 'How consistently does the employee meet deadlines?' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  prompt: string;

  @ApiProperty({ enum: BEHAVIORAL_QUESTION_TYPES })
  @IsIn([...BEHAVIORAL_QUESTION_TYPES])
  questionType: BehavioralQuestionType;

  @ApiProperty({ default: true })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiProperty({
    description:
      'rating_scale questions only. Must be null for all other question types.',
    nullable: true,
  })
  @IsOptional()
  @IsBoolean()
  allowNotObserved?: boolean | null;

  @ApiProperty({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiProperty({
    description:
      'Required for multiple_choice questions, at least two options.',
    required: false,
    type: [ChoiceOptionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChoiceOptionDto)
  choiceOptions?: ChoiceOptionDto[];
}

export class SectionDto {
  @ApiProperty({ description: 'Optional. Generated on create when missing.' })
  @IsOptional()
  @IsString()
  sectionId?: string;

  @ApiProperty({ example: 'Leadership' })
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title: string;

  @ApiProperty({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiProperty({ type: [QuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions: QuestionDto[];
}
