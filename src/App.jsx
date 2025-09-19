// src/App.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import CatSvg from "./assets/cat.svg";
import DogSvg from "./assets/dog.svg";

/* ================= UI Primitives & Helpers ================= */
function Card({ className = "", children, ...rest }){
  return <div {...rest} className={`border rounded-2xl bg-white shadow-sm ${className}`}>{children}</div>;
}
function CardBody({ className = "", children, ...rest }){
  return <div {...rest} className={className}>{children}</div>;
}
function H2({ children, className = "" }){
  return <h2 className={`text-xl font-semibold ${className}`}>{children}</h2>;
}
function Button({ className = "", children, ...rest }){
  return <button {...rest} className={`px-3 py-1.5 rounded-xl border bg-black text-white hover:opacity-90 disabled:opacity-50 ${className}`}>{children}</button>;
}
function GhostButton({ className = "", children, ...rest }){
  return <button {...rest} className={`px-3 py-1.5 rounded-xl border bg-white hover:bg-gray-50 disabled:opacity-50 ${className}`}>{children}</button>;
}
function Tag({ children, className = "" }){
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs bg-white ${className}`}>{children}</span>;
}
function TextArea({ className = "", ...rest }){
  return <textarea {...rest} className={`w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black ${className}`} />;
}
function Progress({ label, value }){
  const v = Math.max(0, Math.min(100, value|0));
  return (
    <div>
      <div className="text-sm mb-1">{label} <b>{v}</b></div>
      <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
        <div className="h-full bg-black transition-all" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

// localStorage JSON helper
const ls = {
  get(key, fallback){
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
  },
  set(key, value){ try { localStorage.setItem(key, JSON.stringify(value)); } catch {} },
};

/* ================= Simple media recorder hook ================= */
function useMediaRecorder(){
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState(null);
  const [durationMs, setDurationMs] = useState(0);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => () => {
    if (mediaRef.current && mediaRef.current.state !== "inactive") mediaRef.current.stop();
    if (timerRef.current) window.clearInterval(timerRef.current);
  }, []);

  const start = async () => {
    try {
      setBlob(null);
      chunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: 'audio/webm' });
        setBlob(b);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setRecording(true);
      setDurationMs(0);
      timerRef.current = window.setInterval(() => setDurationMs((d) => d + 100), 100);
    } catch (e) {
      console.warn('Microphone error', e);
    }
  };

  const stop = () => {
    const mr = mediaRef.current;
    if (!mr) return;
    if (mr.state !== 'inactive') mr.stop();
    setRecording(false);
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
  };

  return { recording, blob, durationMs, start, stop };
}

/* ================= Install PWA (optional) ================= */
function InstallPWAButton(){
  const [deferred, setDeferred] = useState(null);
  const [status, setStatus] = useState("");
  useEffect(() => {
    const onBip = (e) => { if (e?.preventDefault) e.preventDefault(); setDeferred(e); };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);
  const onClick = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const res = await deferred.userChoice;
    setStatus(res?.outcome === "accepted" ? "설치 완료 또는 진행됨" : "설치 취소됨");
    setDeferred(null);
  };
  if (!deferred) return null;
  return (
    <div className="flex items-center gap-2">
      <Button onClick={onClick}>앱 설치</Button>
      {status && <span className="text-xs text-gray-500">{status}</span>}
    </div>
  );
}

/* ================= PetAvatar (src/assets import) ================= */
function PetAvatar({ buddy, mood = "happy", size = 144 }) {
  const src = buddy === "cat" ? CatSvg : DogSvg;

  return (
    <div
      className="rounded-2xl grid place-items-center select-none transition-all"
      style={{
        width: size,
        height: size,
        border: "1px solid #e5e7eb",
        background: "linear-gradient(180deg,#ffffff,#fff7f2)",
        boxShadow: "0 2px 6px rgba(0,0,0,0.06)"
      }}
    >
      <img
        src={src}
        alt={buddy === "cat" ? "고양이 캐릭터" : "강아지 캐릭터"}
        className="object-contain"
        style={{
          width: "88%",
          height: "88%",
          opacity: mood === "angry" ? 0.78 : 1,
          filter: mood === "angry" ? "grayscale(28%)" : "none",
          transition: "opacity .2s ease, filter .2s ease, transform .2s ease",
        }}
        onMouseEnter={(e)=>{ e.currentTarget.style.transform = "translateY(-2px)"; }}
        onMouseLeave={(e)=>{ e.currentTarget.style.transform = "translateY(0)"; }}
      />
    </div>
  );
}

/* ================= Evaluate Tab ================= */
function useEvaluate() {
  const [sentences] = useState([
    "Could you elaborate on your previous experience?",
    "The quick brown fox jumps over the lazy dog.",
    "I would like a cup of coffee, please.",
  ]);
  const [scores, setScores] = useState(null);
  const [loading, setLoading] = useState(false);

  const submitAudio = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    const rand = () => Math.round(70 + Math.random() * 30);
    setScores({
      accuracy: rand(),
      fluency: rand(),
      completeness: rand(),
      feedback: "Great effort! Focus on /r/ and /l/ distinction in the middle phrase."
    });
    setLoading(false);
  };

  return { sentences, scores, loading, submitAudio, setScores };
}

function EvaluateTab() {
  const { sentences, scores, loading, submitAudio, setScores } = useEvaluate();
  const [current, setCurrent] = useState(0);
  const { recording, blob, durationMs, start, stop } = useMediaRecorder();

  const handleSubmitRecording = async () => {
    if (!blob) return;
    await submitAudio();
  };

  return (
    <div className="space-y-6">
      <H2>평가 (Pronunciation Assessment)</H2>
      <Card>
        <CardBody className="p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {sentences.map((_, i) => (
              <button
                key={i}
                onClick={() => { setCurrent(i); setScores(null); }}
                className={`text-sm px-3 py-1.5 rounded-full border ${i===current?"bg-black text-white":"bg-white"}`}
              >
                {i+1}
              </button>
            ))}
          </div>
          <p className="text-lg">{sentences[current]}</p>
          <div className="flex flex-wrap items-center gap-3">
            {!recording && <Button onClick={start}>🎙️ 녹음 시작</Button>}
            {recording && <Button className="bg-red-600 hover:bg-red-700" onClick={stop}>⏹️ 녹음 종료</Button>}
            <span className="text-sm text-gray-600">{(durationMs/1000).toFixed(1)}s</span>
            <GhostButton onClick={() => setScores(null)} disabled={loading}>초기화</GhostButton>
            <Button onClick={handleSubmitRecording} disabled={!blob || loading}>제출하고 점수 받기</Button>
          </div>
          {blob && <audio className="w-full" controls src={URL.createObjectURL(blob)} />}
          {scores && (
            <>
              <div className="grid md:grid-cols-3 gap-4">
                <Progress label="Accuracy" value={scores.accuracy} />
                <Progress label="Fluency" value={scores.fluency} />
                <Progress label="Completeness" value={scores.completeness} />
              </div>
              <div className="text-sm text-gray-700">Feedback: {scores.feedback}</div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

/* ================= Train Tab ================= */
function speak(text) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95; u.pitch = 1; u.lang = "en-US";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}
function TrainTab() {
  const [deck] = useState([
    "Please call me back when you have time.",
    "She sells seashells by the seashore.",
    "We need to finalize the budget by Friday.",
  ]);
  const [idx, setIdx] = useState(0);
  const [reps, setReps] = useState(0);
  const current = deck[idx];
  const next = () => setIdx((i) => (i + 1) % deck.length);
  const prev = () => setIdx((i) => (i - 1 + deck.length) % deck.length);

  return (
    <div className="space-y-6">
      <H2>훈련 (Shadowing)</H2>
      <Card>
        <CardBody className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GhostButton onClick={prev}>← 이전</GhostButton>
              <GhostButton onClick={next}>다음 →</GhostButton>
            </div>
            <Tag>반복: {reps}</Tag>
          </div>
          <p className="text-lg">{current}</p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => speak(current)}>🔈 듣기</Button>
            <Button onClick={() => setReps((r) => r + 1)}>✅ 따라 읽음</Button>
          </div>
          <p className="text-sm text-gray-600">TIP: 강세, 리듬, 연결발음에 집중해요.</p>
        </CardBody>
      </Card>
    </div>
  );
}

/* ================= Real Tab ================= */
function useRealMode() {
  const prompts = [
    { id: "p1", title: "Job Interview", text: "Tell me about a challenge you faced and how you solved it." },
    { id: "p2", title: "Travel", text: "Describe your favorite trip and why it was special." },
    { id: "p3", title: "Daily Life", text: "Walk me through your typical weekday morning." },
  ];
  const [current, setCurrent] = useState(0);
  const [timer, setTimer] = useState(60);
  const [running, setRunning] = useState(false);
  const [lastScore, setLastScore] = useState(null);

  useEffect(() => {
    if (!running) return;
    if (timer <= 0) { setRunning(false); return; }
    const id = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [running, timer]);

  const startTimer = () => { setTimer(60); setRunning(true); setLastScore(null); };
  const submitAttempt = async () => {
    await new Promise((r) => setTimeout(r, 600));
    setLastScore({ overall: Math.round(70 + Math.random() * 30), notes: "Good structure. Improve pausing and linking sounds." });
  };

  return { prompts, current, setCurrent, timer, running, startTimer, submitAttempt, lastScore };
}
function RealTab() {
  const { prompts, current, setCurrent, timer, running, startTimer, submitAttempt, lastScore } = useRealMode();
  const { recording, blob, start, stop } = useMediaRecorder();

  return (
    <div className="space-y-6">
      <H2>실전 (Timed Speaking)</H2>
      <Card>
        <CardBody className="p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {prompts.map((p, i) => (
              <button key={p.id} onClick={() => setCurrent(i)} className={`text-sm px-3 py-1.5 rounded-full border ${i===current?"bg-black text-white":"bg-white"}`}>{p.title}</button>
            ))}
          </div>
          <p className="text-lg">{prompts[current].text}</p>
          <div className="flex items-center gap-3">
            <Tag>⏱ {timer}s</Tag>
            {!running && <Button onClick={startTimer}>START</Button>}
            {!recording && running && <Button onClick={start}>🎙️ 녹음</Button>}
            {recording && <Button className="bg-red-600 hover:bg-red-700" onClick={stop}>⏹️ 종료</Button>}
            <Button onClick={() => submitAttempt()} disabled={!blob}>제출</Button>
          </div>
          {blob && <audio className="w-full" controls src={URL.createObjectURL(blob)} />}
          {lastScore && (
            <div className="space-y-2">
              <div className="text-sm text-gray-700">Overall: <b>{lastScore.overall}</b></div>
              <div className="text-sm text-gray-700">Notes: {lastScore.notes}</div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

/* ================= Vocab (Word Deck) ================= */
function useVocab() {
  const [items, setItems] = useState(ls.get("speak_vocab_v1", [
    { id: crypto.randomUUID(), word: "meticulous", meaning: "showing great attention to detail", streak: 0 },
    { id: crypto.randomUUID(), word: "alleviate", meaning: "make (suffering) less severe", streak: 0 },
    { id: crypto.randomUUID(), word: "inevitable", meaning: "certain to happen; unavoidable", streak: 0 },
  ]));
  useEffect(() => { ls.set("speak_vocab_v1", items); }, [items]);

  const addMany = (bulk) => {
    const lines = bulk.split(/\n+/).map(l => l.trim()).filter(Boolean);
    const added = [];
    for (const line of lines) {
      const [w, ...rest] = line.split("-");
      const word = (w || "").trim();
      const meaning = rest.join("-").trim();
      if (!word || !meaning) continue;
      added.push({ id: crypto.randomUUID(), word, meaning, streak: 0 });
    }
    if (added.length) setItems((prev) => [...added, ...prev]);
  };

  const remove = (id) => setItems((prev) => prev.filter(i => i.id !== id));
  const recordAnswer = (id, correct, passThreshold = 2) => {
    setItems((prev) => prev.flatMap((i) => {
      if (i.id !== id) return [i];
      const nextStreak = correct ? i.streak + 1 : 0;
      if (nextStreak >= passThreshold) return [];
      return [{ ...i, streak: nextStreak }];
    }));
  };

  return { items, addMany, remove, recordAnswer };
}
function VocabQuiz({ items, onAnswer }){
  const [index, setIndex] = useState(0);
  const [showAns, setShowAns] = useState(false);
  const cur = items[index];
  useEffect(() => { setShowAns(false); }, [index]);
  if (!items.length) return <p className="text-gray-600">단어가 없습니다. 아래에서 추가/임포트하세요.</p>;
  const next = () => setIndex((i) => (i + 1) % items.length);

  return (
    <div className="space-y-3">
      <div className="text-lg font-medium">{cur.word}</div>
      {!showAns ? (
        <GhostButton onClick={() => setShowAns(true)}>뜻 보기</GhostButton>
      ) : (
        <div className="space-y-2">
          <div className="text-gray-800">{cur.meaning}</div>
          <div className="flex gap-2">
            <Button className="bg-green-600 border-green-600" onClick={() => { onAnswer(cur.id, true); next(); }}>맞음 (기록)</Button>
            <GhostButton onClick={() => { onAnswer(cur.id, false); next(); }}>틀림 (초기화)</GhostButton>
          </div>
          <div className="text-xs text-gray-500">연속 정답 {cur.streak} / 2 (2회 통과 시 자동 삭제)</div>
        </div>
      )}
    </div>
  );
}
function VocabTab() {
  const { items, addMany, remove, recordAnswer } = useVocab();
  const [bulk, setBulk] = useState("");
  return (
    <div className="space-y-6">
      <H2>영어 단어장</H2>
      <Card>
        <CardBody className="p-6 space-y-4">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <VocabQuiz items={items} onAnswer={(id, ok) => recordAnswer(id, ok)} />
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-2">임포트 (한 줄에 하나: "word - meaning")</div>
              <TextArea rows={6} value={bulk} onChange={(e)=>setBulk(e.target.value)} placeholder={`meticulous - showing great attention to detail
plausible - seeming reasonable or probable`} />
              <div className="flex gap-2 mt-2">
                <Button className="bg-green-600 border-green-600" onClick={()=>{ addMany(bulk); setBulk(""); }}>추가</Button>
                <GhostButton onClick={()=>setBulk("")}>지우기</GhostButton>
              </div>
            </div>
          </div>
          <div className="pt-2">
            <div className="text-sm text-gray-600 mb-1">현재 단어 ({items.length})</div>
            <div className="grid md:grid-cols-2 gap-2">
              {items.map(i => (
                <div key={i.id} className="flex items-center justify-between border rounded-xl p-2">
                  <div>
                    <div className="font-medium">{i.word}</div>
                    <div className="text-sm text-gray-600">{i.meaning}</div>
                  </div>
                  <GhostButton onClick={()=>remove(i.id)}>삭제</GhostButton>
                </div>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

/* ================= Attendance (Pets + Treats) ================= */
const ATTENDANCE_KEY = 'speak_attendance_v1';
function dateStrSeoul(d){ return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }); }
function todaySeoul(){ return dateStrSeoul(new Date()); }
function addDaysSeoul(dateStr, delta){ const d = new Date(dateStr + 'T00:00:00+09:00'); d.setDate(d.getDate() + delta); return dateStrSeoul(d); }
function isYesterdaySeoul(prev, today){ return addDaysSeoul(prev, 1) === today; }
function diffDaysSeoul(a, b){ const da = new Date(a + 'T00:00:00+09:00'); const db = new Date(b + 'T00:00:00+09:00'); return Math.floor((db - da) / (1000*60*60*24)); }

function useAttendance() {
  const [state, setState] = useState(() =>
    ls.get(ATTENDANCE_KEY, { buddy: null, snacks: 0, streak: 0, lastCheck: null, history: [] })
  );
  useEffect(() => { ls.set(ATTENDANCE_KEY, state); }, [state]);

  const chooseBuddy = (b) => setState((s) => ({ ...s, buddy: b }));
  const canCheckToday = useMemo(() => state.lastCheck !== todaySeoul(), [state.lastCheck]);

  const checkIn = () => {
    const today = todaySeoul();
    if (state.lastCheck === today) return { ok: false };
    setState(prev => {
      const wasYesterday = prev.lastCheck ? isYesterdaySeoul(prev.lastCheck, today) : false;
      const nextStreak = wasYesterday ? prev.streak + 1 : 1;
      const bonus = nextStreak % 7 === 0 ? 3 : 0;
      const nextSnacks = prev.snacks + 1 + bonus;
      const setHist = new Set(prev.history);
      setHist.add(today);
      return { ...prev, lastCheck: today, streak: nextStreak, snacks: nextSnacks, history: Array.from(setHist).sort().slice(-60) };
    });
    return { ok: true };
  };

  const giveSnack = () => {
    let ok = false;
    setState(prev => {
      if (prev.snacks <= 0) return prev;
      ok = true;
      return { ...prev, snacks: prev.snacks - 1 };
    });
    return ok;
  };

  return { state, chooseBuddy, canCheckToday, checkIn, giveSnack };
}

/* ================= Attendance Tab ================= */
function AttendanceTab(){
  const { state, chooseBuddy, canCheckToday, checkIn, giveSnack } = useAttendance();
  const angry = useMemo(()=> state.lastCheck && diffDaysSeoul(state.lastCheck, todaySeoul()) >= 3, [state.lastCheck]);

  if (!state.buddy) {
    return (
      <div className="space-y-6">
        <H2>출석 체크 · 캐릭터 선택</H2>
        <Card>
          <CardBody className="p-6 space-y-4">
            <div className="text-gray-700">원하는 친구를 골라주세요. 나중에 바꿀 수 있어요.</div>
            <div className="flex items-center gap-8">
              <div className="flex flex-col items-center gap-2">
                <PetAvatar buddy="cat" />
                <Button onClick={()=>chooseBuddy('cat')}>고양이로 선택</Button>
              </div>
              <div className="flex flex-col items-center gap-2">
                <PetAvatar buddy="dog" />
                <Button onClick={()=>chooseBuddy('dog')}>강아지로 선택</Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  const isCat = state.buddy === "cat";
  const treatIcon = isCat ? "🐟" : "🍖";

  return (
    <div className="space-y-6">
      <H2>출석</H2>
      <Card>
        <CardBody className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center rounded-xl border overflow-hidden">
              <button onClick={() => chooseBuddy('cat')} className={`px-3 py-1.5 text-sm ${isCat ? 'bg-black text-white' : 'bg-white'}`}>🐱 고양이</button>
              <button onClick={() => chooseBuddy('dog')} className={`px-3 py-1.5 text-sm border-l ${!isCat ? 'bg-black text-white' : 'bg-white'}`}>🐶 강아지</button>
            </div>
            <div className="flex items-center gap-2">
              <Tag>간식: {state.snacks}</Tag>
              <Tag>연속: {state.streak}일</Tag>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* 캐릭터가 자연스럽게 카드에 들어오도록 좌측에 배치 */}
            <PetAvatar buddy={state.buddy} mood={angry ? "angry" : "happy"} size={160} />
            <div className="space-y-2">
              <Button onClick={checkIn} disabled={!canCheckToday}>출석하기</Button>
              <GhostButton onClick={giveSnack} disabled={state.snacks<=0}>간식 주기 {treatIcon}</GhostButton>
              <div className="text-xs text-gray-500">마지막 출석: {state.lastCheck || "없음"}</div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

/* ================= Tabs & App ================= */
const TABS = ["출석", "평가", "훈련", "실전", "단어장"];

function TabSwitcher({ tab }){
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {tab === "출석" && <AttendanceTab />}
      {tab === "평가" && <EvaluateTab />}
      {tab === "훈련" && <TrainTab />}
      {tab === "실전" && <RealTab />}
      {tab === "단어장" && <VocabTab />}
    </div>
  );
}

function LoginView({ onLogin }){
  const [value, setValue] = useState("");
  const [agree, setAgree] = useState(true);
  const submit = (e) => { e.preventDefault(); if (!value.trim()) return; onLogin(value.trim()); };
  return (
    <div className="min-h-screen grid place-items-center bg-gray-50 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardBody className="p-6 space-y-4">
          <H2>로그인</H2>
          <form onSubmit={submit} className="space-y-3">
            <label className="block text-sm text-gray-700">이메일</label>
            <input
              type="email"
              value={value}
              onChange={(e)=>setValue(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            />
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input type="checkbox" checked={agree} onChange={(e)=>setAgree(e.target.checked)} />
              이용 약관에 동의합니다.
            </label>
            <Button type="submit" disabled={!agree || !value.trim()}>시작하기</Button>
          </form>
          <div className="text-xs text-gray-500">입력한 이메일은 로컬에만 저장됩니다.</div>
        </CardBody>
      </Card>
    </div>
  );
}

export default function App(){
  const USER_KEY = "speak_user_v1";
  const [user, setUser] = useState(() => ls.get(USER_KEY, null));
  useEffect(() => { ls.set(USER_KEY, user); }, [user]);
  const [tab, setTab] = useState("출석");

  if (!user) return <LoginView onLogin={setUser} />;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="font-semibold">Speak-style English Coach</div>
          <div className="flex items-center gap-2">
            <InstallPWAButton />
            <GhostButton onClick={()=>setUser(null)}>로그아웃</GhostButton>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 pb-2 flex flex-wrap gap-2">
          {TABS.map((t) => {
            const isActive = t === tab;
            const isVocab = t === "단어장";
            return (
              <button
                key={t}
                onClick={()=>setTab(t)}
                className={`text-sm px-3 py-1.5 rounded-full border
                  ${isVocab
                    ? "bg-green-600 text-white border-green-600" // 항상 초록색
                    : isActive
                      ? "bg-black text-white"
                      : "bg-white"
                  }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>
      <TabSwitcher tab={tab} />
    </div>
  );
}
