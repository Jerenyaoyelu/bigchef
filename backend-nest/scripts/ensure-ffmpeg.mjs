#!/usr/bin/env node
/**
 * 启动前检查 ffmpeg / ffprobe（社区视频转码依赖）。
 * - 已安装：直接退出 0
 * - 未安装：尝试按操作系统调用包管理器安装；失败则打印手动命令并退出 1
 *
 * 跳过：SKIP_ENSURE_FFMPEG=1（CI 若在流水线里已安装 ffmpeg，可在单独脚本里设置）
 */
import { execSync, spawnSync } from "node:child_process";
import os from "node:os";
import process from "node:process";

const SKIP =
  process.env.SKIP_ENSURE_FFMPEG === "1" ||
  process.env.SKIP_ENSURE_FFMPEG === "true";

function hasBin(name) {
  try {
    execSync(`${name} -version`, { stdio: "pipe", shell: true });
    return true;
  } catch {
    return false;
  }
}

function exitOk(msg) {
  console.log(`[ensure-ffmpeg] ${msg}`);
  process.exit(0);
}

function exitFail(msg) {
  console.error(`[ensure-ffmpeg] ${msg}`);
  process.exit(1);
}

function installWindows() {
  console.warn("[ensure-ffmpeg] 尝试使用 winget 安装（需要系统已安装 winget）…");
  const r = spawnSync(
    "winget",
    [
      "install",
      "--id",
      "Gyan.FFmpeg",
      "-e",
      "--accept-package-agreements",
      "--accept-source-agreements",
    ],
    { stdio: "inherit", shell: true },
  );
  return r.status === 0;
}

function installDarwin() {
  if (!hasBin("brew")) {
    exitFail(
      "未检测到 Homebrew。请先安装 https://brew.sh 后执行: brew install ffmpeg",
    );
  }
  console.warn("[ensure-ffmpeg] 尝试 brew install ffmpeg …");
  const r = spawnSync("brew", ["install", "ffmpeg"], {
    stdio: "inherit",
    shell: true,
  });
  return r.status === 0;
}

function installLinux() {
  try {
    execSync("which apt-get", { stdio: "pipe" });
  } catch {
    exitFail(
      "未检测到 apt-get。请使用发行版包管理器自行安装 ffmpeg（例如 yum/dnf/pacman）。",
    );
  }

  const isRoot = typeof process.getuid === "function" && process.getuid() === 0;

  const run = (cmd, args) =>
    spawnSync(cmd, args, { stdio: "inherit", shell: false });

  if (isRoot) {
    console.warn("[ensure-ffmpeg] 以 root 执行 apt-get …");
    if (run("apt-get", ["update"]).status !== 0) return false;
    return run("apt-get", ["install", "-y", "ffmpeg"]).status === 0;
  }

  console.warn("[ensure-ffmpeg] 尝试 sudo apt-get（需要当前用户在 sudoers 且可用 sudo -n）…");
  if (run("sudo", ["-n", "apt-get", "update"]).status !== 0) {
    console.error(
      "[ensure-ffmpeg] 无法用免交互 sudo 更新索引。请手动执行:",
    );
    console.error("  sudo apt-get update && sudo apt-get install -y ffmpeg");
    return false;
  }
  return run("sudo", ["-n", "apt-get", "install", "-y", "ffmpeg"]).status === 0;
}

function main() {
  if (SKIP) {
    exitOk("SKIP_ENSURE_FFMPEG 已设置，跳过检测。");
  }

  if (hasBin("ffmpeg") && hasBin("ffprobe")) {
    exitOk("ffmpeg / ffprobe 已在 PATH 中。");
  }

  console.warn("[ensure-ffmpeg] 未检测到 ffmpeg 或 ffprobe，尝试安装…");

  const platform = os.platform();
  let attempted = false;

  if (platform === "win32") {
    attempted = installWindows();
  } else if (platform === "darwin") {
    attempted = installDarwin();
    if (!attempted) exitFail("brew install ffmpeg 失败。");
  } else if (platform === "linux") {
    attempted = installLinux();
    if (!attempted) exitFail("Linux 自动安装失败。");
  } else {
    exitFail(`不支持的操作系统: ${platform}，请手动安装 ffmpeg 并加入 PATH。`);
  }

  if (!attempted && platform === "win32") {
    exitFail(
      "winget 安装失败或未安装 winget。请手动安装后重开终端:\n" +
        "  winget install --id Gyan.FFmpeg -e\n" +
        "或从 https://www.gyan.dev/ffmpeg/builds/ 下载并配置 PATH。",
    );
  }

  if (hasBin("ffmpeg") && hasBin("ffprobe")) {
    exitOk("安装完成，ffmpeg / ffprobe 可用。");
  }

  exitFail(
    "安装命令已执行，但当前终端仍找不到 ffmpeg。\n" +
      "  · Windows：关闭并重开终端（或 VS Code）以使 PATH 生效。\n" +
      "  · 仍不行：手动确认 ffmpeg.exe、ffprobe.exe 所在目录已加入 PATH。",
  );
}

main();
