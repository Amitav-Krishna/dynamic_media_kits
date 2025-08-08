import { query } from "@/lib/db";
async function main() {
  const result = await query("SELECT * FROM users;");
  console.log(result);
}
