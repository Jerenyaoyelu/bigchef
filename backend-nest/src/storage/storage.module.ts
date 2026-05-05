import { Global, Module } from "@nestjs/common";
import { TosStorageService } from "./tos-storage.service";

@Global()
@Module({
  providers: [TosStorageService],
  exports: [TosStorageService],
})
export class StorageModule {}
