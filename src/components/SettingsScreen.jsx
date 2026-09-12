import { lazy, Suspense, useState } from "react";
import { ArrowRight, Check, Flag, Info, Monitor, Settings, Volume2 } from "lucide-react";
import { Button, Field, Heading, Toggle } from "./design.jsx";
import { exportHistory } from "../lib/exports.js";
import { downloadText } from "../lib/raceUtils.js";
const ShareQrCode = lazy(() => import("./ShareQrCode.jsx"));
export default function SettingsScreen({ session: s, navigate, systemMotion }) {
  const o = s.settings,
    patch = s.patch;
  const [tab, setTab] = useState("graphics"),
    [clearConfirm, setClearConfirm] = useState(false);
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set("audience", "1");
  if (o.chroma) url.searchParams.set("theme", "chroma");
  if (o.seed.trim()) url.searchParams.set("seed", o.seed.trim());
  if (o.compact) url.searchParams.set("minimal", "1");
  async function share() {
    try {
      await navigator.clipboard.writeText(url.toString());
      s.setNotice("Audience settings link copied. Entry names are not included.");
    } catch {
      downloadText("share-link.txt", url.toString());
      s.setNotice("Link downloaded.");
    }
  }
  return (
    <section className="settings-screen panel">
      <Heading icon={Settings} title="Settings" />
      <div className="settings-layout">
        <div className="settings-tabs" role="tablist" aria-label="Settings categories">
          {[
            ["graphics", Monitor],
            ["audio", Volume2],
            ["race", Flag],
            ["about", Info],
          ].map(([id, Icon]) => (
            <button
              role="tab"
              aria-selected={tab === id}
              key={id}
              className={tab === id ? "selected" : ""}
              onClick={() => setTab(id)}
            >
              <Icon size={20} />
              {id[0].toUpperCase() + id.slice(1)}
            </button>
          ))}
        </div>
        <div className="settings-content" role="tabpanel">
          {tab === "graphics" && (
            <>
              <Field label="Graphics quality">
                <select
                  aria-label="Graphics quality"
                  value={o.quality}
                  onChange={(e) => patch({ quality: e.target.value })}
                >
                  {["auto", "high", "medium", "low"].map((q) => (
                    <option key={q} value={q}>
                      {q[0].toUpperCase() + q.slice(1)}
                    </option>
                  ))}
                </select>
              </Field>
              <Toggle
                label="Reduced motion"
                description="Reduce camera motion and visual effects."
                checked={o.reducedMotion || systemMotion}
                onChange={(reducedMotion) => patch({ reducedMotion })}
              />
              {systemMotion && <p className="muted">Your system requests reduced motion.</p>}
              <Field label="Default camera">
                <select value={o.camera} onChange={(e) => patch({ camera: e.target.value })}>
                  <option value="chase">Chase</option>
                  <option value="overview">Overview</option>
                  <option value="follow">Follow a duck</option>
                </select>
              </Field>
              <p className="muted">
                <Monitor size={17} /> Graphics adapt to your device.
              </p>
            </>
          )}
          {tab === "audio" && (
            <>
              <Toggle
                label="Sound effects"
                checked={o.sound}
                onChange={(sound) => {
                  patch({ sound });
                  if (sound) s.sound("start", true);
                }}
              />
              <Field label={`Master volume · ${o.volume}%`}>
                <input
                  aria-label="Master volume"
                  type="range"
                  min="0"
                  max="200"
                  value={o.volume}
                  onChange={(e) => patch({ volume: Number(e.target.value) })}
                />
              </Field>
              <Field label="Sound preset">
                <select
                  value={o.soundPreset}
                  onChange={(e) => patch({ soundPreset: e.target.value })}
                >
                  <option value="sport">Sport</option>
                  <option value="cinematic">Cinematic</option>
                  <option value="minimal">Minimal</option>
                </select>
              </Field>
              {Object.entries(o.channels).map(([k, v]) => (
                <Field label={`${k[0].toUpperCase() + k.slice(1)} · ${v}%`} key={k}>
                  <input
                    aria-label={`${k} volume`}
                    type="range"
                    min="0"
                    max="200"
                    value={v}
                    onChange={(e) =>
                      patch({ channels: { ...o.channels, [k]: Number(e.target.value) } })
                    }
                  />
                </Field>
              ))}
              <Button icon={Volume2} onClick={() => s.sound("finish", true)}>
                Test sound
              </Button>
            </>
          )}
          {tab === "race" && (
            <>
              <h2>Audience & replay</h2>
              <Toggle
                label="Green screen overlay"
                description="Show standings on a chroma-key background in audience mode."
                checked={o.chroma}
                onChange={(chroma) => patch({ chroma })}
              />
              <Toggle
                label="Compact overlay"
                checked={o.compact}
                onChange={(compact) => patch({ compact })}
              />
              <div className="button-row">
                <Button
                  onClick={() => {
                    s.setAudience(true);
                    s.setScreen("race");
                  }}
                >
                  Audience Mode
                </Button>
                <Button onClick={share}>Copy share link</Button>
              </div>
              <p className="muted">
                The link shares presentation settings. Names and results stay in this browser; it is
                not a live remote broadcast.
              </p>
              <Suspense fallback={null}>
                <ShareQrCode value={url.toString()} />
              </Suspense>
              <p className="muted">
                Shortcuts: R starts a race · I makes an instant pick · M toggles sound.
              </p>
              <Button onClick={() => navigate("setup")}>Edit race rules</Button>
            </>
          )}
          {tab === "about" && (
            <>
              <h2>Every entry. Equal odds.</h2>
              <p>
                Fresh draws use your browser’s cryptographic random source. Seeded draws repeat the
                same result for the same entries and seed.
              </p>
              <p>
                The race animates that result. Breed, accessories, graphics, and camera never change
                who wins.
              </p>
              <p>
                Settings and the latest 40 races stay in this browser. Export history to keep a
                copy.
              </p>
              <a href="/asset-credits.txt" target="_blank" rel="noreferrer">
                Artwork & asset credits <ArrowRight size={16} />
              </a>
              <div className="data-controls">
                <Button onClick={() => exportHistory(s.history, s.legacyHistory)}>
                  Export history backup
                </Button>
                {!clearConfirm ? (
                  <Button onClick={() => setClearConfirm(true)}>Clear saved browser data</Button>
                ) : (
                  <div>
                    <p>Clear entries, settings, and race history in this browser?</p>
                    <div className="button-row">
                      <Button
                        onClick={() => {
                          s.clearSaved();
                          setClearConfirm(false);
                        }}
                      >
                        Clear saved session
                      </Button>
                      <Button onClick={() => setClearConfirm(false)}>Keep session</Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="settings-footer">
        <Button primary icon={Check} onClick={() => navigate("home")}>
          Done
        </Button>
      </div>
    </section>
  );
}
