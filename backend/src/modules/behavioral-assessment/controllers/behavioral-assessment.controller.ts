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
import { ParseVersionPipe } from "../../../common/pipes/parse-version.pipe.js";
import { ParseGuidPipe } from "../../../common/pipes/parse-guid.pipe.js";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard.js";
import { AdminRoleGuard } from "../../employees/guards/admin-role.guard.js";
import type { AuthedUser } from "../../employees/types/authed-user.types.js";
import { ApiErrorResponseDto } from "../../../common/dtos/api-response.dto.js";
import { CreateBehavioralTemplateDto } from "../dtos/create-behavioral-template.dto.js";
import { UpdateBehavioralTemplateDto } from "../dtos/update-behavioral-template.dto.js";
import { BehavioralTemplate } from "../entities/behavioral-template.entity.js";
import { BehavioralAssessmentService } from "../services/behavioral-assessment.service.js";

/** The request after `JwtAuthGuard`: the JWT strategy sets `user`. */
interface AuthedRequest {
  user: AuthedUser;
}

@ApiTags("Behavioral Assessment")
@Controller("behavioral-assessment")
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@ApiBearerAuth()
@ApiForbiddenResponse({ description: "Admin role required", type: ApiErrorResponseDto })
export class BehavioralAssessmentController {
  constructor(private readonly service: BehavioralAssessmentService) {}

  @Get()
  @ApiOperation({ summary: "list the behavioral assessment templates of your company" })
  @ApiOkResponse({
    description: "template list",
    type: BehavioralTemplate,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ description: "Unauthorized", type: ApiErrorResponseDto })
  async list(@Req() req: AuthedRequest) {
    return this.service.list(req.user.userId);
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
  async getById(@Param("id", ParseGuidPipe) templateId: string, @Req() req: AuthedRequest) {
    return this.service.getById(templateId, req.user.userId);
  }

  @Post("create")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "create a behavioral assessment template (draft)" })
  @ApiOkResponse({ description: "template created with draft version 1" })
  @ApiBadRequestResponse({ description: "Bad Request", type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ description: "Unauthorized", type: ApiErrorResponseDto })
  async create(@Body() dto: CreateBehavioralTemplateDto, @Req() req: AuthedRequest) {
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
    @Body() dto: UpdateBehavioralTemplateDto,
    @Req() req: AuthedRequest,
  ) {
    return this.service.update(templateId, dto, req.user.userId);
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
  async publish(@Param("id", ParseGuidPipe) templateId: string, @Req() req: AuthedRequest) {
    return this.service.publish(templateId, req.user.userId);
  }

  @Post(":id/archived")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "archive a draft or published template" })
  @ApiOkResponse({ description: "the archived template" })
  @ApiConflictResponse({ description: "template is already archived" })
  @ApiNotFoundResponse({ description: "template not found", type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ description: "Unauthorized", type: ApiErrorResponseDto })
  async archive(@Param("id", ParseGuidPipe) templateId: string, @Req() req: AuthedRequest) {
    return this.service.archive(templateId, req.user.userId);
  }

  @Get(":id/versions")
  @ApiOperation({ summary: "the published versions of a behavioral template, newest first" })
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
    @Body() dto: UpdateBehavioralTemplateDto,
    @Req() req: AuthedRequest,
  ) {
    return this.service.createVersion(templateId, dto, req.user.userId);
  }
}
