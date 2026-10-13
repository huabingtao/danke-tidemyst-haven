import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  X,
  ImagePlus,
  Camera,
  ScanLine,
  Check,
  ChevronRight,
} from "lucide-react";
import {
  createBoard,
  type Board,
  type BoardSize,
  type Cell,
} from "../core/models";
import {
  detectGrid,
  type Pixels,
  type Rect,
  type RecognitionCell,
} from "../features/image-recognition/pixels";
import {
  decodeImage,
  recognizeCells,
  type RecognitionRequest,
} from "../features/image-recognition/pipeline";
import { makeTemplates } from "../features/image-recognition/templates";
import { BoardGrid } from "./BoardGrid";
import { CellEditor, type Brush } from "./CellEditor";
import { detectEnvironment } from "../adapters/environment";
import {
  isImageFile,
  openImagePicker,
  imagesFromTransfer,
} from "../adapters/browserFiles";
interface Props {
  files: File[];
  onClose: () => void;
  onImport: (board: Board) => void;
}
export function ImageImporter({ files, onClose, onImport }: Props) {
  const dialog = useRef<HTMLDialogElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    input = useRef<HTMLInputElement>(null),
    camera = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState(files),
    [index, setIndex] = useState(0),
    [image, setImage] = useState<Pixels | null>(null),
    [rect, setRect] = useState<Rect>({ x: 0, y: 0, width: 1, height: 1 }),
    [size, setSize] = useState<BoardSize>(8),
    [total, setTotal] = useState(20),
    [room, setRoom] = useState("截图 1");
  const [cells, setCells] = useState<RecognitionCell[]>([]),
    [selected, setSelected] = useState<number | null>(null),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [message, setMessage] = useState("选择游戏棋盘截图，全部处理留在设备内"),
    [error, setError] = useState(""),
    [ocr, setOcr] = useState(true),
    [brush, setBrush] = useState(false),
    [tool, setTool] = useState<Brush>("gem"),
    [reviewed, setReviewed] = useState(false);
  const worker = useRef<Worker | null>(null),
    abort = useRef<AbortController | null>(null),
    epoch = useRef(0),
    manual = useRef(new Map<number, Cell>());
  const stop = () => {
    epoch.current++;
    worker.current?.terminate();
    worker.current = null;
    abort.current?.abort();
    abort.current = null;
    setBusy(false);
    setMessage("识别已取消，已经校正的内容已保留");
  };
  useEffect(() => {
    dialog.current?.showModal();
    return () => {
      epoch.current++;
      worker.current?.terminate();
      abort.current?.abort();
    };
  }, []);
  useEffect(() => {
    const file = queue[index];
    if (!file) return;
    const current = ++epoch.current;
    worker.current?.terminate();
    abort.current?.abort();
    setBusy(true);
    setImage(null);
    setCells([]);
    manual.current.clear();
    setSelected(null);
    setReviewed(false);
    setError("");
    setProgress(0);
    setMessage("解码并缩小图片…");
    void (async () => {
      try {
        const pixels = await decodeImage(file);
        if (current !== epoch.current) return;
        setImage(pixels);
        setRoom(`截图 ${index + 1}`);
        setMessage("自动定位棋盘边界…");
        let detection;
        if (typeof Worker !== "undefined") {
          try {
            detection = await new Promise<ReturnType<typeof detectGrid>>(
              (resolve, reject) => {
                const w = new Worker(
                  new URL("../workers/image.worker.ts", import.meta.url),
                  { type: "module" },
                );
                worker.current = w;
                w.onmessage = (e) => {
                  w.terminate();
                  e.data.kind === "detected"
                    ? resolve(e.data.detection)
                    : reject(new Error(e.data.message));
                };
                w.onerror = () => {
                  w.terminate();
                  reject(new Error("定位线程不可用"));
                };
                w.postMessage({ kind: "detect", image: pixels });
              },
            );
          } catch {
            if (current !== epoch.current) return;
            detection = detectGrid(pixels);
          }
        } else detection = detectGrid(pixels);
        if (current !== epoch.current) return;
        setRect(detection.rect);
        setSize(detection.size);
        setTotal(detection.size === 8 ? 20 : detection.size === 10 ? 30 : 45);
        setMessage(detection.reason);
        setBusy(false);
      } catch (e) {
        if (current !== epoch.current) return;
        setError(e instanceof Error ? e.message : "图片读取失败");
        setBusy(false);
      }
    })();
  }, [queue, index]);
  useEffect(() => {
    if (image && canvas.current) {
      canvas.current.width = image.width;
      canvas.current.height = image.height;
      canvas.current
        .getContext("2d")
        ?.putImageData(
          new ImageData(
            new Uint8ClampedArray(image.data),
            image.width,
            image.height,
          ),
          0,
          0,
        );
    }
  }, [image]);
  const addFiles = (values: File[]) => {
    const allowed = values.filter(isImageFile);
    if (!allowed.length) {
      setError("请选择图片文件");
      return;
    }
    stop();
    setQueue(allowed.slice(0, 20));
    setIndex(0);
    if (values.length > 20) setMessage("单次最多处理 20 张图片");
  };
  const chooseImage = (source: "album" | "camera") => {
    const result = openImagePicker(
      source === "album" ? input.current : camera.current,
      source,
    );
    if (!result.ok) setError(result.message);
  };
  const recognize = async () => {
    if (!image) return;
    const current = ++epoch.current;
    worker.current?.terminate();
    abort.current?.abort();
    abort.current = new AbortController();
    setBusy(true);
    setProgress(0);
    setError("");
    setReviewed(false);
    setMessage("正在识别…");
    const request: RecognitionRequest = {
      image,
      rect,
      size,
      ocr,
      templates: makeTemplates(),
      assetBase: new URL(
        `${import.meta.env.BASE_URL}ocr`,
        window.location.href,
      ).href.replace(/\/$/, ""),
    };
    try {
      let output: RecognitionCell[];
      if (
        typeof Worker !== "undefined" &&
        typeof OffscreenCanvas !== "undefined"
      )
        output = await new Promise((resolve, reject) => {
          const w = new Worker(
            new URL("../workers/image.worker.ts", import.meta.url),
            { type: "module" },
          );
          worker.current = w;
          w.onmessage = (e) => {
            if (current !== epoch.current) return;
            if (e.data.kind === "progress") {
              setProgress(e.data.progress);
              setMessage(e.data.message);
            } else if (e.data.kind === "complete") {
              w.terminate();
              resolve(e.data.cells);
            } else if (e.data.kind === "error") {
              w.terminate();
              reject(new Error(e.data.message));
            }
          };
          w.onerror = () => {
            w.terminate();
            reject(new Error("识别线程异常，请关闭 OCR 后重试或手动录入"));
          };
          w.postMessage({ kind: "recognize", request });
        });
      else
        output = await recognizeCells(
          request,
          (p) => {
            if (current === epoch.current) {
              setProgress(p.progress);
              setMessage(p.message);
            }
          },
          abort.current.signal,
        );
      if (current !== epoch.current) return;
      setCells(
        output.map((c, i) =>
          manual.current.has(i)
            ? {
                cell: manual.current.get(i)!,
                confidence: 1,
                reason: "已人工校正",
                needsReview: false,
              }
            : c,
        ),
      );
      setBusy(false);
      setProgress(1);
      setMessage("识别完成。请核对原图，修正橙色边框中的不确定格子。");
    } catch (e) {
      if (current !== epoch.current) return;
      setBusy(false);
      setError(
        e instanceof Error ? e.message : "识别失败，可以继续校正已有结果",
      );
    }
  };
  const draft: Board = {
    id: "draft",
    room,
    size,
    totalGems: total,
    cells: cells.map((c) => c.cell),
    updatedAt: Date.now(),
  };
  const apply = (value: Brush) => {
    setTool(value);
    if (selected === null) return;
    edit(selected, value);
  };
  const edit = (i: number, value: Brush) => {
    const current = cells[i]?.cell;
    if (!current) return;
    const cell =
      value === "flag"
        ? { ...current, flagged: !current.flagged }
        : { observed: value, flagged: current.flagged };
    manual.current.set(i, cell);
    setCells((old) =>
      old.map((c, j) =>
        j === i
          ? { cell, confidence: 1, reason: "已人工校正", needsReview: false }
          : c,
      ),
    );
    setReviewed(false);
  };
  const select = (i: number) => {
    setSelected(i);
    if (brush) edit(i, tool);
  };
  const changeRect = (key: keyof Rect, value: number) => {
    if (!image) return;
    setReviewed(false);
    setRect((old) => {
      const next = { ...old, [key]: value };
      next.x = Math.max(0, Math.min(image.width - 10, next.x));
      next.y = Math.max(0, Math.min(image.height - 10, next.y));
      next.width = Math.max(10, Math.min(image.width - next.x, next.width));
      next.height = Math.max(10, Math.min(image.height - next.y, next.height));
      return next;
    });
  };
  const confirm = () => {
    try {
      onImport({
        ...createBoard(size, room.trim() || `截图 ${index + 1}`),
        totalGems: total,
        cells: cells.map((c) => c.cell),
      });
      if (index < queue.length - 1) {
        setIndex((i) => i + 1);
      } else onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "无法导入");
    }
  };
  const drop = (e: DragEvent) => {
    e.preventDefault();
    addFiles(imagesFromTransfer(e.dataTransfer));
  };
  return (
    <dialog
      className="import-dialog"
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault();
        stop();
        onClose();
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={drop}
      onPaste={(e) => {
        const fs = Array.from(e.clipboardData.files);
        if (fs.length) {
          e.preventDefault();
          addFiles(fs);
        }
      }}
    >
      <div className="dialog-header">
        <div>
          <h2>
            <ScanLine size={23} />
            从截图读取棋盘
          </h2>
          <p>图片在本地处理 · 核对后再加入房间</p>
        </div>
        <button
          className="icon-button"
          onClick={() => {
            stop();
            onClose();
          }}
          aria-label="关闭图片识别"
        >
          <X size={20} />
        </button>
      </div>
      <div className="import-toolbar">
        <button
          className="secondary-button"
          onClick={() => chooseImage("album")}
          disabled={busy}
        >
          <ImagePlus size={16} />
          选择图片 / 相册
        </button>
        <button
          className="secondary-button"
          onClick={() => chooseImage("camera")}
          disabled={busy}
        >
          <Camera size={16} />
          拍照
        </button>
        <span>
          {queue.length
            ? `${index + 1} / ${queue.length} 张 · ${queue[index]?.name}`
            : "支持拖拽或 Ctrl / ⌘ + V 粘贴"}
        </span>
      </div>
      <input
        ref={input}
        hidden
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          addFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      <input
        ref={camera}
        hidden
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          addFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      <div className="import-content">
        <div className="image-setup">
          {image ? (
            <>
              <div className="crop-preview">
                <canvas ref={canvas} />
                <div
                  className="crop-outline"
                  style={{
                    left: `${(rect.x / image.width) * 100}%`,
                    top: `${(rect.y / image.height) * 100}%`,
                    width: `${(rect.width / image.width) * 100}%`,
                    height: `${(rect.height / image.height) * 100}%`,
                  }}
                >
                  <span>
                    {size}×{size}
                  </span>
                </div>
              </div>
              <p className="helper">
                边框应贴合棋盘最外侧网格线。移动端可用下方滑块微调，避免手指遮住边界。
              </p>
              <div className="crop-inputs">
                {(["x", "y", "width", "height"] as const).map((key, i) => (
                  <label key={key}>
                    {["左边距", "上边距", "宽度", "高度"][i]}{" "}
                    <span>{Math.round(rect[key])} px</span>
                    <input
                      type="range"
                      aria-label={`裁剪${["左边距", "上边距", "宽度", "高度"][i]}`}
                      min={key === "width" || key === "height" ? 10 : 0}
                      max={
                        key === "x" || key === "width"
                          ? image.width
                          : image.height
                      }
                      value={rect[key]}
                      disabled={busy}
                      onChange={(e) => changeRect(key, Number(e.target.value))}
                    />
                  </label>
                ))}
              </div>
            </>
          ) : (
            <div className="image-empty">
              <ImagePlus size={40} />
              <h3>导入一张游戏截图</h3>
              <p>选择相册、拍照，或把图片拖到这里。</p>
            </div>
          )}
          <div className="recognition-settings">
            <label>
              棋盘尺寸
              <select
                aria-label="识别棋盘尺寸"
                value={size}
                disabled={busy}
                onChange={(e) => {
                  const s = Number(e.target.value) as BoardSize;
                  setSize(s);
                  setTotal(s === 8 ? 20 : s === 10 ? 30 : 45);
                  setCells([]);
                  manual.current.clear();
                  setReviewed(false);
                }}
              >
                <option value={8}>8×8</option>
                <option value={10}>10×10</option>
                <option value={12}>12×12</option>
              </select>
            </label>
            <label>
              宝石总数
              <input
                aria-label="截图宝石总数"
                type="number"
                min={0}
                max={size * size}
                value={total}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isInteger(n) && n >= 0 && n <= size * size)
                    setTotal(n);
                }}
              />
            </label>
            <label>
              房间编号
              <input
                aria-label="截图房间编号"
                maxLength={24}
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
            </label>
          </div>
          <label className="brush-toggle">
            <input
              type="checkbox"
              checked={ocr}
              disabled={busy}
              onChange={(e) => setOcr(e.target.checked)}
            />
            数字 OCR 辅助 <small>首次加载同源模型</small>
          </label>
          <div className="recognition-action">
            <button
              className="primary-button"
              disabled={!image || busy}
              onClick={() => void recognize()}
            >
              <ScanLine size={17} />
              {cells.length ? "重新识别" : "开始识别"}
            </button>
            {busy && (
              <button className="secondary-button" onClick={stop}>
                取消
              </button>
            )}
            {image && !cells.length && !busy && (
              <button
                className="text-button"
                onClick={() => {
                  setCells(
                    Array.from({ length: size * size }, () => ({
                      cell: { observed: "unknown", flagged: false },
                      confidence: 0,
                      needsReview: true,
                      reason: "手动录入",
                    })),
                  );
                  setMessage("已建立可编辑棋盘，请对照图片录入");
                }}
              >
                从空棋盘手动校正
              </button>
            )}
          </div>
          <div role="status" className="recognition-progress">
            <p>{message}</p>
            {busy && <progress value={progress} max={1} />}
          </div>
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
          {detectEnvironment().wechat && (
            <p className="helper">
              微信中剪贴板和拍照由宿主决定；若选择器受限，可从相册选择，或手动录入。
            </p>
          )}
        </div>
        <div className="recognition-review">
          <h3>核对识别结果</h3>
          {cells.length === size * size ? (
            <>
              <p className="helper">
                {cells.filter((c) => c.needsReview).length} 格需要核对。
                <br />
                未识别的格子保持「?」，不会被当作数字或宝石。
              </p>
              <BoardGrid
                board={draft}
                selected={selected}
                onSelect={select}
                uncertain={
                  new Set(cells.flatMap((c, i) => (c.needsReview ? [i] : [])))
                }
                compact
              />
              <CellEditor
                size={size}
                selected={selected}
                cell={selected === null ? undefined : cells[selected]?.cell}
                onApply={apply}
                onClose={() => setSelected(null)}
                brush={brush}
                onBrush={setBrush}
                tool={tool}
                review={selected !== null && cells[selected]?.needsReview}
              />
              <label className="confirm-review">
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(e) => setReviewed(e.target.checked)}
                />
                我已核对尺寸、总数与格子；未知内容保留为未知
              </label>
              <button
                className="primary-button import-confirm"
                disabled={!reviewed || busy}
                onClick={confirm}
              >
                <Check size={18} />
                确认导入并计算
                {index < queue.length - 1 && <ChevronRight size={16} />}
              </button>
            </>
          ) : (
            <div className="review-empty">
              <ScanLine size={30} />
              <p>
                识别后的棋盘会显示在这里
                <br />
                所有结果都可以点击修正
              </p>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
