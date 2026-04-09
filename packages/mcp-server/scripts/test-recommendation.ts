import { getChampionRecommendation } from "../src/tools/champion-recommend.js";

async function run() {
  const res = await getChampionRecommendation({
    position: "bot",
    allies: ["가렌", "애쉬"],
    enemies: ["징크스", "럭스"]
  });
  console.log(JSON.stringify(res, null, 2));
}

run();
