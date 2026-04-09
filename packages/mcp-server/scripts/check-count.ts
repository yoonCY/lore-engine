import { Database } from "../src/config/database.js";

async function main() {
  const driver = await Database.getDriver();
  const session = driver.session();
  
  const res = await session.run('MATCH (c:Champion) RETURN count(c) as champs');
  const res2 = await session.run('MATCH ()-[r:USES_SKILL_PATH]->() RETURN count(r) as skills');
  const res3 = await session.run('MATCH ()-[r:BUILDS_CORE_PATH]->() RETURN count(r) as cores');
  const res4 = await session.run('MATCH (c:Champion) RETURN sum(c.totalGames) as totalGames');
  
  console.log('--- Neo4j Stats ---');
  console.log('Champs:', res.records[0].get(0).toNumber());
  console.log('Unique Skill Paths Built:', res2.records[0].get(0).toNumber());
  console.log('Unique Core Paths Built:', res3.records[0].get(0).toNumber());
  console.log('Total Processed Participant Permutations (Total Games):', res4.records[0].get(0).toNumber());
  
  await session.close();
  await driver.close();
  process.exit(0);
}
main().catch(console.error);
