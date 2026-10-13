import { useEffect, useState, type DragEvent } from "react";
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
  ChevronDown,
} from "lucide-react";
import { useBoards } from "./stores/boards";
import { useSolver } from "./hooks/useSolver";
import {
  BoardGrid,
  type BoardView,
  coordinate,
  percent,
} from "./components/BoardGrid";
import { CellEditor, type Brush } from "./components/CellEditor";
import { RoomList } from "./components/RoomList";
import { Analysis } from "./components/Analysis";
import { ImageImporter } from "./components/ImageImporter";
import { recommend } from "./core/recommendations";
import { detectEnvironment, getHostAdapter } from "./adapters/environment";
import { imagesFromTransfer } from "./adapters/browserFiles";
export default function App() {
  const store = useBoards(),
    board = store.boards.find((b) => b.id === store.activeId),
    solver = useSolver(board);
  const [selected, setSelected] = useState<number | null>(null),
    [view, setView] = useState<BoardView>("standard"),
    [brush, setBrush] = useState(false),
    [tool, setTool] = useState<Brush>("gem"),
    [upload, setUpload] = useState<File[] | null>(null),
    [toast, setToast] = useState(""),
    [help, setHelp] = useState(false),
    [roomDraft, setRoomDraft] = useState(board?.room ?? "");
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
  }, [upload]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
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
  }, [store.undo, store.redo, upload]);
  const edit = (i: number, value: Brush) => {
    if (!board) return;
    const c = board.cells[i];
    store.setCell(
      board.id,
      i,
      value === "flag"
        ? { ...c, flagged: !c.flagged }
        : { ...c, observed: value },
    );
  };
  const apply = (value: Brush) => {
    setTool(value);
    if (selected !== null) edit(selected, value);
  };
  const select = (i: number) => {
    setSelected(i);
    if (brush) edit(i, tool);
  };
  const drop = (e: DragEvent) => {
    e.preventDefault();
    if (upload !== null) return;
    const fs = imagesFromTransfer(e.dataTransfer);
    if (fs.length) setUpload(fs);
  };
  const rec = board && solver.result ? recommend(board, solver.result) : null;
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
            本地处理，安心使用
          </span>
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
      {help && (
        <section className="help-banner">
          <div>
            <h2>从已知线索，找到下一颗宝石</h2>
            <p>
              新建房间，或导入截图。点击棋盘格子，录入游戏实际显示的数字
              0–8、宝石或安全格。数字表示周围八格中的宝石数；推测旗标不参与计算。
            </p>
            <p>
              优先查看「必有宝石」和高概率位置；0%
              格子确定为空。连续录入可像笔刷一样编辑。撤销支持 Ctrl / ⌘ + Z。
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
      <div className="workspace">
        <RoomList onMessage={setToast} />
        <main className="board-main">
          {board ? (
            <>
              <div className="board-title">
                <div>
                  <span className="board-context">
                    Survivor.io · Tidemyst Haven
                  </span>
                  <h1>
                    房间 {board.room}
                    <span>
                      {board.size}×{board.size}
                    </span>
                  </h1>
                </div>
                <button
                  className="primary-button upload-button"
                  onClick={() => setUpload([])}
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
                  best={rec?.best}
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
                    ? "点选格子，录入实际结果"
                    : `已选 ${coordinate(selected, board.size)}${brush ? " · 连续录入中" : ""}`}
                </span>
                <span>
                  大棋盘可左右滑动{" "}
                  <ChevronDown size={12} className="scroll-chevron" />
                </span>
              </div>
              <div className="board-legend">
                <span>
                  <i className="legend-symbol gem-symbol">◆</i>已发现宝石
                </span>
                <span>
                  <i className="legend-symbol number-symbol">3</i>周围宝石数
                </span>
                <span>
                  <i className="legend-symbol certain-symbol">◆</i>必有宝石
                </span>
                <span>
                  <i className="legend-symbol safe-symbol">×</i>必为空
                </span>
                <span>
                  <i className="legend-symbol recommend-symbol">•</i>推荐位置
                </span>
              </div>
              <div className="board-bottom">
                <p>
                  每次记录，都会重新推理。
                  <br />
                  概率来自满足全部线索的合法布局。
                </p>
                <div>
                  <button
                    className="text-button"
                    onClick={() => {
                      store.reset(board.id);
                      setSelected(null);
                      setToast("棋盘已重置，可撤销恢复");
                    }}
                  >
                    <RotateCcw size={15} />
                    重置
                  </button>
                  <button
                    className="text-button danger"
                    onClick={() => {
                      store.remove(board.id);
                      setToast("房间已删除，可撤销恢复");
                    }}
                  >
                    <Trash2 size={15} />
                    删除
                  </button>
                </div>
              </div>
              <div className="mobile-actions">
                <button onClick={() => setUpload([])}>
                  <ImagePlus size={18} />
                  读取截图
                </button>
                <button onClick={store.undo} disabled={!store.past.length}>
                  <Undo2 size={18} />
                  撤销
                </button>
                <button
                  onClick={() => {
                    if (rec?.best.length) select(rec.best[0]);
                  }}
                  disabled={!rec?.best.length}
                  className="mobile-recommend"
                >
                  <Gem size={18} />
                  <span>
                    推荐{" "}
                    {rec?.best.length
                      ? coordinate(rec.best[0], board.size)
                      : "等待计算"}
                    <small>
                      {rec?.best.length ? `${percent(rec.max)} 宝石概率` : ""}
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
              <Analysis board={board} {...solver} onSelect={select} />
              <CellEditor
                selected={selected}
                size={board.size}
                cell={selected === null ? undefined : board.cells[selected]}
                onApply={apply}
                onClose={() => setSelected(null)}
                brush={brush}
                onBrush={setBrush}
                tool={tool}
              />
            </>
          )}
          <div className="local-note">
            <ShieldCheck size={17} />
            <p>
              截图与房间数据留在此设备
              <br />
              {detectEnvironment().wechat
                ? "微信内置浏览器 · 可从相册导入"
                : "无需登录，打开就能用"}
            </p>
          </div>
        </aside>
      </div>
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
      {upload !== null && (
        <ImageImporter
          files={upload}
          onClose={() => setUpload(null)}
          onImport={(b) => {
            store.addRecognized(b);
            setToast(`房间 ${b.room} 已导入，正在计算`);
          }}
        />
      )}
    </div>
  );
}
