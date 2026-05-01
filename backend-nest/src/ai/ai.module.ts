import { Global, Module } from "@nestjs/common";
import { DoubaoProvider } from "./doubao.provider";
import { RecipeGenerationService } from "./recipe-generation.service";

@Global()
@Module({
  providers: [RecipeGenerationService, { provide: "LLM_PROVIDER", useClass: DoubaoProvider }],
  exports: [RecipeGenerationService, "LLM_PROVIDER"],
})
export class AiModule {}
