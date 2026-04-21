import { Global, Module } from "@nestjs/common";
import { DoubaoProvider } from "./doubao.provider";

@Global()
@Module({
  providers: [{ provide: "LLM_PROVIDER", useClass: DoubaoProvider }],
  exports: ["LLM_PROVIDER"],
})
export class AiModule {}
