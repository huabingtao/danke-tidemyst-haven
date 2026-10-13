export type ImageSource = "album" | "camera";
export function isImageFile(file: File) {
  return (
    file.type.startsWith("image/") ||
    /\.(png|jpe?g|webp|bmp|gif|heic|heif)$/i.test(file.name)
  );
}
export function imagesFromTransfer(data: DataTransfer | null): File[] {
  return Array.from(data?.files ?? [])
    .filter(isImageFile)
    .slice(0, 20);
}
/** File chooser and capture are host capabilities; never assume capture implies camera permission. */
export function openImagePicker(
  input: HTMLInputElement | null,
  source: ImageSource,
): { ok: boolean; message: string } {
  if (!input || typeof FileReader === "undefined")
    return {
      ok: false,
      message: "当前环境不支持图片文件选择，请使用普通浏览器或手动录入",
    };
  input.accept = "image/*";
  input.multiple = source === "album";
  if (source === "camera") input.setAttribute("capture", "environment");
  else input.removeAttribute("capture");
  try {
    input.click();
    return { ok: true, message: "" };
  } catch {
    return {
      ok: false,
      message: "宿主限制了文件选择，请尝试相册入口或手动录入",
    };
  }
}
