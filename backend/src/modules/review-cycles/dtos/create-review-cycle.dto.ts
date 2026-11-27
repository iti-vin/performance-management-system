import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  EVALUATOR_TYPES,
  MAX_CYCLE_DESCRIPTION_LENGTH,
  MAX_CYCLE_PARTICIPANTS,
  MAX_CYCLE_PEERS,
  MAX_CYCLE_STAGES,
  REVIEW_TYPES,
  type EvaluatorType,
  type ReviewType,
} from '@pms/shared-types';
import { STORABLE_TEXT, STORABLE_TEXT_MESSAGE } from './storable-text.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** A calendar day such as '2027-03-31', and a real one: '2027-02-30' fails. */
function IsCalendarDay() {
  return applyDecorators(Matches(/^\d{4}-\d{2}-\d{2}$/), IsISO8601({ strict: true }));
}

/** An instant with an offset, such as '2027-04-01T08:00:00+08:00' or '...Z', like the shared `timestampSchema`. */
export function IsInstant() {
  return applyDecorators(
    Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/),
    IsISO8601({ strict: true, strictSeparator: true }),
  );
}

/** Any GUID of 8-4-4-4-12 hex digits, like the shared `idSchema`: `IsUUID` refuses the dev ids such as ...0023. */
export const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One stage of a cycle. The evaluator person is optional: launch derives it for self and manager. */
export class CycleStageDto {
  @ApiProperty({ enum: EVALUATOR_TYPES })
  @IsIn([...EVALUATOR_TYPES])
  perspective: EvaluatorType;

  @ApiProperty({ example: 'hr_officer' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  evaluatorRole: string;

  @ApiPropertyOptional({ description: 'The GUID of the employee who evaluates this stage.' })
  @IsOptional()
  @Matches(GUID)
  evaluatorId?: string;

  @ApiProperty({ example: '2027-04-07T00:00:00+08:00' })
  @IsInstant()
  deadline: string;
}

/** One participant. The server resolves each template id to its current frozen version. */
export class ParticipantDto {
  @ApiProperty({ description: 'The GUID of the employee.' })
  @Matches(GUID)
  employeeId: string;

  @ApiPropertyOptional({ description: 'A published KPI goal template of the position of the employee. Left out: the one published template of that position.' })
  @IsOptional()
  @Matches(GUID)
  kpiTemplateId?: string;

  @ApiPropertyOptional({ description: 'A published behavioral template.' })
  @IsOptional()
  @Matches(GUID)
  behavioralTemplateId?: string;

  @ApiPropertyOptional({ type: [String], description: 'The GUIDs of the peers who assess this participant.' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_CYCLE_PEERS)
  @ArrayUnique()
  @Matches(GUID, { each: true })
  peerIds?: string[];
}

/** The company and the actor are not in the body: they come from the signed-in account. */
export class CreateReviewCycleDto {
  @ApiProperty({ maxLength: 120, example: 'CY2027-Q1' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(STORABLE_TEXT, { message: STORABLE_TEXT_MESSAGE })
  name: string;

  @ApiPropertyOptional({ maxLength: MAX_CYCLE_DESCRIPTION_LENGTH })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(MAX_CYCLE_DESCRIPTION_LENGTH)
  @Matches(STORABLE_TEXT, { message: STORABLE_TEXT_MESSAGE })
  description?: string;

  @ApiPropertyOptional({ nullable: true, example: '2027-04-10T23:59:59+08:00' })
  @IsOptional()
  @IsInstant()
  accomplishmentDeadline?: string | null;

  @ApiPropertyOptional({ description: 'The employee reads their own released result.' })
  @IsOptional()
  @IsBoolean()
  employeeVisible?: boolean;

  @ApiPropertyOptional({ description: 'The manager reads the released results of their team.' })
  @IsOptional()
  @IsBoolean()
  managerVisible?: boolean;

  @ApiPropertyOptional({ description: 'The reviewer of a later stage reads the submitted answers of an earlier one.' })
  @IsOptional()
  @IsBoolean()
  earlierAnswersVisible?: boolean;

  @ApiProperty({ enum: REVIEW_TYPES })
  @IsIn([...REVIEW_TYPES])
  reviewType: ReviewType;

  @ApiProperty({ example: '2027-01-01' })
  @IsCalendarDay()
  evaluationStart: string;

  @ApiProperty({ example: '2027-03-31' })
  @IsCalendarDay()
  evaluationEnd: string;

  @ApiProperty({ example: '2027-04-01T00:00:00+08:00' })
  @IsInstant()
  assessmentStart: string;

  @ApiProperty({ example: '2027-04-20T00:00:00+08:00' })
  @IsInstant()
  verificationDeadline: string;

  @ApiProperty({ minimum: 0, maximum: 1, example: 0.5, description: 'A fraction: the two weights total 1.' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1)
  goalsWeight: number;

  @ApiProperty({ minimum: 0, maximum: 1, example: 0.5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1)
  behavioralWeight: number;

  @ApiPropertyOptional({ minimum: 2, maximum: 10, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(10)
  anonymityThreshold?: number | null;

  @ApiProperty({ type: [CycleStageDto], maxItems: MAX_CYCLE_STAGES })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_CYCLE_STAGES)
  @ValidateNested({ each: true })
  @Type(() => CycleStageDto)
  stages: CycleStageDto[];

  @ApiPropertyOptional({ type: [ParticipantDto], maxItems: MAX_CYCLE_PARTICIPANTS })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_CYCLE_PARTICIPANTS)
  @ValidateNested({ each: true })
  @Type(() => ParticipantDto)
  participants?: ParticipantDto[];
}
