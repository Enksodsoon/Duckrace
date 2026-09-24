import {
  ArrowRight,
  Check,
  Clover,
  Flag,
  Glasses,
  Medal,
  Mountain,
  Shirt,
  Shuffle,
  X,
} from "lucide-react";
import { Button, DuckIcon, Heading, Selected, Toggle } from "./design.jsx";
import { ACCESSORIES, BREEDS, STAGES } from "../lib/catalog.js";
import { assetUrl } from "../scene/assetUrl.js";
export function StagesScreen({ session: s, navigate }) {
  const o = s.settings;
  return (
    <section className="stage-screen">
      <Heading icon={Mountain} title="Select Stage">
        Five places. The same fair chance.
      </Heading>
      <div className="stage-grid">
        {STAGES.map((item, i) => (
          <button
            key={item.id}
            className={`stage-card ${o.stage === item.id ? "selected" : ""}`}
            aria-pressed={o.stage === item.id}
            onClick={() => s.patch({ stage: item.id })}
            style={{ "--stage-color": item.color }}
          >
            <span className={`stage-art stage-art-${item.id}`}>
              <img
                src={assetUrl(`/assets/stages/${item.id}.png`)}
                alt=""
                onError={(e) => {
                  e.currentTarget.hidden = true;
                }}
              />
              <Mountain size={45} />
            </span>
            <span className="stage-number">0{i + 1}</span>
            <span className="stage-name">{item.name}</span>
            <span className="stage-description">{item.description}</span>
            {o.stage === item.id && <Selected />}
          </button>
        ))}
      </div>
      <div className="stage-footer">
        <span>
          {s.participants.length} entries · {o.duration} seconds
        </span>
        <Button primary icon={ArrowRight} onClick={() => navigate("setup")}>
          Continue to Race
        </Button>
      </div>
    </section>
  );
}
export function GarageScreen({ session: s, navigate }) {
  const o = s.settings;
  return (
    <section className="garage-screen">
      <Heading icon={DuckIcon} title="Duck Garage">
        Choose your look. Every duck races with equal odds.
      </Heading>
      <div className="garage-preview-label">
        <h2>{(BREEDS.find((x) => x.id === o.breed) || BREEDS[0]).name}</h2>
        <span>{(BREEDS.find((x) => x.id === o.breed) || BREEDS[0]).description}</span>
      </div>
      <div className="garage-controls panel">
        <div className="breed-tabs" role="group" aria-label="Duck breeds">
          {BREEDS.map((b) => (
            <button
              key={b.id}
              className={o.breed === b.id ? "selected" : ""}
              aria-pressed={o.breed === b.id}
              onClick={() => s.patch({ breed: b.id, mixedBreeds: false })}
            >
              <DuckIcon size={23} />
              {b.name}
              {o.breed === b.id && <Check size={15} />}
            </button>
          ))}
        </div>
        <div className="accessory-heading">
          <h2>Accessories</h2>
          <span>Cosmetic only</span>
        </div>
        <div className="accessory-grid">
          {ACCESSORIES.map((a, i) => {
            const Icon = [X, Shirt, Glasses, Shuffle, Medal, Clover, Flag][i];
            return (
              <button
                key={a.id}
                className={o.accessory === a.id ? "selected" : ""}
                aria-pressed={o.accessory === a.id}
                onClick={() => s.patch({ accessory: a.id })}
              >
                <Icon size={25} />
                <span>{a.name}</span>
              </button>
            );
          })}
        </div>
        <div className="garage-footer">
          <Toggle
            label="Mix breeds across entries"
            checked={o.mixedBreeds}
            onChange={(mixedBreeds) => s.patch({ mixedBreeds })}
          />
          <Toggle
            label="Rotate looks each round"
            checked={o.reroll}
            onChange={(reroll) => s.patch({ reroll })}
          />
          <Button primary icon={Check} onClick={() => navigate("setup")}>
            Done
          </Button>
        </div>
      </div>
    </section>
  );
}
