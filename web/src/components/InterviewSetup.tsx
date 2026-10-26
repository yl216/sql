import { useState } from 'react';

interface Props {
  modules: string[];
  onStart: (opts: { scope: string; count: number; minutes: number }) => void;
  onCancel: () => void;
}

export default function InterviewSetup({ modules, onStart, onCancel }: Props) {
  const [scope, setScope] = useState('all');
  const [count, setCount] = useState(3);
  const [minutes, setMinutes] = useState(12);

  return (
    <div className="modal-mask" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">面试模拟</div>
        <p className="modal-desc">
          随机抽题、每题独立计时。开始后自动补全和「运行」按钮都会被关掉——就像真的手写 SQL，写完才能看到结果。
        </p>

        <div className="field">
          <label>出题范围</label>
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="all">全部模块</option>
            {modules.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>题量</label>
          <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
            <option value={1}>1 题</option>
            <option value={3}>3 题</option>
            <option value={5}>5 题</option>
          </select>
        </div>

        <div className="field">
          <label>每题时长</label>
          <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
            <option value={8}>8 分钟</option>
            <option value={12}>12 分钟</option>
            <option value={20}>20 分钟</option>
          </select>
        </div>

        <div className="modal-actions">
          <button className="btn ghost" onClick={onCancel}>
            取消
          </button>
          <button className="btn primary" onClick={() => onStart({ scope, count, minutes })}>
            开始面试
          </button>
        </div>
      </div>
    </div>
  );
}
