const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.userHistory.deleteMany();
  await prisma.userFavorite.deleteMany();
  await prisma.video.deleteMany();
  await prisma.dishIngredient.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.dish.deleteMany();

  await prisma.ingredient.createMany({
    data: [
      { id: "ing_egg", name: "鸡蛋", aliasNames: ["蛋"], category: "main" },
      { id: "ing_tomato", name: "西红柿", aliasNames: ["番茄"], category: "main" },
      { id: "ing_scallion", name: "葱", aliasNames: ["葱花"], category: "secondary" },
      { id: "ing_wing", name: "鸡翅中", aliasNames: ["鸡中翅"], category: "main" },
      { id: "ing_pork", name: "猪肉", aliasNames: ["猪里脊肉"], category: "main" },
      { id: "ing_starch", name: "淀粉", aliasNames: [], category: "secondary" },
      { id: "ing_flour", name: "面粉", aliasNames: [], category: "secondary" },
      { id: "ing_vinegar", name: "白醋", aliasNames: [], category: "seasoning" },
      { id: "ing_sugar", name: "白糖", aliasNames: [], category: "seasoning" },
      { id: "ing_ketchup", name: "番茄酱", aliasNames: [], category: "seasoning" },
      { id: "ing_cola", name: "可乐", aliasNames: [], category: "seasoning" },
      { id: "ing_soy", name: "生抽", aliasNames: [], category: "seasoning" },
      { id: "ing_ginger", name: "姜片", aliasNames: ["姜"], category: "secondary" },
    ],
  });

  await prisma.dish.create({
    data: {
      id: "dish_001",
      name: "西红柿炒蛋",
      cookTimeMinutes: 12,
      difficulty: 1,
      tasteTags: ["家常", "下饭"],
      stepsSummary: [
        "西红柿切块，鸡蛋打散。",
        "先炒鸡蛋盛出，再炒西红柿出汁。",
        "鸡蛋回锅翻炒，调味后出锅。",
      ],
    },
  });

  await prisma.dish.create({
    data: {
      id: "dish_101",
      name: "可乐鸡翅",
      cookTimeMinutes: 30,
      difficulty: 2,
      tasteTags: ["家常", "甜咸"],
      stepsSummary: [
        "鸡翅焯水后沥干。",
        "两面煎至微黄。",
        "加入可乐和生抽焖煮。",
        "大火收汁后出锅。",
      ],
    },
  });

  await prisma.dish.create({
    data: {
      id: "dish_201",
      name: "糖醋里脊",
      cookTimeMinutes: 30,
      difficulty: 2,
      tasteTags: ["酸甜", "家常"],
      stepsSummary: [
        "里脊肉切条，加盐和料酒腌制10分钟。",
        "鸡蛋打散后加入淀粉和面粉调成糊，肉条裹糊。",
        "下锅炸至金黄后复炸一次，口感更酥脆。",
        "调糖醋汁：白醋、白糖、番茄酱加少许清水。",
        "锅中收汁后倒入里脊，快速翻炒均匀即可。",
      ],
    },
  });

  await prisma.dishIngredient.createMany({
    data: [
      { id: "di_001", dishId: "dish_001", ingredientId: "ing_tomato", role: "main", amountText: "2个" },
      { id: "di_002", dishId: "dish_001", ingredientId: "ing_egg", role: "main", amountText: "3个" },
      { id: "di_003", dishId: "dish_001", ingredientId: "ing_scallion", role: "secondary", amountText: "少许" },
      { id: "di_004", dishId: "dish_101", ingredientId: "ing_wing", role: "main", amountText: "500g" },
      { id: "di_005", dishId: "dish_101", ingredientId: "ing_cola", role: "seasoning", amountText: "1听" },
      { id: "di_006", dishId: "dish_101", ingredientId: "ing_soy", role: "seasoning", amountText: "2勺" },
      { id: "di_007", dishId: "dish_101", ingredientId: "ing_ginger", role: "secondary", amountText: "3片" },
      { id: "di_201", dishId: "dish_201", ingredientId: "ing_pork", role: "main", amountText: "300g" },
      { id: "di_202", dishId: "dish_201", ingredientId: "ing_egg", role: "secondary", amountText: "1个" },
      { id: "di_203", dishId: "dish_201", ingredientId: "ing_starch", role: "secondary", amountText: "适量" },
      { id: "di_204", dishId: "dish_201", ingredientId: "ing_flour", role: "secondary", amountText: "适量" },
      { id: "di_205", dishId: "dish_201", ingredientId: "ing_vinegar", role: "seasoning", amountText: "3勺" },
      { id: "di_206", dishId: "dish_201", ingredientId: "ing_sugar", role: "seasoning", amountText: "4勺" },
      { id: "di_207", dishId: "dish_201", ingredientId: "ing_ketchup", role: "seasoning", amountText: "2勺" },
    ],
  });

  await prisma.video.createMany({
    data: [
      {
        id: "vid_001",
        dishId: "dish_001",
        sourcePlatform: "douyin",
        sourceVideoId: "v_123",
        title: "家常西红柿炒蛋 3 分钟学会",
        url: "https://www.douyin.com/",
        durationSec: 95,
        likeCount: 12000,
      },
      {
        id: "vid_101",
        dishId: "dish_101",
        sourcePlatform: "douyin",
        sourceVideoId: "v_900",
        title: "新手可乐鸡翅不翻车教程",
        url: "https://www.douyin.com/",
        durationSec: 132,
        likeCount: 22500,
      },
    ],
  });
}

main()
  .then(async () => {
    console.log("Seed completed.");
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
