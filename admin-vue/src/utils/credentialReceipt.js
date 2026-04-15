function pad2(value) {
  return String(value).padStart(2, "0");
}

function timestampLabel(date = new Date()) {
  return [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
    "-",
    pad2(date.getHours()),
    pad2(date.getMinutes()),
    pad2(date.getSeconds()),
  ].join("");
}

function sanitizeFileSegment(value, fallback = "credential") {
  const text = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return text || fallback;
}

export function downloadCredentialReceipt({
  scene = "credential",
  title = "一次性敏感凭据回执",
  subject = "",
  account = "",
  temporaryPassword = "",
  lines = [],
} = {}) {
  const safePassword = String(temporaryPassword || "").trim();
  if (!safePassword) {
    throw new Error("missing temporary password for secure receipt");
  }

  const contentLines = [
    title,
    `生成时间: ${new Date().toLocaleString()}`,
    subject ? `对象: ${subject}` : "",
    account ? `账号: ${account}` : "",
    `一次性临时口令: ${safePassword}`,
    "",
    "安全要求:",
    "1. 请通过受控渠道单独交付该回执，不要在聊天群或工单评论区直接粘贴密码。",
    "2. 请提醒对方首次登录后立即修改密码。",
    "3. 如未能安全交付，请立即再次重置，旧口令随即作废。",
    ...lines.filter((item) => String(item || "").trim()),
  ].filter(Boolean);

  const blob = new Blob([`${contentLines.join("\n")}\n`], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const filename = `infinitech-${sanitizeFileSegment(scene)}-${timestampLabel()}.txt`;
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  return filename;
}
