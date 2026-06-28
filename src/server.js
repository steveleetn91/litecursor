import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

app.post("/api/remote-command", async (req, res) => {

  res.json({ ok: true, message: "" });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("LiteCursor API running");
});