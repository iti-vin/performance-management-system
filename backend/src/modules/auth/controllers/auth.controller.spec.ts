import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";
import { AuthService } from "../services/auth.service.js";
import { AccountRegistrationService } from "../services/account-registration.service.js";
import { AuthController } from "./auth.controller.js";
import { RATE_LIMIT_POLICY } from "../../../common/rate-limit/rate-limit.decorator.js";

describe("AuthController rate limits", () => {
  it.each([
    ["login", "login"],
    ["refreshToken", "refresh"],
    ["me", "session"],
  ] as const)("limits %s by the %s policy", (method, policy) => {
    expect(Reflect.getMetadata(RATE_LIMIT_POLICY, AuthController.prototype[method])).toBe(policy);
  });
});

describe("Auth token response documentation", () => {
  let document: OpenAPIObject;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: {} },
        { provide: AccountRegistrationService, useValue: {} },
      ],
    }).compile();
    const app = moduleRef.createNestApplication();
    try {
      await app.init();
      document = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle("Auth").build());
    } finally {
      await app.close();
    }
  });

  it.each(["/auth/login", "/auth/refresh-token"])("documents the token fields for %s", (path) => {
    const response = document.paths[path]?.post?.responses?.["200"];
    const schema = response && "content" in response ? response.content?.["application/json"]?.schema : undefined;
    if (!schema || !("$ref" in schema)) {
      throw new Error(`Expected a response schema for ${path}`);
    }

    const schemaName = schema.$ref.split("/").at(-1) ?? "";
    const token = document.components?.schemas?.[schemaName];
    expect(token).toMatchObject({
      properties: {
        accessToken: { type: "string" },
        expiresIn: { type: "number" },
      },
    });
    expect(Object.keys(token && "properties" in token ? (token.properties ?? {}) : {}).sort()).toEqual([
      "accessToken",
      "expiresIn",
    ]);
  });
});
