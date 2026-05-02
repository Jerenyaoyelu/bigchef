import { IsNumber, Max, Min } from "class-validator";

export class PlayMetricsDto {
  /** 单次播放完成度 0~1，用于滑动平均更新 completePlayRate */
  @IsNumber()
  @Min(0)
  @Max(1)
  completion!: number;
}
