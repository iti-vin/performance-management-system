import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { AuthedUser } from "../../employees/types/authed-user.types.js";
import { ParseVersionPipe } from "../../../common/pipes/parse-version.pipe.js";
import { ParseGuidPipe } from "../../../common/pipes/parse-guid.pipe.js";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard.js";
import { ApiErrorResponseDto } from "../../../common/dtos/api-response.dto.js";
import { AdminRoleGuard } from "../../employees/guards/admin-role.guard.js";
import { CreateKpiGoalTemplateDto } from "../dtos/create-kpi-goal-template.dto.js";
import { UpdateKpiGoalTemplateDto } from "../dtos/update-kpi-goal-template.dto.js";
import { KpiGoalTemplate } from "../entities/kpi-goal-template.entity.js";
import { KpiGoalsService } from "../services/kpi-goals.service.js";

/** The request after `JwtAuthGuard`: the JWT strategy sets `user`. */
interface AuthedRequest {
  user: AuthedUser;
}

@ApiTags("KPI Goals")
@Controller("kpi-goals")
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@ApiBearerAuth()
@ApiForbiddenResponse({ description: "Admin role required", type: ApiErrorResponseDto })
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
  async list(@Req() req: AuthedRequest) {
    return this.service.list(req.user.userId);
  }

  // Declared before ":id": a route declared later would never match, because
  // ":id" catches "positions" first.
  @Get("positions")
  @ApiOperation({ summary: "list the positions of your company for the template editor" })
  @ApiOkResponse({ description: "positions of the caller's company" })
  @ApiUnauthorizedResponse({ description: "Unauthorized", type: ApiErrorResponseDto })
  async listPositions(@Req() req: AuthedRequest) {
    return this.service.listPositions(req.user.userId);
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
  async getById(@Param("id", ParseGuidPipe) templateId: string, @Req() req: AuthedRequest) {
    return this.service.getById(templateId, req.user.userId);
  }

  @Post("create")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "create a KPI goal template (draft)" })
  @ApiOkResponse({ description: "template created with draft version 1" })
  @ApiBadRequestResponse({ description: "Bad Request", type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ description: "Unauthorized", type: ApiErrorResponseDto })
  async create(@Body() dto: CreateKpiGoalTemplateDto, @Req() req: AuthedRequest) {
    return this.service.create(dto, req.user.userId);
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
  async update(
    @Param("id", ParseGuidPipe) templateId: string,
    @Body() dto: UpdateKpiGoalTemplateDto,
    @Req() req: AuthedRequest,
  ) {
    return this.service.update(templateId, dto, req.user.userId);
  }

  @Get(":id/versions")
  @ApiOperation({ summary: "the published versions of a KPI goal template, newest first" })
  @ApiOkResponse({ description: "number, time, publisher, and whether it is current" })
  @ApiNotFoundResponse({ description: "template not found", type: ApiErrorResponseDto })
  async listVersions(@Param("id", ParseGuidPipe) templateId: string, @Req() req: AuthedRequest) {
    return this.service.listVersions(templateId, req.user.userId);
  }

  @Get(":id/versions/:version")
  @ApiOperation({ summary: "the content of one published version" })
  @ApiOkResponse({ description: "the template with that version" })
  @ApiNotFoundResponse({ description: "template or version not found", type: ApiErrorResponseDto })
  async getVersion(
    @Param("id", ParseGuidPipe) templateId: string,
    @Param("version", ParseVersionPipe) version: number,
    @Req() req: AuthedRequest,
  ) {
    return this.service.getVersion(templateId, version, req.user.userId);
  }

  @Post(":id/versions")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "edit a published template: publish its next version, and keep the old one",
  })
  @ApiOkResponse({ description: "the template with its new version" })
  @ApiBadRequestResponse({ description: "Bad Request", type: ApiErrorResponseDto })
  @ApiConflictResponse({ description: "template is not published" })
  @ApiNotFoundResponse({ description: "template not found", type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ description: "Unauthorized", type: ApiErrorResponseDto })
  async createVersion(
    @Param("id", ParseGuidPipe) templateId: string,
    @Body() dto: UpdateKpiGoalTemplateDto,
    @Req() req: AuthedRequest,
  ) {
    return this.service.createVersion(templateId, dto, req.user.userId);
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
  async publish(@Param("id", ParseGuidPipe) templateId: string, @Req() req: AuthedRequest) {
    return this.service.publish(templateId, req.user.userId);
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
  async archive(@Param("id", ParseGuidPipe) templateId: string, @Req() req: AuthedRequest) {
    return this.service.archive(templateId, req.user.userId);
  }
}
