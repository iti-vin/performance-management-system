import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { Request } from "express";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard.js";
import { ApiErrorResponseDto } from "../../../common/dtos/api-response.dto.js";
import { CreateKpiGoalTemplateDto } from "../dtos/create-kpi-goal-template.dto.js";
import { UpdateKpiGoalTemplateDto } from "../dtos/update-kpi-goal-template.dto.js";
import { KpiGoalTemplate } from "../entities/kpi-goal-template.entity.js";
import { KpiGoalsService } from "../services/kpi-goals.service.js";

@ApiTags("KPI Goals")
@Controller("kpi-goals")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class KpiGoalsController {
  constructor(private readonly service: KpiGoalsService) {}

  @Get()
  @ApiOperation({ summary: "list all KPI goal templates" })
  @ApiOkResponse({
    description: "template list",
    type: KpiGoalTemplate,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ description: "Unauthorized", type: ApiErrorResponseDto })
  async list() {
    return this.service.list();
  }

  @Get(":id")
  @ApiOperation({ summary: "get a template with its full indicator/scale/matrix tree" })
  @ApiOkResponse({
    description: "full template tree",
    schema: {
      allOf: [
        { $ref: "#/components/schemas/KpiGoalTemplate" },
        {
          properties: {
            version: { $ref: "#/components/schemas/KpiTemplateVersion" },
            indicators: {
              type: "array",
              items: { $ref: "#/components/schemas/KpiIndicator" },
            },
            scales: {
              type: "array",
              items: { $ref: "#/components/schemas/KpiIndicatorScale" },
            },
            matrixRows: {
              type: "array",
              items: { $ref: "#/components/schemas/KpiIndicatorMatrixRow" },
            },
            matrixColumns: {
              type: "array",
              items: { $ref: "#/components/schemas/KpiIndicatorMatrixColumn" },
            },
          },
        },
      ],
    },
  })
  @ApiNotFoundResponse({ description: "template not found", type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ description: "Unauthorized", type: ApiErrorResponseDto })
  async getById(@Param("id", new ParseUUIDPipe()) templateId: string) {
    return this.service.getById(templateId);
  }

  @Post("create")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "create a KPI goal template (draft)" })
  @ApiOkResponse({ description: "template created with draft version 1" })
  @ApiBadRequestResponse({ description: "Bad Request", type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ description: "Unauthorized", type: ApiErrorResponseDto })
  async create(@Body() dto: CreateKpiGoalTemplateDto, @Req() req: Request) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.service.create(dto, user.id);
  }

  @Post(":id/update")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "replace the active draft version content of a template",
  })
  @ApiOkResponse({ description: "template updated" })
  @ApiBadRequestResponse({ description: "Bad Request", type: ApiErrorResponseDto })
  @ApiConflictResponse({ description: "template is not in draft state" })
  @ApiNotFoundResponse({ description: "template not found", type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ description: "Unauthorized", type: ApiErrorResponseDto })
  async update(@Param("id", new ParseUUIDPipe()) templateId: string, @Body() dto: UpdateKpiGoalTemplateDto) {
    return this.service.update(templateId, dto);
  }

  @Post(":id/published")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "publish the active draft version, freezing it",
  })
  @ApiOkResponse({ description: "template published and version frozen" })
  @ApiConflictResponse({ description: "template is not in draft state" })
  @ApiNotFoundResponse({ description: "template not found", type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ description: "Unauthorized", type: ApiErrorResponseDto })
  async publish(@Param("id", new ParseUUIDPipe()) templateId: string, @Req() req: Request) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.service.publish(templateId, user.id);
  }

  @Post(":id/archived")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "archive a draft or published template",
  })
  @ApiOkResponse({ description: "template archived" })
  @ApiConflictResponse({ description: "template cannot be archived from its current state" })
  @ApiNotFoundResponse({ description: "template not found", type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ description: "Unauthorized", type: ApiErrorResponseDto })
  async archive(@Param("id", new ParseUUIDPipe()) templateId: string) {
    return this.service.archive(templateId);
  }
}
