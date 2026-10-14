import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  Gem,
  Sun,
  Moon,
  ImagePlus,
  Undo2,
  Redo2,
  RotateCcw,
  Trash2,
  ShieldCheck,
  HelpCircle,
  X,
  Check,
  Flag,
  Eraser,
  Share2,
  Trophy,
} from "lucide-react";
import { BattlePage } from "./components/battle/BattlePage";
import { BattleReadOnly } from "./components/battle/BattleReadOnly";
import { useBattleLink } from "./hooks/useBattleLink";
import { CommunityStats } from "./components/CommunityStats";
import { useBoards } from "./stores/boards";
import { useSharedBoard } from "./hooks/useSharedBoard";
import { ShareDialog } from "./components/ShareDialog";
import { progressLink, toolLink } from "./features/sharing/links";
import {
  shareLink,
  type SharePayload,
  type ShareResult,
} from "./adapters/sharing";
import { useSolver } from "./hooks/useSolver";
import {
  BoardGrid,
  type BoardView,
  coordinate,
  percent,
} from "./components/BoardGrid";
import { CellEditor } from "./components/CellEditor";
import { BoardLegend } from "./components/BoardLegend";
import { ImageSourcePicker } from "./components/ImageSourcePicker";
import { RoomList } from "./components/RoomList";
import { Analysis } from "./components/Analysis";
import { ImageImporter } from "./components/ImageImporter";
import { recommend } from "./core/recommendations";
import { detectEnvironment, getHostAdapter } from "./adapters/environment";
import {
  imagesFromTransfer,
  openImagePicker,
  type ImageSource,
} from "./adapters/browserFiles";
export default function App() {
  const store = useBoards(),
    board = store.boards.find((b) => b.id === store.activeId),
    solver = useSolver(board);
  const [selected, setSelected] = useState<number | null>(null),
    [view, setView] = useState<BoardView>("standard"),
    [editMode, setEditMode] = useState<"observe" | "flag" | "erase">("observe"),
    [sourcePicker, setSourcePicker] = useState(false),
    [upload, setUpload] = useState<File[] | null>(null),
    [toast, setToast] = useState(""),
    [help, setHelp] = useState(false),
    [roomDraft, setRoomDraft] = useState(board?.room ?? "");
  const [share, setShare] = useState<{
    payload: SharePayload;
    result: ShareResult;
  } | null>(null);
  const [sharing, setSharing] = useState(false);
  const [battles, setBattles] = useState(false);
  const battleView = useBattleLink();
  useSharedBoard(setToast);
  const sendShare = async (kind: "progress" | "tool") => {
    if (sharing) return;
    setSharing(true);
    try {
      const base = import.meta.env.VITE_PUBLIC_APP_URL || window.location.href;
      const payload: SharePayload =
        kind === "progress" && board
          ? {
              title: `房间 ${board.room} 的潮汐秘境进度`,
              text: `${board.size}×${board.size} · 已发现 ${board.cells.filter((c) => c.observed === "gem").length}/${board.totalGems} 颗宝石`,
              url: progressLink(board, base),
            }
          : {
              title: "潮汐秘境 · 宝石推理助手",
              text: "录入棋盘或读取游戏截图，推算宝石概率与下一步位置。",
              url: toolLink(base),
            };
      const result = await shareLink(payload);
      if (result.method === "native" || result.method === "canceled")
        setToast(result.message);
      else setShare({ payload, result });
    } catch (e) {
      setToast(e instanceof Error ? e.message : "无法生成分享链接，请重试");
    } finally {
      setSharing(false);
    }
  };
  const fileInput = useRef<HTMLInputElement>(null),
    cameraInput = useRef<HTMLInputElement>(null);
  const [theme, setTheme] = useState(() => {
    try {
      return (
        localStorage.getItem("tidemyst-theme") ??
        (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      );
    } catch {
      return "light";
    }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("tidemyst-theme", theme);
    } catch {}
  }, [theme]);
  useEffect(() => {
    setSelected(null);
    getHostAdapter().notifyBoardChanged?.(board?.room ?? "");
  }, [board?.id]);
  useEffect(() => setRoomDraft(board?.room ?? ""), [board?.id, board?.room]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 6500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      if (
        battleView.active ||
        upload !== null ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      const fs = imagesFromTransfer(e.clipboardData);
      if (fs.length) {
        e.preventDefault();
        setUpload(fs);
      }
    };
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [upload, battleView.active]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        battleView.active ||
        upload !== null ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? store.redo() : store.undo();
      } else if (e.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [store.undo, store.redo, upload, battleView.active]);
  const apply = (value: "gem" | number) => {
    if (board && selected !== null && board.cells[selected])
      store.setCell(board.id, selected, {
        observed: value,
        flagged: board.cells[selected].flagged,
      });
    setSelected(null);
  };
  const select = (i: number) => {
    if (!board) return;
    const c = board.cells[i];
    if (editMode === "flag") {
      store.setCell(board.id, i, { ...c, flagged: !c.flagged });
      return;
    }
    if (editMode === "erase") {
      store.setCell(board.id, i, { observed: "unknown", flagged: false });
      return;
    }
    setSelected(i);
  };
  const chooseSource = (source: ImageSource) => {
    const result = openImagePicker(
      source === "album" ? fileInput.current : cameraInput.current,
      source,
    );
    setSourcePicker(false);
    if (!result.ok) setToast(result.message);
  };
  const requestScreenshot = () => {
    if (detectEnvironment().mobile) setSourcePicker(true);
    else chooseSource("album");
  };
  const acceptFiles = (files: FileList | null) => {
    const values = Array.from(files ?? []).slice(0, 20);
    if (values.length) {
      setSelected(null);
      setUpload(values);
    }
  };
  const drop = (e: DragEvent) => {
    e.preventDefault();
    if (upload !== null) return;
    const fs = imagesFromTransfer(e.dataTransfer);
    if (fs.length) setUpload(fs);
  };

  const rec = board && solver.result ? recommend(board, solver.result) : null;
  if (battleView.active)
    return (
      <div className="app-shell">
        <CommunityStats />
        <BattleReadOnly share={battleView.share} error={battleView.error} />
      </div>
    );
  return (
    <div
      className="app-shell"
      onDragOver={(e) => e.preventDefault()}
      onDrop={drop}
    >
      <header className="app-header">
        <a className="brand" href="./" aria-label="潮汐秘境首页">
          <span className="brand-mark">
            <Gem size={25} strokeWidth={1.7} />
          </span>
          <span>
            <strong>潮汐秘境</strong>
            <small>宝石推理助手</small>
          </span>
        </a>
        <div className="header-actions">
          <span className="privacy-badge">
            <ShieldCheck size={15} />
            截图本地处理
          </span>
          <button
            className="battle-nav"
            aria-label="我的战绩"
            aria-pressed={battles}
            onClick={() => {
              setSelected(null);
              setBattles((v) => !v);
            }}
          >
            <Trophy size={20} />
            <span>我的战绩</span>
          </button>
          <button
            className="icon-button"
            aria-label="分享工具"
            title="分享工具"
            disabled={sharing}
            onClick={() => void sendShare("tool")}
          >
            <Share2 size={20} />
          </button>
          <button
            className="icon-button"
            aria-label="使用说明"
            onClick={() => setHelp((v) => !v)}
          >
            <HelpCircle size={20} />
          </button>
          <button
            className="icon-button"
            aria-label={theme === "dark" ? "切换浅色模式" : "切换深色模式"}
            onClick={() => setTheme((v) => (v === "dark" ? "light" : "dark"))}
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>
      <CommunityStats />
      {help && (
        <section className="help-banner">
          <div>
            <h2>从已知线索，找到下一颗宝石</h2>
            <p>
              新建房间，或导入截图。点击棋盘格子，录入游戏实际显示的数字 0–8
              或宝石。数字表示周围八格中的宝石数；推测旗标不参与计算。
            </p>
            <p>
              优先查看「必有宝石」和高概率位置；0%
              格子确定为空。旗标和擦除可用棋盘工具栏。撤销支持 Ctrl / ⌘ + Z。
            </p>
          </div>
          <button
            className="icon-button"
            onClick={() => setHelp(false)}
            aria-label="关闭说明"
          >
            <X size={18} />
          </button>
        </section>
      )}
      {battles ? (
        <BattlePage
          board={board}
          onBack={() => setBattles(false)}
          onMessage={setToast}
        />
      ) : (
        <div className="workspace">
          <RoomList onMessage={setToast} />
          <main className="board-main">
            {board ? (
              <>
                <div className="board-title">
                  <div>
                    <h1>
                      房间 {board.room}
                      <span>
                        {board.size}×{board.size}
                      </span>
                    </h1>
                  </div>
                  <button
                    className="primary-button upload-button"
                    onClick={requestScreenshot}
                  >
                    <ImagePlus size={18} />
                    <span>读取截图</span>
                  </button>
                </div>
                <div className="board-settings">
                  <label>
                    房间编号
                    <input
                      aria-label="房间编号"
                      maxLength={24}
                      value={roomDraft}
                      onChange={(e) => setRoomDraft(e.target.value)}
                      onBlur={() => {
                        const value = roomDraft.trim();
                        if (value && value !== board.room)
                          store.patch(board.id, { room: value });
                        else setRoomDraft(board.room);
                      }}
                    />
                  </label>
                  <label>
                    宝石总数
                    <input
                      aria-label="宝石总数"
                      type="number"
                      min={0}
                      max={board.size * board.size}
                      value={board.totalGems}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (
                          Number.isInteger(n) &&
                          n >= 0 &&
                          n <= board.size * board.size
                        )
                          store.patch(board.id, { totalGems: n });
                      }}
                    />
                  </label>
                  <span className="saved-status">
                    <Check size={13} />
                    自动保存
                  </span>
                </div>
                <div className="board-toolbar">
                  <div className="view-tabs" role="group" aria-label="棋盘视图">
                    {(
                      [
                        ["standard", "标准"],
                        ["heatmap", "热力图"],
                        ["recommendations", "只看推荐"],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        aria-pressed={view === key}
                        className={view === key ? "active" : ""}
                        onClick={() => setView(key)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="history-buttons">
                    <button
                      className="icon-button"
                      aria-label="重置"
                      title="重置棋盘"
                      onClick={() => {
                        if (!window.confirm(`重置房间 ${board.room} 的棋盘？所有格子记录将清空，并开启新局。已保存的战绩会保留。`)) return;
                        store.reset(board.id);
                        setSelected(null);
                        setToast("棋盘已重置，可撤销恢复");
                      }}
                    >
                      <RotateCcw size={17} />
                    </button>
                    <button
                      className="icon-button danger"
                      aria-label="删除"
                      title="删除房间"
                      onClick={() => {
                        if (!window.confirm(`删除房间 ${board.room}？该房间的棋盘记录将移除，已保存的战绩会保留。`)) return;
                        store.remove(board.id);
                        setSelected(null);
                        setToast("房间已删除，可撤销恢复");
                      }}
                    >
                      <Trash2 size={17} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label="分享当前进度"
                      title="分享当前进度"
                      disabled={sharing}
                      onClick={() => void sendShare("progress")}
                    >
                      <Share2 size={17} />
                    </button>
                    <button
                      className={`icon-button ${editMode === "flag" ? "active" : ""}`}
                      aria-label="推测旗标工具"
                      aria-pressed={editMode === "flag"}
                      onClick={() =>
                        setEditMode((m) => (m === "flag" ? "observe" : "flag"))
                      }
                    >
                      <Flag size={17} />
                    </button>
                    <button
                      className={`icon-button ${editMode === "erase" ? "active" : ""}`}
                      aria-label="擦除记录工具"
                      aria-pressed={editMode === "erase"}
                      onClick={() =>
                        setEditMode((m) =>
                          m === "erase" ? "observe" : "erase",
                        )
                      }
                    >
                      <Eraser size={17} />
                    </button>
                    <button
                      className="icon-button"
                      onClick={store.undo}
                      disabled={!store.past.length}
                      aria-label="撤销"
                    >
                      <Undo2 size={18} />
                    </button>
                    <button
                      className="icon-button"
                      onClick={store.redo}
                      disabled={!store.future.length}
                      aria-label="重做"
                    >
                      <Redo2 size={18} />
                    </button>
                  </div>
                </div>
                <div className="board-surface">
                  <BoardGrid
                    board={board}
                    result={solver.result}
                    selected={selected}
                    onSelect={select}
                    view={view}
                    best={rec?.next}
                  />
                  {solver.busy && (
                    <div className="board-calculating" role="status">
                      计算中…
                    </div>
                  )}
                </div>
                <div className="board-caption">
                  <span>
                    {selected === null
                      ? editMode === "flag"
                        ? "旗标模式：点击格子切换推测标记"
                        : editMode === "erase"
                          ? "擦除模式：点击格子清除记录"
                          : "点击格子，选择宝石或 0–8"
                      : `已选 ${coordinate(selected, board.size)}`}
                  </span>
                  <span>棋盘随屏幕自动适配</span>
                </div>
                <BoardLegend />
                <div className="board-bottom">
                  <p>
                    每次记录，都会重新推理。
                    <br />
                    概率来自满足全部线索的合法布局。
                  </p>

                </div>
                <div className="mobile-actions">
                  <button onClick={requestScreenshot}>
                    <ImagePlus size={18} />
                    读取截图
                  </button>
                  <button onClick={store.undo} disabled={!store.past.length}>
                    <Undo2 size={18} />
                    撤销
                  </button>
                  <button
                    onClick={() => {
                      if (rec?.next.length) {
                        setEditMode("observe");
                        setSelected(rec.next[0]);
                      }
                    }}
                    disabled={!rec?.next.length}
                    className="mobile-recommend"
                  >
                    <Gem size={18} />
                    <span>
                      推荐{" "}
                      {rec?.next.length
                        ? coordinate(rec.next[0], board.size)
                        : "等待计算"}
                      <small>
                        {rec?.next.length ? `${percent(rec.max)} 宝石概率` : ""}
                      </small>
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-workspace">
                <Gem size={44} />
                <h1>准备好寻找宝石了吗？</h1>
                <p>选择尺寸创建房间，或从游戏截图开始。</p>
                <button className="primary-button" onClick={() => store.add(8)}>
                  创建 8×8 房间
                </button>
                <button
                  className="secondary-button"
                  onClick={store.undo}
                  disabled={!store.past.length}
                >
                  撤销删除
                </button>
              </div>
            )}
          </main>
          <aside className="right-sidebar">
            {board && (
              <>
                <Analysis
                  board={board}
                  {...solver}
                  onSelect={(i) => {
                    setEditMode("observe");
                    setSelected(i);
                  }}
                />
              </>
            )}
            <div className="local-note">
              <ShieldCheck size={17} />
              <p>
                截图与棋盘内容留在此设备
                <br />
                {detectEnvironment().wechat
                  ? "微信内置浏览器 · 可从相册导入"
                  : "无需登录，打开就能用"}
              </p>
            </div>
          </aside>
        </div>
      )}
      {(toast || store.notice) && (
        <div className="toast" role="status">
          <span>{toast || store.notice}</span>
          <button
            className="icon-button"
            aria-label="关闭提示"
            onClick={() => {
              setToast("");
              store.clearNotice();
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {board && selected !== null && board.cells[selected] && (
        <CellEditor
          key={`${board.id}/${selected}`}
          selected={selected}
          size={board.size}
          cell={board.cells[selected]}
          onApply={apply}
          onReset={() => {
            store.setCell(board.id, selected, {
              observed: "unknown",
              flagged: false,
            });
            setSelected(null);
          }}
          onClose={() => setSelected(null)}
        />
      )}
      {share && (
        <ShareDialog
          payload={share.payload}
          result={share.result}
          onClose={() => setShare(null)}
        />
      )}
      {sourcePicker && (
        <ImageSourcePicker
          onSelect={chooseSource}
          onClose={() => setSourcePicker(false)}
        />
      )}
      <input
        hidden
        data-testid="screenshot-input"
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          acceptFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        hidden
        data-testid="camera-input"
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          acceptFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {upload !== null && (
        <ImageImporter
          files={upload}
          firstRoom={1}
          onClose={() => setUpload(null)}
          onImport={(b) => {
            const room = String(useBoards.getState().boards.length + 1);
            store.addRecognized({ ...b, room });
            setBattles(false);
            const reviews = b.cells.filter((c) => c.recognition).length;
            setToast(
              `房间 ${room} 已自动填入${reviews ? `，${reviews} 格待核对，可点击修正` : ""}`,
            );
          }}
        />
      )}
    </div>
  );
}
