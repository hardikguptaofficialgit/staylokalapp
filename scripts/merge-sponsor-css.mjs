import fs from "node:fs";
import path from "node:path";

const dir = path.join(import.meta.dirname, "..", "app", "styles", "landing");
const details = fs.readFileSync(path.join(dir, "sponsors-details.css"), "utf8");
const bid = fs.readFileSync(path.join(dir, "sponsors-bid-modal.css"), "utf8");
fs.writeFileSync(path.join(dir, "sponsors-ui.css"), `${details.trimEnd()}\n\n${bid.trimStart()}`, "utf8");
fs.unlinkSync(path.join(dir, "sponsors-details.css"));
fs.unlinkSync(path.join(dir, "sponsors-bid-modal.css"));

const index = `/* Landing styles - import order matters. */
@import "./hero-layout.css";
@import "./donate.css";
@import "./how-it-works.css";
@import "./sponsors-orbit.css";
@import "./sponsors-overrides.css";
@import "./sponsors-ui.css";
@import "./chrome.css";
`;
fs.writeFileSync(path.join(dir, "index.css"), index, "utf8");
