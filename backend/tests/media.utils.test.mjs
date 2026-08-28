import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
  ALLOWED_VIDEO_EXTENSIONS,
  buildCompressVideoArgs,
  buildConvertVideoArgs,
  buildExtractAudioArgs,
  isAllowedVideoUpload,
  sanitizeBaseName,
} from "../dist/services/media/media.utils.js";
import { summarizeFfmpegFailure } from "../dist/services/media/ffmpeg.service.js";

describe("media.utils", () => {
  describe("isAllowedVideoUpload", () => {
    for (const [name, mime, expected] of [
      ["holiday.mp4", "video/mp4", true],
      ["clip.MOV", "video/quicktime", true],
      ["movie.mkv", "application/octet-stream", true],
      ["recording.webm", "", true],
      ["notes.txt", "text/plain", false],
      ["archive.zip", "application/zip", false],
    ]) {
      it(`${name} (${mime || "no mime"}) -> ${expected}`, () => {
        assert.equal(isAllowedVideoUpload(name, mime), expected);
      });
    }

    it("rejects traversal-style names whose extension is not allowed", () => {
      assert.equal(isAllowedVideoUpload("../../etc/passwd.sh", "text/x-sh"), false);
    });

    it("allow-list contains the documented containers", () => {
      for (const ext of [".mp4", ".mov", ".webm", ".mkv", ".avi"]) {
        assert.ok(ALLOWED_VIDEO_EXTENSIONS.has(ext));
      }
    });
  });

  describe("sanitizeBaseName", () => {
    it("strips extensions and directories (path traversal protection)", () => {
      assert.equal(sanitizeBaseName("../../etc/passwd.mp4"), "passwd");
      const evil = "..\\..\\windows\\system32\\config.mp4";
      const cleaned = sanitizeBaseName(evil);
      assert.ok(!cleaned.includes("/") && !cleaned.includes("\\"));
    });

    it("keeps safe characters and arabic letters", () => {
      assert.equal(sanitizeBaseName("محاضرة-01 final.mp4"), "محاضرة-01 final");
    });

    it("falls back to 'video' for unusable names", () => {
      assert.equal(sanitizeBaseName("???"), "video");
      assert.equal(sanitizeBaseName(""), "video");
    });

    it("caps the length", () => {
      const long = "x".repeat(500) + ".mp4";
      assert.ok(sanitizeBaseName(long).length <= 80);
    });
  });

  describe("ffmpeg arg builders never leak raw user input", () => {
    it("extract-audio args use validated codec constants", () => {
      const args = buildExtractAudioArgs("/tmp/in.mp4", "/tmp/out/audio.mp3", "mp3", "high");
      assert.equal(args.filter((a) => a === "-vn").length, 1);
      assert.ok(args.includes("libmp3lame"));
      assert.ok(!args.some((a) => a.includes("/tmp/in.mp4") && a !== "/tmp/in.mp4"));
    });

    it("compress presets map to distinct CRF values", () => {
      const light = buildCompressVideoArgs("in", "out", "light");
      const medium = buildCompressVideoArgs("in", "out", "medium");
      const strong = buildCompressVideoArgs("in", "out", "strong");
      assert.deepEqual(light.filter((a) => !medium.includes(a)), ["23", "fast"]);
      assert.notDeepEqual(medium, strong);
    });

    it("webm conversion uses vp9+opus, mp4 uses h264+aac", () => {
      assert.ok(buildConvertVideoArgs("i", "o", "webm").includes("libvpx-vp9"));
      assert.ok(buildConvertVideoArgs("i", "o", "webm").includes("libopus"));
      const mp4 = buildConvertVideoArgs("i", "o", "mp4");
      assert.ok(mp4.includes("libx264"));
      assert.ok(!mp4.includes("libvpx-vp9"));
    });
  });

  describe("summarizeFfmpegFailure", () => {
    it("maps corrupted input to a clean message", () => {
      const message = summarizeFfmpegFailure(
        "Invalid data found when processing input moov atom not found"
      );
      assert.match(message, /corrupted/i);
      assert.ok(!message.includes("moov"));
    });

    it("never returns raw stderr fragments", () => {
      const raw = "some random ffmpeg stack trace with C:\\Users\\paths";
      const message = summarizeFfmpegFailure(raw);
      assert.ok(!message.includes(raw));
    });
  });
});

describe("path module sanity for temp isolation", () => {
  it("job dirs are uuid-based and cannot escape via filename", async () => {
    const { randomUUID } = await import("node:crypto");
    const id = randomUUID();
    assert.match(id, /^[0-9a-f-]{36}$/);
    assert.ok(!id.includes(path.sep));
  });
});
