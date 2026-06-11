"use client";

import { useMemo, useState } from "react";
import type { LicenseCode } from "@/lib/license-types";

type ApiResult = {
  ok: boolean;
  error?: string;
  reason?: string;
  licenses?: LicenseCode[];
  count?: number;
};

type LicensePeriod = "unlimited" | "7" | "30" | "365" | "custom";

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("ko-KR");
}

function periodLabel(period: LicensePeriod) {
  if (period === "unlimited") return "무제한";
  if (period === "7") return "7일 체험권";
  if (period === "30") return "30일 이용권";
  if (period === "365") return "1년 이용권";
  return "직접 만료일 지정";
}

export default function AdminPanel() {
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [licenses, setLicenses] = useState<LicenseCode[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [count, setCount] = useState(100);
  const [maxActivations, setMaxActivations] = useState(1);
  const [period, setPeriod] = useState<LicensePeriod>("unlimited");
  const [expiresAt, setExpiresAt] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function api(path: string, options: RequestInit = {}) {
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": password,
        ...(options.headers ?? {})
      }
    });

    const text = await response.text();
    let data: ApiResult;
    try {
      data = text ? JSON.parse(text) as ApiResult : { ok: false, error: "서버 응답이 비어 있습니다. Netlify Functions 배포 상태를 확인해야 합니다." };
    } catch {
      data = { ok: false, error: text || "서버 응답을 읽지 못했습니다." };
    }

    if (!response.ok || !data.ok) {
      throw new Error(data.error ?? data.reason ?? "요청에 실패했습니다.");
    }
    return data;
  }

  async function load() {
    setBusy(true);
    setMessage("");
    try {
      const data = await api("/api/licenses/list");
      setLicenses(data.licenses ?? []);
      setAuthorized(true);
      setMessage("라이선스 목록을 불러왔습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "오류가 발생했습니다.");
      setAuthorized(false);
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    setBusy(true);
    setMessage("");
    try {
      const data = await api("/api/licenses/generate", {
        method: "POST",
        body: JSON.stringify({
          count,
          maxActivations,
          period,
          expiresAt: period === "custom" && expiresAt ? expiresAt : null,
          note: note || null
        })
      });
      await load();
      setMessage(`${periodLabel(period)} 코드 ${data.count ?? count}개를 생성했습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "생성 실패");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(id: string, nextStatus: "active" | "revoked") {
    setBusy(true);
    setMessage("");
    try {
      await api("/api/licenses/revoke", {
        method: "POST",
        body: JSON.stringify({ id, status: nextStatus })
      });
      await load();
      setMessage(nextStatus === "revoked" ? "코드를 사용 중지했습니다." : "코드를 다시 활성화했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "변경 실패");
    } finally {
      setBusy(false);
    }
  }

  async function resetDevice(id: string) {
    setBusy(true);
    setMessage("");
    try {
      await api("/api/licenses/reset-device", {
        method: "POST",
        body: JSON.stringify({ id })
      });
      await load();
      setMessage("기기 연결을 해제했습니다. 이 코드는 새 기기에서 다시 사용할 수 있습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "초기화 실패");
    } finally {
      setBusy(false);
    }
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toUpperCase();
    return licenses.filter((item) => {
      const matchesQuery = !needle ||
        item.code.toUpperCase().includes(needle) ||
        item.normalizedCode.includes(needle) ||
        item.note?.toUpperCase().includes(needle) ||
        item.boundDeviceId?.toUpperCase().includes(needle) ||
        item.purchaserEmail?.toUpperCase().includes(needle) ||
        item.orderId?.toUpperCase().includes(needle);
      const matchesStatus = status === "all" || item.status === status ||
        (status === "used" && Boolean(item.boundDeviceId)) ||
        (status === "unused" && !item.boundDeviceId);
      return matchesQuery && matchesStatus;
    });
  }, [licenses, query, status]);

  const stats = useMemo(() => ({
    total: licenses.length,
    active: licenses.filter((item) => item.status === "active").length,
    used: licenses.filter((item) => item.boundDeviceId).length,
    unused: licenses.filter((item) => item.status === "active" && !item.boundDeviceId).length
  }), [licenses]);

  if (!authorized) {
    return (
      <main className="shell login">
        <section className="panel">
          <h1>Moment License Admin</h1>
          <p className="muted">관리자 비밀번호를 입력하면 코드 관리 화면이 열립니다.</p>
          <label className="field">
            <span>관리자 비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") load();
              }}
              autoFocus
            />
          </label>
          <button className="primary" onClick={load} disabled={busy || !password}>
            관리자 페이지 열기
          </button>
          {message && <p className={message.includes("올바르지") || message.includes("실패") || message.includes("필요") ? "message error" : "message"}>{message}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Moment Camera</p>
          <h1>라이선스 코드 관리자</h1>
          <p>기본 정책은 무제한 1기기입니다. 유출 의심 코드는 즉시 중지할 수 있습니다.</p>
        </div>
        <button className="secondary" onClick={load} disabled={busy}>새로고침</button>
      </header>

      <section className="stats">
        <div className="stat"><strong>{stats.total}</strong><span>전체 코드</span></div>
        <div className="stat"><strong>{stats.active}</strong><span>활성 코드</span></div>
        <div className="stat"><strong>{stats.used}</strong><span>사용됨</span></div>
        <div className="stat"><strong>{stats.unused}</strong><span>미사용</span></div>
      </section>

      <div className="grid">
        <section className="panel">
          <h2>수동 코드 생성</h2>
          <label className="field">
            <span>생성 개수</span>
            <input type="number" min="1" max="1000" value={count} onChange={(event) => setCount(Number(event.target.value))} />
          </label>
          <label className="field">
            <span>라이선스 기간</span>
            <select value={period} onChange={(event) => setPeriod(event.target.value as LicensePeriod)}>
              <option value="unlimited">무제한</option>
              <option value="7">7일 체험권</option>
              <option value="30">30일 이용권</option>
              <option value="365">1년 이용권</option>
              <option value="custom">직접 만료일 지정</option>
            </select>
          </label>
          {period === "custom" && (
            <label className="field">
              <span>직접 만료일</span>
              <input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
            </label>
          )}
          <label className="field">
            <span>사용 가능 기기 수</span>
            <input type="number" min="1" max="20" value={maxActivations} onChange={(event) => setMaxActivations(Number(event.target.value))} />
          </label>
          <label className="field">
            <span>메모</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="예: 해외 렉쳐 수동 발급분" />
          </label>
          <button className="primary" onClick={generate} disabled={busy}>코드 생성</button>
          {message && <p className={message.includes("실패") || message.includes("오류") || message.includes("필요") ? "message error" : "message"}>{message}</p>}
        </section>

        <section className="panel">
          <h2>코드 목록</h2>
          <div className="toolbar">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="코드, 이메일, 주문 ID, 기기 ID 검색" />
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">전체</option>
              <option value="active">활성</option>
              <option value="revoked">중지</option>
              <option value="used">사용됨</option>
              <option value="unused">미사용</option>
            </select>
          </div>
          <table>
            <thead>
              <tr>
                <th>코드</th>
                <th>구매자</th>
                <th>상태</th>
                <th>기기</th>
                <th>사용</th>
                <th>만료</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td className="code">{item.code}</td>
                  <td>
                    <div>{item.purchaserEmail ?? "-"}</div>
                    <div className="muted">{item.orderId ?? item.note ?? ""}</div>
                  </td>
                  <td><span className={`badge ${item.status}`}>{item.status === "active" ? "활성" : "중지"}</span></td>
                  <td>
                    {item.boundDeviceId ? (
                      <>
                        <div>{item.boundDeviceId.slice(0, 18)}...</div>
                        <div className="muted">{item.platform ?? "-"} {item.appVersion ?? ""}</div>
                      </>
                    ) : "-"}
                  </td>
                  <td>{item.activationCount}/{item.maxActivations}<br /><span className="muted">{formatDate(item.activatedAt)}</span></td>
                  <td>{item.expiresAt ? formatDate(item.expiresAt) : "무제한"}</td>
                  <td>
                    <div className="actions">
                      {item.status === "active" ? (
                        <button className="danger" onClick={() => changeStatus(item.id, "revoked")} disabled={busy}>중지</button>
                      ) : (
                        <button className="secondary" onClick={() => changeStatus(item.id, "active")} disabled={busy}>활성</button>
                      )}
                      <button className="ghost" onClick={() => resetDevice(item.id)} disabled={busy}>기기 해제</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
