-- CreateTable
CREATE TABLE "UserDishLike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserDishLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserDishLike_userId_dishId_key" ON "UserDishLike"("userId", "dishId");

-- CreateIndex
CREATE INDEX "UserDishLike_userId_createdAt_idx" ON "UserDishLike"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "UserDishLike" ADD CONSTRAINT "UserDishLike_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE CASCADE ON UPDATE CASCADE;
