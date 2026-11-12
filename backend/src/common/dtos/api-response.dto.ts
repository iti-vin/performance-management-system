import { ApiProperty } from "@nestjs/swagger";

export class ApiErrorResponseDto {
  @ApiProperty({ example: "Bad Request" })
  type: string;

  @ApiProperty({ example: "Validation Failed" })
  title: string;

  @ApiProperty({ example: 400 })
  status: number;
}

export class ApiErrorNotFoundResponse {
  @ApiProperty({ example: "Not Found" })
  type: string;

  @ApiProperty({ example: "Details doesn't exist in the database" })
  title: string;

  @ApiProperty({ example: 404 })
  status: number;
}
