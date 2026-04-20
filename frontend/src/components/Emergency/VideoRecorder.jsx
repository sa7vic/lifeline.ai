import React, { useEffect, useMemo, useRef, useState } from "react";

function blobToFile(blob, filename) {
  return new File([blob], filename, { type: blob.type || "video/webm" });
}

export default function VideoRecorder({ onRecordedFile }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const [chunks, setChunks] = useState([]);
  const [previewUrl, setPreviewUrl] = useState("");

  const canRecord = typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && !!window.MediaRecorder;

  const mimeType = useMemo(() => {
    const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
    for (const c of candidates) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported?.(c)) return c;
    }
    return "";
  }, []);

  async function startCamera() {
    if (!canRecord) return;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }
    setChunks([]);
    setSeconds(0);

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: true
    });

    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
    setReady(true);
  }

  function stopCamera() {
    const s = streamRef.current;
    if (s) s.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
  }

  function startRecording() {
    if (!streamRef.current) return;
    setChunks([]);
    setSeconds(0);

    const r = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
    recorderRef.current = r;

    r.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) setChunks((c) => [...c, e.data]);
    };

    r.start(200);
    setRecording(true);
  }

  function stopRecording() {
    const r = recorderRef.current;
    if (r && r.state !== "inactive") r.stop();
    setRecording(false);
  }

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  useEffect(() => {
    if (recording && seconds >= 8) stopRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, recording]);

  useEffect(() => {
    if (recording) return;
    if (chunks.length === 0) return;

    const blob = new Blob(chunks, { type: mimeType || "video/webm" });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function useThisClip() {
    if (!previewUrl || chunks.length === 0) return;
    const blob = new Blob(chunks, { type: mimeType || "video/webm" });
    const file = blobToFile(blob, `lifeline_recording_${Date.now()}.webm`);
    onRecordedFile(file);
  }

  if (!canRecord) {
    return <div className="text-sm text-white/70">Recording not supported; use upload instead.</div>;
  }

  return (
    <div className="mt-2">
      {!previewUrl ? (
        <div>
          <video ref={videoRef} className="w-full rounded border border-white/10 bg-black" playsInline muted />
          <div className="mt-2 flex flex-wrap gap-2">
            {!ready ? (
              <button className="px-3 py-2 rounded bg-slate-200 text-black" onClick={startCamera}>Start Camera</button>
            ) : (
              <button className="px-3 py-2 rounded border border-white/20" onClick={stopCamera}>Stop Camera</button>
            )}
            <button className="px-3 py-2 rounded bg-emerald-600 disabled:opacity-50"
              onClick={startRecording} disabled={!ready || recording}>
              Record
            </button>
            <button className="px-3 py-2 rounded bg-red-600 disabled:opacity-50"
              onClick={stopRecording} disabled={!recording || seconds < 5}>
              Stop (min 5s)
            </button>
            <div className="px-3 py-2 rounded border border-white/20 text-sm">
              {recording ? `Recording: ${seconds}s` : "Idle"}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <video src={previewUrl} className="w-full rounded border border-white/10 bg-black" controls />
          <div className="mt-2 flex gap-2">
            <button className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500" onClick={useThisClip}>
              Use Clip
            </button>
            <button className="px-3 py-2 rounded border border-white/20"
              onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(""); setChunks([]); setSeconds(0); }}>
              Retake
            </button>
          </div>
        </div>
      )}
    </div>
  );
}