-- CreateTable
CREATE TABLE "Dish" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'published',
    "cookTimeMinutes" INTEGER,
    "difficulty" INTEGER,
    "tasteTags" JSONB NOT NULL DEFAULT '[]',
    "stepsSummary" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "Dish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aliasNames" JSONB NOT NULL DEFAULT '[]',
    "category" TEXT,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DishIngredient" (
    "id" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "amountText" TEXT,

    CONSTRAINT "DishIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "sourcePlatform" TEXT NOT NULL,
    "sourceVideoId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "durationSec" INTEGER,
    "likeCount" INTEGER,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSmsCode" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiredAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthSmsCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "accessExpiredAt" TIMESTAMP(3) NOT NULL,
    "refreshExpiredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoRequestDemand" (
    "dishId" TEXT NOT NULL,
    "totalRequests" INTEGER NOT NULL DEFAULT 0,
    "uniqueRequestUsers" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoRequestDemand_pkey" PRIMARY KEY ("dishId")
);

-- CreateTable
CREATE TABLE "VideoRequestRecord" (
    "id" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "requesterKey" TEXT NOT NULL,
    "firstRequestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRequestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoRequestRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiGenerationTask" (
    "id" TEXT NOT NULL,
    "sceneType" TEXT NOT NULL,
    "normalizedQuery" TEXT NOT NULL,
    "queryHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "model" TEXT,
    "latencyMs" INTEGER,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiGenerationTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiGenerationResult" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "validationResult" TEXT,
    "rawJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiGenerationResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_name_key" ON "Ingredient"("name");

-- CreateIndex
CREATE INDEX "UserFavorite_userId_createdAt_idx" ON "UserFavorite"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserFavorite_userId_dishId_key" ON "UserFavorite"("userId", "dishId");

-- CreateIndex
CREATE INDEX "UserHistory_userId_viewedAt_idx" ON "UserHistory"("userId", "viewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserHistory_userId_dishId_key" ON "UserHistory"("userId", "dishId");

-- CreateIndex
CREATE INDEX "AuthSmsCode_phone_createdAt_idx" ON "AuthSmsCode"("phone", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_accessToken_key" ON "AuthSession"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_refreshToken_key" ON "AuthSession"("refreshToken");

-- CreateIndex
CREATE INDEX "VideoRequestRecord_dishId_lastRequestedAt_idx" ON "VideoRequestRecord"("dishId", "lastRequestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "VideoRequestRecord_dishId_requesterKey_key" ON "VideoRequestRecord"("dishId", "requesterKey");

-- CreateIndex
CREATE INDEX "AiGenerationTask_sceneType_status_createdAt_idx" ON "AiGenerationTask"("sceneType", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiGenerationTask_sceneType_queryHash_key" ON "AiGenerationTask"("sceneType", "queryHash");

-- CreateIndex
CREATE UNIQUE INDEX "AiGenerationResult_taskId_dishId_key" ON "AiGenerationResult"("taskId", "dishId");

-- AddForeignKey
ALTER TABLE "DishIngredient" ADD CONSTRAINT "DishIngredient_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DishIngredient" ADD CONSTRAINT "DishIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavorite" ADD CONSTRAINT "UserFavorite_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserHistory" ADD CONSTRAINT "UserHistory_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoRequestDemand" ADD CONSTRAINT "VideoRequestDemand_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiGenerationResult" ADD CONSTRAINT "AiGenerationResult_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AiGenerationTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiGenerationResult" ADD CONSTRAINT "AiGenerationResult_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
