import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import rrwebPlayer from "rrweb-player";
import "rrweb-player/dist/style.css";
import { Globe2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getSharedWebsiteRecording, getSharedWebsiteRecordingChunks } from "@/features/website-analytics";
import { prepareReplayEvents } from "@/features/website-analytics/utils/replay-events";

function formatDuration(ms?: number | null) {
  if (!ms) return "0s";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export default function SharedRecordingPage() {
  const { token } = useParams();
  const playerRef = useRef<HTMLDivElement | null>(null);
  const recordingQuery = useQuery({ queryKey: ["shared-recording", token], queryFn: () => getSharedWebsiteRecording(token!), enabled: Boolean(token) });
  const chunksQuery = useQuery({ queryKey: ["shared-recording", token, "chunks"], queryFn: () => getSharedWebsiteRecordingChunks(token!), enabled: Boolean(token) });
  const events = useMemo(
    () => prepareReplayEvents((chunksQuery.data?.chunks || []).flatMap((chunk) => chunk.events || [])),
    [chunksQuery.data],
  );

  useEffect(() => {
    if (!playerRef.current || events.length < 2) return;
    playerRef.current.innerHTML = "";
    const player = new rrwebPlayer({
      target: playerRef.current,
      props: { events, width: Math.min(1000, playerRef.current.clientWidth || 1000), height: 560, showController: true },
    } as any);
    return () => {
      playerRef.current && (playerRef.current.innerHTML = "");
      void player;
    };
  }, [events]);

  const recording = recordingQuery.data;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="border-b border-[#E2E8F0] bg-white px-6 py-5">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="rounded-lg bg-[#0891B2]/10 p-2 text-[#0891B2]"><Globe2 size={22} /></div>
          <div>
            <h1 className="text-2xl font-semibold text-[#0F172A]">Shared Website Recording</h1>
            <p className="text-sm text-[#64748B]">Read-only replay shared from Zodo Sales CRM.</p>
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-5 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
          {events.length >= 2 ? <div ref={playerRef} className="min-h-[560px]" /> : <div className="p-12 text-center text-[#64748B]">This recording does not have enough replay data yet.</div>}
        </section>
        <aside className="rounded-lg border border-[#E2E8F0] bg-white p-5 text-sm text-[#334155]">
          {recording ? (
            <div className="space-y-3">
              <Badge variant="outline">{recording.status}</Badge>
              <p><span className="font-medium">Site:</span> {recording.site?.name}</p>
              <p><span className="font-medium">Entry:</span> {recording.session?.entryUrl || "-"}</p>
              <p><span className="font-medium">Exit:</span> {recording.session?.exitUrl || "-"}</p>
              <p><span className="font-medium">Browser:</span> {recording.session?.browser || "-"} / {recording.session?.os || "-"}</p>
              <p><span className="font-medium">Device:</span> {recording.session?.device || "-"}</p>
              <p><span className="font-medium">Country:</span> {recording.session?.country || "-"}</p>
              <p><span className="font-medium">Duration:</span> {formatDuration(recording.durationMs)}</p>
            </div>
          ) : <p>Loading metadata...</p>}
        </aside>
      </main>
    </div>
  );
}
