import { Plus, ChevronDown, Grid2X2, Upload, Download } from "lucide-react";
import { useState, useRef } from "react";
import { useBoards, exportData } from "../stores/boards";
import { downloadJson } from "../adapters/environment";
import type { BoardSize } from "../core/models";
export function RoomList({ onMessage }: { onMessage: (s: string) => void }) {
  const store = useBoards(),
    [size, setSize] = useState<BoardSize>(8),
    input = useRef<HTMLInputElement>(null);
  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > 4 * 1024 * 1024) throw new Error("JSON 文件超过 4MB");
      store.importData(JSON.parse(await file.text()));
      onMessage("数据已导入，可撤销恢复导入前状态");
    } catch (e) {
      onMessage(e instanceof Error ? e.message : "导入失败");
    } finally {
      if (input.current) input.current.value = "";
    }
  };
  const exportFile = () => {
    if (!store.boards.length) {
      onMessage("请先创建一个房间");
      return;
    }
    downloadJson(exportData(store.boards, store.activeId));
    onMessage("已生成 JSON 备份；微信中若下载受限，可在普通浏览器保存。");
  };
  return (
    <aside className="room-sidebar">
      <div className="sidebar-heading">
        <h2>我的房间</h2>
        <span>{store.boards.length}</span>
      </div>
      <div className="room-list">
        {store.boards.map((b) => {
          const found = b.cells.filter((c) => c.observed === "gem").length,
            opened = b.cells.filter((c) => c.observed !== "unknown").length;
          return (
            <button
              key={b.id}
              className={`room-item ${b.id === store.activeId ? "active" : ""}`}
              onClick={() => store.select(b.id)}
              aria-label={`切换房间 ${b.room}`}
            >
              <span className="room-icon">
                <Grid2X2 size={20} />
              </span>
              <span>
                <strong>房间 {b.room}</strong>
                <small>
                  {b.size}×{b.size} · 已开 {opened} 格
                </small>
              </span>
              <span className="room-count">
                {found}
                <small>/{b.totalGems}</small>
              </span>
            </button>
          );
        })}
      </div>
      <div className="new-room">
        <label className="select-wrap">
          <span className="sr-only">新房间尺寸</span>
          <select
            aria-label="新房间尺寸"
            value={size}
            onChange={(e) => setSize(Number(e.target.value) as BoardSize)}
          >
            <option value={8}>8×8 · 20 颗</option>
            <option value={10}>10×10 · 30 颗</option>
            <option value={12}>12×12 · 45 颗</option>
          </select>
          <ChevronDown size={16} />
        </label>
        <button className="secondary-button" onClick={() => store.add(size)}>
          <Plus size={18} />
          新建房间
        </button>
      </div>
      <div className="sidebar-footer">
        <div className="backup-actions">
          <button onClick={() => input.current?.click()}>
            <Upload size={16} />
            导入
          </button>
          <button onClick={exportFile}>
            <Download size={16} />
            导出
          </button>
        </div>
        <p>
          自动保存在当前浏览器
          <br />
          导出备份可迁移到其他设备
        </p>
      </div>
      <input
        hidden
        ref={input}
        type="file"
        accept=".json,application/json"
        onChange={(e) => void importFile(e.target.files?.[0])}
      />
    </aside>
  );
}
