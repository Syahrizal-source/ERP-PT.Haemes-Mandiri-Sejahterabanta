import bcrypt from "bcrypt";
import * as readline from "node:readline";
import { stdin as input, stdout as output } from "node:process";

const rl = readline.createInterface({ input, output });

rl.question("Masukkan password baru: ", async (password) => {
  try {
    if (password.length < 8 || password.length > 72) {
      throw new Error("Password harus 8 sampai 72 karakter");
    }

    const hash = await bcrypt.hash(password, 10);

    console.log("\nHash bcrypt berhasil dibuat:");
    console.log(hash);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan";

    console.error("Gagal:", message);
  } finally {
    password = "";
    rl.close();
  }
});
