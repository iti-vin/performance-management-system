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
import { CreateBehavioralTemplateDto } from "../dtos/create-behavioral-template.dto.js";
import { UpdateBehavioralTemplateDto } from "../dtos/update-behavioral-template.dto.js";
import { BehavioralTemplate } from "../entities/behavioral-template.entity.js";
import { BehavioralAssessmentService } from "../services/behavioral-assessment.service.js";

@ApiTags("Behavioral Assessment")
@Controller("behavioral-assessment")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BehavioralAssessmentController {
  constructor(private readonly service: BehavioralAssessmentService) {}

  @Get()
  @ApiOperation({ summary: "list all behavioral assessment templates" })
  @ApiOkResponse({
    description: "template list",
    type: BehavioralTemplate,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ description: "Unauthorized", type: ApiErrorResponseDto })
  async list() {
    return this.service.list();
  }

  @Get(":id")
  @ApiOperation({ summary: "get a template with its full section/question/option tree" })
  @ApiOkResponse({
    description: "full template tree",
    schema: {
      allOf: [
        { $ref: "#/components/schemas/BehavioralTemplate" },
        {
          properties: {
            version: { $ref: "#/components/schemas/BehavioralTemplateVersion" },
            sections: {
              type: "array",
              items: { $ref: "#/components/schemas/BehavioralSection" },
            },
            questions: {
              type: "array",
              items: { $ref: "#/components/schemas/BehavioralQuestion" },
            },
            options: {
              type: "array",
              items: { $ref: "#/components/schemas/BehavioralChoiceOption" },
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
  @ApiOperation({ summary: "create a behavioral assessment template (draft)" })
  @ApiOkResponse({ description: "template created with draft version 1" })
  @ApiBadRequestResponse({ description: "Bad Request", type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ description: "Unauthorized", type: ApiErrorResponseDto })
  async create(@Body() dto: CreateBehavioralTemplateDto, @Req() req: Request) {
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
  async update(@Param("id", new ParseUUIDPipe()) templateId: string, @Body() dto: UpdateBehavioralTemplateDto) {
    return this.service.update(templateId, dto);
  }

  @Post(":id/published")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'publish the active draft version, freezing it. Note: route segment is "pubished" per the agreed contract, not "published".',
  })
  @ApiOkResponse({ description: "template published and version frozen" })
  @ApiConflictResponse({ description: "template is not in draft state" })
  @ApiNotFoundResponse({ description: "template not found", type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ description: "Unauthorized", type: ApiErrorResponseDto })
  async publish(@Param("id", new ParseUUIDPipe()) templateId: string, @Req() req: Request) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.service.publish(templateId, user.id);
  }
}
