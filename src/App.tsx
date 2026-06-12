import { useEffect, useMemo, useState } from 'react';

type TradeSide = 'LONG' | 'SHORT';
type FormValues = {
  entry: string;
  stop: string;
  target: string;
};

type Calculation =
  | {
      status: 'idle';
    }
  | {
      status: 'error' | 'warning';
      message: string;
    }
  | {
      status: 'ready';
      side: TradeSide;
      risk: number;
      reward: number;
      ratio: number;
      grade: '◎' | '△' | '×';
      targetForTwoR: number;
    };

const STORAGE_KEY = 'quick-rr-values';
const EMPTY_VALUES: FormValues = {
  entry: '',
  stop: '',
  target: '',
};

function parsePrice(value: string) {
  if (value.trim() === '') {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ja-JP', {
    maximumFractionDigits: 8,
  }).format(value);
}

function formatRatio(value: number) {
  return value.toFixed(2);
}

function getGrade(ratio: number): '◎' | '△' | '×' {
  if (ratio >= 2) {
    return '◎';
  }

  if (ratio >= 1.5) {
    return '△';
  }

  return '×';
}

function calculate(values: FormValues): Calculation {
  const entry = parsePrice(values.entry);
  const stop = parsePrice(values.stop);
  const target = parsePrice(values.target);

  if (entry === null || stop === null || target === null) {
    return { status: 'idle' };
  }

  if (entry === stop) {
    return {
      status: 'error',
      message: 'エントリー価格と損切り価格が同じです。',
    };
  }

  const isLong = target > entry && entry > stop;
  const isShort = target < entry && entry < stop;

  if (!isLong && !isShort) {
    return {
      status: 'warning',
      message: 'LONG / SHORT を判定できない価格関係です。',
    };
  }

  const side: TradeSide = isLong ? 'LONG' : 'SHORT';
  const risk = Math.abs(entry - stop);
  const reward = Math.abs(target - entry);
  const ratio = reward / risk;
  const targetForTwoR = side === 'LONG' ? entry + risk * 2 : entry - risk * 2;

  return {
    status: 'ready',
    side,
    risk,
    reward,
    ratio,
    grade: getGrade(ratio),
    targetForTwoR,
  };
}

function App() {
  const [values, setValues] = useState<FormValues>(() => {
    try {
      const storedValues = localStorage.getItem(STORAGE_KEY);
      return storedValues ? { ...EMPTY_VALUES, ...JSON.parse(storedValues) } : EMPTY_VALUES;
    } catch {
      return EMPTY_VALUES;
    }
  });

  const result = useMemo(() => calculate(values), [values]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  }, [values]);

  function updateValue(field: keyof FormValues, value: string) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetValues() {
    setValues(EMPTY_VALUES);
  }

  const gradeClass = result.status === 'ready' ? `grade-${result.grade}` : '';
  const sideClass = result.status === 'ready' ? result.side.toLowerCase() : '';

  return (
    <main className="app-shell">
      <section className="workspace" aria-label="リスクリワード計算ツール">
        <header className="app-header">
          <div>
            <p className="eyebrow">Risk Reward Calculator</p>
            <h1>Quick RR</h1>
          </div>
          <div className="market-strip" aria-hidden="true">
            <span>株</span>
            <span>FX</span>
            <span>CFD</span>
          </div>
        </header>

        <div className="calculator-layout">
          <form className="input-panel" aria-label="価格入力">
            <label className="price-field">
              <span>エントリー価格</span>
              <input
                inputMode="decimal"
                type="number"
                step="any"
                placeholder="例: 150.25"
                value={values.entry}
                onChange={(event) => updateValue('entry', event.target.value)}
              />
            </label>

            <label className="price-field">
              <span>損切り価格</span>
              <input
                inputMode="decimal"
                type="number"
                step="any"
                placeholder="例: 148.80"
                value={values.stop}
                onChange={(event) => updateValue('stop', event.target.value)}
              />
            </label>

            <label className="price-field">
              <span>利確価格</span>
              <input
                inputMode="decimal"
                type="number"
                step="any"
                placeholder="例: 153.40"
                value={values.target}
                onChange={(event) => updateValue('target', event.target.value)}
              />
            </label>

            <div className="button-row">
              <button type="button" className="ghost-button" onClick={resetValues}>
                リセット
              </button>
            </div>
          </form>

          <section className="result-panel" aria-live="polite" aria-label="計算結果">
            {result.status === 'ready' ? (
              <>
                <div className="result-topline">
                  <span className={`side-pill ${sideClass}`}>{result.side}</span>
                  <span className={`grade-badge ${gradeClass}`}>{result.grade}</span>
                </div>

                <div className="ratio-block">
                  <span>R:R</span>
                  <strong>{formatRatio(result.ratio)}</strong>
                </div>

                <div className="metric-grid">
                  <div className="metric">
                    <span>リスク幅</span>
                    <strong>{formatNumber(result.risk)}</strong>
                  </div>
                  <div className="metric">
                    <span>リワード幅</span>
                    <strong>{formatNumber(result.reward)}</strong>
                  </div>
                  <div className="metric wide">
                    <span>R:R 2.0に必要な利確価格</span>
                    <strong>{formatNumber(result.targetForTwoR)}</strong>
                  </div>
                </div>
              </>
            ) : (
              <div className={`empty-state ${result.status}`}>
                <span>{result.status === 'error' ? '!' : result.status === 'warning' ? '?' : 'RR'}</span>
                <p>
                  {result.status === 'idle'
                    ? '3つの価格を入力すると自動で計算します。'
                    : result.message}
                </p>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

export default App;
